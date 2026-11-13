/**
 * Cartoon 3D Penalty Shootout Engine Controller
 * Imported & customised from jainalokk/soccer.io src/game/Game.js (MIT License, Copyright (c) 2025 jainalokk)
 */
import * as THREE from 'three';
import type { AssetManager } from '../assets/AssetManager';
import type {
  MatchPhase,
  MatchStateSnapshot,
  ShootoutMatchConfig,
  ShotOutcome,
  ShotRecord,
  TeamConfig,
  TurnRole,
} from '../types';
import { Controls, type ShootPayload } from '../utils/Controls';
import { checkGoalLineCross, checkSave, type Vec2 } from '../utils/Physics';
import { Ball } from './Ball';
import { Goalkeeper } from './Goalkeeper';
import { Level } from './Level';
import { Player } from './Player';

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class Game {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private resizeObserver: ResizeObserver | null = null;

  private level!: Level;
  private ball!: Ball;
  private player!: Player;
  private goalkeeper!: Goalkeeper;
  public controls: Controls;

  private config: ShootoutMatchConfig;
  private homeTeam: TeamConfig;
  private awayTeam: TeamConfig;

  private phase: MatchPhase = 'ready';
  private activeTeamIndex: 0 | 1 = 0; // 0 = Home kicking, 1 = Away kicking
  private activeControlRole: TurnRole = 'shoot';
  private round = 1;
  private kicksTaken: [number, number] = [0, 0];
  private scores: [number, number] = [0, 0];
  private history: ShotRecord[] = [];

  // Arcade 1..100 mode state (preserved from soccer.io)
  private currentLevel = 1;
  private readonly maxLevel = 100;
  private readonly levelGoalsRequired = 3;
  private readonly arcadeMaxShots = 5;
  private levelGoals = 0;
  private arcadeShotsTaken = 0;

  // Per-shot flags
  private shotResolved = false;
  private ballEnteredGoal = false;
  private goalNetImpacted = false;
  private ballFlightElapsed = 0;
  private lastShotSpeedKmh = 0;
  private countdownSeconds: number | null = null;
  private lastOutcome: ShotOutcome | null = null;
  private statusMessage = 'Aim & hold Space or Shoot to strike!';
  private subMessage = 'Best of 5 penalties + Sudden Death';
  private handoffNextPlayerLabel: string | null = null;
  private winnerTeamIndex: 0 | 1 | 'draw' | null = null;
  private winReason: string | null = null;

  // Camera choreography
  private camTargetPos = new THREE.Vector3(0, 3.1, 18.2);
  private camLookAtCurrent = new THREE.Vector3(0, 1.15, 0);
  private camLookAtTarget = new THREE.Vector3(0, 1.15, 0);
  private cameraShake = 0;

  // Particles
  private particles: Particle[] = [];
  private particleGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);

  // Lifecycle & timers
  private rafId: number | null = null;
  private lastFrameTime = performance.now();
  private elapsedTime = 0;
  private activeTimers = new Set<number>();
  private disposed = false;

  private onStateChange?: (snapshot: MatchStateSnapshot) => void;
  private onMatchFinish?: (snapshot: MatchStateSnapshot) => void;

  constructor(options: {
    container: HTMLElement;
    assets: AssetManager;
    config: ShootoutMatchConfig;
    onStateChange?: (snapshot: MatchStateSnapshot) => void;
    onMatchFinish?: (snapshot: MatchStateSnapshot) => void;
  }) {
    this.container = options.container;
    this.assets = options.assets;
    this.config = options.config;
    this.onStateChange = options.onStateChange;
    this.onMatchFinish = options.onMatchFinish;

    this.homeTeam = this.assets.getTeam(this.config.homeTeamCode);
    this.awayTeam = this.assets.getTeam(this.config.awayTeamCode);
    this.assets.soundEnabled = this.config.soundEnabled;

    this.controls = new Controls();
    this.controls.setCallbacks({
      onShoot: (payload) => this.handlePlayerShoot(payload),
      onDive: (dir) => this.handlePlayerDive(dir),
      onChange: () => this.emitSnapshot(),
    });

    this.createScene();
    this.initEntities();
    this.setupTurn(false);
    this.animate();
  }

  private container: HTMLElement;
  private assets: AssetManager;

  private isSoftwareGl = false;

  private detectSoftwareGl(): boolean {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return false;
    }
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private handleContextRestored = () => {
    this.onResize();
  };

  private createScene(): void {
    this.scene = new THREE.Scene();
    this.isSoftwareGl = this.detectSoftwareGl();

    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 400);
    this.camera.position.copy(this.camTargetPos);
    this.camera.lookAt(this.camLookAtTarget);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);
    this.container.appendChild(this.renderer.domElement);

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.container);
  }

  private onResize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  }

  private initEntities(): void {
    const stadium = this.assets.getStadium(this.config.stadiumId);
    const ballTheme = this.assets.getBallTheme(this.config.ballId);
    this.level = new Level(this.scene, this.assets, stadium, this.homeTeam, this.awayTeam);
    this.ball = new Ball(this.scene, this.assets, ballTheme);

    const homeStriker = this.assets.getCharacter(this.config.homeStrikerId);
    const awayKeeper = this.assets.getCharacter(this.config.awayKeeperId);

    this.player = new Player(this.scene, this.assets, this.controls, homeStriker, this.homeTeam);
    this.goalkeeper = new Goalkeeper(
      this.scene,
      this.assets,
      awayKeeper,
      this.awayTeam,
      this.getAdjustedDifficulty(),
    );

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private getAdjustedDifficulty(): number {
    if (this.config.mode === 'arcade-shoot' || this.config.mode === 'arcade-save') {
      return Math.min(100, this.config.difficulty + (this.currentLevel - 1) * 5);
    }
    return this.config.difficulty;
  }

  private scheduleTimer(fn: () => void, ms: number): void {
    const id = window.setTimeout(() => {
      this.activeTimers.delete(id);
      if (!this.disposed) fn();
    }, ms);
    this.activeTimers.add(id);
  }

  private clearAllTimers(): void {
    this.activeTimers.forEach((id) => window.clearTimeout(id));
    this.activeTimers.clear();
  }

  public setSoundEnabled(enabled: boolean): void {
    this.config.soundEnabled = enabled;
    this.assets.soundEnabled = enabled;
  }

  public setAimFromNormalized(x: number, y: number): void {
    if (this.phase !== 'ready' || this.activeControlRole !== 'shoot') return;
    this.controls.setAimDirection({ x, y });
  }

  public startTouchPower(): void {
    if (this.phase !== 'ready' || this.activeControlRole !== 'shoot') return;
    this.controls.startPowerBar();
  }

  public releaseTouchShot(): void {
    if (this.phase !== 'ready' || this.activeControlRole !== 'shoot') return;
    this.controls.releaseShot();
  }

  public triggerTouchDive(dir: Vec2): void {
    if (this.phase !== 'ball-flight' && this.phase !== 'countdown') return;
    if (this.activeControlRole === 'save' || (this.config.mode === 'local-2p' && this.config.local2pStyle === 'simultaneous')) {
      this.goalkeeper.dive(dir, false);
    }
  }

  public confirmHandoff(): void {
    if (this.phase !== 'handoff') return;
    this.handoffNextPlayerLabel = null;
    if (this.activeControlRole === 'save') {
      this.startAiAutoShotCountdown();
    } else {
      this.phase = 'ready';
      this.controls.enabled = true;
      this.controls.resetState();
      this.statusMessage =
        this.activeTeamIndex === 0
          ? `${this.homeTeam.shortName} (P1) Stepping Up`
          : `${this.awayTeam.shortName} (P2) Stepping Up`;
      this.subMessage = 'Aim & hold Space / Shoot button to strike!';
      this.assets.playSound('whistle');
      this.emitSnapshot();
    }
  }

  public advanceNextArcadeLevel(): void {
    if (this.phase !== 'level-complete') return;
    if (this.currentLevel < this.maxLevel) {
      this.currentLevel += 1;
    }
    this.levelGoals = 0;
    this.arcadeShotsTaken = 0;
    this.goalkeeper.setDifficulty(this.getAdjustedDifficulty());
    this.setupTurn(false);
  }

  public restartMatch(): void {
    this.clearAllTimers();
    this.round = 1;
    this.activeTeamIndex = 0;
    this.kicksTaken = [0, 0];
    this.scores = [0, 0];
    this.history = [];
    this.currentLevel = 1;
    this.levelGoals = 0;
    this.arcadeShotsTaken = 0;
    this.lastOutcome = null;
    this.winnerTeamIndex = null;
    this.winReason = null;
    this.goalkeeper.setDifficulty(this.getAdjustedDifficulty());
    this.setupTurn(false);
  }

  private async syncActiveKitsForTurn(): Promise<void> {
    const kickingTeam = this.activeTeamIndex === 0 ? this.homeTeam : this.awayTeam;
    const defendingTeam = this.activeTeamIndex === 0 ? this.awayTeam : this.homeTeam;
    const strikerProfile = this.assets.getCharacter(
      this.activeTeamIndex === 0 ? this.config.homeStrikerId : this.config.awayStrikerId,
    );
    const keeperProfile = this.assets.getCharacter(
      this.activeTeamIndex === 0 ? this.config.awayKeeperId : this.config.homeKeeperId,
    );

    await Promise.all([
      this.player.loadRig(strikerProfile, kickingTeam),
      this.goalkeeper.loadRig(keeperProfile, defendingTeam),
    ]);
  }

  private setupTurn(promptHandoff: boolean): void {
    this.ball.reset();
    this.player.reset();
    this.goalkeeper.reset();
    this.shotResolved = false;
    this.ballEnteredGoal = false;
    this.goalNetImpacted = false;
    this.ballFlightElapsed = 0;
    this.countdownSeconds = null;
    this.controls.resetState();

    // Determine who controls what on this kick
    const mode = this.config.mode;
    if (mode === 'arcade-shoot') {
      this.activeTeamIndex = 0;
      this.activeControlRole = 'shoot';
      this.controls.usePrimaryWasd = false;
      this.goalkeeper.setPlayerControlled(false);
      this.player.setAimHelpersVisible(true);
    } else if (mode === 'arcade-save') {
      this.activeTeamIndex = 1;
      this.activeControlRole = 'save';
      this.controls.usePrimaryWasd = false;
      this.goalkeeper.setPlayerControlled(true);
      this.player.setAimHelpersVisible(false);
    } else if (mode === 'shootout-ai') {
      // Even turns (Home kicks): human shoots; Odd turns (Away kicks): human saves
      this.activeControlRole = this.activeTeamIndex === 0 ? 'shoot' : 'save';
      this.controls.usePrimaryWasd = false;
      this.goalkeeper.setPlayerControlled(this.activeControlRole === 'save');
      this.player.setAimHelpersVisible(this.activeControlRole === 'shoot');
    } else {
      // Local 2-Player mode
      if (this.config.local2pStyle === 'simultaneous') {
        this.activeControlRole = 'shoot';
        this.controls.usePrimaryWasd = true;
        this.goalkeeper.setPlayerControlled(true);
        // Hide goal reticle in simultaneous 2P so keeper doesn't see striker's exact spot
        this.player.setAimHelpersVisible(false);
      } else {
        // Pass-and-play: active striker team shoots against AI keeper (or alternates striker turns cleanly)
        this.activeControlRole = 'shoot';
        this.controls.usePrimaryWasd = false;
        this.goalkeeper.setPlayerControlled(false);
        this.player.setAimHelpersVisible(true);
      }
    }

    this.controls.role = this.activeControlRole;
    this.updateCameraForRole();
    void this.syncActiveKitsForTurn();

    if (
      promptHandoff &&
      this.config.mode === 'local-2p' &&
      this.config.local2pStyle === 'pass-and-play'
    ) {
      const nextTeam = this.activeTeamIndex === 0 ? this.homeTeam : this.awayTeam;
      const pLabel = this.activeTeamIndex === 0 ? 'Player 1' : 'Player 2';
      this.phase = 'handoff';
      this.controls.enabled = false;
      this.handoffNextPlayerLabel = `${pLabel} · ${nextTeam.name}`;
      this.statusMessage = `Pass Controls to ${pLabel}`;
      this.subMessage = `${nextTeam.name} penalty kick — Round ${this.round}`;
      this.emitSnapshot();
      return;
    }

    this.handoffNextPlayerLabel = null;

    if (this.activeControlRole === 'save') {
      this.startAiAutoShotCountdown();
    } else {
      this.phase = 'ready';
      this.controls.enabled = true;
      const kickerTeam = this.activeTeamIndex === 0 ? this.homeTeam : this.awayTeam;
      if (this.config.mode === 'local-2p' && this.config.local2pStyle === 'simultaneous') {
        this.statusMessage = `${kickerTeam.shortName} vs ${
          this.activeTeamIndex === 0 ? this.awayTeam.shortName : this.homeTeam.shortName
        } · Simultaneous Duel`;
        this.subMessage = 'Striker: WASD + Space · Keeper: Arrow Keys';
      } else {
        this.statusMessage = `${kickerTeam.name} Penalty Kick`;
        this.subMessage = 'Aim with Arrows/WASD or Touch · Hold Space/Shoot for power';
      }
      this.assets.playSound('whistle');
      this.emitSnapshot();
    }
  }

  private updateCameraForRole(): void {
    if (this.config.mode === 'local-2p' && this.config.local2pStyle === 'simultaneous') {
      // Broadcast TV angle so both striker & keeper are crisp and readable
      this.camTargetPos.set(3.8, 3.6, 17.5);
      this.camLookAtTarget.set(0, 1.1, 1.5);
    } else if (this.activeControlRole === 'save') {
      // Preserved soccer.io behind-goal camera for goalkeeper mode
      this.camTargetPos.set(0, 2.35, -3.6);
      this.camLookAtTarget.set(0, 1.05, 11);
    } else {
      // Preserved soccer.io behind-striker camera for shoot mode
      this.camTargetPos.set(0, 3.05, 18.2);
      this.camLookAtTarget.set(0, 1.15, 0);
    }
  }

  private startAiAutoShotCountdown(): void {
    this.phase = 'countdown';
    this.controls.enabled = true; // Allow early dive positioning or reaction
    this.countdownSeconds = 3;
    this.statusMessage = 'Get Ready to Save!';
    this.subMessage = 'Use Arrow Keys / WASD or Touch Dive buttons';
    this.assets.playSound('tick');
    this.emitSnapshot();

    const step = (remaining: number) => {
      if (remaining <= 0) {
        this.countdownSeconds = null;
        this.triggerAiPenaltyKick();
        return;
      }
      this.countdownSeconds = remaining;
      this.statusMessage = `Incoming Shot in ${remaining}...`;
      this.assets.playSound('tick');
      this.emitSnapshot();
      this.scheduleTimer(() => step(remaining - 1), 900);
    };

    this.scheduleTimer(() => step(2), 900);
  }

  private triggerAiPenaltyKick(): void {
    const diff = this.getAdjustedDifficulty();
    const randomDir: Vec2 = {
      x: (Math.random() * 2 - 1) * 0.82,
      y: Math.random() * 0.72 - 0.05,
    };
    const power = THREE.MathUtils.clamp(0.58 + (diff / 100) * 0.34, 0.55, 0.96);

    this.phase = 'running-up';
    this.statusMessage = 'Striker Running Up — Dive to Save!';
    this.emitSnapshot();

    this.player.startRunUp(() => {
      this.launchBall(randomDir, power, false);
    });
  }

  private handlePlayerShoot(payload: ShootPayload): void {
    if (this.phase !== 'ready') return;
    this.phase = 'running-up';
    if (!this.controls.usePrimaryWasd) {
      this.controls.enabled = false;
    }
    this.statusMessage = 'Striking...';
    this.emitSnapshot();

    this.player.startRunUp(() => {
      const keeperShouldAiDive =
        !this.goalkeeper.isPlayerControlled && !this.goalkeeper.isCurrentlyDiving();
      this.launchBall(payload.direction, payload.power, keeperShouldAiDive);
    });
  }

  private handlePlayerDive(dir: Vec2): void {
    if (
      this.phase !== 'countdown' &&
      this.phase !== 'running-up' &&
      this.phase !== 'ball-flight'
    ) {
      return;
    }
    if (!this.goalkeeper.isPlayerControlled && !this.controls.usePrimaryWasd) return;
    this.goalkeeper.dive(dir, false);
  }

  private launchBall(direction: Vec2, power: number, aiDive: boolean): void {
    this.phase = 'ball-flight';
    this.ballFlightElapsed = 0;
    this.shotResolved = false;
    this.ballEnteredGoal = false;

    const diff = this.getAdjustedDifficulty();
    this.ball.kick(direction, power, diff);
    this.lastShotSpeedKmh = this.ball.getSpeedKmh();
    this.assets.playSound('kick');

    if (aiDive) {
      // Slight human-like reaction delay (90ms - 220ms depending on difficulty)
      const reactionMs = THREE.MathUtils.lerp(220, 85, diff / 100);
      this.scheduleTimer(() => {
        if (this.phase === 'ball-flight' && !this.shotResolved) {
          this.goalkeeper.dive(this.ball.velocity, true);
        }
      }, reactionMs);
    }

    this.emitSnapshot();
  }

  private spawnBurst(pos: THREE.Vector3, colors: string[], count = 26): void {
    const gradient = this.assets.getToonGradientMap();
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshToonMaterial({
        color: colors[i % colors.length],
        gradientMap: gradient,
      });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.copy(pos);
      const speed = 2.5 + Math.random() * 5.5;
      const angle = Math.random() * Math.PI * 2;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        2.5 + Math.random() * 5.0,
        Math.sin(angle) * speed,
      );
      this.scene.add(mesh);
      this.particles.push({ mesh, vel, life: 0, maxLife: 0.9 + Math.random() * 0.6 });
    }
  }

  private resolveShot(outcome: ShotOutcome): void {
    if (this.shotResolved) return;
    this.shotResolved = true;
    this.lastOutcome = outcome;
    this.phase = 'shot-result';
    this.controls.enabled = false;

    const isGoal = outcome === 'goal';
    this.player.playOutcomeReaction(isGoal);
    this.goalkeeper.playOutcomeReaction(outcome === 'saved');

    if (outcome === 'goal') {
      this.assets.playSound('goal');
      this.level.triggerCrowdCheer(1.0);
      const kickingTeam = this.activeTeamIndex === 0 ? this.homeTeam : this.awayTeam;
      this.spawnBurst(
        new THREE.Vector3(this.ball.getPosition().x, 1.4, -0.5),
        [kickingTeam.primaryColor, '#FACC15', '#FFFFFF'],
        34,
      );
    } else if (outcome === 'saved') {
      this.assets.playSound('save');
      this.level.triggerCrowdCheer(0.6);
      this.cameraShake = 0.14;
      this.spawnBurst(
        new THREE.Vector3(this.goalkeeper.getPosition().x, 1.1, 0),
        ['#38BDF8', '#4ADE80', '#FFFFFF'],
        20,
      );
    } else {
      this.assets.playSound('miss');
    }

    // Record kick & update scores
    const kickingTeam = this.activeTeamIndex === 0 ? this.homeTeam : this.awayTeam;
    if (this.config.mode === 'arcade-shoot' || this.config.mode === 'arcade-save') {
      this.arcadeShotsTaken += 1;
      const playerSucceeded =
        (this.config.mode === 'arcade-shoot' && outcome === 'goal') ||
        (this.config.mode === 'arcade-save' && outcome !== 'goal');
      if (playerSucceeded) {
        this.scores[0] += 1;
        this.levelGoals += 1;
      } else {
        this.scores[1] += 1;
      }

      this.history.push({
        round: this.arcadeShotsTaken,
        teamIndex: this.activeTeamIndex,
        teamCode: kickingTeam.shortName,
        outcome,
        isSuddenDeath: false,
        shotSpeedKmh: this.lastShotSpeedKmh,
      });

      this.statusMessage =
        outcome === 'goal'
          ? this.config.mode === 'arcade-save'
            ? 'BEATEN! AI SCORES'
            : 'GOAL!'
          : outcome === 'saved'
          ? this.config.mode === 'arcade-save'
            ? 'WHAT A SAVE!'
            : 'SAVED BY KEEPER!'
          : 'OFF TARGET!';
      this.subMessage = `${this.lastShotSpeedKmh} km/h · Level ${this.currentLevel}`;
      this.emitSnapshot();

      this.scheduleTimer(() => this.advanceArcadeState(), 1900);
      return;
    }

    // Shootout Match (5 penalties per team + Sudden Death)
    this.kicksTaken[this.activeTeamIndex] += 1;
    if (outcome === 'goal') {
      this.scores[this.activeTeamIndex] += 1;
    }

    this.history.push({
      round: this.round,
      teamIndex: this.activeTeamIndex,
      teamCode: kickingTeam.shortName,
      outcome,
      isSuddenDeath: this.round > 5,
      shotSpeedKmh: this.lastShotSpeedKmh,
    });

    this.statusMessage =
      outcome === 'goal'
        ? `${kickingTeam.shortName} SCORES!`
        : outcome === 'saved'
        ? 'SAVED!'
        : 'MISSED!';
    this.subMessage = `${this.homeTeam.shortName} ${this.scores[0]} - ${this.scores[1]} ${this.awayTeam.shortName} · ${this.lastShotSpeedKmh} km/h`;
    this.emitSnapshot();

    this.scheduleTimer(() => this.advanceShootoutState(), 1950);
  }

  private advanceArcadeState(): void {
    if (this.arcadeShotsTaken >= this.arcadeMaxShots) {
      if (this.levelGoals >= this.levelGoalsRequired) {
        this.phase = 'level-complete';
        this.assets.playSound('win');
        this.statusMessage = `Level ${this.currentLevel} Cleared!`;
        this.subMessage = `${this.levelGoals}/${this.arcadeMaxShots} successful plays`;
        this.emitSnapshot();
      } else {
        this.phase = 'match-over';
        this.winnerTeamIndex = 1;
        this.winReason = `Arcade Run Ended at Level ${this.currentLevel} (${this.levelGoals}/${this.levelGoalsRequired} needed)`;
        this.statusMessage = 'Arcade Run Complete';
        this.subMessage = this.winReason;
        this.emitSnapshot();
        this.onMatchFinish?.(this.getSnapshot());
      }
      return;
    }

    this.setupTurn(false);
  }

  private advanceShootoutState(): void {
    const [k0, k1] = this.kicksTaken;
    const [s0, s1] = this.scores;

    // 1. Best-of-5 early clinch check
    if (this.round <= 5) {
      const rem0 = 5 - k0;
      const rem1 = 5 - k1;
      if (s0 > s1 + rem1) {
        this.finishMatch(0, `${this.homeTeam.name} wins ${s0}-${s1} with an insurmountable lead!`);
        return;
      }
      if (s1 > s0 + rem0) {
        this.finishMatch(1, `${this.awayTeam.name} wins ${s1}-${s0} with an insurmountable lead!`);
        return;
      }
      // End of round 5 with winner
      if (k0 === 5 && k1 === 5 && s0 !== s1) {
        const winner: 0 | 1 = s0 > s1 ? 0 : 1;
        const winTeam = winner === 0 ? this.homeTeam : this.awayTeam;
        this.finishMatch(winner, `${winTeam.name} wins ${s0}-${s1} after 5 penalties!`);
        return;
      }
    } else {
      // 2. Sudden death check (only resolve after both teams took equal kicks in SD round)
      if (k0 === k1 && s0 !== s1) {
        const winner: 0 | 1 = s0 > s1 ? 0 : 1;
        const winTeam = winner === 0 ? this.homeTeam : this.awayTeam;
        this.finishMatch(
          winner,
          `${winTeam.name} wins ${s0}-${s1} in Sudden Death (Round ${this.round})!`,
        );
        return;
      }
    }

    // Advance turn
    if (this.activeTeamIndex === 0) {
      this.activeTeamIndex = 1;
    } else {
      this.activeTeamIndex = 0;
      this.round += 1;
    }

    this.setupTurn(true);
  }

  private finishMatch(winnerIndex: 0 | 1, reason: string): void {
    this.phase = 'match-over';
    this.winnerTeamIndex = winnerIndex;
    this.winReason = reason;
    this.controls.enabled = false;
    this.statusMessage =
      winnerIndex === 0 ? `${this.homeTeam.name} Wins!` : `${this.awayTeam.name} Wins!`;
    this.subMessage = reason;
    this.assets.playSound('win');
    this.level.triggerCrowdCheer(1.3);
    this.emitSnapshot();
    this.onMatchFinish?.(this.getSnapshot());
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;
    this.elapsedTime += dt;

    this.updateScene(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private updateScene(dt: number): void {
    this.level.update(dt, this.elapsedTime);
    this.player.update(dt);
    this.goalkeeper.update(dt);

    if (this.phase === 'ball-flight') {
      this.ballFlightElapsed += dt;
      this.goalkeeper.trackBall(this.ball.getPosition(), dt);

      const hitNet = this.ball.update(dt, this.level.getGoalBounds(), this.ballEnteredGoal);
      if (hitNet && !this.goalNetImpacted) {
        this.goalNetImpacted = true;
        this.level.triggerNetRipple(this.ball.getPosition().x, this.ball.getPosition().y, 0.72);
      }

      if (!this.shotResolved) {
        const ballPos = this.ball.getPosition();

        // 1. Check save BEFORE goal crossing if keeper touches ball around line
        const isSaved = checkSave(
          ballPos,
          this.goalkeeper.getPosition(),
          this.goalkeeper.isCurrentlyDiving(),
          this.getAdjustedDifficulty(),
        );

        if (isSaved) {
          // Deflect ball outward away from goal!
          this.ball.velocity.z = Math.abs(this.ball.velocity.z) * 0.45 + 3.5;
          this.ball.velocity.x += (ballPos.x >= this.goalkeeper.getPosition().x ? 1 : -1) * 4.5;
          this.ball.velocity.y = Math.max(2.2, Math.abs(this.ball.velocity.y) * 0.5);
          this.resolveShot('saved');
          return;
        }

        // 2. Swept goal-line crossing & post/crossbar collision check
        const crossCheck = checkGoalLineCross(
          this.ball.previousPosition,
          { x: ballPos.x, y: ballPos.y, z: ballPos.z },
          this.level.getGoalBounds(),
          this.ball.radius,
        );

        if (crossCheck.hitPost || crossCheck.hitCrossbar) {
          this.assets.playSound('post');
          this.cameraShake = 0.18;
          this.ball.velocity.z = Math.abs(this.ball.velocity.z) * 0.55;
          if (crossCheck.hitPost) {
            this.ball.velocity.x = -this.ball.velocity.x * 0.65;
          }
          if (crossCheck.hitCrossbar) {
            this.ball.velocity.y = -Math.abs(this.ball.velocity.y) * 0.5;
          }
          this.ball.mesh.position.z = Math.max(this.ball.mesh.position.z, 0.25);
        } else if (crossCheck.crossed) {
          this.ballEnteredGoal = true;
          this.level.triggerNetRipple(crossCheck.crossX, crossCheck.crossY, 0.75);
          this.resolveShot('goal');
          return;
        }

        // 3. Missed shot bounds (past backline outside goal, or stalled, or timeout)
        if (
          ballPos.z < -2.4 ||
          Math.abs(ballPos.x) > 12 ||
          !this.ball.isMoving ||
          this.ballFlightElapsed > 2.4
        ) {
          this.resolveShot('missed');
        }
      }
    } else {
      // Keep ball settled after goal/save physics settle
      this.ball.update(dt, this.level.getGoalBounds(), this.ballEnteredGoal);
    }

    // Update confetti/spark particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.vel.y -= 11 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 7;
      p.mesh.rotation.y += dt * 6;
      const scale = Math.max(0, 1 - p.life / p.maxLife);
      p.mesh.scale.setScalar(scale);
      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      }
    }

    // Smooth camera lerp + subtle shake on impact
    const lerpAlpha = Math.min(1, dt * 6.5);
    this.camera.position.lerp(this.camTargetPos, lerpAlpha);
    this.camLookAtCurrent.lerp(this.camLookAtTarget, lerpAlpha);
    if (this.cameraShake > 0.002) {
      this.cameraShake *= Math.pow(0.02, dt);
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
    }
    this.camera.lookAt(this.camLookAtCurrent);
  }

  public getSnapshot(): MatchStateSnapshot {
    return {
      phase: this.phase,
      mode: this.config.mode,
      local2pStyle: this.config.local2pStyle,
      activeTeamIndex: this.activeTeamIndex,
      activeControlRole: this.activeControlRole,
      round: this.round,
      isSuddenDeath: this.round > 5,
      kicksTaken: [...this.kicksTaken],
      scores: [...this.scores],
      history: [...this.history],
      currentLevel: this.currentLevel,
      maxLevel: this.maxLevel,
      levelGoals: this.levelGoals,
      levelGoalsRequired: this.levelGoalsRequired,
      arcadeShotsTaken: this.arcadeShotsTaken,
      arcadeMaxShots: this.arcadeMaxShots,
      power: this.controls.power,
      isPowerActive: this.controls.isPowerActive,
      aimDirection: { ...this.controls.direction },
      countdownSeconds: this.countdownSeconds,
      lastOutcome: this.lastOutcome,
      statusMessage: this.statusMessage,
      subMessage: this.subMessage,
      handoffNextPlayerLabel: this.handoffNextPlayerLabel,
      winnerTeamIndex: this.winnerTeamIndex,
      winReason: this.winReason,
    };
  }

  private emitSnapshot(): void {
    this.onStateChange?.(this.getSnapshot());
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.clearAllTimers();
    this.controls.dispose();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];
    this.particleGeo.dispose();

    this.player.dispose();
    this.goalkeeper.dispose();
    this.ball.dispose();
    this.level.dispose();

    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
