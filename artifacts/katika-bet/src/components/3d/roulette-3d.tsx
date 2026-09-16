import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Roulette3DProps {
  busy: boolean;
  roll: number | null;
  className?: string;
}

// European Roulette wheel order (clockwise)
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const RED_NUMS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function createRouletteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 512;
  const cy = 512;
  const outerR = 490;
  const innerR = 300;
  const slice = (Math.PI * 2) / 37;

  // Outer dark rim
  ctx.fillStyle = '#1e140d';
  ctx.beginPath();
  ctx.arc(cx, cy, 510, 0, Math.PI * 2);
  ctx.fill();

  // Brass outer fret
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Draw 37 pockets
  for (let i = 0; i < 37; i += 1) {
    const num = WHEEL_NUMBERS[i];
    const angleStart = i * slice - Math.PI / 2 - slice / 2;
    const angleEnd = angleStart + slice;

    // Pocket background color
    if (num === 0) {
      ctx.fillStyle = '#059669'; // Green 0
    } else if (RED_NUMS.has(num)) {
      ctx.fillStyle = '#dc2626'; // Red
    } else {
      ctx.fillStyle = '#171717'; // Black
    }

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, angleStart, angleEnd);
    ctx.closePath();
    ctx.fill();

    // Brass separator lines
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angleStart) * innerR, cy + Math.sin(angleStart) * innerR);
    ctx.lineTo(cx + Math.cos(angleStart) * outerR, cy + Math.sin(angleStart) * outerR);
    ctx.stroke();

    // Pocket number text
    const textAngle = angleStart + slice / 2;
    const textR = (outerR + innerR) / 2 + 10;
    const tx = cx + Math.cos(textAngle) * textR;
    const ty = cy + Math.sin(textAngle) * textR;

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(textAngle + Math.PI / 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num), 0, 0);
    ctx.restore();
  }

  // Inner track circle
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = '#091c15';
  ctx.fill();
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 10;
  ctx.stroke();

  // Decorative ring
  ctx.beginPath();
  ctx.arc(cx, cy, 210, 0, Math.PI * 2);
  ctx.fillStyle = '#040d0a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(212,175,55,0.6)';
  ctx.lineWidth = 4;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function Roulette3D({ busy, roll, className = '' }: Roulette3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelMeshRef = useRef<THREE.Mesh | null>(null);
  const ballMeshRef = useRef<THREE.Mesh | null>(null);

  const stateRef = useRef({
    busy: false,
    wheelSpeed: 0.8,
    ballSpeed: -2.8,
    ballRadius: 1.62,
    ballAngle: 0,
    ballHeight: 0.38,
    targetNumber: 0,
    settling: false,
    settleProgress: 0,
  });

  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 280;
    const height = container.clientHeight || 200;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 3.8, 4.4);
    camera.lookAt(0, -0.2, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xfffae0, 1.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.6);
    mainLight.position.set(4, 8, 5);
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x35d399, 1.8);
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    const turretSpot = new THREE.PointLight(0xfef08a, 2.2, 8);
    turretSpot.position.set(0, 2, 0);
    scene.add(turretSpot);

    // Outer Wooden Bowl / Rim
    const bowlGeo = new THREE.CylinderGeometry(2.35, 2.1, 0.45, 64);
    const bowlMat = new THREE.MeshStandardMaterial({
      color: 0x241108,
      roughness: 0.35,
      metalness: 0.2,
    });
    const bowlMesh = new THREE.Mesh(bowlGeo, bowlMat);
    bowlMesh.position.y = -0.22;
    scene.add(bowlMesh);

    // Wheel Rotor
    const wheelTexture = createRouletteTexture();
    const wheelGeo = new THREE.CylinderGeometry(1.95, 1.95, 0.14, 64);
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, metalness: 0.5 });
    const topMat = new THREE.MeshStandardMaterial({
      map: wheelTexture,
      roughness: 0.28,
      metalness: 0.35,
    });
    const bottomMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });

    const wheelMesh = new THREE.Mesh(wheelGeo, [sideMat, topMat, bottomMat]);
    scene.add(wheelMesh);
    wheelMeshRef.current = wheelMesh;

    // Center Brass Turret
    const turretGeo = new THREE.ConeGeometry(0.48, 0.72, 32);
    const turretMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.18,
    });
    const turretMesh = new THREE.Mesh(turretGeo, turretMat);
    turretMesh.position.y = 0.36;
    wheelMesh.add(turretMesh);

    // Turret cross handles (4 brass handles)
    for (let i = 0; i < 4; i += 1) {
      const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 16);
      handleGeo.rotateZ(Math.PI / 2);
      const handle = new THREE.Mesh(handleGeo, turretMat);
      handle.rotation.y = (i * Math.PI) / 2;
      handle.position.y = 0.45;
      wheelMesh.add(handle);
    }

    // 3D Ivory Ball
    const ballGeo = new THREE.SphereGeometry(0.09, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.1,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.castShadow = true;
    scene.add(ballMesh);
    ballMeshRef.current = ballMesh;

    // Mouse tilt
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = x * 0.35;
      mouseRef.current.targetY = y * 0.35;
    };
    container.addEventListener('mousemove', handleMouseMove);

    let reqId = 0;
    const clock = new THREE.Clock();

    const render = () => {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Mouse camera parallax
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      camera.position.x = mouseRef.current.x * 0.8;
      camera.position.y = 3.8 + mouseRef.current.y * 0.6;
      camera.lookAt(0, -0.1, 0);

      const state = stateRef.current;

      if (state.busy) {
        // Active spin
        wheelMesh.rotation.y += state.wheelSpeed * delta;
        state.ballAngle += state.ballSpeed * delta;
        state.ballRadius = 1.72; // outer rim
        state.ballHeight = 0.36;

        ballMesh.position.x = Math.cos(state.ballAngle) * state.ballRadius;
        ballMesh.position.z = Math.sin(state.ballAngle) * state.ballRadius;
        ballMesh.position.y = state.ballHeight;
      } else if (state.settling) {
        // Ball dropping into target pocket
        state.settleProgress = Math.min(state.settleProgress + delta * 1.5, 1);
        const p = state.settleProgress;
        const ease = 1 - Math.pow(1 - p, 2);

        // Wheel continues slowing down
        wheelMesh.rotation.y += state.wheelSpeed * delta * (1 - ease * 0.5);

        // Find pocket angle on wheel for targetNumber
        const pocketIndex = WHEEL_NUMBERS.indexOf(state.targetNumber);
        const slice = (Math.PI * 2) / 37;
        const pocketAngleRel = pocketIndex * slice - Math.PI / 2;
        const targetWorldAngle = -wheelMesh.rotation.y + pocketAngleRel;

        // Ball spirals in from outer rim (1.72) to pocket (1.35)
        state.ballRadius = THREE.MathUtils.lerp(1.72, 1.32, ease);
        state.ballHeight = THREE.MathUtils.lerp(0.36, 0.14, ease) + Math.abs(Math.sin(p * Math.PI * 5) * (1 - p) * 0.12);
        state.ballAngle = THREE.MathUtils.lerp(state.ballAngle, targetWorldAngle, ease);

        ballMesh.position.x = Math.cos(state.ballAngle) * state.ballRadius;
        ballMesh.position.z = Math.sin(state.ballAngle) * state.ballRadius;
        ballMesh.position.y = state.ballHeight;

        if (p >= 1) {
          state.settling = false;
        }
      } else {
        // Idle gentle rotation
        wheelMesh.rotation.y += 0.18 * delta;
        // Keep ball locked inside current pocket
        const pocketIndex = WHEEL_NUMBERS.indexOf(state.targetNumber);
        const slice = (Math.PI * 2) / 37;
        const pocketAngleRel = pocketIndex * slice - Math.PI / 2;
        const lockedAngle = -wheelMesh.rotation.y + pocketAngleRel;

        ballMesh.position.x = Math.cos(lockedAngle) * 1.32;
        ballMesh.position.z = Math.sin(lockedAngle) * 1.32;
        ballMesh.position.y = 0.14;
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
      wheelGeo.dispose();
      bowlGeo.dispose();
      turretGeo.dispose();
      ballGeo.dispose();
      wheelTexture.dispose();
      sideMat.dispose();
      topMat.dispose();
      bottomMat.dispose();
      bowlMat.dispose();
      turretMat.dispose();
      ballMat.dispose();
    };
  }, []);

  // Handle spin changes
  useEffect(() => {
    if (busy) {
      stateRef.current.busy = true;
      stateRef.current.settling = false;
      stateRef.current.wheelSpeed = 2.4;
      stateRef.current.ballSpeed = -6.2;
    } else if (roll !== null) {
      stateRef.current.busy = false;
      stateRef.current.settling = true;
      stateRef.current.settleProgress = 0;
      stateRef.current.targetNumber = roll;
      stateRef.current.wheelSpeed = 0.6;
    }
  }, [busy, roll]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center cursor-grab active:cursor-grabbing select-none ${className}`}
      style={{ width: '100%', height: '100%', minHeight: '220px' }}
      title="3D European Roulette Wheel"
    />
  );
}
