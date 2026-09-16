import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Dice3DProps {
  busy: boolean;
  roll: number | null;
  target?: number;
  prediction?: 'over' | 'under';
  won?: boolean;
  className?: string;
}

// Generates canvas texture for each face (1 through 6) with Katika luxury emerald & gold casino styling
function createPipTexture(num: number, centerText?: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Background gradient: rich deep emerald with carbon texture
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#102e23');
  grad.addColorStop(0.5, '#071812');
  grad.addColorStop(1, '#020b08');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Outer border chamfer
  ctx.strokeStyle = '#35d399';
  ctx.lineWidth = 16;
  ctx.strokeRect(16, 16, 480, 480);

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.lineWidth = 6;
  ctx.strokeRect(36, 36, 440, 440);

  // If a center number (1-100) is provided on the primary face
  if (centerText) {
    ctx.font = '900 180px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#35d399';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(centerText, 256, 230);

    ctx.shadowBlur = 0;
    ctx.font = '700 32px monospace';
    ctx.fillStyle = '#f3d37a';
    ctx.fillText('KATIKA ROLL', 256, 360);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Draw traditional pips with gold glow
  const drawPip = (x: number, y: number) => {
    ctx.save();
    ctx.shadowColor = '#f3d37a';
    ctx.shadowBlur = 18;
    const pipGrad = ctx.createRadialGradient(x, y, 6, x, y, 36);
    pipGrad.addColorStop(0, '#ffffff');
    pipGrad.addColorStop(0.4, '#fef08a');
    pipGrad.addColorStop(0.8, '#d4af37');
    pipGrad.addColorStop(1, '#854d0e');
    ctx.fillStyle = pipGrad;
    ctx.beginPath();
    ctx.arc(x, y, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const c = 256;
  const l = 130;
  const r = 382;
  const t = 130;
  const b = 382;

  switch (num) {
    case 1:
      drawPip(c, c);
      break;
    case 2:
      drawPip(l, t);
      drawPip(r, b);
      break;
    case 3:
      drawPip(l, t);
      drawPip(c, c);
      drawPip(r, b);
      break;
    case 4:
      drawPip(l, t);
      drawPip(r, t);
      drawPip(l, b);
      drawPip(r, b);
      break;
    case 5:
      drawPip(l, t);
      drawPip(r, t);
      drawPip(c, c);
      drawPip(l, b);
      drawPip(r, b);
      break;
    case 6:
      drawPip(l, t);
      drawPip(r, t);
      drawPip(l, c);
      drawPip(r, c);
      drawPip(l, b);
      drawPip(r, b);
      break;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function Dice3D({ busy, roll, target, prediction, won, className = '' }: Dice3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const animStateRef = useRef({
    busy: false,
    startTime: 0,
    duration: 850,
    startRotX: 0,
    startRotY: 0,
    startRotZ: 0,
    targetRotX: 0,
    targetRotY: 0,
    targetRotZ: 0,
    bouncing: false,
    bounceStart: 0,
  });
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 280;
    const height = container.clientHeight || 200;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 5.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xd1fae5, 1.2);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.6);
    mainLight.position.set(3, 5, 4);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x35d399, 2.0);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    const goldPoint = new THREE.PointLight(0xfef08a, 1.8, 6);
    goldPoint.position.set(0, -2, 2);
    scene.add(goldPoint);

    // Felt table shadow floor
    const shadowGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x030806,
      transparent: true,
      opacity: 0.55,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.35;
    scene.add(shadowMesh);

    // Box Geometry
    const geometry = new THREE.BoxGeometry(1.8, 1.8, 1.8);

    // 6 faces: +X, -X, +Y, -Y, +Z, -Z
    // Standard dice arrangement:
    // Face 0: Right (2)
    // Face 1: Left (5)
    // Face 2: Top (3)
    // Face 3: Bottom (4)
    // Face 4: Front (1 or current Roll)
    // Face 5: Back (6)
    const textures = [
      createPipTexture(2),
      createPipTexture(5),
      createPipTexture(3),
      createPipTexture(4),
      createPipTexture(1, roll ? String(roll) : '?'),
      createPipTexture(6),
    ];

    const materials = textures.map(
      (tex) =>
        new THREE.MeshStandardMaterial({
          map: tex,
          metalness: 0.35,
          roughness: 0.25,
        }),
    );
    materialsRef.current = materials;

    const diceMesh = new THREE.Mesh(geometry, materials);
    diceMesh.castShadow = true;
    scene.add(diceMesh);
    meshRef.current = diceMesh;

    // Slight initial angle so multiple faces are visible in 3D
    diceMesh.rotation.set(0.35, 0.45, 0);

    // Mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = x * 0.45;
      mouseRef.current.targetY = y * 0.45;
    };
    container.addEventListener('mousemove', handleMouseMove);

    let reqId = 0;
    const clock = new THREE.Clock();

    const render = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      const state = animStateRef.current;

      if (state.busy) {
        const progress = Math.min((performance.now() - state.startTime) / state.duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);

        diceMesh.rotation.x = THREE.MathUtils.lerp(state.startRotX, state.targetRotX, ease);
        diceMesh.rotation.y = THREE.MathUtils.lerp(state.startRotY, state.targetRotY, ease);
        diceMesh.rotation.z = THREE.MathUtils.lerp(state.startRotZ, state.targetRotZ, ease);

        // Toss up in 3D space
        const jump = Math.sin(progress * Math.PI) * 1.5;
        diceMesh.position.y = jump;
        diceMesh.position.z = Math.sin(progress * Math.PI) * 0.8;

        // Shadow scales with height
        shadowMesh.scale.setScalar(1 - (jump / 1.5) * 0.4);
        shadowMat.opacity = 0.55 - (jump / 1.5) * 0.3;

        if (progress >= 1) {
          state.busy = false;
          state.bouncing = true;
          state.bounceStart = performance.now();
        }
      } else if (state.bouncing) {
        const bounceTime = (performance.now() - state.bounceStart) / 1000;
        if (bounceTime < 0.55) {
          const decay = Math.exp(-bounceTime * 7);
          diceMesh.position.y = Math.abs(Math.sin(bounceTime * 22) * decay * 0.45);
          diceMesh.position.z = 0;
          diceMesh.rotation.z = state.targetRotZ + Math.sin(bounceTime * 18) * decay * 0.2;
          shadowMesh.scale.setScalar(1);
          shadowMat.opacity = 0.55;
        } else {
          diceMesh.position.y = 0;
          diceMesh.position.z = 0;
          diceMesh.rotation.z = state.targetRotZ;
          state.bouncing = false;
        }
      } else {
        // Idle hover with mouse parallax
        diceMesh.position.y = Math.sin(elapsed * 2.0) * 0.08;
        diceMesh.rotation.x = THREE.MathUtils.lerp(
          diceMesh.rotation.x,
          state.targetRotX + mouseRef.current.y * 0.4,
          0.08,
        );
        diceMesh.rotation.y = THREE.MathUtils.lerp(
          diceMesh.rotation.y,
          state.targetRotY + mouseRef.current.x * 0.5,
          0.08,
        );
      }

      renderer.render(scene, camera);
      reqId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 280;
      const h = container.clientHeight || 200;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      shadowGeo.dispose();
      shadowMat.dispose();
    };
  }, []);

  // Update front face texture whenever roll updates
  useEffect(() => {
    if (materialsRef.current[4]) {
      const oldTex = materialsRef.current[4].map;
      const newTex = createPipTexture(1, roll !== null ? String(roll) : '?');
      materialsRef.current[4].map = newTex;
      materialsRef.current[4].needsUpdate = true;
      if (oldTex) oldTex.dispose();
    }
  }, [roll]);

  // Handle spin trigger
  useEffect(() => {
    if (busy) {
      const dice = meshRef.current;
      if (!dice) return;

      const currentX = dice.rotation.x;
      const currentY = dice.rotation.y;
      const currentZ = dice.rotation.z;

      // 4 to 6 full rotations
      const targetX = Math.round(currentX / (Math.PI * 2)) * Math.PI * 2 + Math.PI * 4;
      const targetY = Math.round(currentY / (Math.PI * 2)) * Math.PI * 2 + Math.PI * 4;
      const targetZ = Math.round(currentZ / (Math.PI * 2)) * Math.PI * 2;

      animStateRef.current = {
        busy: true,
        startTime: performance.now(),
        duration: 750,
        startRotX: currentX,
        startRotY: currentY,
        startRotZ: currentZ,
        targetRotX: targetX,
        targetRotY: targetY,
        targetRotZ: targetZ,
        bouncing: false,
        bounceStart: 0,
      };
    }
  }, [busy]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center cursor-grab active:cursor-grabbing select-none ${className}`}
      style={{ width: '100%', height: '100%', minHeight: '200px' }}
      title="Interactive 3D Casino Dice"
    />
  );
}
