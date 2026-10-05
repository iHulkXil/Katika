import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocation, useRoute, Link } from 'wouter';
import * as THREE from 'three';
import { useServerSession } from '@/components/server-session';
import { useLegend } from '@/components/legend-card';
import { useToast } from '@/hooks/use-toast';
import { KatikaLogo } from '@/components/katika-logo';
import {
  Trophy,
  Swords,
  RotateCcw,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Users,
  Award,
  ArrowRight,
  Shield,
  HelpCircle,
  Play,
  CheckCircle2,
  XCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Flame,
  Radio,
  Timer,
  Target,
} from 'lucide-react';

// =============================================================================
// PROCEDURAL AUDIO SYNTHESIZER
// =============================================================================
class PenaltyAudio {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  playWhistle() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(2850, t);
      osc2.frequency.setValueAtTime(3240, t);

      const trill = this.ctx.createOscillator();
      const trillGain = this.ctx.createGain();
      trill.frequency.value = 34;
      trillGain.gain.value = 75;
      trill.connect(osc1.frequency);
      trill.start(t);
      trill.stop(t + 0.38);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.38);
      osc2.stop(t + 0.38);
    } catch {}
  }

  playKick(powerMultiplier = 0.8) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(185, t);
      osc.frequency.exponentialRampToValueAtTime(34, t + 0.14);

      const vol = Math.min(0.95, Math.max(0.4, powerMultiplier * 0.95));
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.14);
    } catch {}
  }

  playGoal() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.45;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.14));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1180;
      const netGain = this.ctx.createGain();
      netGain.gain.setValueAtTime(0.32, t);
      netGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      noise.connect(filter);
      filter.connect(netGain);
      netGain.connect(this.ctx.destination);
      noise.start(t);

      const crowdBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 1.1, this.ctx.sampleRate);
      const crowdData = crowdBuffer.getChannelData(0);
      for (let i = 0; i < crowdBuffer.length; i++) {
        crowdData[i] = (Math.random() * 2 - 1) * Math.sin((i / crowdBuffer.length) * Math.PI);
      }
      const crowd = this.ctx.createBufferSource();
      crowd.buffer = crowdBuffer;
      const crowdFilter = this.ctx.createBiquadFilter();
      crowdFilter.type = 'lowpass';
      crowdFilter.frequency.value = 850;
      const crowdGain = this.ctx.createGain();
      crowdGain.gain.setValueAtTime(0.02, t);
      crowdGain.gain.linearRampToValueAtTime(0.38, t + 0.22);
      crowdGain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      crowd.connect(crowdFilter);
      crowdFilter.connect(crowdGain);
      crowdGain.connect(this.ctx.destination);
      crowd.start(t);
    } catch {}
  }

  playSave() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

      gain.gain.setValueAtTime(0.48, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch {}
  }

  playCueJoin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, t);
      osc.frequency.setValueAtTime(880, t + 0.05);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch {}
  }

  playCountdown(count: number) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(count === 1 ? 880 : 440, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    } catch {}
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const t = this.ctx!.currentTime + idx * 0.11;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t);
        osc.stop(t + 0.28);
      });
    } catch {}
  }
}

const audio = new PenaltyAudio();

// =============================================================================
// GAME TYPES: STRICTLY 3 DIRECTIONS (LEFT, CENTRE, RIGHT) & 3V3 SQUAD
// =============================================================================
export type ShotDirection = 'left' | 'centre' | 'right';
export type DiveDirection = 'left' | 'centre' | 'right';
export type PitchElevation = 'low' | 'mid' | 'high' | 'panenka';

export interface SquadPlayer {
  id: string;
  name: string;
  number: number;
  role: 'striker' | 'keeper';
  isUser: boolean;
  avatarSeed: number;
}

export interface ShotResult {
  round: number;
  kickerSlot: number;
  team: 'A' | 'B';
  kickerName: string;
  keeperName: string;
  shotDirection: ShotDirection;
  diveDirection: DiveDirection;
  scored: boolean;
  powerKmH: number;
  pitchElevation: PitchElevation;
  composureQuality: 'green' | 'yellow' | 'red';
  message: string;
}

