/**
 * Cartoon 3D Football Entity
 * Preserved from jainalokk/soccer.io src/game/Ball.js (MIT License)
 */
import * as THREE from 'three';
import type { AssetManager } from '../assets/AssetManager';
import type { BallTheme } from '../types';
import {
  calculateBallTrajectory,
  clampBallInsideNet,
  updateBallPhysics,
  type GoalBounds,
  type Vec2,
  type Vec3,
} from '../utils/Physics';

export class Ball {
  public readonly radius = 0.22;
  public readonly initialPosition: Vec3 = { x: 0, y: 0.22, z: 11 };

  public isMoving = false;
  public velocity: Vec3 = { x: 0, y: 0, z: 0 };
  public mesh: THREE.Group;
  public previousPosition: Vec3 = { ...this.initialPosition };

  private shadowBlob: THREE.Mesh;
  private disposables: Array<{ dispose: () => void }> = [];

  constructor(
    private scene: THREE.Scene,
    assets: AssetManager,
    ballTheme: BallTheme,
  ) {
    this.mesh = new THREE.Group();

    const sphereGeo = new THREE.SphereGeometry(this.radius, 28, 24);
    const ballTex = assets.createCartoonBallTexture(ballTheme);
    const ballMat = new THREE.MeshToonMaterial({
      map: ballTex,
      gradientMap: assets.getToonGradientMap(),
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, ballMat);
    sphereMesh.castShadow = true;
    sphereMesh.receiveShadow = true;

    // Crisp cartoon ink outline
    const outlineMat = new THREE.MeshBasicMaterial({
      color: '#0F172A',
      side: THREE.BackSide,
    });
    const outlineMesh = new THREE.Mesh(sphereGeo, outlineMat);
    outlineMesh.scale.setScalar(1.075);

    this.mesh.add(sphereMesh, outlineMesh);
    this.disposables.push(sphereGeo, ballMat, outlineMat);

    // Contact shadow disc under ball
    const shadowGeo = new THREE.CircleGeometry(this.radius * 1.25, 20);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: '#052E16',
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    this.shadowBlob = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowBlob.rotation.x = -Math.PI / 2;
    this.shadowBlob.position.y = 0.018;
    this.disposables.push(shadowGeo, shadowMat);

    this.reset();
    this.scene.add(this.mesh);
    this.scene.add(this.shadowBlob);
  }

  kick(direction: Vec2, power: number, difficulty: number): void {
    this.isMoving = true;
    this.previousPosition = {
      x: this.mesh.position.x,
      y: this.mesh.position.y,
      z: this.mesh.position.z,
    };
    this.velocity = calculateBallTrajectory(direction, power, difficulty);
  }

  update(deltaTime: number, goalBounds?: GoalBounds, alreadyScored = false): boolean {
    let hitNet = false;
    if (this.isMoving) {
      this.previousPosition = {
        x: this.mesh.position.x,
        y: this.mesh.position.y,
        z: this.mesh.position.z,
      };
      this.velocity = updateBallPhysics(this.mesh, this.velocity, deltaTime, this.radius);

      if (alreadyScored && goalBounds) {
        hitNet = clampBallInsideNet(this.mesh, this.velocity, goalBounds, this.radius);
      }

      const speed = Math.hypot(this.velocity.x, this.velocity.y, this.velocity.z);
      if (speed < 0.25 && this.mesh.position.y <= this.radius + 0.04) {
        this.velocity = { x: 0, y: 0, z: 0 };
        this.isMoving = false;
      }
    }

    // Update contact shadow position and scale with ball height
    this.shadowBlob.position.set(this.mesh.position.x, 0.018, this.mesh.position.z);
    const heightScale = THREE.MathUtils.clamp(1 - (this.mesh.position.y - this.radius) * 0.14, 0.4, 1);
    this.shadowBlob.scale.setScalar(heightScale);
    (this.shadowBlob.material as THREE.MeshBasicMaterial).opacity = 0.38 * heightScale;

    return hitNet;
  }

  getSpeedKmh(): number {
    const mps = Math.hypot(this.velocity.x, this.velocity.y, this.velocity.z);
    return Math.round(mps * 3.6);
  }

  reset(): void {
    this.mesh.position.set(
      this.initialPosition.x,
      this.initialPosition.y,
      this.initialPosition.z,
    );
    this.mesh.rotation.set(0, 0, 0);
    this.previousPosition = { ...this.initialPosition };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.isMoving = false;
    this.shadowBlob.position.set(this.initialPosition.x, 0.018, this.initialPosition.z);
    this.shadowBlob.scale.setScalar(1);
  }

  getPosition(): THREE.Vector3 {
    return this.mesh.position;
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.scene.remove(this.shadowBlob);
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
