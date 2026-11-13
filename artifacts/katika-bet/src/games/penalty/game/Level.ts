/**
 * Cartoon 3D Stadium, Field & Animated Goal Net
 * Refactored from jainalokk/soccer.io src/game/Level.js (MIT License)
 */
import * as THREE from 'three';
import type { AssetManager } from '../assets/AssetManager';
import type { StadiumTheme, TeamConfig } from '../types';
import type { GoalBounds } from '../utils/Physics';

export class Level {
  public readonly fieldWidth = 44;
  public readonly fieldLength = 64;
  public readonly goalWidth = 7.32;
  public readonly goalHeight = 2.44;
  public readonly goalDepth = 2.0;
  public readonly goalPostRadius = 0.08;

  public readonly goalBounds: GoalBounds;

  private root = new THREE.Group();
  private disposables: Array<{ dispose: () => void }> = [];
  private crowdMesh: THREE.InstancedMesh | null = null;
  private crowdDummy = new THREE.Object3D();
  private crowdBasePositions: Array<{ x: number; y: number; z: number; phase: number; color: THREE.Color }> = [];
  private crowdExcitement = 0;

  // Net ripple animation state
  private backNetGeo: THREE.PlaneGeometry | null = null;
  private backNetRestPos: Float32Array | null = null;
  private netRippleTime = 0;
  private netRippleStrength = 0;
  private netRippleCenter = new THREE.Vector2(0, 1.2);

  constructor(
    private scene: THREE.Scene,
    private assets: AssetManager,
    private theme: StadiumTheme,
    homeTeam: TeamConfig,
    awayTeam: TeamConfig,
  ) {
    this.goalBounds = {
      left: -this.goalWidth / 2,
      right: this.goalWidth / 2,
      bottom: 0,
      top: this.goalHeight,
      front: 0,
      back: -this.goalDepth,
    };

    this.createSkyAndFog();
    this.createLights();
    this.createField();
    this.createGoal();
    this.createCartoonStadium(homeTeam, awayTeam);

    this.scene.add(this.root);
  }

  private createSkyAndFog(): void {
    this.scene.fog = new THREE.FogExp2(this.theme.fogColor, 0.0085);

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, this.theme.skyTopColor);
    grad.addColorStop(0.65, this.theme.skyBottomColor);
    grad.addColorStop(1, this.theme.fogColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 256);

    const skyTex = new THREE.CanvasTexture(canvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const skyGeo = new THREE.SphereGeometry(220, 24, 16);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.root.add(sky);
    this.disposables.push(skyTex, skyGeo, skyMat);
  }

  private createLights(): void {
    const hemi = new THREE.HemisphereLight('#FFFBEB', '#14532D', 0.95);
    hemi.position.set(0, 40, 0);
    this.root.add(hemi);

    const sun = new THREE.DirectionalLight('#FFF7ED', 1.45);
    sun.position.set(18, 28, 22);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 85;
    sun.shadow.camera.left = -16;
    sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 16;
    sun.shadow.camera.bottom = -16;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    this.root.add(sun);

    const rim = new THREE.DirectionalLight('#BAE6FD', 0.5);
    rim.position.set(-14, 12, -20);
    this.root.add(rim);
  }

  private createField(): void {
    const gradientMap = this.assets.getToonGradientMap();
    const grassTex = this.assets.createCartoonGrassTexture(this.theme);

    const fieldGeo = new THREE.PlaneGeometry(this.fieldWidth, this.fieldLength);
    const fieldMat = new THREE.MeshToonMaterial({
      map: grassTex,
      gradientMap,
    });
    if (this.theme.turfTextureUrl) {
      void this.assets.loadTexture(this.theme.turfTextureUrl).then((customTex) => {
        customTex.wrapS = THREE.RepeatWrapping;
        customTex.wrapT = THREE.RepeatWrapping;
        customTex.repeat.set(4, 6);
        fieldMat.map = customTex;
        fieldMat.needsUpdate = true;
      }).catch(() => {});
    }
    const field = new THREE.Mesh(fieldGeo, fieldMat);
    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    this.root.add(field);
    this.disposables.push(fieldGeo, fieldMat);

    // Outer track apron around the pitch
    const apronGeo = new THREE.PlaneGeometry(this.fieldWidth + 24, this.fieldLength + 24);
    const apronMat = new THREE.MeshToonMaterial({
      color: '#0F172A',
      gradientMap,
    });
    const apron = new THREE.Mesh(apronGeo, apronMat);
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.02;
    apron.receiveShadow = true;
    this.root.add(apron);
    this.disposables.push(apronGeo, apronMat);

    this.addFieldMarkings();
  }