export function PenaltyShootoutPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/pvp/penalty/:id');

  const { serverUser } = useServerSession();
  const { legend } = useLegend();
  const { toast } = useToast();

  const [soundOn, setSoundOn] = useState(true);
  const [stake, setStake] = useState<number>(10);
  const [keeperControlAll, setKeeperControlAll] = useState<boolean>(true);

  // Match States
  const [matchState, setMatchState] = useState<
    'lobby' | 'queue_matching' | 'countdown' | 'aiming' | 'runup' | 'ball_flight' | 'shot_result' | 'game_over'
  >('lobby');

  // Matchmaking Queue State
  const [queuePlayersFound, setQueuePlayersFound] = useState<number>(1);
  const [queueStatusText, setQueueStatusText] = useState<string>('Searching 3v3 cue...');
  const [countdownNum, setCountdownNum] = useState<number>(3);

  // 3 vs 3 Turns
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [currentKickerSlot, setCurrentKickerSlot] = useState<number>(0);
  const [attackingTeam, setAttackingTeam] = useState<'A' | 'B'>('A');

  // Scores & Indicators
  const [scoreTeamA, setScoreTeamA] = useState<number>(0);
  const [scoreTeamB, setScoreTeamB] = useState<number>(0);
  const [shotsA, setShotsA] = useState<(boolean | null)[]>([null, null, null]);
  const [shotsB, setShotsB] = useState<(boolean | null)[]>([null, null, null]);
  const [history, setHistory] = useState<ShotResult[]>([]);

  // Telemetry & Results
  const [userSelectedDir, setUserSelectedDir] = useState<ShotDirection | null>(null);
  const [hoveredDir, setHoveredDir] = useState<ShotDirection | null>(null);
  const [activeShotData, setActiveShotData] = useState<ShotResult | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string>('');

  // 3v3 Squads
  const teamA: SquadPlayer[] = useMemo(() => [
    { id: 'p1', name: legend?.name || 'K. MBAPPÉ', number: 10, role: 'striker', isUser: true, avatarSeed: 1 },
    { id: 'p2', name: 'V. JÚNIOR', number: 7, role: 'striker', isUser: false, avatarSeed: 2 },
    { id: 'p3', name: 'J. BELLINGHAM', number: 5, role: 'striker', isUser: false, avatarSeed: 3 },
  ], [legend?.name]);

  const teamB: SquadPlayer[] = useMemo(() => [
    { id: 'b1', name: 'T. COURTOIS', number: 1, role: 'keeper', isUser: false, avatarSeed: 4 },
    { id: 'b2', name: 'E. HAALAND', number: 9, role: 'striker', isUser: false, avatarSeed: 5 },
    { id: 'b3', name: 'K. DE BRUYNE', number: 17, role: 'striker', isUser: false, avatarSeed: 6 },
  ], []);

  // Active Shooter & Goalkeeper
  const currentShooter = attackingTeam === 'A' ? teamA[currentKickerSlot] : teamB[currentKickerSlot];
  const currentKeeper = attackingTeam === 'A'
    ? teamB[currentKickerSlot]
    : teamA[keeperControlAll ? 0 : currentKickerSlot];

  const isUserTurnToShoot = attackingTeam === 'A' && currentShooter.isUser;
  const isUserTurnToSave = attackingTeam === 'B' && (keeperControlAll || currentKeeper.isUser);

  // WebGL Container & Three.js References
  const containerRef = useRef<HTMLDivElement>(null);
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    strikerGroup: THREE.Group;
    strikerLegR: THREE.Group;
    strikerLegL: THREE.Group;
    strikerArmR: THREE.Group;
    strikerArmL: THREE.Group;
    keeperGroup: THREE.Group;
    keeperBody: THREE.Group;
    keeperArmL: THREE.Group;
    keeperArmR: THREE.Group;
    ballMesh: THREE.Mesh;
    composureMesh: THREE.Mesh;
    targetLeftMesh: THREE.Group;
    targetCentreMesh: THREE.Group;
    targetRightMesh: THREE.Group;
    netMesh: THREE.LineSegments;
  } | null>(null);

  // Animation Progress & Physics State
  const animProgressRef = useRef<{
    runup: number;
    ballT: number;
    keeperT: number;
    netRipple: number;
    ballSpin: number;
    composureRadius: number;
    shotDir: ShotDirection;
    diveDir: DiveDirection;
    pitchElevation: PitchElevation;
    powerKmH: number;
    scored: boolean;
  }>({
    runup: 0,
    ballT: 0,
    keeperT: 0,
    netRipple: 0,
    ballSpin: 0,
    composureRadius: 36,
    shotDir: 'centre',
    diveDir: 'centre',
    pitchElevation: 'mid',
    powerKmH: 95,
    scored: false,
  });

  const toggleSound = () => {
    audio.enabled = !soundOn;
    setSoundOn(!soundOn);
  };

  // Join Matchmaking Queue
  const joinQueue = () => {
    setMatchState('queue_matching');
    setQueuePlayersFound(1);
    setQueueStatusText('Searching 3v3 Matchmaking Cue...');
    audio.playCueJoin();

    const interval = setInterval(() => {
      setQueuePlayersFound((prev) => {
        if (prev < 6) {
          audio.playCueJoin();
          const next = prev + 1;
          if (next === 3) setQueueStatusText('Katika Squad Assembled (3/3). Finding Rivals...');
          if (next === 5) setQueueStatusText('Rivals Joining (5/6)...');
          if (next === 6) {
            setQueueStatusText('3v3 Cue Full (6/6)! Connecting Stadium...');
            clearInterval(interval);
            setTimeout(() => {
              startCountdown();
            }, 600);
          }
          return next;
        }
        clearInterval(interval);
        return prev;
      });
    }, 450);
  };

  // 3-2-1 Countdown
  const startCountdown = () => {
    setMatchState('countdown');
    setCountdownNum(3);
    audio.playCountdown(3);

    const timer = setInterval(() => {
      setCountdownNum((prev) => {
        if (prev > 1) {
          const next = prev - 1;
          audio.playCountdown(next);
          return next;
        }
        clearInterval(timer);
        startKickoff();
        return 0;
      });
    }, 750);
  };

  // Kickoff
  const startKickoff = () => {
    setScoreTeamA(0);
    setScoreTeamB(0);
    setShotsA([null, null, null]);
    setShotsB([null, null, null]);
    setCurrentRound(1);
    setCurrentKickerSlot(0);
    setAttackingTeam('A');
    setHistory([]);
    setUserSelectedDir(null);
    setActiveShotData(null);
    setMatchState('aiming');
    audio.playWhistle();
    setBannerNotice('FC 26 3D PRACTICE ARENA · ROUND 1 OF 3');
  };

  // Execute Shot Resolution
  const resolveShot = useCallback((shooterChoice: ShotDirection, keeperChoice: DiveDirection) => {
    const randomPower = Math.floor(82 + Math.random() * 44);

    const elevations: PitchElevation[] = ['low', 'mid', 'high', 'panenka'];
    const randomElevation = elevations[Math.floor(Math.random() * elevations.length)];

    const r = animProgressRef.current.composureRadius;
    const compQuality: 'green' | 'yellow' | 'red' = r < 18 ? 'green' : r < 28 ? 'yellow' : 'red';

    let isGoal = false;
    let message = '';

    if (shooterChoice !== keeperChoice) {
      isGoal = true;
      message = compQuality === 'green'
        ? `PERFECT TIMED FINISH! Clinical 3D strike buried in the ${shooterChoice} net!`
        : `GOAL! Courtois wrong-footed, strike tucked cleanly into the ${shooterChoice}!`;
    } else {
      const topCornerBullet = randomElevation === 'high' && randomPower >= 110;
      if (topCornerBullet) {
        isGoal = true;
        message = `UNSTOPPABLE! ${randomPower} km/h bullet sniped past the keeper's fingertips!`;
      } else {
        isGoal = false;
        message = `SAVED! Courtois anticipated ${keeperChoice} and made a spectacular diving block!`;
      }
    }

    const shotResult: ShotResult = {
      round: currentRound,
      kickerSlot: currentKickerSlot,
      team: attackingTeam,
      kickerName: currentShooter.name,
      keeperName: currentKeeper.name,
      shotDirection: shooterChoice,
      diveDirection: keeperChoice,
      scored: isGoal,
      powerKmH: randomPower,
      pitchElevation: randomElevation,
      composureQuality: compQuality,
      message,
    };

    setActiveShotData(shotResult);
    animProgressRef.current.shotDir = shooterChoice;
    animProgressRef.current.diveDir = keeperChoice;
    animProgressRef.current.pitchElevation = randomElevation;
    animProgressRef.current.powerKmH = randomPower;
    animProgressRef.current.scored = isGoal;
    animProgressRef.current.runup = 0;
    animProgressRef.current.ballT = 0;
    animProgressRef.current.keeperT = 0;
    animProgressRef.current.netRipple = 0;

    setMatchState('runup');

    // Kick impact timing
    setTimeout(() => {
      audio.playKick(randomPower / 120);
      setMatchState('ball_flight');
    }, 420);

    // Goal or Save Resolution
    setTimeout(() => {
      if (isGoal) {
        audio.playGoal();
        setBannerNotice(`⚽ GOAL! ${randomPower} KM/H · ${shooterChoice.toUpperCase()}`);
      } else {
        audio.playSave();
        setBannerNotice(`🧤 SAVED! ${currentKeeper.name} BLOCKS`);
      }
      setMatchState('shot_result');

      if (attackingTeam === 'A') {
        if (isGoal) setScoreTeamA((prev) => prev + 1);
        setShotsA((prev) => {
          const next = [...prev];
          next[currentKickerSlot] = isGoal;
          return next;
        });
      } else {
        if (isGoal) setScoreTeamB((prev) => prev + 1);
        setShotsB((prev) => {
          const next = [...prev];
          next[currentKickerSlot] = isGoal;
          return next;
        });
      }

      setHistory((prev) => [...prev, shotResult]);
    }, 860);

    // Next Turn
    setTimeout(() => {
      progressNextTurn(isGoal);
    }, 2900);
  }, [currentRound, currentKickerSlot, attackingTeam, currentShooter.name, currentKeeper.name]);

  // Turn Progression
  const progressNextTurn = useCallback((lastShotGoal: boolean) => {
    if (attackingTeam === 'A') {
      setAttackingTeam('B');
      setUserSelectedDir(null);
      setMatchState('aiming');
      setBannerNotice(`ROUND ${currentRound} · ${teamB[currentKickerSlot].name} TO KICK`);
      audio.playWhistle();
    } else {
      if (currentKickerSlot < 2) {
        const nextSlot = currentKickerSlot + 1;
        setCurrentKickerSlot(nextSlot);
        setCurrentRound(nextSlot + 1);
        setAttackingTeam('A');
        setUserSelectedDir(null);
        setMatchState('aiming');
        setBannerNotice(`ROUND ${nextSlot + 1} OF 3 · ${teamA[nextSlot].name} TO KICK`);
        audio.playWhistle();
      } else {
        const finalA = scoreTeamA + (attackingTeam === 'A' && lastShotGoal ? 1 : 0);
        const finalB = scoreTeamB + (attackingTeam === 'B' && lastShotGoal ? 1 : 0);

        setMatchState('game_over');
        audio.playFanfare();
        if (finalA > finalB) {
          toast({ title: '🏆 VICTORY!', description: 'Katika Elite won the 3v3 Penalty Shootout!' });
        } else if (finalB > finalA) {
          toast({ title: 'Defeat', description: 'Rivals edged the shootout. Better luck next time!' });
        } else {
          toast({ title: 'Draw!', description: 'Honors even in a thrilling 3v3 shootout!' });
        }
      }
    }
  }, [attackingTeam, currentKickerSlot, currentRound, scoreTeamA, scoreTeamB, teamA, teamB, toast]);

  // User Choice
  const handleUserChoice = (direction: ShotDirection) => {
    if (matchState !== 'aiming') return;
    setUserSelectedDir(direction);

    if (isUserTurnToShoot) {
      const dirs: DiveDirection[] = ['left', 'centre', 'right'];
      const aiKeeperChoice = dirs[Math.floor(Math.random() * dirs.length)];
      resolveShot(direction, aiKeeperChoice);
    } else if (isUserTurnToSave) {
      const dirs: ShotDirection[] = ['left', 'centre', 'right'];
      const aiStrikerChoice = dirs[Math.floor(Math.random() * dirs.length)];
      resolveShot(aiStrikerChoice, direction);
    } else {
      const dirs: ShotDirection[] = ['left', 'centre', 'right'];
      const sChoice = dirs[Math.floor(Math.random() * dirs.length)];
      const kChoice = dirs[Math.floor(Math.random() * dirs.length)];
      resolveShot(sChoice, kChoice);
    }
  };

  // AI Spectate
  useEffect(() => {
    if (matchState === 'aiming' && !isUserTurnToShoot && !isUserTurnToSave) {
      const timer = setTimeout(() => {
        const dirs: ShotDirection[] = ['left', 'centre', 'right'];
        const sChoice = dirs[Math.floor(Math.random() * dirs.length)];
        const kChoice = dirs[Math.floor(Math.random() * dirs.length)];
        resolveShot(sChoice, kChoice);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [matchState, isUserTurnToShoot, isUserTurnToSave, resolveShot]);

  // =============================================================================
  // PS3-ERA 3D WEBGL ENGINE (THREE.JS RUNTIME)
  // =============================================================================
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbfe3f7); // Pale daylight sky from video
    scene.fog = new THREE.Fog(0xbfe3f7, 18, 48);

    // 2. CAMERA SETUP (Third-person elevated behind striker)
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 100);
    camera.position.set(0, 1.85, 4.8);
    camera.lookAt(0, 1.25, -6.5);

    // 3. WEBGL RENDERER (PBR / Soft Shadows)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. DAYLIGHT OUTDOOR SUN LIGHTING
    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x446644, 0.95);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    sunLight.position.set(-6, 12, 6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 30;
    sunLight.shadow.camera.left = -6;
    sunLight.shadow.camera.right = 6;
    sunLight.shadow.camera.top = 8;
    sunLight.shadow.camera.bottom = -4;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // 5. NATURAL GREEN CUT-LAWN PITCH WITH REALISTIC STRIPES
    const pitchGeo = new THREE.PlaneGeometry(36, 40);
    const canvasTexture = document.createElement('canvas');
    canvasTexture.width = 512;
    canvasTexture.height = 512;
    const pctx = canvasTexture.getContext('2d')!;
    // Alternating natural lawn stripes
    for (let i = 0; i < 16; i++) {
      pctx.fillStyle = i % 2 === 0 ? '#438038' : '#4f9142';
      pctx.fillRect(0, i * 32, 512, 32);
    }
    // Crisp white chalk lines
    pctx.strokeStyle = '#ffffff';
    pctx.lineWidth = 6;
    pctx.strokeRect(32, 32, 448, 448);
    const turfTexture = new THREE.CanvasTexture(canvasTexture);
    turfTexture.wrapS = THREE.RepeatWrapping;
    turfTexture.wrapT = THREE.RepeatWrapping;
    turfTexture.repeat.set(2, 2);

    const pitchMat = new THREE.MeshStandardMaterial({
      map: turfTexture,
      roughness: 0.85,
      metalness: 0.05,
    });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.set(0, 0, -5);
    pitch.receiveShadow = true;
    scene.add(pitch);

    // Penalty Spot (White chalk circle)
    const spotGeo = new THREE.CircleGeometry(0.09, 32);
    const spotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const spot = new THREE.Mesh(spotGeo, spotMat);
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(0, 0.005, 0);
    scene.add(spot);

    // Goal Line
    const lineGeo = new THREE.PlaneGeometry(14, 0.1);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const goalLine = new THREE.Mesh(lineGeo, lineMat);
    goalLine.rotation.x = -Math.PI / 2;
    goalLine.position.set(0, 0.006, -7.2);
    scene.add(goalLine);

    // 6. CHAINLINK COURT FENCE & RED REBOUNDER BOARDS BEHIND GOAL
    const fenceMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      wireframe: true,
      roughness: 0.9,
    });
    const fenceGeo = new THREE.PlaneGeometry(28, 6, 28, 8);
    const fence = new THREE.Mesh(fenceGeo, fenceMat);
    fence.position.set(0, 3, -11.5);
    scene.add(fence);

    // Red Training Rebounders (from video)
    const rebounderMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 0.05), rebounderMat);
    r1.position.set(-5.5, 0.9, -11.2);
    scene.add(r1);
    const r2 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 0.05), rebounderMat);
    r2.position.set(5.5, 0.9, -11.2);
    scene.add(r2);

    // 7. 3D TUBULAR METALLIC GOALPOSTS
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.6 });
    const postRadius = 0.065;
    const goalWidth = 5.2;
    const goalHeight = 2.1;
    const goalZ = -7.2;

    // Left post
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 20), postMat);
    postL.position.set(-goalWidth / 2, goalHeight / 2, goalZ);
    postL.castShadow = true;
    scene.add(postL);

    // Right post
    const postR = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 20), postMat);
    postR.position.set(goalWidth / 2, goalHeight / 2, goalZ);
    postR.castShadow = true;
    scene.add(postR);

    // Horizontal crossbar
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, goalWidth, 20), postMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, goalHeight, goalZ);
    crossbar.castShadow = true;
    scene.add(crossbar);

    // 3D Net Mesh
    const netGeo = new THREE.WireframeGeometry(new THREE.BoxGeometry(goalWidth, goalHeight, 1.6));
    const netMat = new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.5 });
    const netMesh = new THREE.LineSegments(netGeo, netMat);
    netMesh.position.set(0, goalHeight / 2, goalZ - 0.8);
    scene.add(netMesh);

    // 8. SOCCER BALL (3D SHADED SPHERE WITH LEATHER PANELS & SHADOW)
    const ballRadius = 0.11;
    const ballGeo = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.1,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.position.set(0, ballRadius, 0);
    ballMesh.castShadow = true;
    ballMesh.receiveShadow = true;
    scene.add(ballMesh);

    // 9. FC 26 COMPOSURE RING (3D RING ON TURF AROUND BALL)
    const compRingGeo = new THREE.RingGeometry(0.18, 0.22, 48);
    const compRingMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    const composureMesh = new THREE.Mesh(compRingGeo, compRingMat);
    composureMesh.rotation.x = -Math.PI / 2;
    composureMesh.position.set(0, 0.012, 0);
    scene.add(composureMesh);

    // 10. 3D AIMING TARGET RETICLES IN GOAL (LEFT, CENTRE, RIGHT)
    const createTargetMesh = (label: string) => {
      const group = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.24, 0.28, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
      );
      group.add(ring);
      return group;
    };
    const targetLeftMesh = createTargetMesh('L');
    targetLeftMesh.position.set(-1.8, 1.2, goalZ + 0.1);
    scene.add(targetLeftMesh);

    const targetCentreMesh = createTargetMesh('C');
    targetCentreMesh.position.set(0, 1.2, goalZ + 0.1);
    scene.add(targetCentreMesh);

    const targetRightMesh = createTargetMesh('R');
    targetRightMesh.position.set(1.8, 1.2, goalZ + 0.1);
    scene.add(targetRightMesh);

    // 11. PS3 QUALITY 3D CHARACTER: GOALKEEPER (ROYAL BLUE KIT & GLOVES)
    const keeperGroup = new THREE.Group();
    keeperGroup.position.set(0, 0, goalZ + 0.15);

    const keeperBody = new THREE.Group();
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.5 }); // Royal blue jersey
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

    // Torso
    const kTorso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.6, 0.24), blueMat);
    kTorso.position.y = 1.35;
    kTorso.castShadow = true;
    keeperBody.add(kTorso);

    // Head
    const kHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), skinMat);
    kHead.position.y = 1.76;
    kHead.castShadow = true;
    keeperBody.add(kHead);

    // Goalkeeper Arms & Oversized Gloves
    const keeperArmL = new THREE.Group();
    keeperArmL.position.set(-0.3, 1.55, 0);
    const armLMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.45, 12), blueMat);
    armLMesh.position.y = -0.22;
    keeperArmL.add(armLMesh);
    const gloveL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.08), whiteMat);
    gloveL.position.y = -0.48;
    keeperArmL.add(gloveL);
    keeperBody.add(keeperArmL);

    const keeperArmR = new THREE.Group();
    keeperArmR.position.set(0.3, 1.55, 0);
    const armRMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.45, 12), blueMat);
    armRMesh.position.y = -0.22;
    keeperArmR.add(armRMesh);
    const gloveR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.08), whiteMat);
    gloveR.position.y = -0.48;
    keeperArmR.add(gloveR);
    keeperBody.add(keeperArmR);

    // Shorts & Legs
    const kShorts = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.32, 0.25), blueMat);
    kShorts.position.y = 0.95;
    kShorts.castShadow = true;
    keeperBody.add(kShorts);

    const kLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.75, 12), whiteMat);
    kLegL.position.set(-0.13, 0.42, 0);
    kLegL.castShadow = true;
    keeperBody.add(kLegL);

    const kLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.75, 12), whiteMat);
    kLegR.position.set(0.13, 0.42, 0);
    kLegR.castShadow = true;
    keeperBody.add(kLegR);

    keeperGroup.add(keeperBody);
    scene.add(keeperGroup);

    // 12. PS3 QUALITY 3D CHARACTER: STRIKER (MBAPPÉ YELLOW/LIME TRAINING KIT)
    const strikerGroup = new THREE.Group();
    strikerGroup.position.set(-0.48, 0, 0.55);

    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 }); // Neon yellow/lime
    const bootMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });

    // Striker Torso
    const sTorso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.23), yellowMat);
    sTorso.position.y = 1.25;
    sTorso.castShadow = true;
    strikerGroup.add(sTorso);

    // Number 10 Black Patch
    const sPatch = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), darkMat);
    sPatch.position.set(0, 1.28, 0.12);
    strikerGroup.add(sPatch);

    // Head
    const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), skinMat);
    sHead.position.y = 1.64;
    sHead.castShadow = true;
    strikerGroup.add(sHead);

    // Arms
    const strikerArmL = new THREE.Group();
    strikerArmL.position.set(-0.28, 1.45, 0);
    const sArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.45, 12), skinMat);
    sArmL.position.y = -0.22;
    strikerArmL.add(sArmL);
    strikerGroup.add(strikerArmL);

    const strikerArmR = new THREE.Group();
    strikerArmR.position.set(0.28, 1.45, 0);
    const sArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.45, 12), skinMat);
    sArmR.position.y = -0.22;
    strikerArmR.add(sArmR);
    strikerGroup.add(strikerArmR);

    // Black Shorts
    const sShorts = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.24), darkMat);
    sShorts.position.y = 0.88;
    sShorts.castShadow = true;
    strikerGroup.add(sShorts);

    // Left Leg (Pivot Leg)
    const strikerLegL = new THREE.Group();
    strikerLegL.position.set(-0.13, 0.75, 0);
    const sLegLMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.72, 12), skinMat);
    sLegLMesh.position.y = -0.36;
    sLegLMesh.castShadow = true;
    strikerLegL.add(sLegLMesh);
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.18), bootMat);
    bootL.position.set(0, -0.72, -0.04);
    strikerLegL.add(bootL);
    strikerGroup.add(strikerLegL);

    // Right Leg (Kicking Leg with dynamic joint)
    const strikerLegR = new THREE.Group();
    strikerLegR.position.set(0.13, 0.75, 0);
    const sLegRMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.72, 12), skinMat);
    sLegRMesh.position.y = -0.36;
    sLegRMesh.castShadow = true;
    strikerLegR.add(sLegRMesh);
    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.18), bootMat);
    bootR.position.set(0, -0.72, -0.04);
    strikerLegR.add(bootR);
    strikerGroup.add(strikerLegR);

    scene.add(strikerGroup);

    threeRef.current = {
      scene,
      camera,
      renderer,
      strikerGroup,
      strikerLegR,
      strikerLegL,
      strikerArmR,
      strikerArmL,
      keeperGroup,
      keeperBody,
      keeperArmL,
      keeperArmR,
      ballMesh,
      composureMesh,
      targetLeftMesh,
      targetCentreMesh,
      targetRightMesh,
      netMesh,
    };

    // 13. REAL-TIME 60FPS 3D RENDER LOOP
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const anim = animProgressRef.current;

      // Pulse FC 26 Composure Ring around the ball
      const cycle = (elapsed % 1.5) / 1.5;
      const radius = 0.18 + (Math.sin(cycle * Math.PI * 2) * 0.5 + 0.5) * 0.38;
      anim.composureRadius = radius * 70; // mapped to pixel scale for logic
      composureMesh.scale.set(radius * 3.5, radius * 3.5, 1);

      if (radius < 0.24) {
        (compRingMat as THREE.MeshBasicMaterial).color.setHex(0x22c55e); // Green
      } else if (radius < 0.35) {
        (compRingMat as THREE.MeshBasicMaterial).color.setHex(0xfacc15); // Yellow
      } else {
        (compRingMat as THREE.MeshBasicMaterial).color.setHex(0xef4444); // Red
      }

      // Hide Composure Ring & Targets when kicking
      const isAiming = matchState === 'aiming';
      composureMesh.visible = isAiming;
      targetLeftMesh.visible = isAiming;
      targetCentreMesh.visible = isAiming;
      targetRightMesh.visible = isAiming;

      // Animate Target reticles
      if (isAiming) {
        targetLeftMesh.rotation.z += delta * 1.5;
        targetCentreMesh.rotation.z += delta * 1.5;
        targetRightMesh.rotation.z += delta * 1.5;
      }

      // -----------------------------------------------------------
      // REAL-TIME 3D GOALKEEPER MOTIONS & DIVES
      // -----------------------------------------------------------
      if (matchState === 'ball_flight' || matchState === 'shot_result') {
        const diveT = Math.min(1, anim.keeperT);
        let targetX = 0;
        let diveAngle = 0;
        let liftY = 0.35;

        if (anim.diveDir === 'left') {
          targetX = -1.9 * diveT;
          diveAngle = 1.1 * diveT;
        } else if (anim.diveDir === 'right') {
          targetX = 1.9 * diveT;
          diveAngle = -1.1 * diveT;
        }

        keeperGroup.position.x = targetX;
        keeperBody.rotation.z = diveAngle;
        keeperBody.position.y = liftY * Math.sin(diveT * Math.PI);
        keeperArmL.rotation.z = -1.2 * diveT;
        keeperArmR.rotation.z = 1.2 * diveT;
      } else {
        // Ready stance subtle bounce
        const kIdle = Math.sin(elapsed * 6) * 0.03;
        keeperBody.position.y = kIdle;
        keeperBody.rotation.z = 0;
        keeperGroup.position.x = 0;
        keeperArmL.rotation.z = -0.2 + Math.sin(elapsed * 4) * 0.05;
        keeperArmR.rotation.z = 0.2 - Math.sin(elapsed * 4) * 0.05;
      }

      // -----------------------------------------------------------
      // REAL-TIME 3D STRIKER SKELETAL RUN-UP & KICK
      // -----------------------------------------------------------
      if (matchState === 'runup' || matchState === 'ball_flight' || matchState === 'shot_result') {
        const runupT = Math.min(1, anim.runup);
        // Advance striker from start position to beside the ball
        strikerGroup.position.x = -0.48 + runupT * 0.28;
        strikerGroup.position.z = 0.55 - runupT * 0.52;

        if (runupT < 0.7) {
          // Running stride cycle
          const stride = Math.sin(runupT * Math.PI * 6);
          strikerLegR.rotation.x = stride * 0.8;
          strikerLegL.rotation.x = -stride * 0.8;
          strikerArmR.rotation.x = -stride * 0.6;
          strikerArmL.rotation.x = stride * 0.6;
        } else {
          // Plant left foot, whip right kicking leg back and drive forward
          const kickCycle = (runupT - 0.7) / 0.3;
          strikerLegL.rotation.x = 0.1; // planted firmly
          strikerLegR.rotation.x = -0.9 + kickCycle * 1.8; // leg strikes ball!
          strikerArmL.rotation.z = -0.4;
          strikerArmR.rotation.z = 0.4;
        }
      } else {
        // Idle breathing stance
        strikerGroup.position.set(-0.48, 0, 0.55);
        strikerLegR.rotation.x = 0;
        strikerLegL.rotation.x = 0;
        strikerArmR.rotation.x = 0;
        strikerArmL.rotation.x = 0;
        sTorso.position.y = 1.25 + Math.sin(elapsed * 3) * 0.015;
      }

      // -----------------------------------------------------------
      // REAL-TIME 3D BALL TRAJECTORY & PARABOLIC FLIGHT
      // -----------------------------------------------------------
      if (matchState === 'ball_flight' || matchState === 'shot_result') {
        const flightT = Math.min(1, anim.ballT);

        let targetX = 0;
        if (anim.shotDir === 'left') targetX = -1.8;
        if (anim.shotDir === 'right') targetX = 1.8;

        let targetY = 1.2;
        if (anim.pitchElevation === 'low') targetY = 0.2;
        if (anim.pitchElevation === 'high') targetY = 1.85;
        if (anim.pitchElevation === 'panenka') targetY = 1.6;

        // Deflect off keeper if saved
        if (!anim.scored && flightT > 0.82) {
          targetX = keeperGroup.position.x + (anim.diveDir === 'left' ? -0.3 : 0.3);
          targetY = 0.8;
        }

        ballMesh.position.x = flightT * targetX;
        ballMesh.position.z = -flightT * 7.2;

        const linearY = ballRadius + flightT * (targetY - ballRadius);
        const arcLift = Math.sin(flightT * Math.PI) * (anim.pitchElevation === 'panenka' ? 1.5 : 0.65);
        ballMesh.position.y = linearY + arcLift;

        ballMesh.rotation.x += delta * 18;
        ballMesh.rotation.y += delta * 12;

        // Net bulge vibration
        if (anim.scored && flightT > 0.75) {
          anim.netRipple = Math.sin((flightT - 0.75) * Math.PI * 4) * 0.22;
          netMesh.position.z = goalZ - 0.8 - anim.netRipple;
        }
      } else {
        ballMesh.position.set(0, ballRadius, 0);
        ballMesh.rotation.set(0, 0, 0);
        netMesh.position.set(0, goalHeight / 2, goalZ - 0.8);
      }

      // Advance physics clock
      if (matchState === 'runup') {
        anim.runup += delta * 2.4;
      } else if (matchState === 'ball_flight') {
        const speed = (anim.powerKmH / 100) * 2.2;
        anim.ballT += delta * speed;
        anim.keeperT += delta * 2.5;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.clear();
    };
  }, [matchState, attackingTeam, currentShooter.number]);

  // Handle user tap on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (matchState !== 'aiming') return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;

    if (x < w * 0.38) handleUserChoice('left');
    else if (x > w * 0.62) handleUserChoice('right');
    else handleUserChoice('centre');
  };

  return (
    <div className="mx-auto flex min-h-[92vh] max-w-lg flex-col justify-between px-2 pt-1 pb-16 select-none font-sans">
      {/* ============================================================= */}
      {/* VIEW A: LOBBY & 3V3 MATCHMAKING CUE SCREEN                    */}
      {/* ============================================================= */}
      {matchState === 'lobby' ? (
        <div className="space-y-3 pt-2">
          {/* EA FC Header */}
          <div className="rounded-2xl border border-[#35d399]/40 bg-gradient-to-r from-[#0d2218] via-[#081711] to-[#040e0a] p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#064e3b] p-1.5 border border-[#35d399]/40 shadow-sm">
                  <KatikaLogo className="h-full w-full" />
                </div>
                <div>
                  <span className="font-mono-custom text-[10px] uppercase tracking-widest text-[#35D399]">
                    PS3 REALISM ENGINE
                  </span>
                  <h1 className="text-lg font-black text-white">3v3 Penalty Shootout</h1>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-[#35D399]/40 bg-[#35D399]/15 px-2.5 py-1 text-[11px] font-mono-custom text-[#35D399]">
                <Radio size={11} className="animate-pulse" />
                <span>3D WEBGL</span>
              </div>
            </div>

            <p className="mt-2 text-xs text-[#8FA39A] leading-relaxed">
              Authentic EA FC 26 3D graphics with Three.js WebGL! Composure timing ring, 3 directions (Left, Centre, Right), taking turns shooting &amp; saving.
            </p>
          </div>

          {/* 3v3 Squad Lineup Preview */}
          <div className="rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono-custom text-xs font-bold text-white uppercase tracking-wider">
                3 vs 3 Squad Roster
              </span>
              <span className="font-mono-custom text-[10px] text-[#35D399]">6 Players Total</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-[#35D399]/30 bg-black/40 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono-custom text-[10px] font-black text-[#35D399] uppercase">
                    Katika Elite
                  </span>
                  <span className="text-[9px] text-[#8FA39A]">Your Team</span>
                </div>
                {teamA.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between text-[11px] bg-white/5 px-2 py-1 rounded">
                    <span className="font-medium text-white">#{p.number} {p.name}</span>
                    <span className="text-[9px] font-mono-custom text-[#35D399]">Slot {idx + 1}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-blue-500/30 bg-black/40 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono-custom text-[10px] font-black text-blue-400 uppercase">
                    Rivals Squad
                  </span>
                  <span className="text-[9px] text-[#8FA39A]">Opponents</span>
                </div>
                {teamB.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between text-[11px] bg-white/5 px-2 py-1 rounded">
                    <span className="font-medium text-[#cbd5e1]">#{p.number} {p.name}</span>
                    <span className="text-[9px] font-mono-custom text-blue-400">Slot {idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stake Selector */}
          <div className="rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Wager Stake ($KTK)</span>
              <span className="font-mono-custom text-xs font-bold text-[#35D399]">
                {stake} KTK (Pot: {stake * 2} KTK)
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[10, 25, 50, 75].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setStake(amt)}
                  className={`rounded-xl border py-2 text-center font-mono-custom text-xs font-bold transition-all ${
                    stake === amt
                      ? 'border-[#35D399] bg-[#35D399]/20 text-[#35D399]'
                      : 'border-[#1C3A2E] bg-black/40 text-[#8FA39A] hover:text-white'
                  }`}
                >
                  {amt} KTK
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={joinQueue}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#208b61] via-[#35D399] to-[#208b61] py-3.5 text-sm font-black text-[#062018] shadow-lg transition-transform active:scale-[0.99] hover:opacity-95"
            >
              <Users size={18} />
              <span>JOIN 3v3 MATCHMAKING CUE</span>
            </button>

            <button
              type="button"
              onClick={startCountdown}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1C3A2E] bg-black/40 py-2.5 font-mono-custom text-xs font-bold text-[#8FA39A] hover:text-white"
            >
              <span>Instant FC Practice Kickoff →</span>
            </button>
          </div>
        </div>
      ) : matchState === 'queue_matching' ? (
        /* ============================================================= */
        /* VIEW B: ACTIVE CUE MATCHMAKING ANIMATION                      */
        /* ============================================================= */
        <div className="my-auto rounded-3xl border border-[#35D399]/40 bg-[#091712] p-6 text-center shadow-2xl space-y-4">
          <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#064e3b]/40 border border-[#35D399]/40">
            <Radio size={32} className="text-[#35D399] animate-pulse" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">3v3 Matchmaking Cue</h2>
            <p className="mt-1 font-mono-custom text-xs text-[#35D399]">{queueStatusText}</p>
          </div>

          <div className="mx-auto max-w-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-mono-custom text-[#8FA39A]">
              <span>Players in Cue:</span>
              <span className="font-bold text-[#fef08a]">{queuePlayersFound} / 6</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/60 border border-[#1C3A2E]">
              <div
                className="h-full bg-gradient-to-r from-[#35D399] to-[#fef08a] transition-all duration-300"
                style={{ width: `${(queuePlayersFound / 6) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-6 gap-1 pt-2">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div
                key={num}
                className={`py-2 rounded-lg border text-center font-mono-custom text-[10px] font-bold ${
                  num <= queuePlayersFound
                    ? 'border-[#35D399] bg-[#35D399]/20 text-[#35D399]'
                    : 'border-[#1C3A2E] bg-black/40 text-[#475569]'
                }`}
              >
                P{num}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setMatchState('lobby')}
            className="text-xs text-[#8FA39A] hover:text-white underline font-mono-custom pt-2"
          >
            Cancel Cue Search
          </button>
        </div>
      ) : matchState === 'countdown' ? (
        /* ============================================================= */
        /* VIEW C: 3-2-1 KICKOFF COUNTDOWN                               */
        /* ============================================================= */
        <div className="my-auto rounded-3xl border border-[#fef08a]/40 bg-[#091712] p-8 text-center shadow-2xl space-y-3">
          <span className="font-mono-custom text-xs font-black uppercase tracking-widest text-[#35D399]">
            3D Arena Ready · 6 Players Connected
          </span>
          <div className="font-mono-custom text-7xl font-black text-[#fef08a] animate-ping">
            {countdownNum}
          </div>
          <p className="font-mono-custom text-sm font-bold text-white">GET READY TO SHOOT &amp; SAVE</p>
        </div>
      ) : (
        /* ============================================================= */
        /* VIEW D: LIVE FC 26 3D ARENA (SCOREBOARD, 3D WEBGL, CONTROLS)  */
        /* ============================================================= */
        <>
          {/* EA FC Scoreboard HUD */}
          <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-r from-[#0f172a]/90 via-[#1e293b]/90 to-[#0f172a]/90 p-3 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#eab308] p-1 font-black text-black text-xs shadow-sm">
                  10
                </div>
                <div>
                  <span className="font-mono-custom text-xs font-black tracking-wider text-white">
                    {teamA[currentKickerSlot].name}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {shotsA.map((res, i) => (
                      <span key={i}>
                        {res === true ? (
                          <CheckCircle2 size={13} className="text-[#4ade80]" />
                        ) : res === false ? (
                          <XCircle size={13} className="text-red-400" />
                        ) : (
                          <Circle size={11} className="text-[#64748b]" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-center px-4 py-1 rounded-xl bg-black/60 border border-white/10 shadow-inner">
                <div className="font-mono-custom text-xl font-black text-[#fde047] tracking-widest">
                  {scoreTeamA} - {scoreTeamB}
                </div>
                <span className="font-mono-custom text-[8px] font-bold uppercase tracking-widest text-[#38bdf8]">
                  ПОПЫТКИ: {currentRound} / 3
                </span>
              </div>

              <div className="flex items-center gap-2 text-right">
                <div>
                  <span className="font-mono-custom text-xs font-black tracking-wider text-white">
                    RIVALS
                  </span>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {shotsB.map((res, i) => (
                      <span key={i}>
                        {res === true ? (
                          <CheckCircle2 size={13} className="text-[#4ade80]" />
                        ) : res === false ? (
                          <XCircle size={13} className="text-red-400" />
                        ) : (
                          <Circle size={11} className="text-[#64748b]" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#2563eb] text-xs font-black text-white border border-blue-400/40 shadow-sm">
                  GK
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-[10px]">
              <div className="flex items-center gap-1.5 font-mono-custom text-[#94a3b8]">
                <Target size={12} className="text-[#facc15]" />
                <span>KICKER: {currentShooter.name} vs GOALIE: {currentKeeper.name}</span>
              </div>
              <button
                type="button"
                onClick={toggleSound}
                className="flex items-center gap-1 text-[#94a3b8] hover:text-white"
              >
                {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>
            </div>
          </div>

          {/* REAL-TIME 3D THREE.JS WEBGL VIEWPORT */}
          <div className="relative mt-2 overflow-hidden rounded-3xl border-2 border-slate-700 bg-slate-900 shadow-2xl h-[380px]">
            <div
              ref={containerRef}
              onClick={handleCanvasClick}
              className="h-full w-full cursor-pointer"
            />

            {/* Banner Notice */}
            {bannerNotice && (
              <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-yellow-400/60 bg-black/80 px-4 py-1 font-mono-custom text-[11px] font-black tracking-wider text-[#fde047] shadow-lg animate-fade-in backdrop-blur-sm">
                {bannerNotice}
              </div>
            )}

            {/* Prompt bar from video */}
            {matchState === 'aiming' && (
              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-xl bg-black/70 px-4 py-1.5 font-sans text-xs font-semibold text-white shadow-lg backdrop-blur-md border border-white/10">
                {isUserTurnToShoot
                  ? 'Забейте как можно больше голов (Лево, Центр или Право)'
                  : isUserTurnToSave
                  ? 'Отразите удар (Прыжок вратаря)'
                  : `Ход партнера: ${currentShooter.name}...`}
              </div>
            )}

            {/* Shot Telemetry */}
            {activeShotData && matchState === 'shot_result' && (
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-2xl border border-emerald-400/60 bg-black/90 px-4 py-2 font-mono-custom text-xs shadow-2xl backdrop-blur-md">
                <span className="font-bold text-[#fde047]">{activeShotData.powerKmH} KM/H</span>
                <span className="text-white/40">|</span>
                <span className="font-bold uppercase text-[#4ade80]">{activeShotData.pitchElevation}</span>
                <span className="text-white/40">|</span>
                <span className="font-black text-white">{activeShotData.shotDirection.toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* INTERACTIVE CONTROLLER: STRICTLY 3 DIRECTIONS (LEFT, CENTRE, RIGHT) */}
          <div className="mt-3">
            {matchState === 'aiming' ? (
              <div>
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="font-mono-custom text-xs font-black uppercase tracking-wider text-white">
                    {isUserTurnToShoot
                      ? '🎯 Направление удара (3 зоны):'
                      : isUserTurnToSave
                      ? '🧤 Прыжок вратаря:'
                      : `Удар наносит ${currentShooter.name}...`}
                  </span>
                  <span className="font-mono-custom text-[10px] text-[#4ade80]">
                    {isUserTurnToShoot ? 'Striker' : isUserTurnToSave ? 'Keeper' : 'Squad Turn'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUserChoice('left')}
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-3.5 text-center transition-all hover:border-[#4ade80] hover:bg-[#4ade80]/15 active:scale-95 shadow-lg"
                  >
                    <ChevronLeft size={26} className="text-[#4ade80] group-hover:-translate-x-1 transition-transform" />
                    <span className="mt-1 font-mono-custom text-sm font-black text-white">
                      LEFT
                    </span>
                    <span className="font-mono-custom text-[9px] text-slate-400">
                      {isUserTurnToShoot ? 'Левый угол' : 'Прыжок влево'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUserChoice('centre')}
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-3.5 text-center transition-all hover:border-[#fde047] hover:bg-[#fde047]/15 active:scale-95 shadow-lg"
                  >
                    <Zap size={26} className="text-[#fde047] group-hover:scale-110 transition-transform" />
                    <span className="mt-1 font-mono-custom text-sm font-black text-white">
                      CENTRE
                    </span>
                    <span className="font-mono-custom text-[9px] text-slate-400">
                      {isUserTurnToShoot ? 'По центру' : 'Остаться'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUserChoice('right')}
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-3.5 text-center transition-all hover:border-[#4ade80] hover:bg-[#4ade80]/15 active:scale-95 shadow-lg"
                  >
                    <ChevronRight size={26} className="text-[#4ade80] group-hover:translate-x-1 transition-transform" />
                    <span className="mt-1 font-mono-custom text-sm font-black text-white">
                      RIGHT
                    </span>
                    <span className="font-mono-custom text-[9px] text-slate-400">
                      {isUserTurnToShoot ? 'Правый угол' : 'Прыжок вправо'}
                    </span>
                  </button>
                </div>
              </div>
            ) : matchState === 'game_over' ? (
              <div className="rounded-3xl border border-yellow-500/60 bg-slate-900 p-5 text-center shadow-2xl animate-fade-in">
                <Trophy size={40} className="mx-auto text-[#fde047] animate-bounce" />
                <h3 className="mt-2 text-xl font-black text-white">Shootout Concluded!</h3>
                <p className="font-mono-custom text-base font-bold text-[#4ade80]">
                  Final Score: {scoreTeamA} - {scoreTeamB}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {scoreTeamA > scoreTeamB
                    ? 'Katika Elite wins the match!'
                    : scoreTeamB > scoreTeamA
                    ? 'Rivals edged the victory.'
                    : 'A hard-fought draw!'}
                </p>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMatchState('lobby')}
                    className="flex-1 rounded-xl bg-gradient-to-r from-[#fef08a] via-[#eab308] to-[#ca8a04] py-3 font-mono-custom text-xs font-black text-black shadow-lg hover:opacity-95"
                  >
                    NEW 3v3 MATCH
                  </button>
                  <Link
                    href="/pvp"
                    className="rounded-xl border border-slate-700 bg-black/40 px-4 py-3 font-mono-custom text-xs font-bold text-slate-400 hover:text-white"
                  >
                    PvP Floor
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 py-4 text-center font-mono-custom text-xs text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-[#fde047] animate-ping" />
                <span>3D Strike in flight · Resolving kick...</span>
              </div>
            )}
          </div>

          {/* 3 VS 3 ROSTER PREVIEW STRIP */}
          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="flex items-center justify-between text-[10px] font-mono-custom text-slate-400 uppercase tracking-wider mb-2">
              <span>3v3 Squad Lineup</span>
              <span className="text-[#4ade80]">Taking Turns: Shoot &amp; Save</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-emerald-500/30 bg-black/30 p-2 space-y-1">
                <span className="font-mono-custom text-[9px] font-bold text-[#4ade80] uppercase">
                  Katika Elite
                </span>
                {teamA.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded ${
                      currentKickerSlot === idx && attackingTeam === 'A'
                        ? 'bg-[#4ade80]/20 font-bold text-white'
                        : 'text-slate-400'
                    }`}
                  >
                    <span>#{p.number} {p.name}</span>
                    <span className="font-mono-custom text-[9px]">
                      {currentKickerSlot === idx && attackingTeam === 'A' ? 'SHOOTING ⚽' : 'Kicker'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-blue-500/30 bg-black/30 p-2 space-y-1">
                <span className="font-mono-custom text-[9px] font-bold text-blue-400 uppercase">
                  Rivals Squad
                </span>
                {teamB.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded ${
                      currentKickerSlot === idx && attackingTeam === 'B'
                        ? 'bg-blue-500/20 font-bold text-white'
                        : 'text-slate-400'
                    }`}
                  >
                    <span>#{p.number} {p.name}</span>
                    <span className="font-mono-custom text-[9px]">
                      {currentKickerSlot === idx && attackingTeam === 'B' ? 'SHOOTING ⚽' : 'Kicker'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
