import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const GLB_PATH = '/models/legend-bust.glb';

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

function hexToCss(n: number) {
  return `#${n.toString(16).padStart(6, '0')}`;
}

function buildProceduralBust(seed: number, shirt: number, stripe: number, skinHex: number) {
  const root = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({
    color: skinHex,
    roughness: 0.55,
    metalness: 0.04,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: seed % 3 === 0 ? 0x1a120c : seed % 3 === 1 ? 0x0b0b0b : 0x3b2416,
    roughness: 0.85,
  });
  const kitMat = new THREE.MeshStandardMaterial({
    color: shirt,
    roughness: 0.45,
    metalness: 0.08,
  });
  const trim = new THREE.MeshStandardMaterial({ color: stripe, roughness: 0.4 });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), skin);
  head.position.y = 0.72;
  head.scale.set(0.92, 1.05, 0.88);
  root.add(head);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.44, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), hair);
  cap.position.set(0, 0.86, 0);
  cap.scale.set(1.02, 0.7, 1.05);
  root.add(cap);

  const eyeGeo = new THREE.SphereGeometry(0.055, 16, 12);
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.3 });
  const pupil = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });
  for (const x of [-0.14, 0.14]) {
    const w = new THREE.Mesh(eyeGeo, eyeWhite);
    w.position.set(x, 0.76, 0.34);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), pupil);
    p.position.set(x, 0.76, 0.39);
    root.add(w, p);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 16), skin);
  neck.position.y = 0.38;
  root.add(neck);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.42, 8, 16), kitMat);
  torso.position.y = 0.02;
  torso.scale.set(1.15, 0.85, 0.55);
  root.add(torso);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 20), trim);
  collar.position.y = 0.28;
  collar.rotation.x = Math.PI / 2;
  root.add(collar);

  const shoulder = new THREE.SphereGeometry(0.14, 16, 12);
  const sl = new THREE.Mesh(shoulder, kitMat);
  sl.position.set(-0.42, 0.18, 0);
  const sr = sl.clone();
  sr.position.x = 0.42;
  root.add(sl, sr);

  root.rotation.y = -0.22;
  return root;
}

function tintKit(root: THREE.Object3D, shirt: number) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const std = m as THREE.MeshStandardMaterial;
      if (!std.color) continue;
      const name = `${mesh.name} ${std.name}`.toLowerCase();
      if (name.includes('kit') || name.includes('shirt') || name.includes('jersey') || name.includes('body')) {
        std.color.setHex(shirt);
      }
    }
  });
}

export function LegendAvatar({
  name,
  position,
  size = 'lg',
}: {
  name?: string;
  position?: string;
  size?: 'sm' | 'lg';
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const seed = useMemo(() => hash(`${name ?? 'ghost'}|${position ?? 'XX'}`), [name, position]);
  const colors = kit(position ?? 'ST');
  const tone = ((seed >> 8) % 40) / 100;
  const skinHex =
    (Math.floor((0.35 + tone) * 255) << 16) +
    (Math.floor((0.22 + tone * 0.45) * 255) << 8) +
    Math.floor((0.14 + tone * 0.2) * 255);
  const wide = size === 'lg' ? 'h-36 w-28' : 'h-12 w-10';

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const w = Math.max(40, el.clientWidth || 112);
    const h = Math.max(48, el.clientHeight || 144);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, w / h, 0.1, 20);
    camera.position.set(0, 0.55, 3.05);
    camera.lookAt(0, 0.45, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);
    el.innerHTML = '';
    el.appendChild(renderer.domElement);

    const key = new THREE.DirectionalLight(0xfff4e6, 1.35);
    key.position.set(1.6, 2.4, 2.2);
    const rim = new THREE.DirectionalLight(0x88bbff, 0.55);
    rim.position.set(-2.2, 0.8, -0.4);
    const fill = new THREE.AmbientLight(0x6a7a88, 0.55);
    scene.add(key, rim, fill);

    const rig = new THREE.Group();
    scene.add(rig);

    const fallback = buildProceduralBust(seed, colors.shirt, colors.stripe, skinHex);
    rig.add(fallback);

    const loader = new GLTFLoader();
    loader.load(
      GLB_PATH,
      (gltf) => {
        rig.remove(fallback);
        fallback.traverse((o) => {
          const m = o as THREE.Mesh;
          m.geometry?.dispose?.();
        });
        const model = gltf.scene;
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) mesh.castShadow = false;
        });
        const box = new THREE.Box3().setFromObject(model);
        const sizeVec = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z) || 1;
        model.scale.setScalar(1.7 / maxDim);
        box.setFromObject(model);
        const c = box.getCenter(new THREE.Vector3());
        model.position.sub(c);
        model.position.y += 0.15;
        tintKit(model, colors.shirt);
        rig.add(model);
      },
      undefined,
      () => {
        /* keep procedural bust if no GLB in /models */
      },
    );

    let frame = 0;
    const tick = (t: number) => {
      rig.rotation.y = -0.18 + Math.sin(t / 1800) * 0.06;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [seed, colors.shirt, colors.stripe, skinHex]);

  return (
    <div
      className={`legend-avatar ${wide}`}
      style={{ ['--kit' as string]: hexToCss(colors.shirt), ['--stripe' as string]: hexToCss(colors.stripe) }}
    >
      <div ref={wrap} className="h-full w-full overflow-hidden rounded-[18px]" />
    </div>
  );
}
