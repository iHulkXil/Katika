/**
 * Animated Striker Entity (powered by /models/footballer-animated.glb via AssetManager)
 * Preserves jainalokk/soccer.io src/game/Player.js run-up, directional aim arrow, and shoot flow.
 */
import * as THREE from 'three';
import type { AssetManager, CharacterRigInstance } from '../assets/AssetManager';
import type { CharacterProfile, TeamConfig } from '../types';
import type { Controls } from '../utils/Controls';
import type { Vec2 } from '../utils/Physics';

export class Player {
  public readonly initialPosition = { x: -0.65, y: 0, z: 14.6 };
  public group = new THREE.Group();
  public isRunningUp = false;

  private rig: CharacterRigInstance | null = null;
  private runUpProgress = 0;
  private readonly runUpDuration = 0.62; // Seconds to sprint to ball
  private runUpCallback: (() => void) | null = null;
  private kickFired = false;

  // Preserved directional indicator arrow + cartoon goal reticle
  private arrowGroup: THREE.Group;
  private arrowBodyMat: THREE.MeshBasicMaterial;
  private arrowHeadMat: THREE.MeshBasicMaterial;
  private goalReticle: THREE.Mesh;
  private goalReticleMat: THREE.MeshBasicMaterial;
  private tempColor = new THREE.Color();
  private reticleTarget = new THREE.Vector3();
  private rigLoadToken = 0;
  private disposables: Array<{ dispose: () => void }> = [];

  private showAimHelpers = true;

  constructor(
    private scene: THREE.Scene,
    private assets: AssetManager,
    private controls: Controls,
    private profile: CharacterProfile,
    private team: TeamConfig,
  ) {
    this.group.position.set(
      this.initialPosition.x,
      this.initialPosition.y,
      this.initialPosition.z,
    );
    this.scene.add(this.group);

    // Build directional aim arrow (preserved & enhanced from soccer.io)
    this.arrowGroup = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.11, 0.08, 1.55);
    const headGeo = new THREE.ConeGeometry(0.28, 0.52, 10);
    this.arrowBodyMat = new THREE.MeshBasicMaterial({ color: '#FACC15' });
    this.arrowHeadMat = new THREE.MeshBasicMaterial({ color: '#FACC15' });

    const body = new THREE.Mesh(bodyGeo, this.arrowBodyMat);
    body.position.z = -0.85;
    const head = new THREE.Mesh(headGeo, this.arrowHeadMat);
    head.rotation.x = -Math.PI / 2;
    head.position.z = -1.85;

    this.arrowGroup.add(body, head);
    this.arrowGroup.position.set(0, 0.24, 11);
    this.scene.add(this.arrowGroup);

