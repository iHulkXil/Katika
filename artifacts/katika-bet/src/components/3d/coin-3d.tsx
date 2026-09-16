import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Coin3DProps {
  busy: boolean;
  result: 'heads' | 'tails' | null;
  side: 'heads' | 'tails';
  className?: string;
}

function createFaceTexture(label: 'HEADS' | 'TAILS'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Background radial gold
  const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 250);
  grad.addColorStop(0, '#fff6d1');
  grad.addColorStop(0.35, '#e9be3b');
  grad.addColorStop(0.75, '#ab7d16');
  grad.addColorStop(1, '#523a06');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(256, 256, 246, 0, Math.PI * 2);
  ctx.fill();

  // Outer beaded/grooved ring
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 14;
  ctx.stroke();

  ctx.strokeStyle = '#422006';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Decorative inner ring
  ctx.beginPath();
  ctx.arc(256, 256, 210, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 6;
  ctx.setLineDash([8, 10]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Laurel wreath / laurel arc
  ctx.strokeStyle = '#fef08a';
  ctx.fillStyle = '#fef08a';
  ctx.lineWidth = 4;

  if (label === 'HEADS') {
    // Katika Lion / Crown Symbol
    ctx.font = 'bold 84px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#3b2505';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#422006';
    ctx.fillText('🦁', 256, 210);

    ctx.shadowBlur = 4;
    ctx.font = '900 48px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#fffbeb';
    ctx.fillText('KATIKA', 256, 320);

    ctx.font = '700 20px monospace';
    ctx.fillStyle = '#fde68a';
    ctx.fillText('★ TESTNET GOLD ★', 256, 370);
  } else {
    // Tails: KTK Currency Symbol & Wings
    ctx.font = '900 110px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#3b2505';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#fffbeb';
    ctx.fillText('KTK', 256, 220);

    ctx.font = '900 42px monospace';
    ctx.fillStyle = '#fde68a';
    ctx.fillText('1 SOVEREIGN', 256, 320);

    ctx.font = '700 18px monospace';
    ctx.fillStyle = '#fef3c7';
    ctx.fillText('• PROVABLY FAIR •', 256, 370);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSideTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Ridged coin edge pattern
  for (let x = 0; x < 128; x += 4) {
    ctx.fillStyle = x % 8 === 0 ? '#fef08a' : '#78350f';
    ctx.fillRect(x, 0, 4, 32);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(32, 1);
  return texture;
}

export function Coin3D({ busy, result, side, className = '' }: Coin3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const coinMeshRef = useRef<THREE.Mesh | null>(null);
  const animStateRef = useRef({
    busy: false,
    startTime: 0,
    duration: 1200,
    startRotX: 0,
    targetRotX: 0,
    bouncing: false,
    bounceStart: 0,
  });
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 280;
    const height = container.clientHeight || 168;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.6);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.pointerEvents = 'none';
    renderer.domElement.style.touchAction = 'pan-y';
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xfff7d6, 1.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.8);
    mainLight.position.set(2, 4, 4);
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x35d399, 1.6);
    rimLight.position.set(-3, -2, -2);
    scene.add(rimLight);

    const topRim = new THREE.PointLight(0xfef08a, 2.2, 8);
    topRim.position.set(0, 3, 2);
    scene.add(topRim);

    // Coin Materials
    const headsTexture = createFaceTexture('HEADS');
    const tailsTexture = createFaceTexture('TAILS');
    const sideTexture = createSideTexture();

    const sideMat = new THREE.MeshStandardMaterial({
      map: sideTexture,
      metalness: 0.85,
      roughness: 0.35,
      color: 0xeab308,
    });
    const headsMat = new THREE.MeshStandardMaterial({
      map: headsTexture,
      metalness: 0.7,
      roughness: 0.25,
    });
    const tailsMat = new THREE.MeshStandardMaterial({
      map: tailsTexture,
      metalness: 0.7,
      roughness: 0.25,
    });

    // Cylinder: Materials order [side, top, bottom]
    const geometry = new THREE.CylinderGeometry(1.22, 1.22, 0.16, 64);
    // Cylinder default top is along Y, rotate geometry so top faces camera along Z
    geometry.rotateX(Math.PI / 2);

    const materials = [sideMat, headsMat, tailsMat];
    const coin = new THREE.Mesh(geometry, materials);
    coin.castShadow = true;
    scene.add(coin);
    coinMeshRef.current = coin;

    // Pointer move tilt (passive, only applies to non-touch pointer to allow native mobile scrolling)
    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = x * 0.35;
      mouseRef.current.targetY = y * 0.35;
    };
    container.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Animation Loop
    let reqId = 0;
    let clock = new THREE.Clock();

    const render = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      const state = animStateRef.current;

      if (state.busy) {
        const progress = Math.min((performance.now() - state.startTime) / state.duration, 1);
        // Easing: cubic out
        const ease = 1 - Math.pow(1 - progress, 3);
        const rotX = THREE.MathUtils.lerp(state.startRotX, state.targetRotX, ease);
        coin.rotation.x = rotX;

        // Parabolic height jump
        const jumpHeight = Math.sin(progress * Math.PI) * 1.35;
        coin.position.y = jumpHeight;
        coin.position.z = Math.sin(progress * Math.PI) * 0.5;

        // Dynamic wobble in air
        coin.rotation.z = Math.sin(progress * Math.PI * 4) * 0.25;
        coin.rotation.y = Math.cos(progress * Math.PI * 3) * 0.2;

        if (progress >= 1) {
          state.busy = false;
          state.bouncing = true;
          state.bounceStart = performance.now();
        }
      } else if (state.bouncing) {
        const bounceTime = (performance.now() - state.bounceStart) / 1000;
        if (bounceTime < 0.6) {
          // Damped spring bounce
          const decay = Math.exp(-bounceTime * 6);
          coin.position.y = Math.abs(Math.sin(bounceTime * 20) * decay * 0.35);
          coin.rotation.z = Math.sin(bounceTime * 15) * decay * 0.15;
        } else {
          coin.position.y = 0;
          coin.position.z = 0;
          coin.rotation.z = 0;
          state.bouncing = false;
        }
      } else {
        // Idle breathing & gentle float with mouse parallax
        const idleRotX = coin.rotation.x;
        coin.position.y = Math.sin(elapsed * 2.2) * 0.06;
        coin.rotation.y = mouseRef.current.x + Math.sin(elapsed * 1.5) * 0.08;
        coin.rotation.z = mouseRef.current.y * 0.5;
        // Keep target side face-up with subtle bob
        const baseRotX = state.targetRotX % (Math.PI * 2);
        coin.rotation.x = THREE.MathUtils.lerp(idleRotX, baseRotX + mouseRef.current.y * 0.25, 0.1);
      }

      renderer.render(scene, camera);
      reqId = requestAnimationFrame(render);
    };

    render();

    let lastW = width;
    let lastH = height;
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      if (Math.abs(w - lastW) < 6 && Math.abs(h - lastH) < 6) return;
      lastW = w;
      lastH = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointermove', handlePointerMove);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      headsMat.dispose();
      tailsMat.dispose();
      sideMat.dispose();
      headsTexture.dispose();
      tailsTexture.dispose();
      sideTexture.dispose();
    };
  }, []);

  // Trigger flip animation on busy change or result update
  useEffect(() => {
    if (busy) {
      const coin = coinMeshRef.current;
      if (!coin) return;

      const currentRotX = coin.rotation.x;
      // Flip between 8 to 12 half turns (so it spins fast in 3D)
      const flips = 10;
      const targetSide = result ?? side;
      // Heads is 0 mod 2pi, Tails is pi mod 2pi
      const targetOffset = targetSide === 'heads' ? 0 : Math.PI;

      // Calculate future rotation
      const fullRotations = Math.floor(currentRotX / (Math.PI * 2)) * Math.PI * 2;
      const finalRotX = fullRotations + flips * Math.PI + targetOffset;

      animStateRef.current = {
        busy: true,
        startTime: performance.now(),
        duration: 980,
        startRotX: currentRotX,
        targetRotX: finalRotX,
        bouncing: false,
        bounceStart: 0,
      };
    } else if (result) {
      // Ensure target rotation matches outcome
      const coin = coinMeshRef.current;
      if (!coin) return;
      const targetOffset = result === 'heads' ? 0 : Math.PI;
      const currentRotX = coin.rotation.x;
      const nearest = Math.round(currentRotX / (Math.PI * 2)) * Math.PI * 2 + targetOffset;
      animStateRef.current.targetRotX = nearest;
    }
  }, [busy, result, side]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: '100%', height: '100%', touchAction: 'pan-y' }}
      title="Interactive 3D Coin"
    />
  );
}
