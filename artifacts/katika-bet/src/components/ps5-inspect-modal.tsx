import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import {
  X,
  RotateCw,
  Sun,
  ShieldCheck,
  Zap,
  Flame,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  Gamepad2,
} from 'lucide-react';
import type { LegendCardData } from './legend-card';

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function kit(position: string) {
  if (position === 'GK') return { shirt: 0xf2c14e, stripe: 0x062018 };
  if (position === 'CB' || position === 'LB' || position === 'RB') return { shirt: 0x2f6bff, stripe: 0xdce7ff };
  if (position === 'CDM' || position === 'CM' || position === 'CAM') return { shirt: 0x35d399, stripe: 0x062018 };
  return { shirt: 0xe11d48, stripe: 0xfff1f3 };
}

// Procedural texture generators for inspect viewport
function createInspectFabricNormal(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 4) {
      for (let x = 0; x < 64; x += 4) {
        const offset = (y / 4) % 2 === 0 ? 0 : 2;
        ctx.fillStyle = '#7a7aff';
        ctx.fillRect(x + offset, y, 2, 2);
        ctx.fillStyle = '#8a8aff';
        ctx.fillRect(x + offset + 2, y + 2, 2, 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

function createInspectIris(seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const cx = 64;
  const cy = 64;

  const eyeColorChoice = seed % 3;
  const irisHues = ['#285437', '#4a2f1c', '#1e384d'];
  const baseColor = irisHues[eyeColorChoice];

  const grad = ctx.createRadialGradient(cx, cy, 18, cx, cy, 60);
  grad.addColorStop(0, '#0c120e');
  grad.addColorStop(0.35, baseColor);
  grad.addColorStop(0.85, '#121f18');
  grad.addColorStop(1, '#050a08');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 36; i++) {
    ctx.rotate((Math.PI * 2) / 36);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)';
    ctx.fillRect(18, -1.2, 38, 2.4);
  }
  ctx.restore();

  ctx.fillStyle = '#050706';
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(cx - 10, cy - 10, 6.5, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

function createInspectCrest(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);

  ctx.fillStyle = '#d4af37';
  ctx.beginPath();
  ctx.moveTo(64, 12);
  ctx.lineTo(108, 28);
  ctx.lineTo(98, 86);
  ctx.lineTo(64, 116);
  ctx.lineTo(30, 86);
  ctx.lineTo(20, 28);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#0a2318';
  ctx.beginPath();
  ctx.moveTo(64, 20);
  ctx.lineTo(100, 34);
  ctx.lineTo(92, 82);
  ctx.lineTo(64, 108);
  ctx.lineTo(36, 82);
  ctx.lineTo(28, 34);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f3d37a';
  ctx.font = 'bold 50px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('K', 64, 62);

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(64, 28, 3.5, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

/**
 * PS5 360-Degree Interactive 3D Turntable & Inspect Modal
 */
export function PS5InspectModal({
  isOpen,
  onClose,
  legend,
}: {
  isOpen: boolean;
  onClose: () => void;
  legend: LegendCardData;
}) {
  const canvasContainer = useRef<HTMLDivElement>(null);
  const [lightingMode, setLightingMode] = useState<'stadium' | 'golden' | 'cyber'>('stadium');
  const [cameraView, setCameraView] = useState<'bust' | 'face' | 'full'>('bust');
  const [activeStat, setActiveStat] = useState<string | null>(null);

  const seed = useMemo(() => hash(`${legend.name}|${legend.position}`), [legend.name, legend.position]);
  const colors = kit(legend.position);
  const tone = ((seed >> 8) % 40) / 100;
  const skinHex =
    (Math.floor((0.38 + tone) * 255) << 16) +
    (Math.floor((0.24 + tone * 0.45) * 255) << 8) +
    Math.floor((0.15 + tone * 0.2) * 255);

  const overall = Math.round(
    ((legend.pace ?? 50) +
      (legend.shooting ?? 50) +
      (legend.passing ?? 50) +
      (legend.dribbling ?? 50) +
      (legend.defending ?? 50) +
      (legend.physical ?? 50)) /
      6,
  );

  // 3D Scene Ref & Drag State
  const rotationRef = useRef({ y: 0, x: 0, targetY: 0, targetX: 0 });
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen) return;
    const el = canvasContainer.current;
    if (!el) return;

    const w = el.clientWidth || 360;
    const h = el.clientHeight || 420;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 20);

    // Initial camera position based on preset
    const camZ = cameraView === 'face' ? 1.8 : cameraView === 'bust' ? 2.8 : 3.6;
    const camY = cameraView === 'face' ? 0.72 : 0.48;
    camera.position.set(0, camY, camZ);
    camera.lookAt(0, camY, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);

    // PS5 Tone Mapping
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    el.innerHTML = '';
    el.appendChild(renderer.domElement);

    // Dynamic Lighting based on selected mode
    const keyLight = new THREE.DirectionalLight(
      lightingMode === 'golden' ? 0xffeaae : lightingMode === 'cyber' ? 0xa5f3fc : 0xfff6e6,
      lightingMode === 'golden' ? 2.5 : 2.2,
    );
    keyLight.position.set(2.4, 3.5, 2.5);

    const rim1 = new THREE.DirectionalLight(
      lightingMode === 'golden' ? 0xf59e0b : lightingMode === 'cyber' ? 0x06b6d4 : 0x35d399,
      3.2,
    );
    rim1.position.set(-3.2, 1.8, -2.0);

    const rim2 = new THREE.DirectionalLight(
      lightingMode === 'golden' ? 0xfcd34d : lightingMode === 'cyber' ? 0xf43f5e : 0xf3d37a,
      2.4,
    );
    rim2.position.set(2.6, 0.8, -1.8);

    const ambient = new THREE.AmbientLight(0x283e33, 0.8);
    const groundBounce = new THREE.DirectionalLight(0x0f291e, 0.6);
    groundBounce.position.set(0, -1.2, 1.0);

    scene.add(keyLight, rim1, rim2, ambient, groundBounce);

    // Build the high-fidelity 3D model
    const rig = new THREE.Group();
    scene.add(rig);

    const skin = new THREE.MeshPhysicalMaterial({
      color: skinHex,
      roughness: 0.52,
      metalness: 0.02,
      clearcoat: 0.32,
      clearcoatRoughness: 0.35,
    });

    const hairColor = seed % 3 === 0 ? 0x16100a : seed % 3 === 1 ? 0x090909 : 0x2b180d;
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.88 });

    const kitFabric = new THREE.MeshPhysicalMaterial({
      color: colors.shirt,
      roughness: 0.48,
      metalness: 0.08,
      sheen: 0.7,
      sheenRoughness: 0.35,
      sheenColor: new THREE.Color(colors.shirt).offsetHSL(0, 0.08, 0.15),
      normalMap: createInspectFabricNormal(),
    });

    const stripeMat = new THREE.MeshStandardMaterial({ color: colors.stripe, roughness: 0.35, metalness: 0.12 });
    const goldMetallic = new THREE.MeshStandardMaterial({ color: 0xf3d37a, roughness: 0.18, metalness: 0.95 });

    // Sculpted Head & Anatomy
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.41, 36, 28), skin);
    cranium.position.set(0, 0.76, 0);
    cranium.scale.set(0.9, 1.06, 0.92);
    rig.add(cranium);

    const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.38, 20), skin);
    jaw.position.set(0, 0.56, 0.08);
    jaw.rotation.x = Math.PI;
    jaw.scale.set(0.95, 0.85, 0.72);
    rig.add(jaw);

    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 14), skin);
    chin.position.set(0, 0.42, 0.22);
    chin.scale.set(1.1, 0.8, 0.9);
    rig.add(chin);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.16), skin);
    brow.position.set(0, 0.83, 0.32);
    brow.rotation.x = 0.05;
    rig.add(brow);

    const noseBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.065, 0.24, 12), skin);
    noseBridge.position.set(0, 0.69, 0.37);
    noseBridge.rotation.x = -0.22;
    rig.add(noseBridge);

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 12), skin);
    noseTip.position.set(0, 0.59, 0.42);
    noseTip.scale.set(1.1, 0.85, 0.95);
    rig.add(noseTip);

    // Next-Gen Eyes with Cornea Catchlight
    const irisTex = createInspectIris(seed);
    const irisMat = new THREE.MeshBasicMaterial({ map: irisTex });
    const corneaMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.05,
      transmission: 0.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.9,
    });
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f3ed, roughness: 0.2 });

    for (const x of [-0.142, 0.142]) {
      const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.068, 20, 16), eyeWhiteMat);
      eyeball.position.set(x, 0.77, 0.3);
      eyeball.scale.set(1, 0.92, 1);
      rig.add(eyeball);

      const iris = new THREE.Mesh(new THREE.CircleGeometry(0.038, 24), irisMat);
      iris.position.set(x, 0.77, 0.366);
      rig.add(iris);

      const cornea = new THREE.Mesh(new THREE.SphereGeometry(0.046, 16, 12), corneaMat);
      cornea.position.set(x, 0.77, 0.368);
      cornea.scale.set(1, 1, 0.45);
      rig.add(cornea);

      const browHair = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.032, 0.06), hairMat);
      browHair.position.set(x, 0.84, 0.35);
      browHair.rotation.z = (x < 0 ? 1 : -1) * 0.08;
      rig.add(browHair);

      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 12), skin);
      ear.position.set(x * 2.65, 0.71, 0.02);
      ear.scale.set(0.35, 1.1, 0.7);
      ear.rotation.y = (x < 0 ? -1 : 1) * 0.25;
      rig.add(ear);
    }

    // Hairstyle
    const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 20, 0, Math.PI * 2, 0, Math.PI / 1.95), hairMat);
    topCap.position.set(0, 0.81, -0.02);
    topCap.scale.set(0.96, 1.05, 0.98);
    rig.add(topCap);

    // Muscular Neck & Traps
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.19, 0.28, 20), skin);
    neck.position.y = 0.36;
    rig.add(neck);

    const traps = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.28, 16), skin);
    traps.position.set(0, 0.24, -0.04);
    traps.scale.set(1.3, 0.65, 0.8);
    rig.add(traps);

    // Sculpted Athletic Kit Torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.48, 12, 24), kitFabric);
    torso.position.y = 0.02;
    torso.scale.set(1.18, 0.9, 0.62);
    rig.add(torso);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.028, 12, 28), stripeMat);
    collar.position.set(0, 0.26, 0.05);
    collar.rotation.x = Math.PI / 2.2;
    rig.add(collar);

    const collarGold = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.015, 8, 24), goldMetallic);
    collarGold.position.set(0, 0.25, 0.05);
    collarGold.rotation.x = Math.PI / 2.2;
    rig.add(collarGold);

    // Shoulders
    for (const sx of [-0.46, 0.46]) {
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), kitFabric);
      sh.position.set(sx, 0.16, 0);
      sh.scale.set(0.95, 1.05, 0.9);
      rig.add(sh);

      const st = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.28), stripeMat);
      st.position.set(sx, 0.15, 0);
      st.rotation.z = (sx < 0 ? -1 : 1) * 0.2;
      rig.add(st);
    }

    // Embossed Katika Gold Crest
    const crestMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.13, 0.13),
      new THREE.MeshStandardMaterial({
        map: createInspectCrest(),
        transparent: true,
        roughness: 0.22,
        metalness: 0.85,
      }),
    );
    crestMesh.position.set(-0.16, 0.14, 0.255);
    crestMesh.rotation.y = 0.22;
    rig.add(crestMesh);

    // Pointer Drag Listeners for 360 Turntable Spin
    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      rotationRef.current.targetY += dx * 0.012;
      rotationRef.current.targetX = Math.max(-0.4, Math.min(0.4, rotationRef.current.targetX + dy * 0.008));
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;

      // Smooth damping interpolation
      rotationRef.current.y += (rotationRef.current.targetY - rotationRef.current.y) * 0.1;
      rotationRef.current.x += (rotationRef.current.targetX - rotationRef.current.x) * 0.1;

      // Auto slow turntable spin if not dragging
      if (!isDraggingRef.current) {
        rotationRef.current.targetY += 0.004;
      }

      rig.rotation.y = rotationRef.current.y;
      rig.rotation.x = rotationRef.current.x;

      // Micro breathing
      rig.position.y = Math.sin(elapsed * 2.2) * 0.01;

      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      cancelAnimationFrame(frame);
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [isOpen, seed, colors.shirt, colors.stripe, skinHex, lightingMode, cameraView]);

  if (!isOpen) return null;

  // Radar chart points for the 6 attributes
  const statsList = [
    { key: 'pace', label: 'PAC', val: legend.pace ?? 50, perk: 'Reaction Speed & Turn Clock' },
    { key: 'shooting', label: 'SHO', val: legend.shooting ?? 50, perk: 'High Multipliers in House Games' },
    { key: 'passing', label: 'PAS', val: legend.passing ?? 50, perk: 'Katika 21 Double & Split Unlock' },
    { key: 'dribbling', label: 'DRI', val: legend.dribbling ?? 50, perk: 'Katika 21 Glance (Peek Shoe)' },
    { key: 'defending', label: 'DEF', val: legend.defending ?? 50, perk: '50% Loss Soak on 21 Defeat' },
    { key: 'physical', label: 'PHY', val: legend.physical ?? 50, perk: 'Daily Arena Clash Stamina Cap' },
  ];

  // SVG Hexagon Calculation
  const cx = 110;
  const cy = 110;
  const r = 85;

  const hexPoints = statsList.map((st, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const norm = Math.min(1, Math.max(0.2, st.val / 99));
    const px = cx + Math.cos(angle) * (r * norm);
    const py = cy + Math.sin(angle) * (r * norm);
    return `${px},${py}`;
  }).join(' ');

  const gridPoints = [0.4, 0.7, 1.0].map((level) => {
    return statsList.map((_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = cx + Math.cos(angle) * (r * level);
      const py = cy + Math.sin(angle) * (r * level);
      return `${px},${py}`;
    }).join(' ');
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative flex max-h-[92dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-[28px] border-2 border-[#d4af37]/60 bg-gradient-to-b from-[#10241c] via-[#091511] to-[#040a08] shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(53,211,153,0.2)]">
        {/* Header with PS5 Status */}
        <div className="flex items-center justify-between border-b border-[#1C3A2E] px-5 py-3.5 bg-[#0a1813]/90">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#35D399]/20 text-[#35D399]">
              <Gamepad2 size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono-custom text-xs font-black uppercase tracking-wider text-[#E8F2EC]">
                  PS5 3D INSPECT
                </h3>
                <span className="rounded bg-[#35D399]/20 px-1.5 py-0.2 font-mono-custom text-[9px] font-bold text-[#35D399]">
                  60 FPS NEXT-GEN
                </span>
              </div>
              <p className="text-[10px] text-[#8FA39A]">Interactive 360° Studio Showcase</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-[#1C3A2E] text-[#8FA39A] hover:bg-[#1C3A2E]/60 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Viewport */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 3D Turntable Stage */}
          <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-[#35D399]/30 bg-gradient-to-b from-[#0e241c] to-[#06120e] shadow-inner">
            <div ref={canvasContainer} className="h-full w-full cursor-grab active:cursor-grabbing" />

            {/* Turntable Hint */}
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-[#1C3A2E] bg-black/60 px-3 py-1 font-mono-custom text-[10px] text-[#c7d9d0] backdrop-blur-md">
              <RotateCw size={11} className="animate-spin text-[#35D399]" style={{ animationDuration: '4s' }} />
              <span>Drag to spin 360°</span>
            </div>

            {/* OVR Floating Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2 rounded-xl border border-[#f3d37a]/50 bg-black/70 p-1.5 px-2.5 backdrop-blur-md">
              <span className="font-mono-custom text-[10px] text-[#f3d37a]">OVR</span>
              <span className="font-mono-custom text-base font-black text-white">{overall}</span>
              <span className="rounded bg-[#35D399]/20 px-1 text-[10px] font-bold text-[#35D399]">
                {legend.position}
              </span>
            </div>

            {/* Lighting Mode Selector */}
            <div className="absolute top-3 right-3 flex items-center gap-1 rounded-xl border border-[#1C3A2E] bg-black/70 p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setLightingMode('stadium')}
                className={`rounded-lg px-2 py-1 text-[10px] font-mono-custom font-bold transition-all ${
                  lightingMode === 'stadium' ? 'bg-[#35D399] text-[#062018]' : 'text-[#8FA39A] hover:text-white'
                }`}
                title="Emerald Stadium Lights"
              >
                Stadium
              </button>
              <button
                type="button"
                onClick={() => setLightingMode('golden')}
                className={`rounded-lg px-2 py-1 text-[10px] font-mono-custom font-bold transition-all ${
                  lightingMode === 'golden' ? 'bg-[#f3d37a] text-[#1a0f02]' : 'text-[#8FA39A] hover:text-white'
                }`}
                title="Golden Hour Floodlights"
              >
                Gold
              </button>
              <button
                type="button"
                onClick={() => setLightingMode('cyber')}
                className={`rounded-lg px-2 py-1 text-[10px] font-mono-custom font-bold transition-all ${
                  lightingMode === 'cyber' ? 'bg-[#06b6d4] text-[#082f49]' : 'text-[#8FA39A] hover:text-white'
                }`}
                title="Cyber Neon Rim"
              >
                Cyber
              </button>
            </div>
          </div>

          {/* Camera View Selector */}
          <div className="flex items-center justify-between rounded-xl border border-[#1C3A2E] bg-[#091612] p-2 text-xs">
            <span className="text-[11px] font-semibold text-[#8FA39A]">Camera Lens:</span>
            <div className="flex gap-1.5">
              {(['face', 'bust', 'full'] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setCameraView(view)}
                  className={`rounded-lg px-2.5 py-1 font-mono-custom text-[10px] uppercase font-bold transition-all ${
                    cameraView === view
                      ? 'bg-[#35D399]/20 border border-[#35D399] text-[#35D399]'
                      : 'border border-transparent text-[#8FA39A] hover:text-white'
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          {/* 3D HEXAGON RADAR STAT CHART */}
          <div className="rounded-2xl border border-[#1C3A2E] bg-[#091612] p-4">
            <div className="flex items-center justify-between border-b border-[#1C3A2E] pb-2">
              <div className="flex items-center gap-1.5">
                <Zap size={14} className="text-[#35D399]" />
                <h4 className="font-mono-custom text-xs font-bold text-[#E8F2EC]">ATTRIBUTE RADAR</h4>
              </div>
              <span className="text-[10px] text-[#8FA39A]">FIFA / EA FC Icon Geometry</span>
            </div>

            <div className="mt-3 flex items-center justify-center">
              <svg width="220" height="220" className="overflow-visible">
                {/* Background Concentric Hexagon Grid */}
                {gridPoints.map((pts, idx) => (
                  <polygon
                    key={idx}
                    points={pts}
                    fill="none"
                    stroke="#1C3A2E"
                    strokeWidth={idx === 2 ? '1.5' : '1'}
                    strokeDasharray={idx < 2 ? '2,2' : undefined}
                  />
                ))}

                {/* Spokes from center */}
                {statsList.map((_, i) => {
                  const angle = (Math.PI / 3) * i - Math.PI / 2;
                  const px = cx + Math.cos(angle) * r;
                  const py = cy + Math.sin(angle) * r;
                  return <line key={i} x1={cx} y1={cy} x2={px} y2={py} stroke="#1C3A2E" strokeWidth="1" />;
                })}

                {/* Data Polygon */}
                <polygon
                  points={hexPoints}
                  fill="rgba(53, 211, 153, 0.3)"
                  stroke="#35D399"
                  strokeWidth="2.5"
                  className="filter drop-shadow-[0_0_8px_rgba(53,211,153,0.5)]"
                />

                {/* Stat Vertices & Labels */}
                {statsList.map((st, i) => {
                  const angle = (Math.PI / 3) * i - Math.PI / 2;
                  const norm = Math.min(1, Math.max(0.2, st.val / 99));
                  const px = cx + Math.cos(angle) * (r * norm);
                  const py = cy + Math.sin(angle) * (r * norm);

                  const lx = cx + Math.cos(angle) * (r + 18);
                  const ly = cy + Math.sin(angle) * (r + 18);

                  return (
                    <g
                      key={st.label}
                      className="cursor-pointer"
                      onClick={() => setActiveStat(st.label)}
                    >
                      {/* Vertex Dot */}
                      <circle cx={px} cy={py} r="4.5" fill="#f3d37a" stroke="#062018" strokeWidth="1.5" />
                      {/* Text Label */}
                      <text
                        x={lx}
                        y={ly + 4}
                        textAnchor="middle"
                        className="font-mono-custom text-[11px] font-bold fill-[#c7d9d0] hover:fill-[#35D399]"
                      >
                        {st.label} {st.val}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Active Stat Description */}
            <div className="mt-2 rounded-xl border border-[#35D399]/30 bg-[#07110e] p-2.5 text-xs">
              <span className="font-mono-custom font-bold text-[#f3d37a]">
                {activeStat ? `${activeStat}: ` : 'Gameplay Impact: '}
              </span>
              <span className="text-[#8FA39A]">
                {activeStat
                  ? statsList.find((s) => s.label === activeStat)?.perk
                  : 'Tap any stat vertex above to inspect how it alters Clash and 21 math.'}
              </span>
            </div>
          </div>

          {/* VERIFIED SEPOLIA SMART CONTRACT PASSPORT */}
          <div className="rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#172e24] to-[#0c1a14] p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#35D399]" />
                <span className="font-mono-custom text-xs font-bold text-[#f3d37a]">
                  Sepolia ERC-721 Contract
                </span>
              </div>
              <span className="rounded bg-[#f3d37a]/15 px-2 py-0.5 font-mono-custom text-[10px] font-bold text-[#f3d37a]">
                {legend.mint ? `TOKEN #${legend.mint.tokenId}` : 'READY TO MINT'}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 font-mono-custom text-[11px] text-[#8FA39A]">
              <div>
                <span>Contract Address:</span>
                <p className="truncate font-semibold text-[#E8F2EC]">0x600f...3e9B</p>
              </div>
              <div>
                <span>Physical Architecture:</span>
                <p className="font-semibold text-[#35D399]">3D PBR WebGL</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#1C3A2E] bg-[#07110e] px-5 py-3 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#35D399] py-2.5 font-mono-custom text-xs font-bold text-[#062018] shadow-[0_0_20px_rgba(53,211,153,0.3)] hover:opacity-95"
          >
            Close 3D Viewport
          </button>
        </div>
      </div>
    </div>
  );
}