    // Target reticle in front of goal so aiming on mobile/desktop is unmistakable
    const reticleGeo = new THREE.RingGeometry(0.26, 0.38, 24);
    this.goalReticleMat = new THREE.MeshBasicMaterial({
      color: '#FACC15',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    this.goalReticle = new THREE.Mesh(reticleGeo, this.goalReticleMat);
    this.goalReticle.position.set(0, 1.1, 0.15);
    this.scene.add(this.goalReticle);

    this.disposables.push(bodyGeo, headGeo, this.arrowBodyMat, this.arrowHeadMat, reticleGeo, this.goalReticleMat);
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
      role: 'striker',
      facingZ: -1,
    });
    if (token !== this.rigLoadToken) {
      nextRig.dispose();
      return;
    }
    this.rig = nextRig;
    this.group.add(nextRig.root);
    nextRig.play('idle', { loop: true, fade: 0.05 });
  }

  setAimHelpersVisible(visible: boolean): void {
    this.showAimHelpers = visible;
    if (!visible) {
      this.arrowGroup.visible = false;
      this.goalReticle.visible = false;
    }
  }

  startRunUp(onImpact: () => void): void {
    if (this.isRunningUp) return;
    this.isRunningUp = true;
    this.runUpProgress = 0;
    this.kickFired = false;
    this.runUpCallback = onImpact;
    this.arrowGroup.visible = false;
    this.goalReticle.visible = false;
    this.rig?.play('run', { loop: true, timeScale: 1.25, fade: 0.08 });
  }

  playOutcomeReaction(isGoal: boolean): void {
    if (isGoal) {
      this.rig?.play('celebrate', { loop: false, fade: 0.12 });
    } else {
      this.rig?.play('miss', { loop: false, fade: 0.12 });
    }
  }

  update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.05);
    this.rig?.update(dt);

    // Update aim arrow & goal reticle while aiming
    if (!this.isRunningUp && this.showAimHelpers && this.controls.role === 'shoot') {
      const dir: Vec2 = this.controls.direction;
      this.arrowGroup.visible = true;
      this.goalReticle.visible = true;

      // Rotate arrow in XZ & pitch slightly with Y
      const yaw = -Math.atan2(dir.x, 1);
      const pitch = THREE.MathUtils.clamp(dir.y * 0.45, -0.15, 0.55);
      this.arrowGroup.rotation.set(pitch, yaw, 0);

      // Move reticle smoothly along goal plane
      const targetX = THREE.MathUtils.clamp(dir.x * 3.55, -3.55, 3.55);
      const targetY = THREE.MathUtils.clamp(0.45 + (dir.y + 0.2) * 1.65, 0.25, 2.32);
      this.reticleTarget.set(targetX, targetY, 0.15);
      this.goalReticle.position.lerp(this.reticleTarget, Math.min(1, dt * 16));

      if (this.controls.isPowerActive) {
        const scale = 0.75 + this.controls.power * 1.45;
        this.arrowGroup.scale.set(scale, scale, scale);
        // Hue shifts smoothly: 0.33 (green) -> 0.16 (gold) -> 0.0 (red hot)
        const hue = THREE.MathUtils.lerp(0.32, 0.02, this.controls.power);
        this.tempColor.setHSL(hue, 0.95, 0.54);
        this.arrowBodyMat.color.copy(this.tempColor);
        this.arrowHeadMat.color.copy(this.tempColor);
        this.goalReticleMat.color.copy(this.tempColor);
        this.goalReticle.scale.setScalar(0.85 + this.controls.power * 0.45);
      } else {
        this.arrowGroup.scale.set(1, 1, 1);
        this.tempColor.set('#FACC15');
        this.arrowBodyMat.color.copy(this.tempColor);
        this.arrowHeadMat.color.copy(this.tempColor);
        this.goalReticleMat.color.copy(this.tempColor);
        this.goalReticle.scale.setScalar(1);
      }
    } else if (this.isRunningUp) {
      this.runUpProgress += dt / this.runUpDuration;

      // Crossfade from Run into Kick slightly before reaching the ball so foot strike aligns with ball launch
      if (this.runUpProgress >= 0.72 && !this.kickFired) {
        this.kickFired = true;
        this.rig?.play('kick', { loop: false, timeScale: 1.35, fade: 0.06 });
      }

      const t = Math.min(1, this.runUpProgress);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      this.group.position.x = THREE.MathUtils.lerp(this.initialPosition.x, -0.18, ease);
      this.group.position.z = THREE.MathUtils.lerp(this.initialPosition.z, 11.55, ease);

      if (this.runUpProgress >= 1) {
        this.isRunningUp = false;
        const cb = this.runUpCallback;
        this.runUpCallback = null;
        cb?.();
      }
    }
  }

  reset(): void {
    this.isRunningUp = false;
    this.runUpProgress = 0;
    this.kickFired = false;
    this.runUpCallback = null;
    this.group.position.set(
      this.initialPosition.x,
      this.initialPosition.y,
      this.initialPosition.z,
    );
    this.group.rotation.set(0, 0, 0);
    this.rig?.play('idle', { loop: true, fade: 0.1 });
  }

  dispose(): void {
    this.rig?.dispose();
    this.scene.remove(this.group);
    this.scene.remove(this.arrowGroup);
    this.scene.remove(this.goalReticle);
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
