/**
 * Modular AssetManager for Cartoon 3D Penalty Shootout
 * Refactored from jainalokk/soccer.io AssetLoader.js (MIT License)
 * Supports GLTF rigged models (/models/footballer-animated.glb), animated sprite sheets,
 * procedural cartoon rigs, custom stadium/ball themes, and custom SFX + Web Audio synth fallback.
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { DEFAULT_ASSET_MANIFEST } from './AssetManifest';
import type {
  AssetManifest,
  BallTheme,
  CharacterAnimState,
  CharacterProfile,
  SoundEffectKey,
  StadiumTheme,
  TeamConfig,
} from '../types';

export interface CharacterRigInstance {
  root: THREE.Group;
  play: (state: CharacterAnimState, options?: { loop?: boolean; timeScale?: number; fade?: number }) => void;
  getDuration: (state: CharacterAnimState) => number;
  update: (deltaTime: number) => void;
  setKitColors: (primary: string, secondary: string, socks: string, gloveColor?: string) => void;
  dispose: () => void;
}

export class AssetManager {
  private manifest: AssetManifest;
  private gltfLoader = new GLTFLoader();
  private textureLoader = new THREE.TextureLoader();

  private gltfCache = new Map<string, Promise<GLTF>>();
  private textureCache = new Map<string, THREE.Texture>();
  private flagTextureCache = new Map<string, THREE.Texture>();
  private audioContext: AudioContext | null = null;
  private audioBufferCache = new Map<string, AudioBuffer>();
  private sharedToonGradient: THREE.DataTexture | null = null;

  public soundEnabled = true;

  constructor(manifest: AssetManifest = DEFAULT_ASSET_MANIFEST) {
    this.manifest = manifest;
  }

  getManifest(): AssetManifest {
    return this.manifest;
  }

  updateManifest(partial: Partial<AssetManifest>): void {
    const nextAudio = { ...this.manifest.audioUrls, ...(partial.audioUrls ?? {}) };
    this.manifest = {
      ...this.manifest,
      ...partial,
      teams: partial.teams ?? this.manifest.teams,
      characters: partial.characters ?? this.manifest.characters,
      stadiums: partial.stadiums ?? this.manifest.stadiums,
      balls: partial.balls ?? this.manifest.balls,
      audioUrls: nextAudio,
    };
    if (partial.audioUrls) {
      for (const [key, url] of Object.entries(partial.audioUrls)) {
        const sfxKey = key as SoundEffectKey;
        this.audioBufferCache.delete(sfxKey);
        if (url && url.trim().length > 0) {
          void this.loadAudio(sfxKey, url.trim());
        }
      }
    }
  }

  upsertCharacter(profile: CharacterProfile): void {
    const idx = this.manifest.characters.findIndex((c) => c.id === profile.id);
    if (idx >= 0) {
      this.manifest.characters[idx] = profile;
    } else {
      this.manifest.characters = [...this.manifest.characters, profile];
    }
    if (profile.source.type === 'gltf') {
      void this.loadGLTF(profile.source.url).catch(() => {});
    } else if (profile.source.type === 'spritesheet') {
      void this.loadTexture(profile.source.url).catch(() => {});
    }
  }

  getTeam(code: string): TeamConfig {
    return (
      this.manifest.teams.find((t) => t.code === code) ?? this.manifest.teams[0]
    );
  }

  getCharacter(id: string): CharacterProfile {
    return (
      this.manifest.characters.find((c) => c.id === id) ??
      this.manifest.characters[0]
    );
  }

  getStadium(id: string): StadiumTheme {
    return (
      this.manifest.stadiums.find((s) => s.id === id) ??
      this.manifest.stadiums[0]
    );
  }

  getBallTheme(id: string): BallTheme {
    return (
      this.manifest.balls.find((b) => b.id === id) ?? this.manifest.balls[0]
    );
  }

  getToonGradientMap(): THREE.DataTexture {
    if (this.sharedToonGradient) return this.sharedToonGradient;
    // 4-step cartoon cel shading ramp
    const colors = new Uint8Array([78, 145, 212, 255]);
    const tex = new THREE.DataTexture(colors, 4, 1, THREE.RedFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    this.sharedToonGradient = tex;
    return tex;
  }

  async preloadCoreAssets(): Promise<void> {
    const gltfUrls = new Set<string>();
    for (const ch of this.manifest.characters) {
      if (ch.source.type === 'gltf') gltfUrls.add(ch.source.url);
    }
    await Promise.allSettled([
      ...Array.from(gltfUrls).map((url) => this.loadGLTF(url)),
      ...Object.entries(this.manifest.audioUrls).map(([key, url]) =>
        url ? this.loadAudio(key as SoundEffectKey, url) : Promise.resolve(),
      ),
    ]);
  }

  loadGLTF(url: string): Promise<GLTF> {
    const cached = this.gltfCache.get(url);
    if (cached) return cached;
    const promise = new Promise<GLTF>((resolve, reject) => {
      this.gltfLoader.load(url, resolve, undefined, reject);
    });
    this.gltfCache.set(url, promise);
    return promise;
  }

  async loadTexture(url: string): Promise<THREE.Texture> {
    const cached = this.textureCache.get(url);
    if (cached) return cached;
    const tex = await new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(url, resolve, undefined, reject);
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textureCache.set(url, tex);
    return tex;
  }

  createCartoonGrassTexture(theme: StadiumTheme): THREE.CanvasTexture {
    const cacheKey = `grass:${theme.id}`;
    const existing = this.textureCache.get(cacheKey);
    if (existing instanceof THREE.CanvasTexture) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Mowed cartoon alternating bands
    const stripeHeight = 64;
    for (let y = 0; y < canvas.height; y += stripeHeight) {
      const even = (y / stripeHeight) % 2 === 0;
      ctx.fillStyle = even ? theme.turfLightColor : theme.turfDarkColor;
      ctx.fillRect(0, y, canvas.width, stripeHeight);
    }

    // Subtle cartoon grass tuft blades
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 450; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.fillRect(x, y, 2, 6);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let i = 0; i < 350; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.fillRect(x, y, 3, 5);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 6);
    this.textureCache.set(cacheKey, texture);
    return texture;
  }

  createCartoonBallTexture(theme: BallTheme): THREE.CanvasTexture {
    const cacheKey = `ball:${theme.id}`;
    const existing = this.textureCache.get(cacheKey);
    if (existing instanceof THREE.CanvasTexture) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = theme.primaryColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Classic stylized football pentagons with crisp cartoon outlines
    ctx.strokeStyle = theme.patternColor;
    ctx.lineWidth = 6;
    ctx.fillStyle = theme.patternColor;

    const drawPentagon = (cx: number, cy: number, r: number, rot = 0) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = rot + (i * Math.PI * 2) / 5 - Math.PI / 2;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    };

    const cols = 4;
    const rows = 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const offsetX = r % 2 === 1 ? canvas.width / (cols * 2) : 0;
        const cx = ((c + 0.5) * canvas.width) / cols + offsetX;
        const cy = ((r + 0.5) * canvas.height) / rows;
        drawPentagon(cx % canvas.width, cy, 40, (c + r) * 0.3);
        if (offsetX > 0 && cx > canvas.width) {
          drawPentagon(cx - canvas.width, cy, 40, (c + r) * 0.3);
        }
      }
    }

    // Seam lines
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.lineWidth = 4;
    for (let y = 85; y < 512; y += 170) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textureCache.set(cacheKey, texture);
    return texture;
  }

  getFlagTexture(team: TeamConfig): THREE.Texture {
    const existing = this.flagTextureCache.get(team.code);
    if (existing) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    const [c1, c2, c3] = team.flagColors;

    ctx.fillStyle = c1;
    ctx.fillRect(0, 0, canvas.width / 3 + 2, canvas.height);
    ctx.fillStyle = c2;
    ctx.fillRect(canvas.width / 3, 0, canvas.width / 3 + 2, canvas.height);
    ctx.fillStyle = c3;
    ctx.fillRect((canvas.width * 2) / 3, 0, canvas.width / 3 + 2, canvas.height);

    // Subtle cartoon badge emblem on flag
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.flagTextureCache.set(team.code, texture);
    return texture;
  }

  async createCharacterRig(options: {
    profile: CharacterProfile;
    team: TeamConfig;
    role: 'striker' | 'goalkeeper';
    facingZ: 1 | -1; // -1 faces goal (-Z), 1 faces striker (+Z)
  }): Promise<CharacterRigInstance> {
    const { profile, team, role, facingZ } = options;

    if (profile.source.type === 'gltf') {
      try {
        const gltf = await this.loadGLTF(profile.source.url);
        return this.buildGLTFCharacterRig(gltf, profile, team, role, facingZ);
      } catch (err) {
        console.warn('Falling back to procedural cartoon character rig:', err);
      }
    }

    if (profile.source.type === 'spritesheet') {
      try {
        const texture = await this.loadTexture(profile.source.url);
        return this.buildSpriteCharacterRig(texture, profile, team, role);
      } catch (err) {
        console.warn('Sprite sheet failed to load, falling back to procedural rig:', err);
      }
    }

    return this.buildProceduralToonRig(profile, team, role, facingZ);
  }

  private buildGLTFCharacterRig(
    gltf: GLTF,
    profile: CharacterProfile,
    team: TeamConfig,
    role: 'striker' | 'goalkeeper',
    facingZ: 1 | -1,
  ): CharacterRigInstance {
    const root = new THREE.Group();
    const clonedModel = SkeletonUtils.clone(gltf.scene) as THREE.Group;
    const scale = profile.source.type === 'gltf' ? (profile.source.scale ?? 1.0) : 1.0;
    clonedModel.scale.setScalar(scale);
    // Mixamo footballer-animated.glb faces +Z by default
    clonedModel.rotation.y = facingZ === -1 ? Math.PI : 0;
    root.add(clonedModel);

    const gradientMap = this.getToonGradientMap();
    const createdMaterials: THREE.Material[] = [];
    const createdGeometries: THREE.BufferGeometry[] = [];

    const primary = role === 'goalkeeper' ? team.gkPrimaryColor : team.primaryColor;
    const secondary = role === 'goalkeeper' ? team.gkSecondaryColor : team.secondaryColor;
    const socks = team.socksColor;

    const meshMap: Record<string, THREE.Mesh> = {};

    clonedModel.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        meshMap[mesh.name] = mesh;

        const origMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const diffuseMap = (origMat as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial | undefined)?.map ?? null;

        if (mesh.name === 'Player_Jersey') {
          const mat = new THREE.MeshToonMaterial({
            color: new THREE.Color(primary),
            gradientMap,
            emissive: new THREE.Color(primary),
            emissiveIntensity: 0.14,
          });
          mesh.material = mat;
          createdMaterials.push(mat);
        } else if (mesh.name === 'Player_Shorts') {
          const mat = new THREE.MeshToonMaterial({
            color: new THREE.Color(secondary),
            gradientMap,
            emissive: new THREE.Color(secondary),
            emissiveIntensity: 0.08,
          });
          mesh.material = mat;
          createdMaterials.push(mat);
        } else if (mesh.name === 'Player_Socks') {
          const mat = new THREE.MeshToonMaterial({
            color: new THREE.Color(socks),
            gradientMap,
          });
          mesh.material = mat;
          createdMaterials.push(mat);
        } else if (mesh.name === 'Ch38_Shoes') {
          const mat = new THREE.MeshToonMaterial({
            color: new THREE.Color(profile.bootsColor),
            gradientMap,
          });
          mesh.material = mat;
          createdMaterials.push(mat);
        } else if (mesh.name === 'Ch38_Hair') {
          // Ch38_hair in footballer-animated.glb ships with baseColorFactor alpha=0; fix visibility cleanly
          const mat = new THREE.MeshToonMaterial({
            color: new THREE.Color(profile.hairColor),
            map: diffuseMap,
            gradientMap,
            alphaTest: 0.35,
            transparent: false,
            opacity: 1,
            side: THREE.DoubleSide,
          });
          mesh.material = mat;
          createdMaterials.push(mat);
        } else {
          // Ch38_Body keeps skin/face UV texture with warm cel-shading
          const mat = new THREE.MeshToonMaterial({
            color: new THREE.Color(profile.skinToneTint ?? '#FFFFFF'),
            map: diffuseMap,
            gradientMap,
          });
          mesh.material = mat;
          createdMaterials.push(mat);
        }
      }
    });

    // Attach stylized cartoon goalkeeper gloves to Mixamo hand bones when playing as keeper
    if (role === 'goalkeeper') {
      const gloveMat = new THREE.MeshToonMaterial({
        color: new THREE.Color(profile.gloveColor),
        gradientMap,
        emissive: new THREE.Color(profile.gloveColor),
        emissiveIntensity: 0.15,
      });
      const cuffMat = new THREE.MeshToonMaterial({
        color: new THREE.Color('#0F172A'),
        gradientMap,
      });
      const gloveGeo = new THREE.BoxGeometry(0.11, 0.14, 0.09);
      const cuffGeo = new THREE.CylinderGeometry(0.048, 0.052, 0.05, 10);
      createdMaterials.push(gloveMat, cuffMat);
      createdGeometries.push(gloveGeo, cuffGeo);

      for (const boneName of ['mixamorig5:LeftHand', 'mixamorig5:RightHand']) {
        const handBone = clonedModel.getObjectByName(boneName);
        if (handBone) {
          const gloveGroup = new THREE.Group();
          const palm = new THREE.Mesh(gloveGeo, gloveMat);
          palm.position.set(0, 0.06, 0);
          palm.castShadow = true;
          const cuff = new THREE.Mesh(cuffGeo, cuffMat);
          cuff.position.set(0, -0.01, 0);
          gloveGroup.add(palm, cuff);
          handBone.add(gloveGroup);
        }
      }
    }

    const mixer = new THREE.AnimationMixer(clonedModel);
    const clips = gltf.animations ?? [];
    const animMap =
      profile.source.type === 'gltf' ? profile.source.animations ?? {} : {};

    const resolveClip = (state: CharacterAnimState): THREE.AnimationClip | null => {
      const preferred = animMap[state];
      const fallbacks: Record<CharacterAnimState, string[]> = {
        idle: [preferred ?? 'Idle', 'Idle'],
        run: [preferred ?? 'Run', 'Run', 'Sprint'],
        kick: [preferred ?? 'Kick', 'Kick'],
        celebrate: [preferred ?? profile.celebrationAnim, 'Spin', 'Bicycle'],
        miss: [preferred ?? 'Stumble', 'Stumble', 'Fall'],
        diveLeft: [preferred ?? 'GK_Dive', 'GK_Dive'],
        diveRight: [preferred ?? 'GK_Dive', 'GK_Dive'],
        diveCenter: [preferred ?? 'GK_Catch', 'GK_Catch'],
        catch: [preferred ?? 'GK_Catch', 'GK_Catch'],
        getUp: [preferred ?? 'GetUp', 'GetUp', 'Idle'],
      };
      for (const name of fallbacks[state]) {
        const found = THREE.AnimationClip.findByName(clips, name);
        if (found) return found;
      }
      return clips[0] ?? null;
    };

    const actionCache = new Map<string, THREE.AnimationAction>();
    let currentAction: THREE.AnimationAction | null = null;
    let currentStateName = '';

    const play: CharacterRigInstance['play'] = (state, opts = {}) => {
      const clip = resolveClip(state);
      if (!clip) return;
      const cacheKey = `${state}:${clip.name}`;
      let nextAction = actionCache.get(cacheKey);
      if (!nextAction) {
        nextAction = mixer.clipAction(clip);
        actionCache.set(cacheKey, nextAction);
      }

      const loop = opts.loop ?? (state === 'idle' || state === 'run');
      nextAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      nextAction.clampWhenFinished = !loop;
      nextAction.timeScale = opts.timeScale ?? 1;

      if (currentAction === nextAction && currentStateName === state && nextAction.isRunning()) {
        return;
      }

      const fade = opts.fade ?? 0.14;
      nextAction.reset().play();
      if (currentAction && currentAction !== nextAction) {
        currentAction.crossFadeTo(nextAction, fade, false);
      } else {
        nextAction.fadeIn(fade);
      }
      currentAction = nextAction;
      currentStateName = state;
    };

    // Start in Idle
    play('idle', { loop: true, fade: 0.05 });

    return {
      root,
      play,
      getDuration: (state) => resolveClip(state)?.duration ?? 0.8,
      update: (deltaTime) => {
        mixer.update(deltaTime);
      },
      setKitColors: (nextPrimary, nextSecondary, nextSocks) => {
        const jMat = meshMap['Player_Jersey']?.material as THREE.MeshToonMaterial | undefined;
        if (jMat) {
          jMat.color.set(nextPrimary);
          jMat.emissive.set(nextPrimary);
        }
        const sMat = meshMap['Player_Shorts']?.material as THREE.MeshToonMaterial | undefined;
        if (sMat) {
          sMat.color.set(nextSecondary);
          sMat.emissive.set(nextSecondary);
        }
        const kMat = meshMap['Player_Socks']?.material as THREE.MeshToonMaterial | undefined;
        if (kMat) kMat.color.set(nextSocks);
      },
      dispose: () => {
        mixer.stopAllAction();
        mixer.uncacheRoot(clonedModel);
        createdMaterials.forEach((m) => m.dispose());
        createdGeometries.forEach((g) => g.dispose());
      },
    };
  }

  private buildSpriteCharacterRig(
    sheetTexture: THREE.Texture,
    profile: CharacterProfile,
    _team: TeamConfig,
    _role: 'striker' | 'goalkeeper',
  ): CharacterRigInstance {
    const src = profile.source;
    const cols = src.type === 'spritesheet' ? src.cols : 4;
    const rows = src.type === 'spritesheet' ? src.rows : 4;
    const fps = src.type === 'spritesheet' ? (src.fps ?? 10) : 10;
    const width = src.type === 'spritesheet' ? (src.width ?? 1.5) : 1.5;
    const height = src.type === 'spritesheet' ? (src.height ?? 1.9) : 1.9;

    const tex = sheetTexture.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1 / cols, 1 / rows);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;

    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.25,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(width, height, 1);
    sprite.position.y = height / 2;

    const root = new THREE.Group();
    root.add(sprite);

    let startFrame = 0;
    let endFrame = cols - 1;
    let loop = true;
    let elapsed = 0;

    return {
      root,
      play: (state, opts) => {
        const range = src.type === 'spritesheet' ? src.states?.[state] : undefined;
        startFrame = range?.startFrame ?? 0;
        endFrame = range?.endFrame ?? cols - 1;
        loop = opts?.loop ?? range?.loop ?? true;
        elapsed = 0;
      },
      getDuration: () => Math.max(0.4, (endFrame - startFrame + 1) / fps),
      update: (dt) => {
        elapsed += dt;
        const count = Math.max(1, endFrame - startFrame + 1);
        const rawIdx = Math.floor(elapsed * fps);
        const frame = loop
          ? startFrame + (rawIdx % count)
          : Math.min(endFrame, startFrame + rawIdx);
        const col = frame % cols;
        const row = Math.floor(frame / cols);
        tex.offset.set(col / cols, 1 - (row + 1) / rows);
      },
      setKitColors: () => {},
      dispose: () => {
        tex.dispose();
        mat.dispose();
      },
    };
  }

  private buildProceduralToonRig(
    profile: CharacterProfile,
    team: TeamConfig,
    role: 'striker' | 'goalkeeper',
    facingZ: 1 | -1,
  ): CharacterRigInstance {
    const gradientMap = this.getToonGradientMap();
    const primary = role === 'goalkeeper' ? team.gkPrimaryColor : team.primaryColor;
    const secondary = role === 'goalkeeper' ? team.gkSecondaryColor : team.secondaryColor;

    const root = new THREE.Group();
    const model = new THREE.Group();
    model.rotation.y = facingZ === -1 ? Math.PI : 0;
    root.add(model);

    const torsoMat = new THREE.MeshToonMaterial({ color: primary, gradientMap });
    const shortsMat = new THREE.MeshToonMaterial({ color: secondary, gradientMap });
    const skinMat = new THREE.MeshToonMaterial({ color: '#FDBA8C', gradientMap });
    const hairMat = new THREE.MeshToonMaterial({ color: profile.hairColor, gradientMap });
    const bootMat = new THREE.MeshToonMaterial({ color: profile.bootsColor, gradientMap });
    const gloveMat = new THREE.MeshToonMaterial({ color: profile.gloveColor, gradientMap });

    const torsoGeo = new THREE.CapsuleGeometry(0.24, 0.42, 6, 12);
    const headGeo = new THREE.SphereGeometry(0.18, 16, 14);
    const hairGeo = new THREE.SphereGeometry(0.19, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58);
    const limbGeo = new THREE.CapsuleGeometry(0.08, 0.34, 4, 10);
    const gloveGeo = new THREE.BoxGeometry(0.13, 0.16, 0.1);

    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.05;
    torso.castShadow = true;

    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.58;
    head.castShadow = true;

    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.6;

    const leftLeg = new THREE.Mesh(limbGeo, shortsMat);
    leftLeg.position.set(-0.13, 0.45, 0);
    leftLeg.castShadow = true;

    const rightLeg = new THREE.Mesh(limbGeo, shortsMat);
    rightLeg.position.set(0.13, 0.45, 0);
    rightLeg.castShadow = true;

    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.2), bootMat);
    leftBoot.position.set(0, -0.25, 0.04);
    leftLeg.add(leftBoot);

    const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.2), bootMat);
    rightBoot.position.set(0, -0.25, 0.04);
    rightLeg.add(rightBoot);

    const leftArm = new THREE.Mesh(limbGeo, role === 'goalkeeper' ? torsoMat : skinMat);
    leftArm.position.set(-0.34, 1.08, 0);
    const rightArm = new THREE.Mesh(limbGeo, role === 'goalkeeper' ? torsoMat : skinMat);
    rightArm.position.set(0.34, 1.08, 0);

    if (role === 'goalkeeper') {
      const lg = new THREE.Mesh(gloveGeo, gloveMat);
      lg.position.set(0, -0.24, 0);
      leftArm.add(lg);
      const rg = new THREE.Mesh(gloveGeo, gloveMat);
      rg.position.set(0, -0.24, 0);
      rightArm.add(rg);
    }

    model.add(torso, head, hair, leftLeg, rightLeg, leftArm, rightArm);

    let currentState: CharacterAnimState = 'idle';
    let stateTime = 0;

    return {
      root,
      play: (state) => {
        currentState = state;
        stateTime = 0;
      },
      getDuration: () => 0.75,
      update: (dt) => {
        stateTime += dt;
        if (currentState === 'run') {
          const swing = Math.sin(stateTime * 14) * 0.75;
          leftLeg.rotation.x = swing;
          rightLeg.rotation.x = -swing;
          leftArm.rotation.x = -swing * 0.6;
          rightArm.rotation.x = swing * 0.6;
        } else if (currentState === 'kick') {
          const p = Math.min(1, stateTime / 0.45);
          rightLeg.rotation.x = -Math.sin(p * Math.PI) * 1.3;
          leftArm.rotation.x = Math.sin(p * Math.PI) * 0.6;
        } else if (currentState === 'celebrate') {
          model.position.y = Math.abs(Math.sin(stateTime * 6)) * 0.45;
          model.rotation.y += dt * 7;
          leftArm.rotation.z = -2.4;
          rightArm.rotation.z = 2.4;
        } else {
          model.position.y = 0;
          leftLeg.rotation.set(Math.sin(stateTime * 2.5) * 0.06, 0, 0);
          rightLeg.rotation.set(-Math.sin(stateTime * 2.5) * 0.06, 0, 0);
          leftArm.rotation.set(0, 0, -0.15);
          rightArm.rotation.set(0, 0, 0.15);
        }
      },
      setKitColors: (nextPrimary, nextSecondary) => {
        torsoMat.color.set(nextPrimary);
        shortsMat.color.set(nextSecondary);
      },
      dispose: () => {
        root.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            m.geometry.dispose();
            if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose());
            else m.material.dispose();
          }
        });
      },
    };
  }

  private async loadAudio(key: SoundEffectKey, url: string): Promise<void> {
    try {
      const ctx = this.ensureAudioContext();
      if (!ctx) return;
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(arr);
      this.audioBufferCache.set(key, buf);
    } catch {
      // Fall back silently to Web Audio synth
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioContext) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) this.audioContext = new Ctx();
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      void this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  playSound(key: SoundEffectKey): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    const customBuffer = this.audioBufferCache.get(key);
    if (customBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = customBuffer;
      src.connect(ctx.destination);
      src.start();
      return;
    }

    // Procedural cartoon Web Audio synth fallback
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (key) {
      case 'whistle': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2450, now);
        osc.frequency.setValueAtTime(2720, now + 0.08);
        osc.frequency.setValueAtTime(2550, now + 0.16);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.29);
        break;
      }
      case 'kick': {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(165, now);
        osc.frequency.exponentialRampToValueAtTime(48, now + 0.12);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.008, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
      case 'save': {
        osc.type = 'square';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.16);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.008, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.21);
        break;
      }
      case 'post': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(640, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.26);
        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
      case 'goal': {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, now + i * 0.065);
          g.gain.setValueAtTime(0.16, now + i * 0.065);
          g.gain.exponentialRampToValueAtTime(0.005, now + i * 0.065 + 0.35);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now + i * 0.065);
          o.stop(now + i * 0.065 + 0.36);
        });
        return;
      }
      case 'miss': {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.29);
        break;
      }
      case 'win': {
        const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        chord.forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, now + i * 0.08);
          g.gain.setValueAtTime(0.18, now + i * 0.08);
          g.gain.exponentialRampToValueAtTime(0.005, now + i * 0.08 + 0.55);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now + i * 0.08);
          o.stop(now + i * 0.08 + 0.56);
        });
        return;
      }
      case 'tick':
      default: {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }
    }
  }

  dispose(): void {
    this.textureCache.forEach((t) => t.dispose());
    this.textureCache.clear();
    this.flagTextureCache.forEach((t) => t.dispose());
    this.flagTextureCache.clear();
    this.sharedToonGradient?.dispose();
    this.sharedToonGradient = null;
    if (this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close().catch(() => {});
    }
    this.audioContext = null;
  }
}