  private addFieldMarkings(): void {
    const lineMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    this.disposables.push(lineMat);

    const addRectLine = (w: number, d: number, x: number, z: number) => {
      const geo = new THREE.PlaneGeometry(w, d);
      const mesh = new THREE.Mesh(geo, lineMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.012, z);
      this.root.add(mesh);
      this.disposables.push(geo);
    };

    const lineW = 0.14;
    // Goal line
    addRectLine(this.fieldWidth - 2, lineW, 0, 0);

    // 6-yard box
    addRectLine(18.32, lineW, 0, 5.5);
    addRectLine(lineW, 5.5, -9.16, 2.75);
    addRectLine(lineW, 5.5, 9.16, 2.75);

    // 18-yard penalty area
    addRectLine(40.32, lineW, 0, 16.5);
    addRectLine(lineW, 16.5, -20.16, 8.25);
    addRectLine(lineW, 16.5, 20.16, 8.25);

    // Penalty spot (z = 11m preserved from soccer.io)
    const spotGeo = new THREE.CircleGeometry(0.2, 20);
    const spot = new THREE.Mesh(spotGeo, lineMat);
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(0, 0.015, 11);
    this.root.add(spot);
    this.disposables.push(spotGeo);

    // Penalty arc (centered on z = 11, radius 9.15m outside the 16.5m box)
    const arcGeo = new THREE.RingGeometry(9.08, 9.22, 48, 1, Math.PI * 0.21, Math.PI * 0.58);
    const arc = new THREE.Mesh(arcGeo, lineMat);
    arc.rotation.x = -Math.PI / 2;
    arc.rotation.z = -Math.PI / 2;
    arc.position.set(0, 0.014, 11);
    this.root.add(arc);
    this.disposables.push(arcGeo);
  }

  private createGoal(): void {
    const gradientMap = this.assets.getToonGradientMap();
    const postMat = new THREE.MeshToonMaterial({
      color: this.theme.postColor,
      gradientMap,
    });
    const outlineMat = new THREE.MeshBasicMaterial({
      color: '#0F172A',
      side: THREE.BackSide,
    });
    const netMat = new THREE.MeshBasicMaterial({
      color: this.theme.netColor,
      transparent: true,
      opacity: 0.45,
      wireframe: true,
      side: THREE.DoubleSide,
    });
    this.disposables.push(postMat, outlineMat, netMat);

    const goalGroup = new THREE.Group();

    const makeOutlinedCyl = (
      r: number,
      len: number,
      x: number,
      y: number,
      z: number,
      rotZ = 0,
      rotX = 0,
    ) => {
      const geo = new THREE.CylinderGeometry(r, r, len, 14);
      const mesh = new THREE.Mesh(geo, postMat);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rotX, 0, rotZ);
      mesh.castShadow = true;

      const outline = new THREE.Mesh(geo, outlineMat);
      outline.scale.set(1.18, 1.005, 1.18);
      mesh.add(outline);

      goalGroup.add(mesh);
      this.disposables.push(geo);
    };

    const halfW = this.goalWidth / 2;
    // Front posts + crossbar
    makeOutlinedCyl(this.goalPostRadius, this.goalHeight, -halfW, this.goalHeight / 2, 0);
    makeOutlinedCyl(this.goalPostRadius, this.goalHeight, halfW, this.goalHeight / 2, 0);
    makeOutlinedCyl(
      this.goalPostRadius,
      this.goalWidth + this.goalPostRadius * 2,
      0,
      this.goalHeight,
      0,
      Math.PI / 2,
    );

    // Back stanchion support frame
    makeOutlinedCyl(0.045, this.goalHeight, -halfW, this.goalHeight / 2, -this.goalDepth);
    makeOutlinedCyl(0.045, this.goalHeight, halfW, this.goalHeight / 2, -this.goalDepth);
    makeOutlinedCyl(0.045, this.goalDepth, -halfW, this.goalHeight, -this.goalDepth / 2, 0, Math.PI / 2);
    makeOutlinedCyl(0.045, this.goalDepth, halfW, this.goalHeight, -this.goalDepth / 2, 0, Math.PI / 2);
    makeOutlinedCyl(0.045, this.goalWidth, 0, this.goalHeight, -this.goalDepth, Math.PI / 2);

    // Subdivided back net so it ripples organically when a goal hits it
    this.backNetGeo = new THREE.PlaneGeometry(this.goalWidth, this.goalHeight, 22, 10);
    const posAttr = this.backNetGeo.attributes.position as THREE.BufferAttribute;
    this.backNetRestPos = new Float32Array(posAttr.array.length);
    this.backNetRestPos.set(posAttr.array);

    const backNet = new THREE.Mesh(this.backNetGeo, netMat);
    backNet.position.set(0, this.goalHeight / 2, -this.goalDepth);
    goalGroup.add(backNet);
    this.disposables.push(this.backNetGeo);

