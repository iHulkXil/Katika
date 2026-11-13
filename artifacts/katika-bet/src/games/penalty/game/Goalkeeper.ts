/**
 * Animated Goalkeeper Entity (powered by /models/footballer-animated.glb via AssetManager)
 * Preserves jainalokk/soccer.io src/game/Goalkeeper.js AI prediction, tracking, and manual dive mechanics.
 */
import * as THREE from 'three';
import type { AssetManager, CharacterRigInstance } from '../assets/AssetManager';
import type { CharacterProfile, TeamConfig } from '../types';
import { getGoalkeeperDiveDirection, type Vec2, type Vec3 } from '../utils/Physics';

export class Goalkeeper {
  public readonly initialPosition = { x: 0, y: 0, z: -0.45 };
  public group = new THREE.Group();

  public difficulty: number;
  public isPlayerControlled = false;
  public isDiving = false;

  private rig: CharacterRigInstance | null = null;
  private rigLoadToken = 0;
  private diveProgress = 0;
  private diveDuration = 0.56;
  private diveDirection: Vec2 = { x: 0, y: 0 };
  private targetPosition = { ...this.initialPosition };
  private anticipationPhase = 0;

  constructor(
    private scene: THREE.Scene,
    private assets: AssetManager,
    private profile: CharacterProfile,
    private team: TeamConfig,
    difficulty: number,
  ) {
    this.difficulty = difficulty;
    this.group.position.set(
      this.initialPosition.x,
      this.initialPosition.y,
      this.initialPosition.z,
    );
    this.scene.add(this.group);
    void this.loadRig(profile, team);
  }

  async loadRig(profile: CharacterProfile, team: TeamConfig): Promise<void> {
    const token = ++this.rigLoadToken;
    this.profile = profile;
    this.team = team;
    if (this.rig) {
      this.group.remove(this.rig.root);
      this.rig.dispose();
      this.rig = null;
    }
    const nextRig = await this.assets.createCharacterRig({
      profile,
      team,
      role: 'goalkeeper',
      facingZ: 1,
    });
    if (token !== this.rigLoadToken) {
      nextRig.dispose();
      return;
    }
    this.rig = nextRig;
    this.group.add(nextRig.root);
    nextRig.play('idle', { loop: true, fade: 0.05 });
  }

  setDifficulty(difficulty: number): void {
    this.difficulty = difficulty;
    // Higher difficulty = slightly faster dive reaction
    this.diveDuration = THREE.MathUtils.lerp(0.64, 0.44, difficulty / 100);
  }

  setPlayerControlled(isPlayerControlled: boolean): void {
    this.isPlayerControlled = isPlayerControlled;
  }

  dive(directionOrVelocity: Vec2 | Vec3, useAiPrediction = false): void {
    if (this.isDiving) return;
    this.isDiving = true;
    this.diveProgress = 0;

    if (useAiPrediction && 'z' in directionOrVelocity) {
      this.diveDirection = getGoalkeeperDiveDirection(directionOrVelocity, this.difficulty);
    } else {
      this.diveDirection = {
        x: directionOrVelocity.x,
        y: directionOrVelocity.y,
      };
    }

    const len = Math.hypot(this.diveDirection.x, this.diveDirection.y);
    if (len > 1) {
      this.diveDirection.x /= len;
      this.diveDirection.y /= len;
    }

    const baseReach = 2.15;
    const difficultyBonus = this.isPlayerControlled ? 0.9 : (this.difficulty / 100) * 1.15;
    const reach = baseReach + difficultyBonus;

    this.targetPosition = {
      x: THREE.MathUtils.clamp(this.diveDirection.x * reach, -3.25, 3.25),
      y: Math.max(0, this.diveDirection.y * 0.72),
      z: this.initialPosition.z + (this.diveDirection.y < 0 ? 0.35 : 0),
    };

    if (Math.abs(this.diveDirection.x) < 0.2) {
      this.rig?.play('diveCenter', { loop: false, timeScale: 1.35, fade: 0.06 });
    } else if (this.diveDirection.x < 0) {
      this.rig?.play('diveLeft', { loop: false, timeScale: 1.35, fade: 0.06 });
    } else {
      this.rig?.play('diveRight', { loop: false, timeScale: 1.35, fade: 0.06 });
    }
  }

  playOutcomeReaction(saved: boolean): void {
    if (saved) {
      this.rig?.play('catch', { loop: false, fade: 0.1 });
    } else {
      this.rig?.play('miss', { loop: false, fade: 0.1 });
    }
  }

  trackBall(ballPosition: THREE.Vector3, deltaTime: number): void {
    if (!this.isDiving && !this.isPlayerControlled) {
      const rate = Math.min(2.8, 0.6 + (this.difficulty / 100) * 2.2);
      const targetX = THREE.MathUtils.clamp(ballPosition.x * 0.22, -2.0, 2.0);
      this.group.position.x += (targetX - this.group.position.x) * Math.min(1, deltaTime * rate);
    }
  }

  update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.05);
    this.rig?.update(dt);

    if (this.isDiving) {
      this.diveProgress = Math.min(1, this.diveProgress + dt / this.diveDuration);
      const easeOutQuad = 1 - Math.pow(1 - this.diveProgress, 2);

      this.group.position.x = THREE.MathUtils.lerp(
        this.initialPosition.x,
        this.targetPosition.x,
        easeOutQuad,
      );
      this.group.position.y = THREE.MathUtils.lerp(
        this.initialPosition.y,
        this.targetPosition.y,
        easeOutQuad,
      );
      this.group.position.z = THREE.MathUtils.lerp(
        this.initialPosition.z,
        this.targetPosition.z,
        easeOutQuad,
      );

      // Smooth cartoon lateral dive bank left/right while GK_Dive clip plays
      const maxTilt = this.diveDirection.x < 0 ? 0.82 : this.diveDirection.x > 0 ? -0.82 : 0;
      this.group.rotation.z = maxTilt * easeOutQuad;
    } else {
      // Keeper pre-kick anticipation shuffle
      this.anticipationPhase += dt * (2.2 + (this.difficulty / 100) * 1.4);
      const shuffleX = Math.sin(this.anticipationPhase) * 0.28;
      if (!this.isPlayerControlled) {
        this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, shuffleX, dt * 4);
      }
      this.group.rotation.z = -Math.sin(this.anticipationPhase) * 0.06;
    }
  }

  reset(): void {
    this.isDiving = false;
    this.diveProgress = 0;
    this.diveDirection = { x: 0, y: 0 };
    this.targetPosition = { ...this.initialPosition };
    this.group.position.set(
      this.initialPosition.x,
      this.initialPosition.y,
      this.initialPosition.z,
    );
    this.group.rotation.set(0, 0, 0);
    this.rig?.play('idle', { loop: true, fade: 0.1 });
  }

  getPosition(): THREE.Vector3 {
    return this.group.position;
  }

  isCurrentlyDiving(): boolean {
    return this.isDiving;
  }

  dispose(): void {
    this.rig?.dispose();
    this.scene.remove(this.group);
  }
}
