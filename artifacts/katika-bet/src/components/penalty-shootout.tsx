import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocation, useRoute, Link } from 'wouter';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
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
  Upload,
  Layers,
  ExternalLink,
  BookOpen,
  X,
  Info,
  Check,
  Download,
  Eye,
  RefreshCw,
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

  playCountdownTick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    } catch {}
  }

  playCelebration() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const chords = [523.25, 659.25, 783.99, 1046.5];
      chords.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.06);
        gain.gain.setValueAtTime(0.12, t + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t + idx * 0.06);
        osc.stop(t + 0.28);
      });
    } catch {}
  }
}

const audio = new PenaltyAudio();

// =============================================================================
// TYPES: STRICTLY 3 DIRECTIONS (LEFT, CENTRE, RIGHT) & 3V3 SQUAD
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

// =============================================================================
// ULTRA HIGH-RES 2048x2048 PROCEDURAL TEXTURES (CRISP & ZERO PIXELATION)
// =============================================================================
function createStrikerJerseyTexture(number = 10, name = 'MBAPPÉ'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d')!;

  // 1. Base Athletic Gold-Yellow with subtle micro-weave
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 2048, 2048);

  // 2. Micro-perforated breathable athletic mesh (Dri-FIT effect)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.035)';
  for (let y = 0; y < 2048; y += 12) {
    for (let x = 0; x < 2048; x += 12) {
      ctx.fillRect(x + (y % 24 === 0 ? 6 : 0), y, 3, 3);
    }
  }

  // 3. Ergonomic Dark Carbon Shoulder/Sleeve Inserts
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 440, 700);
  ctx.fillRect(1608, 0, 440, 700);

  // 4. Ribbed Collar & Neckband
  ctx.fillStyle = '#090d16';
  ctx.fillRect(720, 0, 608, 160);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(800, 140, 448, 20);

  // 5. Katika Shield Crest on Left Chest
  ctx.save();
  ctx.translate(1540, 480);
  ctx.fillStyle = '#064e3b';
  ctx.beginPath();
  ctx.moveTo(-90, -90);
  ctx.lineTo(90, -90);
  ctx.lineTo(90, 20);
  ctx.quadraticCurveTo(90, 110, 0, 150);
  ctx.quadraticCurveTo(-90, 110, -90, 20);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#35d399';
  ctx.stroke();

  // Golden Champion Star above crest
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(0, -115, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 6. Chest Sponsor: "KATIKA BET"
  ctx.fillStyle = '#090d16';
  ctx.font = '900 130px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KATIKA BET', 1024, 760);

  ctx.fillStyle = '#059669';
  ctx.font = 'bold 42px monospace';
  ctx.fillText('OFFICIAL STADIUM KIT', 1024, 825);

  // 7. Large Back Number & Player Name (FIFA Font Style)
  ctx.fillStyle = '#090d16';
  ctx.font = '900 720px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${number}`, 1024, 1540);

  ctx.font = '900 120px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(name, 1024, 1740);

  // 8. Aerodynamic side speed stripes
  ctx.fillStyle = '#eab308';
  ctx.fillRect(60, 720, 140, 1200);
  ctx.fillRect(1848, 720, 140, 1200);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function createKeeperJerseyTexture(number = 1, name = 'COURTOIS'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d')!;

  // 1. Royal Blue Gradient
  const grad = ctx.createLinearGradient(0, 0, 2048, 2048);
  grad.addColorStop(0, '#1e3a8a');
  grad.addColorStop(0.5, '#2563eb');
  grad.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 2048);

  // 2. Protective Hexagonal Chest & Rib Padding Print
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 5;
  for (let y = 140; y < 1900; y += 110) {
    for (let x = 140; x < 1900; x += 130) {
      ctx.strokeRect(x, y, 85, 85);
    }
  }

  // 3. Crisp White Side Breathable Panels
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 260, 2048);
  ctx.fillRect(1788, 0, 260, 2048);

  // 4. Katika Crest on Left Chest
  ctx.save();
  ctx.translate(1540, 480);
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#38bdf8';
  ctx.stroke();
  ctx.restore();

  // 5. Chest Print
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 130px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KATIKA GK', 1024, 760);

  // 6. Goalkeeper Back Number
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 720px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${number}`, 1024, 1540);

  ctx.font = '900 120px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(name, 1024, 1740);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

function createFaceTexture(isKeeper: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Natural athletic skin tone with subtle shading gradient
  const skinGrad = ctx.createRadialGradient(512, 512, 100, 512, 512, 512);
  if (isKeeper) {
    skinGrad.addColorStop(0, '#d97706');
    skinGrad.addColorStop(1, '#92400e');
  } else {
    skinGrad.addColorStop(0, '#92400e');
    skinGrad.addColorStop(1, '#5a2308');
  }
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. High-precision tapered fade hairline
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, 1024, 320);

  // 3. Eyes (sclera + iris + specular highlight)
  const drawEye = (cx: number, cy: number) => {
    // Sclera
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 46, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris
    ctx.fillStyle = isKeeper ? '#1e3a8a' : '#291404';
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.fill();

    // Specular Reflection
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 6, 6, 0, Math.PI * 2);
    ctx.fill();
  };

  drawEye(380, 520);
  drawEye(644, 520);

  // 4. Athletic Eyebrows
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.roundRect(310, 460, 140, 22, 10);
  ctx.roundRect(574, 460, 140, 22, 10);
  ctx.fill();

  // 5. Nose bridge & athletic mouth
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.fillRect(490, 560, 44, 110);

  ctx.fillStyle = isKeeper ? '#78350f' : '#451a03';
  ctx.beginPath();
  ctx.roundRect(420, 730, 184, 26, 12);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

// Soccer Ball Hexagonal Pattern Texture
function createSoccerBallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1024, 1024);

  // Draw dark pentagonal star panels
  ctx.fillStyle = '#090d16';
  const drawStarPanel = (cx: number, cy: number, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  };

  drawStarPanel(512, 512, 130);
  drawStarPanel(200, 200, 100);
  drawStarPanel(824, 200, 100);
  drawStarPanel(200, 824, 100);
  drawStarPanel(824, 824, 100);

  // Metallic Gold accent lines
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 10;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// =============================================================================
// SKELETAL RIGGING & PROCEDURAL MOTION ENGINE FOR ANY .GLB HUMANOID
// =============================================================================
interface HumanoidBones {
  hips?: THREE.Bone;
  spine?: THREE.Bone;
  chest?: THREE.Bone;
  neck?: THREE.Bone;
  head?: THREE.Bone;
  leftUpLeg?: THREE.Bone;
  leftLeg?: THREE.Bone;
  leftFoot?: THREE.Bone;
  rightUpLeg?: THREE.Bone;
  rightLeg?: THREE.Bone;
  rightFoot?: THREE.Bone;
  leftArm?: THREE.Bone;
  leftForeArm?: THREE.Bone;
  leftHand?: THREE.Bone;
  rightArm?: THREE.Bone;
  rightForeArm?: THREE.Bone;
  rightHand?: THREE.Bone;
}

interface RigController {
  bones: HumanoidBones;
  restRotations: Map<THREE.Bone, THREE.Quaternion>;
  initialHipsY: number;
  mixer?: THREE.AnimationMixer;
}

function extractHumanoidBones(root: THREE.Object3D): HumanoidBones {
  const bones: HumanoidBones = {};
  root.traverse((child) => {
    if ((child as THREE.Bone).isBone) {
      const name = child.name.toLowerCase().replace(/[:_]/g, '');
      if (name.includes('hips') || name.includes('pelvis')) bones.hips = child as THREE.Bone;
      else if (name.includes('spine1') || name.includes('spine2') || name.includes('chest')) bones.chest = child as THREE.Bone;
      else if (name.includes('spine')) bones.spine = child as THREE.Bone;
      else if (name.includes('neck')) bones.neck = child as THREE.Bone;
      else if (name.includes('head') && !name.includes('top')) bones.head = child as THREE.Bone;
      else if (name.includes('leftupleg') || name.includes('leftthigh') || name.includes('uplegl')) bones.leftUpLeg = child as THREE.Bone;
      else if (name.includes('leftleg') || name.includes('leftcalf') || name.includes('legl')) bones.leftLeg = child as THREE.Bone;
      else if (name.includes('leftfoot') || name.includes('footl')) bones.leftFoot = child as THREE.Bone;
      else if (name.includes('rightupleg') || name.includes('rightthigh') || name.includes('uplegr')) bones.rightUpLeg = child as THREE.Bone;
      else if (name.includes('rightleg') || name.includes('rightcalf') || name.includes('legr')) bones.rightLeg = child as THREE.Bone;
      else if (name.includes('rightfoot') || name.includes('footr')) bones.rightFoot = child as THREE.Bone;
      else if (name.includes('leftarm') || name.includes('arml')) bones.leftArm = child as THREE.Bone;
      else if (name.includes('leftforearm') || name.includes('forearml')) bones.leftForeArm = child as THREE.Bone;
      else if (name.includes('lefthand') || name.includes('handl')) bones.leftHand = child as THREE.Bone;
      else if (name.includes('rightarm') || name.includes('armr')) bones.rightArm = child as THREE.Bone;
      else if (name.includes('rightforearm') || name.includes('forearmr')) bones.rightForeArm = child as THREE.Bone;
      else if (name.includes('righthand') || name.includes('handr')) bones.rightHand = child as THREE.Bone;
    }
  });
  return bones;
}

function createRigController(root: THREE.Object3D, animations?: THREE.AnimationClip[]): RigController {
  const bones = extractHumanoidBones(root);
  const restRotations = new Map<THREE.Bone, THREE.Quaternion>();
  root.traverse((child) => {
    if ((child as THREE.Bone).isBone) {
      restRotations.set(child as THREE.Bone, child.quaternion.clone());
    }
  });

  let mixer: THREE.AnimationMixer | undefined;
  if (animations && animations.length > 0) {
    mixer = new THREE.AnimationMixer(root);
    const runOrKickClip = animations.find((a) => /run|kick|sprint|shoot|dance|idle/i.test(a.name)) || animations[0];
    if (runOrKickClip) {
      const action = mixer.clipAction(runOrKickClip);
      action.play();
    }
  }

  return {
    bones,
    restRotations,
    initialHipsY: bones.hips ? bones.hips.position.y : 0,
    mixer,
  };
}

function applyStrikerMotion(
  rig: RigController | null,
  matchState: string,
  anim: { runup: number; scored: boolean },
  elapsed: number,
  delta: number
) {
  if (!rig) return;
  if (rig.mixer) rig.mixer.update(delta);

  // Restore rest bind pose before applying kinematics
  rig.restRotations.forEach((q, bone) => bone.quaternion.copy(q));
  const b = rig.bones;

  if (matchState === 'runup') {
    const runupT = Math.min(1, anim.runup);
    if (runupT < 0.68) {
      // Sprint stride cycling: high knee lift and opposite arm swing
      const stride = Math.sin(runupT * Math.PI * 7.5);
      b.leftUpLeg?.rotateX(stride * 0.95);
      b.rightUpLeg?.rotateX(-stride * 0.95);
      b.leftLeg?.rotateX(Math.max(0, -stride) * 1.25);
      b.rightLeg?.rotateX(Math.max(0, stride) * 1.25);

      b.leftArm?.rotateZ(0.85);
      b.leftArm?.rotateX(-stride * 0.95);
      b.leftForeArm?.rotateX(-0.85);

      b.rightArm?.rotateZ(-0.85);
      b.rightArm?.rotateX(stride * 0.95);
      b.rightForeArm?.rotateX(-0.85);

      b.spine?.rotateX(0.24);
      if (b.hips) {
        b.hips.position.y = rig.initialHipsY + Math.abs(Math.sin(runupT * Math.PI * 7.5)) * 0.05;
      }
    } else {
      // Wind-up & Strike through soccer ball
      const kickPhase = (runupT - 0.68) / 0.32;
      b.leftUpLeg?.rotateX(-0.22);
      b.leftLeg?.rotateX(0.35);

      if (kickPhase < 0.35) {
        // Wind-back phase
        const w = kickPhase / 0.35;
        b.rightUpLeg?.rotateX(-1.15 * w);
        b.rightLeg?.rotateX(1.45 * w);
      } else {
        // Whip kicking leg through ball
        const f = (kickPhase - 0.35) / 0.65;
        b.rightUpLeg?.rotateX(-1.15 + f * 2.3);
        b.rightLeg?.rotateX(1.45 * (1 - f));
      }

      b.spine?.rotateX(-0.12 + kickPhase * 0.3);
      b.spine?.rotateY(-0.25 * kickPhase);
      b.leftArm?.rotateZ(1.35);
      b.leftArm?.rotateX(0.5);
      b.rightArm?.rotateZ(-1.25);
      b.rightArm?.rotateX(-0.6);
    }
  } else if (matchState === 'shot_result' && anim.scored) {
    // Goal celebration: arms thrust high in victory!
    b.leftArm?.rotateZ(2.65);
    b.leftArm?.rotateX(0.2);
    b.rightArm?.rotateZ(-2.65);
    b.rightArm?.rotateX(0.2);
    b.spine?.rotateX(-0.18);
    b.head?.rotateX(-0.22);
  } else if (matchState === 'shot_result' && !anim.scored) {
    // Miss/Save reaction: hands on head in disbelief
    b.leftArm?.rotateZ(1.2);
    b.leftArm?.rotateX(-1.1);
    b.rightArm?.rotateZ(-1.2);
    b.rightArm?.rotateX(-1.1);
    b.head?.rotateX(0.35);
  } else {
    // Natural athletic ready stance with relaxed side-hung arms and breathing
    b.leftArm?.rotateZ(1.25);
    b.leftArm?.rotateX(0.1);
    b.rightArm?.rotateZ(-1.25);
    b.rightArm?.rotateX(0.1);
    b.leftForeArm?.rotateX(-0.25);
    b.rightForeArm?.rotateX(-0.25);

    b.leftUpLeg?.rotateX(-0.06);
    b.rightUpLeg?.rotateX(0.06);

    const breathe = Math.sin(elapsed * 2.5);
    b.spine?.rotateX(breathe * 0.03);
    b.head?.rotateX(-0.05 + breathe * 0.015);
    if (b.hips) {
      b.hips.rotation.y = Math.sin(elapsed * 1.5) * 0.03;
    }
  }
}

function applyKeeperMotion(
  rig: RigController | null,
  matchState: string,
  anim: { keeperT: number; diveDir: string },
  elapsed: number,
  delta: number
) {
  if (!rig) return;
  if (rig.mixer) rig.mixer.update(delta);

  rig.restRotations.forEach((q, bone) => bone.quaternion.copy(q));
  const b = rig.bones;

  if (matchState === 'ball_flight' || matchState === 'shot_result') {
    const diveT = Math.min(1, anim.keeperT);
    if (anim.diveDir === 'left') {
      b.leftArm?.rotateZ(2.35 * diveT);
      b.rightArm?.rotateZ(2.0 * diveT);
      b.leftUpLeg?.rotateZ(-0.45 * diveT);
      b.rightUpLeg?.rotateZ(-0.25 * diveT);
      b.spine?.rotateZ(0.35 * diveT);
    } else if (anim.diveDir === 'right') {
      b.leftArm?.rotateZ(-2.0 * diveT);
      b.rightArm?.rotateZ(-2.35 * diveT);
      b.leftUpLeg?.rotateZ(0.25 * diveT);
      b.rightUpLeg?.rotateZ(0.45 * diveT);
      b.spine?.rotateZ(-0.35 * diveT);
    } else {
      b.leftArm?.rotateZ(1.4);
      b.rightArm?.rotateZ(-1.4);
      b.leftUpLeg?.rotateZ(0.35);
      b.rightUpLeg?.rotateZ(-0.35);
    }
  } else {
    // Alert ready crouch on goal line with wide arms and foot-shuffling
    b.leftUpLeg?.rotateX(-0.35);
    b.rightUpLeg?.rotateX(-0.35);
    b.leftLeg?.rotateX(0.55);
    b.rightLeg?.rotateX(0.55);

    b.leftArm?.rotateZ(0.7);
    b.leftArm?.rotateX(-0.4);
    b.rightArm?.rotateZ(-0.7);
    b.rightArm?.rotateX(-0.4);
    b.leftForeArm?.rotateX(-0.55);
    b.rightForeArm?.rotateX(-0.55);

    b.spine?.rotateX(0.2);

    const hop = Math.abs(Math.sin(elapsed * 7)) * 0.04;
    if (b.hips) {
      b.hips.position.y = rig.initialHipsY + hop;
    }
    b.head?.rotateY(Math.sin(elapsed * 3) * 0.08);
  }
}

// =============================================================================
// COMPONENT: 3V3 PENALTY SHOOTOUT (PS3 HD 3D WEBGL ENGINE)
// =============================================================================
export function PenaltyShootoutPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/pvp/penalty/:id');

  const { serverUser } = useServerSession();
  const { legend } = useLegend();
  const { toast } = useToast();

  const [soundOn, setSoundOn] = useState(true);
  const [stake, setStake] = useState<number>(10);
  const [keeperControlAll, setKeeperControlAll] = useState<boolean>(true);

  // Custom 3D Model State (.GLB)
  const [customModelLoaded, setCustomModelLoaded] = useState<string | null>(null);
  const [customModelTarget, setCustomModelTarget] = useState<'striker' | 'keeper' | 'both'>('striker');
  const [showGlbGuide, setShowGlbGuide] = useState<boolean>(false);
  const [glbUrlInput, setGlbUrlInput] = useState<string>('');
  const [isLoadingGlb, setIsLoadingGlb] = useState<boolean>(false);

  // Persistent reference to loaded custom GLTF groups so state changes NEVER drop the model
  const customStrikerModelRef = useRef<THREE.Group | null>(null);
  const customKeeperModelRef = useRef<THREE.Group | null>(null);
  const strikerRigRef = useRef<RigController | null>(null);
  const keeperRigRef = useRef<RigController | null>(null);

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
  const teamA: SquadPlayer[] = useMemo(
    () => [
      { id: 'p1', name: legend?.name || 'K. MBAPPÉ', number: 10, role: 'striker', isUser: true, avatarSeed: 1 },
      { id: 'p2', name: 'V. JÚNIOR', number: 7, role: 'striker', isUser: false, avatarSeed: 2 },
      { id: 'p3', name: 'J. BELLINGHAM', number: 5, role: 'striker', isUser: false, avatarSeed: 3 },
    ],
    [legend?.name]
  );

  const teamB: SquadPlayer[] = useMemo(
    () => [
      { id: 'b1', name: 'T. COURTOIS', number: 1, role: 'keeper', isUser: false, avatarSeed: 4 },
      { id: 'b2', name: 'E. HAALAND', number: 9, role: 'striker', isUser: false, avatarSeed: 5 },
      { id: 'b3', name: 'K. DE BRUYNE', number: 17, role: 'striker', isUser: false, avatarSeed: 6 },
    ],
    []
  );

  const currentShooter = attackingTeam === 'A' ? teamA[currentKickerSlot] : teamB[currentKickerSlot];
  const currentKeeper = attackingTeam === 'A'
    ? teamB[currentKickerSlot]
    : teamA[keeperControlAll ? 0 : currentKickerSlot];

  const isUserTurnToShoot = attackingTeam === 'A' && currentShooter.isUser;
  const isUserTurnToSave = attackingTeam === 'B' && (keeperControlAll || currentKeeper.isUser);

  // WebGL Container & Three.js References
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    composureRadius: 28,
    shotDir: 'centre',
    diveDir: 'centre',
    pitchElevation: 'mid',
    powerKmH: 95,
    scored: false,
  });

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    audio.enabled = next;
  };

  // Start 3v3 Matchmaking Cue
  const handleJoinCue = () => {
    setMatchState('queue_matching');
    setQueuePlayersFound(1);
    setQueueStatusText('Connecting to Katika 3v3 Arena...');
    audio.playWhistle();

    let count = 1;
    const interval = setInterval(() => {
      count++;
      setQueuePlayersFound(count);
      audio.playCueJoin();

      if (count === 3) {
        setQueueStatusText('Team Katika Assembled! Finding Rivals...');
      } else if (count === 6) {
        setQueueStatusText('6/6 Players Matched! Entering Arena...');
        clearInterval(interval);
        setTimeout(() => {
          setMatchState('countdown');
          setCountdownNum(3);
          audio.playWhistle();
        }, 1100);
      }
    }, 650);
  };

  // Countdown 3, 2, 1, Kick Off
  useEffect(() => {
    if (matchState !== 'countdown') return;
    if (countdownNum > 1) {
      const timer = setTimeout(() => {
        setCountdownNum((prev) => prev - 1);
        audio.playCountdownTick();
      }, 900);
      return () => clearTimeout(timer);
    } else if (countdownNum === 1) {
      const timer = setTimeout(() => {
        audio.playWhistle();
        setMatchState('aiming');
        setBannerNotice('KICK OFF! TAKE YOUR SHOT');
        setTimeout(() => setBannerNotice(''), 2200);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [matchState, countdownNum]);

  // Shot Resolution Logic
  const resolveShot = useCallback(
    (chosenShotDir: ShotDirection, keeperDiveDir: DiveDirection) => {
      const anim = animProgressRef.current;
      anim.shotDir = chosenShotDir;
      anim.diveDir = keeperDiveDir;

      // Realistic speed and pitch
      const power = Math.floor(82 + Math.random() * 36);
      anim.powerKmH = power;

      const pitches: PitchElevation[] = ['low', 'mid', 'high'];
      if (power < 90) pitches.push('panenka');
      const pitch = pitches[Math.floor(Math.random() * pitches.length)];
      anim.pitchElevation = pitch;

      // Composure ring timing
      let quality: 'green' | 'yellow' | 'red' = 'yellow';
      if (anim.composureRadius < 20) quality = 'green';
      else if (anim.composureRadius > 34) quality = 'red';

      // Scored if direction is not guessed, or if shot was green precision
      let scored = chosenShotDir !== keeperDiveDir;
      if (!scored && quality === 'green' && Math.random() < 0.42) {
        scored = true;
      }

      anim.scored = scored;
      anim.runup = 0;
      anim.ballT = 0;
      anim.keeperT = 0;
      anim.netRipple = 0;

      const currentKicker = attackingTeam === 'A' ? teamA[currentKickerSlot] : teamB[currentKickerSlot];
      const currentGk = attackingTeam === 'A' ? teamB[0] : teamA[0];

      const res: ShotResult = {
        round: currentRound,
        kickerSlot: currentKickerSlot,
        team: attackingTeam,
        kickerName: currentKicker.name,
        keeperName: currentGk.name,
        shotDirection: chosenShotDir,
        diveDirection: keeperDiveDir,
        scored,
        powerKmH: power,
        pitchElevation: pitch,
        composureQuality: quality,
        message: scored
          ? `GOAL! ${currentKicker.name} fires ${power} km/h into ${chosenShotDir.toUpperCase()}!`
          : `SAVED! ${currentGk.name} leaps ${keeperDiveDir.toUpperCase()} to parry!`,
      };

      setActiveShotData(res);
      setHistory((prev) => [res, ...prev]);

      // Phase 1: Striker Runup
      setMatchState('runup');
      audio.playWhistle();

      // Phase 2: Kick & Ball Flight
      setTimeout(() => {
        setMatchState('ball_flight');
        audio.playKick(power / 100);

        // Phase 3: Goal / Save Result
        setTimeout(() => {
          setMatchState('shot_result');
          if (scored) {
            audio.playGoal();
            setBannerNotice(`GOAL! ${power} KM/H`);
          } else {
            audio.playSave();
            setBannerNotice('SAVED BY GOALKEEPER!');
          }

          if (attackingTeam === 'A') {
            if (scored) setScoreTeamA((prev) => prev + 1);
            setShotsA((prev) => {
              const next = [...prev];
              next[currentKickerSlot] = scored;
              return next;
            });
          } else {
            if (scored) setScoreTeamB((prev) => prev + 1);
            setShotsB((prev) => {
              const next = [...prev];
              next[currentKickerSlot] = scored;
              return next;
            });
          }

          // Advance to next turn or finish
          setTimeout(() => {
            setBannerNotice('');
            advanceTurn();
          }, 2400);
        }, 1100);
      }, 750);
    },
    [attackingTeam, currentKickerSlot, currentRound, teamA, teamB]
  );

  // Turn Advancement
  const advanceTurn = useCallback(() => {
    setUserSelectedDir(null);
    setActiveShotData(null);

    if (attackingTeam === 'A') {
      setAttackingTeam('B');
      setMatchState('aiming');
    } else {
      if (currentKickerSlot < 2) {
        setCurrentKickerSlot((prev) => prev + 1);
        setCurrentRound((prev) => prev + 1);
        setAttackingTeam('A');
        setMatchState('aiming');
      } else {
        setMatchState('game_over');
        audio.playCelebration();
        if (scoreTeamA > scoreTeamB) {
          toast({ title: 'Victory!', description: `Team Katika wins the 3v3 shootout! Won ${stake * 2} KTK!` });
        } else if (scoreTeamB > scoreTeamA) {
          toast({ title: 'Defeat', description: 'Rivals edged out the shootout victory.' });
        } else {
          toast({ title: 'Draw!', description: 'Honors even in a thrilling 3v3 shootout!' });
        }
      }
    }
  }, [attackingTeam, currentKickerSlot, scoreTeamA, scoreTeamB, stake, toast]);

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

  // =============================================================================
  // UNIVERSAL GLTF / GLB MODEL LOADER (PERSISTENT & AUTO-NORMALIZED)
  // =============================================================================
  const applyCustomGLTF = useCallback(
    (
      gltfScene: THREE.Group,
      modelName: string,
      target: 'striker' | 'keeper' | 'both',
      animations?: THREE.AnimationClip[]
    ) => {
      // 1. Calculate Bounding Box to auto-scale to realistic 1.85m human height
      const bbox = new THREE.Box3().setFromObject(gltfScene);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const targetHeight = 1.82;
      const scaleFactor = size.y > 0.05 ? targetHeight / size.y : 1;

      gltfScene.scale.set(scaleFactor, scaleFactor, scaleFactor);

      // Recompute bbox with new scale to find foot offset
      bbox.setFromObject(gltfScene);
      const bottomY = bbox.min.y;

      // Enable shadow casting and soft receiving across all mesh materials
      gltfScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            (child.material as THREE.Material).needsUpdate = true;
          }
        }
      });

      if (target === 'striker' || target === 'both') {
        // Deep skeletal clone to preserve SkinnedMesh bone bindings
        const strikerClone = (SkeletonUtils.clone(gltfScene) as unknown) as THREE.Group;
        strikerClone.position.set(-0.48, -bottomY, 0.55);
        strikerClone.rotation.y = Math.PI; // Face towards the goal net
        customStrikerModelRef.current = strikerClone;
        strikerRigRef.current = createRigController(strikerClone, animations);

        if (threeRef.current) {
          threeRef.current.strikerGroup.visible = false;
          threeRef.current.scene.add(strikerClone);
        }
      }

      if (target === 'keeper' || target === 'both') {
        const keeperClone = (SkeletonUtils.clone(gltfScene) as unknown) as THREE.Group;
        keeperClone.position.set(0, -bottomY, -7.05);
        keeperClone.rotation.y = 0; // Face towards the pitch and striker
        customKeeperModelRef.current = keeperClone;
        keeperRigRef.current = createRigController(keeperClone, animations);

        if (threeRef.current) {
          threeRef.current.keeperGroup.visible = false;
          threeRef.current.scene.add(keeperClone);
        }
      }

      setCustomModelLoaded(modelName);
      toast({
        title: 'PS3 3D Model Loaded & Animated!',
        description: `Successfully applied and rigged ${modelName} to ${target.toUpperCase()}!`,
      });
    },
    [toast]
  );

  // Preset loader for generic .glb models sourced locally
  const loadPresetModel = useCallback(
    (preset: 'striker' | 'keeper' | 'both') => {
      setIsLoadingGlb(true);
      const loader = new GLTFLoader();

      if (preset === 'striker' || preset === 'both') {
        loader.load(
          '/models/generic-striker.glb',
          (gltf) => {
            setIsLoadingGlb(false);
            applyCustomGLTF(
              gltf.scene,
              'Generic Striker (.GLB)',
              preset === 'both' ? 'both' : 'striker',
              gltf.animations
            );
            if (preset === 'both') {
              loader.load('/models/generic-keeper.glb', (gltfK) => {
                applyCustomGLTF(gltfK.scene, 'Generic Striker + Keeper (.GLB)', 'keeper', gltfK.animations);
              });
            }
          },
          undefined,
          (err) => {
            setIsLoadingGlb(false);
            console.error('Failed to load generic striker glb:', err);
          }
        );
      } else if (preset === 'keeper') {
        loader.load(
          '/models/generic-keeper.glb',
          (gltf) => {
            setIsLoadingGlb(false);
            applyCustomGLTF(gltf.scene, 'Generic Keeper (.GLB)', 'keeper', gltf.animations);
          },
          undefined,
          (err) => {
            setIsLoadingGlb(false);
            console.error('Failed to load generic keeper glb:', err);
          }
        );
      }
    },
    [applyCustomGLTF]
  );

  // Auto-load generic striker .glb model on mount
  useEffect(() => {
    loadPresetModel('striker');
  }, [loadPresetModel]);

  // File upload handler
  const handleGLBUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingGlb(true);
    const url = URL.createObjectURL(file);
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        setIsLoadingGlb(false);
        applyCustomGLTF(gltf.scene, file.name, customModelTarget, gltf.animations);
      },
      undefined,
      (err) => {
        setIsLoadingGlb(false);
        toast({
          title: 'Load Error',
          description: 'Failed to parse .glb / .gltf model. Ensure it is a valid 3D file.',
          variant: 'destructive',
        });
      }
    );
  };

  // URL input handler
  const handleLoadFromUrl = () => {
    if (!glbUrlInput.trim()) return;
    setIsLoadingGlb(true);

    const loader = new GLTFLoader();
    loader.load(
      glbUrlInput.trim(),
      (gltf) => {
        setIsLoadingGlb(false);
        const name = glbUrlInput.split('/').pop()?.split('?')[0] || 'Remote 3D Model';
        applyCustomGLTF(gltf.scene, name, customModelTarget, gltf.animations);
      },
      undefined,
      (err) => {
        setIsLoadingGlb(false);
        toast({
          title: 'URL Load Error',
          description: 'Failed to fetch .glb from URL. Ensure CORS is enabled on the host.',
          variant: 'destructive',
        });
      }
    );
  };

  // Reset to Built-in Sculpted PS3 Models
  const handleResetModels = () => {
    if (threeRef.current) {
      if (customStrikerModelRef.current) {
        threeRef.current.scene.remove(customStrikerModelRef.current);
      }
      if (customKeeperModelRef.current) {
        threeRef.current.scene.remove(customKeeperModelRef.current);
      }
      threeRef.current.strikerGroup.visible = true;
      threeRef.current.keeperGroup.visible = true;
    }
    customStrikerModelRef.current = null;
    customKeeperModelRef.current = null;
    strikerRigRef.current = null;
    keeperRigRef.current = null;
    setCustomModelLoaded(null);
    toast({
      title: 'Restored Built-in PS3 Models',
      description: 'Mbappé #10 & Courtois #1 active.',
    });
  };

  // AI Spectator turns
  useEffect(() => {
    if (matchState === 'aiming' && !isUserTurnToShoot && !isUserTurnToSave) {
      const timer = setTimeout(() => {
        const dirs: ShotDirection[] = ['left', 'centre', 'right'];
        const sChoice = dirs[Math.floor(Math.random() * dirs.length)];
        const kChoice = dirs[Math.floor(Math.random() * dirs.length)];
        resolveShot(sChoice, kChoice);
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [matchState, isUserTurnToShoot, isUserTurnToSave, resolveShot]);

  // =============================================================================
  // PS3-ERA TRUE HD 3D WEBGL ENGINE (CRISP 16:9 RENDERING & ZERO PIXELATION)
  // =============================================================================
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbfe3f7);
    scene.fog = new THREE.Fog(0xbfe3f7, 22, 55);

    // 2. CAMERA SETUP (Third-person elevated stadium broadcast camera)
    const camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 100);
    camera.position.set(0, 1.82, 4.8);
    camera.lookAt(0, 1.25, -6.5);

    // 3. WEBGL RENDERER: DYNAMIC PIXEL-RATIO CLAMPING UP TO 2.5 FOR RETINA SHARPNESS
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Dynamic resize handler to prevent any canvas stretching or pixelation
    const updateSize = () => {
      if (!container) return;
      const width = container.clientWidth || 1280;
      const height = container.clientHeight || 720;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, true);
    };
    updateSize();

    const resizeObserver = new ResizeObserver(() => updateSize());
    resizeObserver.observe(container);

    // 4. DAYLIGHT OUTDOOR SUN LIGHTING
    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x3d663d, 0.95);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbee, 2.2);
    sunLight.position.set(-6, 14, 7);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 40;
    sunLight.shadow.camera.left = -10;
    sunLight.shadow.camera.right = 10;
    sunLight.shadow.camera.top = 10;
    sunLight.shadow.camera.bottom = -10;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    // 5. NATURAL GREEN CUT-LAWN PITCH WITH REALISTIC MOWING PATTERN
    const pitchGeo = new THREE.PlaneGeometry(36, 44);
    const canvasTexture = document.createElement('canvas');
    canvasTexture.width = 1024;
    canvasTexture.height = 1024;
    const pctx = canvasTexture.getContext('2d')!;
    for (let i = 0; i < 16; i++) {
      pctx.fillStyle = i % 2 === 0 ? '#3f7c35' : '#4a8e3d';
      pctx.fillRect(0, i * 64, 1024, 64);
    }
    // High-resolution field perimeter and 18-yard box marking
    pctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    pctx.lineWidth = 10;
    pctx.strokeRect(30, 30, 964, 964);

    const turfTexture = new THREE.CanvasTexture(canvasTexture);
    turfTexture.wrapS = THREE.RepeatWrapping;
    turfTexture.wrapT = THREE.RepeatWrapping;
    turfTexture.repeat.set(2, 2);

    const pitchMat = new THREE.MeshStandardMaterial({
      map: turfTexture,
      roughness: 0.82,
      metalness: 0.04,
    });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.set(0, 0, -5);
    pitch.receiveShadow = true;
    scene.add(pitch);

    // Penalty Spot
    const spot = new THREE.Mesh(
      new THREE.CircleGeometry(0.09, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(0, 0.005, 0);
    scene.add(spot);

    // Goal Line
    const goalLine = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    goalLine.rotation.x = -Math.PI / 2;
    goalLine.position.set(0, 0.006, -7.2);
    scene.add(goalLine);

    // 6. CHAINLINK COURT FENCE & RED REBOUNDERS BEHIND GOAL
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x334155, wireframe: true, roughness: 0.9 });
    const fence = new THREE.Mesh(new THREE.PlaneGeometry(30, 6, 30, 8), fenceMat);
    fence.position.set(0, 3, -11.5);
    scene.add(fence);

    const rebounderMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 0.06), rebounderMat);
    r1.position.set(-5.6, 0.9, -11.2);
    scene.add(r1);

    const r2 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 0.06), rebounderMat);
    r2.position.set(5.6, 0.9, -11.2);
    scene.add(r2);

    // 7. 3D TUBULAR METALLIC GOALPOSTS & REALISTIC NET
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.22, metalness: 0.7 });
    const postRadius = 0.065;
    const goalWidth = 5.2;
    const goalHeight = 2.1;
    const goalZ = -7.2;

    const postL = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 28), postMat);
    postL.position.set(-goalWidth / 2, goalHeight / 2, goalZ);
    postL.castShadow = true;
    scene.add(postL);

    const postR = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 28), postMat);
    postR.position.set(goalWidth / 2, goalHeight / 2, goalZ);
    postR.castShadow = true;
    scene.add(postR);

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, goalWidth, 28), postMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, goalHeight, goalZ);
    crossbar.castShadow = true;
    scene.add(crossbar);

    const netGeo = new THREE.WireframeGeometry(new THREE.BoxGeometry(goalWidth, goalHeight, 1.6));
    const netMat = new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.55 });
    const netMesh = new THREE.LineSegments(netGeo, netMat);
    netMesh.position.set(0, goalHeight / 2, goalZ - 0.8);
    scene.add(netMesh);

    // 8. 3D SOCCER BALL WITH CHAMPIONS LEAGUE TEXTURE
    const ballRadius = 0.11;
    const ballGeo = new THREE.SphereGeometry(ballRadius, 36, 36);
    const ballMat = new THREE.MeshStandardMaterial({
      map: createSoccerBallTexture(),
      roughness: 0.35,
      metalness: 0.15,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.position.set(0, ballRadius, 0);
    ballMesh.castShadow = true;
    ballMesh.receiveShadow = true;
    scene.add(ballMesh);

    // 9. FC 26 COMPOSURE RING
    const compRingGeo = new THREE.RingGeometry(0.18, 0.22, 64);
    const compRingMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    const composureMesh = new THREE.Mesh(compRingGeo, compRingMat);
    composureMesh.rotation.x = -Math.PI / 2;
    composureMesh.position.set(0, 0.012, 0);
    scene.add(composureMesh);

    // 10. 3D AIMING TARGET RETICLES IN GOAL
    const createTargetMesh = () => {
      const group = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.24, 0.28, 36),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
      );
      group.add(ring);
      return group;
    };
    const targetLeftMesh = createTargetMesh();
    targetLeftMesh.position.set(-1.8, 1.2, goalZ + 0.1);
    scene.add(targetLeftMesh);

    const targetCentreMesh = createTargetMesh();
    targetCentreMesh.position.set(0, 1.2, goalZ + 0.1);
    scene.add(targetCentreMesh);

    const targetRightMesh = createTargetMesh();
    targetRightMesh.position.set(1.8, 1.2, goalZ + 0.1);
    scene.add(targetRightMesh);

    // =============================================================
    // 11. PS3 QUALITY SCULPTED 3D GOALKEEPER (COURTOIS #1)
    // =============================================================
    const keeperGroup = new THREE.Group();
    keeperGroup.position.set(0, 0, goalZ + 0.15);

    const keeperBody = new THREE.Group();
    const keeperTex = createKeeperJerseyTexture(1, 'COURTOIS');
    const keeperFaceTex = createFaceTexture(true);

    const keeperMat = new THREE.MeshStandardMaterial({ map: keeperTex, roughness: 0.48 });
    const skinKeeperMat = new THREE.MeshStandardMaterial({ map: keeperFaceTex, roughness: 0.65 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.75 });

    // Sculpted organic torso (smooth tapered capsule)
    const kTorsoGeo = new THREE.CapsuleGeometry(0.22, 0.44, 24, 36);
    kTorsoGeo.computeVertexNormals();
    const kTorso = new THREE.Mesh(kTorsoGeo, keeperMat);
    kTorso.position.y = 1.36;
    kTorso.castShadow = true;
    keeperBody.add(kTorso);

    // 3D Sculpted Head with athletic volume haircut
    const kHeadGeo = new THREE.SphereGeometry(0.12, 36, 28);
    kHeadGeo.computeVertexNormals();
    const kHead = new THREE.Mesh(kHeadGeo, skinKeeperMat);
    kHead.position.y = 1.78;
    kHead.castShadow = true;
    keeperBody.add(kHead);

    const kHairGeo = new THREE.SphereGeometry(0.124, 32, 24);
    const kHairMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const kHair = new THREE.Mesh(kHairGeo, kHairMat);
    kHair.position.set(0, 1.82, -0.02);
    keeperBody.add(kHair);

    // 3D Goalkeeper Arms with Padded Latex Match Gloves
    const keeperArmL = new THREE.Group();
    keeperArmL.position.set(-0.30, 1.54, 0);
    const armLGeo = new THREE.CapsuleGeometry(0.058, 0.44, 20, 28);
    armLGeo.computeVertexNormals();
    const armLMesh = new THREE.Mesh(armLGeo, keeperMat);
    armLMesh.position.y = -0.22;
    keeperArmL.add(armLMesh);

    // Professional Latex Palm Glove with Finger Spines
    const gloveL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.09), whiteMat);
    gloveL.position.y = -0.50;
    keeperArmL.add(gloveL);
    keeperBody.add(keeperArmL);

    const keeperArmR = new THREE.Group();
    keeperArmR.position.set(0.30, 1.54, 0);
    const armRGeo = new THREE.CapsuleGeometry(0.058, 0.44, 20, 28);
    armRGeo.computeVertexNormals();
    const armRMesh = new THREE.Mesh(armRGeo, keeperMat);
    armRMesh.position.y = -0.22;
    keeperArmR.add(armRMesh);

    const gloveR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.09), whiteMat);
    gloveR.position.y = -0.50;
    keeperArmR.add(gloveR);
    keeperBody.add(keeperArmR);

    // Goalkeeper Shorts & Sculpted Legs
    const kShorts = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.25, 0.34, 36), keeperMat);
    kShorts.position.y = 0.98;
    kShorts.castShadow = true;
    keeperBody.add(kShorts);

    const legGeo = new THREE.CapsuleGeometry(0.068, 0.66, 20, 28);
    legGeo.computeVertexNormals();

    const kLegL = new THREE.Mesh(legGeo, whiteMat);
    kLegL.position.set(-0.13, 0.45, 0);
    kLegL.castShadow = true;
    keeperBody.add(kLegL);

    const kLegR = new THREE.Mesh(legGeo, whiteMat);
    kLegR.position.set(0.13, 0.45, 0);
    kLegR.castShadow = true;
    keeperBody.add(kLegR);

    keeperGroup.add(keeperBody);

    // Check if custom Keeper model is active
    keeperGroup.visible = !customKeeperModelRef.current;
    scene.add(keeperGroup);
    if (customKeeperModelRef.current) {
      scene.add(customKeeperModelRef.current);
    }

    // =============================================================
    // 12. PS3 QUALITY SCULPTED 3D STRIKER (MBAPPÉ #10)
    // =============================================================
    const strikerGroup = new THREE.Group();
    strikerGroup.position.set(-0.48, 0, 0.55);

    const strikerTex = createStrikerJerseyTexture(currentShooter.number, currentShooter.name);
    const strikerFaceTex = createFaceTexture(false);

    const yellowMat = new THREE.MeshStandardMaterial({ map: strikerTex, roughness: 0.44 });
    const skinStrikerMat = new THREE.MeshStandardMaterial({ map: strikerFaceTex, roughness: 0.65 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28, metalness: 0.1 });
    const studMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });

    // Sculpted organic torso (smooth tapered cylinder with deltoids)
    const sTorsoGeo = new THREE.CapsuleGeometry(0.21, 0.44, 24, 36);
    sTorsoGeo.computeVertexNormals();
    const sTorso = new THREE.Mesh(sTorsoGeo, yellowMat);
    sTorso.position.y = 1.26;
    sTorso.castShadow = true;
    strikerGroup.add(sTorso);

    // Organic head with fade & facial features
    const sHeadGeo = new THREE.SphereGeometry(0.11, 36, 28);
    sHeadGeo.computeVertexNormals();
    const sHead = new THREE.Mesh(sHeadGeo, skinStrikerMat);
    sHead.position.y = 1.66;
    sHead.castShadow = true;
    strikerGroup.add(sHead);

    const sHairGeo = new THREE.SphereGeometry(0.113, 32, 24);
    const sHairMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.95 });
    const sHair = new THREE.Mesh(sHairGeo, sHairMat);
    sHair.position.set(0, 1.70, -0.01);
    strikerGroup.add(sHair);

    // Shoulders & Articulated Arms
    const strikerArmL = new THREE.Group();
    strikerArmL.position.set(-0.28, 1.44, 0);
    const sArmLGeo = new THREE.CapsuleGeometry(0.054, 0.42, 20, 28);
    sArmLGeo.computeVertexNormals();
    const sArmL = new THREE.Mesh(sArmLGeo, skinStrikerMat);
    sArmL.position.y = -0.20;
    strikerArmL.add(sArmL);
    strikerGroup.add(strikerArmL);

    const strikerArmR = new THREE.Group();
    strikerArmR.position.set(0.28, 1.44, 0);
    const sArmRGeo = new THREE.CapsuleGeometry(0.054, 0.42, 20, 28);
    sArmRGeo.computeVertexNormals();
    const sArmR = new THREE.Mesh(sArmRGeo, skinStrikerMat);
    sArmR.position.y = -0.20;
    strikerArmR.add(sArmR);
    strikerGroup.add(strikerArmR);

    // Shorts
    const sShorts = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.32, 36), darkMat);
    sShorts.position.y = 0.90;
    sShorts.castShadow = true;
    strikerGroup.add(sShorts);

    // Articulated legs with smooth capsule geometry and 3D cleats with studs
    const sLegLGeo = new THREE.CapsuleGeometry(0.066, 0.64, 20, 28);
    sLegLGeo.computeVertexNormals();

    const strikerLegL = new THREE.Group();
    strikerLegL.position.set(-0.13, 0.75, 0);
    const sLegLMesh = new THREE.Mesh(sLegLGeo, skinStrikerMat);
    sLegLMesh.position.y = -0.34;
    sLegLMesh.castShadow = true;
    strikerLegL.add(sLegLMesh);

    // Detailed 3D Soccer Cleats (Upper boot + Sole Plate + Studs)
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.20), bootMat);
    bootL.position.set(0, -0.68, -0.04);
    bootL.castShadow = true;
    strikerLegL.add(bootL);

    const studL1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.02, 12), studMat);
    studL1.position.set(0, -0.73, -0.08);
    strikerLegL.add(studL1);

    const studL2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.02, 12), studMat);
    studL2.position.set(0, -0.73, 0.02);
    strikerLegL.add(studL2);

    strikerGroup.add(strikerLegL);

    const strikerLegR = new THREE.Group();
    strikerLegR.position.set(0.13, 0.75, 0);
    const sLegRMesh = new THREE.Mesh(sLegLGeo, skinStrikerMat);
    sLegRMesh.position.y = -0.34;
    sLegRMesh.castShadow = true;
    strikerLegR.add(sLegRMesh);

    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.20), bootMat);
    bootR.position.set(0, -0.68, -0.04);
    bootR.castShadow = true;
    strikerLegR.add(bootR);

    const studR1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.02, 12), studMat);
    studR1.position.set(0, -0.73, -0.08);
    strikerLegR.add(studR1);

    const studR2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.02, 12), studMat);
    studR2.position.set(0, -0.73, 0.02);
    strikerLegR.add(studR2);

    strikerGroup.add(strikerLegR);

    // Check if custom Striker model is active
    strikerGroup.visible = !customStrikerModelRef.current;
    scene.add(strikerGroup);
    if (customStrikerModelRef.current) {
      scene.add(customStrikerModelRef.current);
    }

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

    // 13. RENDER LOOP (PS3 SMOOTH 60FPS)
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
      anim.composureRadius = radius * 70;
      composureMesh.scale.set(radius * 3.5, radius * 3.5, 1);

      if (radius < 0.24) {
        (compRingMat as THREE.MeshBasicMaterial).color.setHex(0x22c55e);
      } else if (radius < 0.35) {
        (compRingMat as THREE.MeshBasicMaterial).color.setHex(0xfacc15);
      } else {
        (compRingMat as THREE.MeshBasicMaterial).color.setHex(0xef4444);
      }

      const isAiming = matchState === 'aiming';
      composureMesh.visible = isAiming;
      targetLeftMesh.visible = isAiming;
      targetCentreMesh.visible = isAiming;
      targetRightMesh.visible = isAiming;

      if (isAiming) {
        targetLeftMesh.rotation.z += delta * 1.5;
        targetCentreMesh.rotation.z += delta * 1.5;
        targetRightMesh.rotation.z += delta * 1.5;
      }

      // Update custom GLB skeletal bone kinematics & animations
      applyStrikerMotion(strikerRigRef.current, matchState, anim, elapsed, delta);
      applyKeeperMotion(keeperRigRef.current, matchState, anim, elapsed, delta);

      // GOALKEEPER 3D MOTIONS & DIVES
      if (matchState === 'ball_flight' || matchState === 'shot_result') {
        const diveT = Math.min(1, anim.keeperT);
        let targetX = 0;
        let diveAngle = 0;
        const liftY = 0.35;

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

        if (customKeeperModelRef.current) {
          customKeeperModelRef.current.position.x = targetX;
          customKeeperModelRef.current.rotation.z = diveAngle * 0.8;
        }
      } else {
        const kIdle = Math.sin(elapsed * 6) * 0.03;
        keeperBody.position.y = kIdle;
        keeperBody.rotation.z = 0;
        keeperGroup.position.x = 0;
        keeperArmL.rotation.z = -0.2 + Math.sin(elapsed * 4) * 0.05;
        keeperArmR.rotation.z = 0.2 - Math.sin(elapsed * 4) * 0.05;

        if (customKeeperModelRef.current) {
          customKeeperModelRef.current.position.x = 0;
          customKeeperModelRef.current.rotation.z = 0;
        }
      }

      // STRIKER SKELETAL RUN-UP & KICK
      if (matchState === 'runup' || matchState === 'ball_flight' || matchState === 'shot_result') {
        const runupT = Math.min(1, anim.runup);
        const posX = -0.48 + runupT * 0.28;
        const posZ = 0.55 - runupT * 0.52;

        strikerGroup.position.x = posX;
        strikerGroup.position.z = posZ;

        if (customStrikerModelRef.current) {
          customStrikerModelRef.current.position.x = posX;
          customStrikerModelRef.current.position.z = posZ;
        }

        if (runupT < 0.7) {
          const stride = Math.sin(runupT * Math.PI * 6);
          strikerLegR.rotation.x = stride * 0.8;
          strikerLegL.rotation.x = -stride * 0.8;
          strikerArmR.rotation.x = -stride * 0.6;
          strikerArmL.rotation.x = stride * 0.6;
        } else {
          const kickCycle = (runupT - 0.7) / 0.3;
          strikerLegL.rotation.x = 0.1;
          strikerLegR.rotation.x = -0.9 + kickCycle * 1.8;
          strikerArmL.rotation.z = -0.4;
          strikerArmR.rotation.z = 0.4;
        }
      } else {
        strikerGroup.position.set(-0.48, 0, 0.55);
        strikerLegR.rotation.x = 0;
        strikerLegL.rotation.x = 0;
        strikerArmR.rotation.x = 0;
        strikerArmL.rotation.x = 0;
        sTorso.position.y = 1.26 + Math.sin(elapsed * 3) * 0.015;

        if (customStrikerModelRef.current) {
          customStrikerModelRef.current.position.set(-0.48, 0, 0.55);
        }
      }

      // 3D BALL TRAJECTORY & PARABOLIC FLIGHT
      if (matchState === 'ball_flight' || matchState === 'shot_result') {
        const flightT = Math.min(1, anim.ballT);

        let targetX = 0;
        if (anim.shotDir === 'left') targetX = -1.8;
        if (anim.shotDir === 'right') targetX = 1.8;

        let targetY = 1.2;
        if (anim.pitchElevation === 'low') targetY = 0.2;
        if (anim.pitchElevation === 'high') targetY = 1.85;
        if (anim.pitchElevation === 'panenka') targetY = 1.6;

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

        if (anim.scored && flightT > 0.75) {
          anim.netRipple = Math.sin((flightT - 0.75) * Math.PI * 4) * 0.22;
          netMesh.position.z = goalZ - 0.8 - anim.netRipple;
        }
      } else {
        ballMesh.position.set(0, ballRadius, 0);
        ballMesh.rotation.set(0, 0, 0);
        netMesh.position.set(0, goalHeight / 2, goalZ - 0.8);
      }

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

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.dispose();
      scene.clear();
    };
  }, [matchState, attackingTeam, currentShooter.number]);

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
          {/* Header */}
          <div className="rounded-2xl border border-[#35d399]/40 bg-gradient-to-r from-[#0d2218] via-[#081711] to-[#040e0a] p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#064e3b] p-1.5 border border-[#35d399]/40 shadow-sm">
                  <KatikaLogo className="h-full w-full" />
                </div>
                <div>
                  <span className="font-mono-custom text-[10px] uppercase tracking-widest text-[#35D399]">
                    PS3 REALISM · 1280x720 TRUE HD
                  </span>
                  <h1 className="text-lg font-black text-white">3v3 Penalty Shootout</h1>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowGlbGuide(true)}
                  className="flex items-center gap-1 rounded-full border border-yellow-400/40 bg-yellow-400/15 px-2.5 py-1 text-[11px] font-mono-custom font-bold text-yellow-300 hover:bg-yellow-400/25 transition-all shadow-sm"
                >
                  <BookOpen size={12} />
                  <span>.GLB Guide</span>
                </button>
                <div className="flex items-center gap-1 rounded-full border border-[#35D399]/40 bg-[#35D399]/15 px-2 py-1 text-[11px] font-mono-custom text-[#35D399]">
                  <Radio size={11} className="animate-pulse" />
                  <span>3D HD</span>
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs text-[#8FA39A] leading-relaxed">
              Console-grade 3D WebGL engine running at 1280×720 HD with ACES tone-mapping, soft shadows, sculpted PS3 player models, authentic FC composure ring, and 3v3 team cue.
            </p>
          </div>

          {/* Custom 3D Model (.GLB) Studio Bar */}
          <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-[#171c14] to-[#0f1410] p-3.5 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-[#facc15]" />
                <div>
                  <span className="text-xs font-bold text-white block">PS3 Custom 3D Model (.GLB)</span>
                  <span className="text-[10px] text-[#8FA39A]">
                    {customModelLoaded ? (
                      <span className="text-[#4ade80] font-semibold">Active: {customModelLoaded}</span>
                    ) : (
                      'Built-in: Sculpted HD Mbappé #10 & Courtois #1'
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {customModelLoaded && (
                  <button
                    type="button"
                    onClick={handleResetModels}
                    className="rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] font-mono-custom text-red-300 hover:bg-red-500/20"
                    title="Reset to default models"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowGlbGuide(true)}
                  className="text-[10px] font-mono-custom text-[#facc15] underline underline-offset-2 flex items-center gap-0.5"
                >
                  Where to get models?
                </button>
              </div>
            </div>

            {/* Sourced .GLB Model Presets */}
            <div className="space-y-1.5 border-t border-white/5 pt-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#94a3b8] font-mono-custom font-semibold">SOURCED .GLB PRESETS:</span>
                <span className="text-yellow-400 font-mono-custom text-[9px]">1-Click Active</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => loadPresetModel('striker')}
                  disabled={isLoadingGlb}
                  className={`rounded-xl border p-2 text-left transition-all ${
                    customModelLoaded === 'Generic Striker (.GLB)'
                      ? 'border-[#35D399] bg-[#35D399]/20 text-white shadow-sm'
                      : 'border-slate-800 bg-black/40 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="text-[10px] block font-mono-custom font-bold text-[#35D399]">⚡ Striker .GLB</span>
                  <span className="text-[9px] text-slate-400 block truncate">ReadyPlayerMe</span>
                </button>

                <button
                  type="button"
                  onClick={() => loadPresetModel('keeper')}
                  disabled={isLoadingGlb}
                  className={`rounded-xl border p-2 text-left transition-all ${
                    customModelLoaded === 'Generic Keeper (.GLB)'
                      ? 'border-[#38bdf8] bg-[#38bdf8]/20 text-white shadow-sm'
                      : 'border-slate-800 bg-black/40 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="text-[10px] block font-mono-custom font-bold text-[#38bdf8]">🧤 Keeper .GLB</span>
                  <span className="text-[9px] text-slate-400 block truncate">Mixamo Athlete</span>
                </button>

                <button
                  type="button"
                  onClick={() => loadPresetModel('both')}
                  disabled={isLoadingGlb}
                  className={`rounded-xl border p-2 text-left transition-all ${
                    customModelLoaded?.includes('Striker + Keeper')
                      ? 'border-yellow-400 bg-yellow-400/20 text-white shadow-sm'
                      : 'border-slate-800 bg-black/40 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="text-[10px] block font-mono-custom font-bold text-yellow-400">⭐ Both .GLBs</span>
                  <span className="text-[9px] text-slate-400 block truncate">Dual 3D Models</span>
                </button>
              </div>
            </div>

            {/* Target Selector: Striker or Goalkeeper for custom uploads */}
            <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-2 text-[11px]">
              <span className="text-[#94a3b8] text-[10px]">Custom Upload Target:</span>
              <div className="flex gap-1">
                {(['striker', 'keeper', 'both'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCustomModelTarget(t)}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-mono-custom uppercase transition-colors ${
                      customModelTarget === t
                        ? 'bg-yellow-400 text-black font-black'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Buttons & URL Input */}
            <div className="flex items-center gap-2 pt-1">
              <label className="cursor-pointer flex-1 rounded-xl border border-[#facc15]/50 bg-[#facc15]/20 px-3 py-2 text-xs font-mono-custom font-bold text-[#facc15] hover:bg-[#facc15]/30 flex items-center justify-center gap-1.5 transition-all shadow-sm">
                <Upload size={14} />
                <span>{isLoadingGlb ? 'Loading...' : 'Upload Any .GLB'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".glb,.gltf"
                  onChange={handleGLBUpload}
                  className="hidden"
                />
              </label>

              <div className="flex-1 flex gap-1">
                <input
                  type="text"
                  placeholder="Or paste .glb URL"
                  value={glbUrlInput}
                  onChange={(e) => setGlbUrlInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-black/50 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
                <button
                  type="button"
                  onClick={handleLoadFromUrl}
                  disabled={!glbUrlInput.trim() || isLoadingGlb}
                  className="rounded-xl border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-mono-custom text-white hover:bg-white/20 disabled:opacity-40"
                >
                  Load
                </button>
              </div>
            </div>
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
              {[5, 10, 25, 50].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStake(val)}
                  className={`rounded-xl border py-2 text-center font-mono-custom text-xs font-bold transition-all ${
                    stake === val
                      ? 'border-[#35D399] bg-[#35D399] text-black shadow-md shadow-[#35D399]/20'
                      : 'border-[#1C3A2E] bg-black/30 text-[#8FA39A] hover:border-[#35D399]/50 hover:text-white'
                  }`}
                >
                  {val} KTK
                </button>
              ))}
            </div>
          </div>

          {/* Goalkeeper Control Preference */}
          <div className="rounded-xl border border-[#1C3A2E] bg-[#0E1A16] p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-[#35D399]" />
              <div>
                <span className="text-xs font-semibold text-white block">Full Squad Goalkeeping</span>
                <span className="text-[10px] text-[#8FA39A]">
                  {keeperControlAll ? 'You control keeper on all rival penalty turns' : 'Squad rotates keeper role'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setKeeperControlAll(!keeperControlAll)}
              className={`rounded-lg px-2.5 py-1 font-mono-custom text-[11px] font-bold transition-colors ${
                keeperControlAll ? 'bg-[#35D399] text-black' : 'bg-white/10 text-white'
              }`}
            >
              {keeperControlAll ? 'ENABLED' : 'ROTATING'}
            </button>
          </div>

          {/* Action Button: Join 3v3 Matchmaking Cue */}
          <button
            type="button"
            onClick={handleJoinCue}
            className="w-full rounded-2xl bg-gradient-to-r from-[#35D399] to-[#10b981] py-4 text-center font-mono-custom text-base font-black text-black shadow-xl shadow-[#35D399]/20 transition-all hover:brightness-110 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <Swords size={20} />
            <span>JOIN 3v3 CUE (START SHOOTOUT)</span>
          </button>
        </div>
      ) : matchState === 'queue_matching' ? (
        /* ============================================================= */
        /* VIEW B: 3V3 MATCHMAKING RADAR CUE SCREEN                      */
        /* ============================================================= */
        <div className="flex flex-col items-center justify-center py-12 px-4 space-y-6 text-center">
          <div className="relative">
            <div className="h-32 w-32 rounded-full border-2 border-[#35D399]/40 bg-[#064e3b]/20 flex items-center justify-center animate-pulse">
              <div className="h-24 w-24 rounded-full border border-[#35D399]/60 flex items-center justify-center">
                <Users size={40} className="text-[#35D399] animate-bounce" />
              </div>
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-[#35D399] animate-ping opacity-25" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">Matchmaking 3 vs 3 Arena</h2>
            <p className="mt-1 font-mono-custom text-xs text-[#35D399]">{queueStatusText}</p>
          </div>

          {/* 6 Cue Slots Filling */}
          <div className="w-full max-w-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-mono-custom text-slate-300">
              <span>PLAYERS CONNECTED:</span>
              <span className="font-bold text-[#35D399]">{queuePlayersFound} / 6</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className={`h-12 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    idx < queuePlayersFound
                      ? 'border-[#35D399] bg-[#35D399]/20 text-[#35D399]'
                      : 'border-slate-800 bg-black/40 text-slate-600'
                  }`}
                >
                  <Users size={16} />
                  <span className="text-[9px] font-mono-custom mt-0.5">#{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-[#8FA39A] max-w-xs leading-relaxed">
            Assembling 3-player squads for Team Katika & Team Rivals. Each player takes alternating penalty shots and saves.
          </div>
        </div>
      ) : (
        /* ============================================================= */
        /* VIEW C: LIVE 3D STADIUM SHOOTOUT MATCH (PS3 1280x720 TRUE HD) */
        /* ============================================================= */
        <div className="space-y-2 pt-1">
          {/* Top Scoreboard: EA FC Broadcast Card */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/95 via-slate-950/95 to-slate-900/95 p-3 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#064e3b] text-xs font-black text-[#35D399] border border-[#35d399]/40 shadow-sm">
                  KAT
                </div>
                <div>
                  <span className="font-mono-custom text-xs font-black tracking-wider text-white">
                    KATIKA
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
              <div className="flex items-center gap-2">
                {customModelLoaded && (
                  <span className="font-mono-custom text-[9px] text-[#4ade80] bg-[#4ade80]/10 px-1.5 py-0.5 rounded border border-[#4ade80]/20">
                    3D: {customModelLoaded.slice(0, 12)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={toggleSound}
                  className="flex items-center gap-1 text-[#94a3b8] hover:text-white"
                >
                  {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
                </button>
              </div>
            </div>
          </div>

          {/* REAL-TIME 1280x720 TRUE HD 3D VIEWPORT (16:9 RATIO) */}
          <div className="relative mt-1 overflow-hidden rounded-3xl border-2 border-slate-700 bg-slate-950 shadow-2xl aspect-video w-full">
            <div
              ref={containerRef}
              onClick={handleCanvasClick}
              className="h-full w-full cursor-pointer [&>canvas]:h-full [&>canvas]:w-full [&>canvas]:block"
            />

            {/* Banner Notice */}
            {bannerNotice && (
              <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-yellow-400/60 bg-black/85 px-4 py-1 font-mono-custom text-[11px] font-black tracking-wider text-[#fde047] shadow-xl animate-fade-in backdrop-blur-sm whitespace-nowrap">
                {bannerNotice}
              </div>
            )}

            {/* Countdown Overlay */}
            {matchState === 'countdown' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                <div className="font-mono-custom text-7xl font-black text-[#fde047] drop-shadow-[0_4px_16px_rgba(250,204,21,0.6)] animate-ping">
                  {countdownNum}
                </div>
              </div>
            )}

            {/* Prompt bar from video */}
            {matchState === 'aiming' && (
              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-xl bg-black/75 px-4 py-1.5 font-sans text-xs font-semibold text-white shadow-lg backdrop-blur-md border border-white/10 whitespace-nowrap">
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
          <div className="mt-2">
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
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-3 text-center transition-all hover:border-[#4ade80] hover:bg-[#4ade80]/15 active:scale-95 shadow-lg"
                  >
                    <ChevronLeft size={24} className="text-[#4ade80] group-hover:-translate-x-1 transition-transform" />
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
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-3 text-center transition-all hover:border-[#fde047] hover:bg-[#fde047]/15 active:scale-95 shadow-lg"
                  >
                    <Zap size={24} className="text-[#fde047] group-hover:scale-110 transition-transform" />
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
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-3 text-center transition-all hover:border-[#4ade80] hover:bg-[#4ade80]/15 active:scale-95 shadow-lg"
                  >
                    <ChevronRight size={24} className="text-[#4ade80] group-hover:translate-x-1 transition-transform" />
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
                    onClick={() => {
                      setMatchState('lobby');
                      setScoreTeamA(0);
                      setScoreTeamB(0);
                      setShotsA([null, null, null]);
                      setShotsB([null, null, null]);
                      setCurrentRound(1);
                      setCurrentKickerSlot(0);
                      setAttackingTeam('A');
                    }}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-[#35D399] to-[#10b981] py-3 font-mono-custom text-xs font-black text-black shadow-lg"
                  >
                    PLAY AGAIN
                  </button>
                  <Link
                    href="/pvp"
                    className="flex-1 rounded-2xl border border-slate-700 bg-black/40 py-3 font-mono-custom text-xs font-bold text-white hover:bg-white/10 flex items-center justify-center"
                  >
                    EXIT TO PVP FLOOR
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-center backdrop-blur-sm">
                <div className="flex items-center justify-center gap-2 font-mono-custom text-xs text-[#35D399]">
                  <Flame size={14} className="animate-pulse" />
                  <span>
                    {matchState === 'runup'
                      ? `${currentShooter.name} is sprinting up to the ball...`
                      : matchState === 'ball_flight'
                      ? 'Ball in flight towards goal!'
                      : 'Resolving penalty outcome...'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: WHERE TO GET PS3 FIFA .GLB 3D MODELS GUIDE             */}
      {/* ============================================================= */}
      {showGlbGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-yellow-500/40 bg-gradient-to-b from-[#171d18] via-[#0d1410] to-[#070b09] p-5 text-white shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-[#facc15]" />
                <div>
                  <h3 className="text-base font-black text-white">Where to Get PS3 FIFA .GLB Models</h3>
                  <span className="text-[10px] font-mono-custom text-[#35D399]">PS3 Graphics & Custom Rigs</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGlbGuide(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-slate-300 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Introduction */}
            <p className="text-xs text-[#cbd5e1] leading-relaxed">
              Katika Bet supports any standard <strong>glTF 2.0 Binary (.glb)</strong> 3D model. The engine automatically rescales models to 1.85m human height and snaps them directly to the penalty spot with soft contact shadows.
            </p>

            {/* Source 1: Sketchfab */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono-custom text-xs font-black text-[#38bdf8]">
                  1. Sketchfab (The #1 Source for FIFA Models)
                </span>
                <span className="text-[9px] font-mono-custom text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                  Direct .GLB Download
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Sketchfab has thousands of free FIFA 14, PS3, and modern football player models with complete textures.
              </p>
              <div className="bg-white/5 p-2 rounded-xl text-[11px] text-[#e2e8f0] space-y-1">
                <div><strong>Best Search Queries:</strong> <code className="text-yellow-300">"FIFA 14 player"</code>, <code className="text-yellow-300">"Mbappe rigged glb"</code>, <code className="text-yellow-300">"Soccer player gltf"</code>, <code className="text-yellow-300">"Courtois 3d model"</code>.</div>
                <div><strong>How to download:</strong> Filter by <em>"Downloadable"</em> &rarr; Click <em>"Download 3D Model"</em> &rarr; Select <strong>glTF (.glb)</strong> format.</div>
              </div>
            </div>

            {/* Source 2: The Models Resource */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono-custom text-xs font-black text-[#facc15]">
                  2. The Models Resource (Original PS3 Discs)
                </span>
                <span className="text-[9px] font-mono-custom text-yellow-300 bg-yellow-400/10 px-2 py-0.5 rounded">
                  Authentic PS3 Rips
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Contains the exact ripped character models, face meshes, and kits directly extracted from the original PlayStation 3 game discs!
              </p>
              <div className="bg-white/5 p-2 rounded-xl text-[11px] text-[#e2e8f0] space-y-1">
                <div><strong>URL:</strong> <span className="text-sky-300">models-resource.com</span> &rarr; PlayStation 3 &rarr; <strong>FIFA 11 / 12 / 13 / 14</strong> or <strong>PES 2013</strong>.</div>
                <div><strong>Format:</strong> Downloads as OBJ/FBX with PNG textures. Convert to <code>.glb</code> in 5 seconds via <span className="text-yellow-300">gltf.report</span>.</div>
              </div>
            </div>

            {/* Source 3: Mixamo by Adobe */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono-custom text-xs font-black text-[#a855f7]">
                  3. Mixamo by Adobe (100% Free Athletes & Mocap)
                </span>
                <span className="text-[9px] font-mono-custom text-purple-300 bg-purple-400/10 px-2 py-0.5 rounded">
                  Free Characters & Mocap
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Adobe provides high-poly realistic humanoid athletic characters (e.g. Malcolm, Remy, Douglas) with free motion-capture soccer kicks and dives.
              </p>
              <div className="bg-white/5 p-2 rounded-xl text-[11px] text-[#e2e8f0] space-y-1">
                <div><strong>URL:</strong> <span className="text-sky-300">mixamo.com</span> (Free Adobe login).</div>
                <div><strong>Download:</strong> Export as FBX, drop into Blender or online converter to save as <code>.glb</code>.</div>
              </div>
            </div>

            {/* Source 4: Ready Player Me */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono-custom text-xs font-black text-[#35D399]">
                  4. Ready Player Me (Custom Soccer Avatar)
                </span>
                <span className="text-[9px] font-mono-custom text-emerald-300 bg-emerald-400/10 px-2 py-0.5 rounded">
                  Instant .GLB
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Create a personalized soccer avatar with custom face, hairstyle, and kit, and download directly as a clean <code>.glb</code> file.
              </p>
            </div>

            {/* Conversion Tip */}
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs text-yellow-200/90 leading-relaxed flex items-start gap-2">
              <Info size={16} className="text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <strong>Quick 1-Click Converter:</strong> If you have an <code>.fbx</code> or <code>.obj</code> model, drop it into{' '}
                <span className="font-mono text-yellow-300 underline">gltf.report</span> or <span className="font-mono text-yellow-300 underline">threejs.org/editor</span> and export as <strong>Binary (.glb)</strong>!
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowGlbGuide(false)}
              className="w-full rounded-2xl bg-gradient-to-r from-[#35D399] to-[#10b981] py-3 text-center font-mono-custom text-xs font-black text-black shadow-lg"
            >
              GOT IT, RETURN TO GAME
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