    // Side & top nets
    const sideGeo = new THREE.PlaneGeometry(this.goalDepth, this.goalHeight, 8, 10);
    const leftNet = new THREE.Mesh(sideGeo, netMat);
    leftNet.rotation.y = Math.PI / 2;
    leftNet.position.set(-halfW, this.goalHeight / 2, -this.goalDepth / 2);

    const rightNet = new THREE.Mesh(sideGeo, netMat);
    rightNet.rotation.y = -Math.PI / 2;
    rightNet.position.set(halfW, this.goalHeight / 2, -this.goalDepth / 2);

    const topGeo = new THREE.PlaneGeometry(this.goalWidth, this.goalDepth, 22, 8);
    const topNet = new THREE.Mesh(topGeo, netMat);
    topNet.rotation.x = Math.PI / 2;
    topNet.position.set(0, this.goalHeight, -this.goalDepth / 2);

    goalGroup.add(leftNet, rightNet, topNet);
    this.disposables.push(sideGeo, topGeo);

    this.root.add(goalGroup);
  }

  private createCartoonStadium(homeTeam: TeamConfig, awayTeam: TeamConfig): void {
    const gradientMap = this.assets.getToonGradientMap();
    const standMat = new THREE.MeshToonMaterial({ color: this.theme.standColor, gradientMap });
    const accentMat = new THREE.MeshToonMaterial({ color: this.theme.standAccentColor, gradientMap });
    const homeBannerMat = new THREE.MeshBasicMaterial({ map: this.assets.getFlagTexture(homeTeam) });
    const awayBannerMat = new THREE.MeshBasicMaterial({ map: this.assets.getFlagTexture(awayTeam) });
    this.disposables.push(standMat, accentMat, homeBannerMat, awayBannerMat);

    // Advertising boards behind the goal
    const boardGeo = new THREE.BoxGeometry(10, 1.1, 0.25);
    this.disposables.push(boardGeo);
    const leftBoard = new THREE.Mesh(boardGeo, homeBannerMat);
    leftBoard.position.set(-10.5, 0.55, -5.2);
    const midBoard = new THREE.Mesh(boardGeo, accentMat);
    midBoard.position.set(0, 0.55, -5.2);
    const rightBoard = new THREE.Mesh(boardGeo, awayBannerMat);
    rightBoard.position.set(10.5, 0.55, -5.2);
    this.root.add(leftBoard, midBoard, rightBoard);

    // 3 stepped grandstands (Behind Goal + Left + Right)
    const addStand = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      this.root.add(mesh);
      this.disposables.push(geo);
    };

    // Behind goal grandstands
    for (let tier = 0; tier < 3; tier++) {
      addStand(46, 1.8, 3.2, 0, 0.9 + tier * 1.8, -11 - tier * 3.1, standMat);
    }
    addStand(48, 0.8, 1.0, 0, 6.2, -19.5, accentMat);

    // Left & right side grandstands
    for (let tier = 0; tier < 2; tier++) {
      addStand(3.2, 1.8, 50, -25 - tier * 3.1, 0.9 + tier * 1.8, 6, standMat);
      addStand(3.2, 1.8, 50, 25 + tier * 3.1, 0.9 + tier * 1.8, 6, standMat);
    }

    // Floodlight towers
    const poleGeo = new THREE.CylinderGeometry(0.3, 0.45, 22, 8);
    const headGeo = new THREE.BoxGeometry(4.2, 1.8, 0.7);
    const glowMat = new THREE.MeshBasicMaterial({ color: '#FEF9C3' });
    this.disposables.push(poleGeo, headGeo, glowMat);

    const towerCoords: Array<[number, number, number]> = [
      [-26, -18, Math.PI * 0.25],
      [26, -18, -Math.PI * 0.25],
      [-26, 28, Math.PI * 0.7],
      [26, 28, -Math.PI * 0.7],
    ];
    for (const [tx, tz, ry] of towerCoords) {
      const pole = new THREE.Mesh(poleGeo, standMat);
      pole.position.set(tx, 11, tz);
      const head = new THREE.Mesh(headGeo, glowMat);
      head.position.set(tx, 22, tz);
      head.rotation.y = ry;
      this.root.add(pole, head);
    }

    // Instanced cartoon cheering crowd dots on the stands (single draw call!)
    const crowdGeo = new THREE.BoxGeometry(0.55, 0.85, 0.45);
    const crowdMat = new THREE.MeshToonMaterial({ color: '#FFFFFF', gradientMap });
    this.disposables.push(crowdGeo, crowdMat);

    const palette = [
      new THREE.Color(homeTeam.primaryColor),
      new THREE.Color(homeTeam.secondaryColor),
      new THREE.Color(awayTeam.primaryColor),
      new THREE.Color('#FACC15'),
      new THREE.Color('#38BDF8'),
      new THREE.Color('#EC4899'),
    ];

    // Behind-goal rows
    for (let tier = 0; tier < 3; tier++) {
      const y = 2.25 + tier * 1.8;
      const z = -11 - tier * 3.1;
      for (let x = -20; x <= 20; x += 1.25) {
        if (Math.random() < 0.14) continue;
        this.crowdBasePositions.push({
          x: x + (Math.random() - 0.5) * 0.3,
          y,
          z,
          phase: Math.random() * Math.PI * 2,
          color: palette[Math.floor(Math.random() * palette.length)],
        });
      }
    }

    // Side stand rows
    for (const side of [-1, 1]) {
      for (let tier = 0; tier < 2; tier++) {
        const x = side * (25 + tier * 3.1);
        const y = 2.25 + tier * 1.8;
        for (let z = -10; z <= 22; z += 1.5) {
          if (Math.random() < 0.2) continue;
          this.crowdBasePositions.push({
            x,
            y,
            z,
            phase: Math.random() * Math.PI * 2,
            color: palette[Math.floor(Math.random() * palette.length)],
          });
        }
      }
    }

    this.crowdMesh = new THREE.InstancedMesh(crowdGeo, crowdMat, this.crowdBasePositions.length);
    this.crowdMesh.frustumCulled = false;
    this.crowdBasePositions.forEach((p, idx) => {
      this.crowdDummy.position.set(p.x, p.y, p.z);
      this.crowdDummy.updateMatrix();
      this.crowdMesh!.setMatrixAt(idx, this.crowdDummy.matrix);
      this.crowdMesh!.setColorAt(idx, p.color);
    });
    this.crowdMesh.instanceMatrix.needsUpdate = true;
    if (this.crowdMesh.instanceColor) this.crowdMesh.instanceColor.needsUpdate = true;
    this.root.add(this.crowdMesh);
  }

  triggerNetRipple(x: number, y: number, strength = 0.65): void {
    this.netRippleCenter.set(
      THREE.MathUtils.clamp(x, -this.goalWidth / 2, this.goalWidth / 2),
      THREE.MathUtils.clamp(y - this.goalHeight / 2, -this.goalHeight / 2, this.goalHeight / 2),
    );
    this.netRippleStrength = strength;
    this.netRippleTime = 0;
  }

  triggerCrowdCheer(excitement = 1.0): void {
    this.crowdExcitement = Math.max(this.crowdExcitement, excitement);
  }

  update(deltaTime: number, elapsedTime: number): void {
    // Update net ripple spring
    if (this.backNetGeo && this.backNetRestPos && this.netRippleStrength > 0.005) {
      this.netRippleTime += deltaTime;
      this.netRippleStrength *= Math.pow(0.08, deltaTime);
      const posAttr = this.backNetGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        const vx = this.backNetRestPos[i];
        const vy = this.backNetRestPos[i + 1];
        const dist = Math.hypot(vx - this.netRippleCenter.x, vy - this.netRippleCenter.y);
        const falloff = Math.exp(-dist * 0.55);
        const wave = Math.cos(this.netRippleTime * 18 - dist * 2.5) * this.netRippleStrength * falloff;
        arr[i + 2] = this.backNetRestPos[i + 2] - Math.abs(wave) * 0.7 - wave * 0.25;
      }
      posAttr.needsUpdate = true;
    }

    // Update cartoon cheering crowd (zero GC per frame)
    if (this.crowdMesh && this.crowdBasePositions.length > 0) {
      this.crowdExcitement = Math.max(0, this.crowdExcitement - deltaTime * 0.45);
      const bounceAmp = 0.04 + this.crowdExcitement * 0.34;
      const speed = 2.6 + this.crowdExcitement * 7.5;
      for (let i = 0; i < this.crowdBasePositions.length; i++) {
        const p = this.crowdBasePositions[i];
        const hop = Math.abs(Math.sin(elapsedTime * speed + p.phase)) * bounceAmp;
        this.crowdDummy.position.set(p.x, p.y + hop, p.z);
        this.crowdDummy.updateMatrix();
        this.crowdMesh.setMatrixAt(i, this.crowdDummy.matrix);
      }
      this.crowdMesh.instanceMatrix.needsUpdate = true;
    }
  }

  getGoalBounds(): GoalBounds {
    return this.goalBounds;
  }

  dispose(): void {
    this.scene.remove(this.root);
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    if (this.crowdMesh) {
      this.crowdMesh.dispose();
      this.crowdMesh = null;
    }
  }
}
