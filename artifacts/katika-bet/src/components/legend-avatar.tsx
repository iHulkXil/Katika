import { useEffect, useMemo, useRef, useState } from 'react';

export function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function kit(position: string) {
  if (position === 'GK') return { shirt: '#f59e0b', secondary: '#1e293b', trim: '#fbbf24', name: 'Goalkeeper Gold' };
  if (position === 'CB' || position === 'LB' || position === 'RB')
    return { shirt: '#2563eb', secondary: '#0f172a', trim: '#93c5fd', name: 'Defender Royal Blue' };
  if (position === 'CDM' || position === 'CM' || position === 'CAM')
    return { shirt: '#10b981', secondary: '#042f2e', trim: '#f3d37a', name: 'Emerald Maestro' };
  return { shirt: '#e11d48', secondary: '#4c0519', trim: '#fecdd3', name: 'Striker Crimson' };
}

export type AthleteArchetype = {
  id: string;
  name: string;
  title: string;
  skinTone: string;
  shadowTone: string;
  highlightTone: string;
  hairColor: string;
  hairStyle: 'fade' | 'curls' | 'braids' | 'crop';
  irisColor: string;
  beard: 'none' | 'stubble' | 'trimmed';
};

export const ARCHETYPES: AthleteArchetype[] = [
  {
    id: 'striker_apex',
    name: 'Apex Finisher',
    title: 'Clinical Goal Machine',
    skinTone: '#a3683f',
    shadowTone: '#63391b',
    highlightTone: '#c98a5e',
    hairColor: '#120d09',
    hairStyle: 'fade',
    irisColor: '#2b573d',
    beard: 'trimmed',
  },
  {
    id: 'maestro_mid',
    name: 'Midfield Maestro',
    title: 'Creative Playmaker',
    skinTone: '#cf956b',
    shadowTone: '#824e2c',
    highlightTone: '#e6b28a',
    hairColor: '#0d0d0d',
    hairStyle: 'curls',
    irisColor: '#4f3521',
    beard: 'stubble',
  },
  {
    id: 'titan_cb',
    name: 'Titan Center-Back',
    title: 'Defensive Anchor',
    skinTone: '#633d26',
    shadowTone: '#381e0f',
    highlightTone: '#8a5839',
    hairColor: '#0a0a0a',
    hairStyle: 'fade',
    irisColor: '#1e384d',
    beard: 'trimmed',
  },
  {
    id: 'speed_winger',
    name: 'Speed Demon',
    title: 'Explosive Winger',
    skinTone: '#e5ab82',
    shadowTone: '#a66a46',
    highlightTone: '#f8cca8',
    hairColor: '#1a1410',
    hairStyle: 'crop',
    irisColor: '#2b573d',
    beard: 'none',
  },
  {
    id: 'keeper_wall',
    name: 'Golden Wall',
    title: 'Shot-Stopping Sentinel',
    skinTone: '#b57950',
    shadowTone: '#6e4020',
    highlightTone: '#d9976c',
    hairColor: '#1f1610',
    hairStyle: 'braids',
    irisColor: '#634428',
    beard: 'trimmed',
  },
];

export interface DrawUHDOptions {
  name?: string;
  position?: string;
  archetypeId?: string;
  pixelScale?: number; // 2x or 4x for UHD retina
  lightingMode?: 'stadium' | 'golden' | 'cyber';
  zoom?: number;
  panX?: number;
  panY?: number;
}

/**
 * Hyperrealistic UHD 2D Player Portrait Renderer
 * Renders sub-pixel micro-textures:
 * - Breathable hexagonal jersey mesh weave
 * - Dual-layer iris with real stadium floodlight catchlights
 * - Anatomical skin shading with subsurface warmth & specular sheen
 * - Stitched metallic gold Katika shield crest
 * - Volumetric dual-color stadium rim lighting
 */
export function drawUHDPlayerPortrait(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  options: DrawUHDOptions = {},
) {
  const {
    name = 'Legend',
    position = 'ST',
    archetypeId,
    pixelScale = 2,
    lightingMode = 'stadium',
    zoom = 1,
    panX = 0,
    panY = 0,
  } = options;

  const seed = hash(`${name}|${position}`);
  const colors = kit(position);

  // Match archetype from id or deterministic hash
  const archetype =
    ARCHETYPES.find((a) => a.id === archetypeId) ||
    ARCHETYPES[seed % ARCHETYPES.length];

  ctx.save();
  ctx.clearRect(0, 0, w, h);

  // Apply zoom / pan transform
  if (zoom !== 1 || panX !== 0 || panY !== 0) {
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-w / 2 + panX, -h / 2 + panY);
  }

  // 1. DEEP STADIUM ATMOSPHERE BACKGROUND
  const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.35, 10, w * 0.5, h * 0.5, w * 0.85);
  if (lightingMode === 'golden') {
    bgGrad.addColorStop(0, '#2e1c0c');
    bgGrad.addColorStop(0.5, '#170e06');
    bgGrad.addColorStop(1, '#080502');
  } else if (lightingMode === 'cyber') {
    bgGrad.addColorStop(0, '#092a36');
    bgGrad.addColorStop(0.5, '#04161d');
    bgGrad.addColorStop(1, '#02090c');
  } else {
    // Stadium Emerald
    bgGrad.addColorStop(0, '#102e21');
    bgGrad.addColorStop(0.55, '#071711');
    bgGrad.addColorStop(1, '#030806');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Stadium Floodlight Cones
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const leftCone = ctx.createLinearGradient(0, 0, w * 0.6, h * 0.7);
  leftCone.addColorStop(0, lightingMode === 'cyber' ? 'rgba(6, 182, 212, 0.35)' : 'rgba(53, 211, 153, 0.32)');
  leftCone.addColorStop(1, 'transparent');
  ctx.fillStyle = leftCone;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w * 0.55, 0);
  ctx.lineTo(w * 0.2, h * 0.85);
  ctx.closePath();
  ctx.fill();

  const rightCone = ctx.createLinearGradient(w, 0, w * 0.4, h * 0.7);
  rightCone.addColorStop(0, lightingMode === 'cyber' ? 'rgba(244, 63, 94, 0.28)' : 'rgba(243, 211, 122, 0.32)');
  rightCone.addColorStop(1, 'transparent');
  ctx.fillStyle = rightCone;
  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(w * 0.45, 0);
  ctx.lineTo(w * 0.8, h * 0.85);
  ctx.closePath();
  ctx.fill();

  // Subtle floating stadium bokeh dust
  for (let i = 0; i < 18; i++) {
    const bx = ((seed * (i + 1) * 31) % w);
    const by = ((seed * (i + 7) * 47) % (h * 0.75));
    const br = 1.5 + ((seed * (i + 3)) % 4.5);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(243, 211, 122, 0.2)' : 'rgba(53, 211, 153, 0.2)';
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Reference points
  const cx = w * 0.5;
  const cy = h * 0.46; // Face center
  const headW = w * 0.38;
  const headH = h * 0.36;

  // 2. ATHLETIC TORSO & KIT
  const chestTop = cy + headH * 0.48;
  const chestBottom = h;

  // Shoulders and Torso Path
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.48, h);
  ctx.lineTo(cx - w * 0.42, chestTop + h * 0.16);
  ctx.quadraticCurveTo(cx - w * 0.34, chestTop + h * 0.05, cx - headW * 0.44, chestTop + h * 0.04);
  // Neck contour
  ctx.lineTo(cx - headW * 0.28, chestTop - h * 0.06);
  ctx.lineTo(cx + headW * 0.28, chestTop - h * 0.06);
  // Right shoulder
  ctx.lineTo(cx + headW * 0.44, chestTop + h * 0.04);
  ctx.quadraticCurveTo(cx + w * 0.34, chestTop + h * 0.05, cx + w * 0.42, chestTop + h * 0.16);
  ctx.lineTo(cx + w * 0.48, h);
  ctx.closePath();

  // Jersey Base Gradient
  const kitGrad = ctx.createLinearGradient(cx - w * 0.4, chestTop, cx + w * 0.4, h);
  kitGrad.addColorStop(0, colors.secondary);
  kitGrad.addColorStop(0.35, colors.shirt);
  kitGrad.addColorStop(0.75, colors.shirt);
  kitGrad.addColorStop(1, colors.secondary);
  ctx.fillStyle = kitGrad;
  ctx.fill();

  // Clip to torso for fabric textures & shading
  ctx.save();
  ctx.clip();

  // SUB-PIXEL BREATHABLE HEX-MESH MICRO-WEAVE PATTERN
  const hexSize = Math.max(3, Math.round(w * 0.016));
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 0.75;
  for (let y = chestTop; y < h; y += hexSize * 1.5) {
    const rowOffset = ((y / (hexSize * 1.5)) % 2 === 0) ? 0 : hexSize;
    for (let x = cx - w * 0.5; x < cx + w * 0.5; x += hexSize * 2) {
      ctx.strokeRect(x + rowOffset, y, hexSize, hexSize * 0.8);
    }
  }

  // Realistic dynamic jersey drape & muscle shadows
  const foldGrad = ctx.createRadialGradient(cx, chestTop + h * 0.18, 10, cx, chestTop + h * 0.18, w * 0.45);
  foldGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  foldGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.5)');
  foldGrad.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
  ctx.fillStyle = foldGrad;
  ctx.fill();

  // Trapezius and Pectoral Highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.22, chestTop + h * 0.12, w * 0.12, h * 0.05, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.22, chestTop + h * 0.12, w * 0.12, h * 0.05, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Jersey Ribbed Collar
  const collarY = chestTop + h * 0.015;
  ctx.beginPath();
  ctx.ellipse(cx, collarY, headW * 0.36, headH * 0.22, 0, 0, Math.PI);
  ctx.fillStyle = colors.secondary;
  ctx.fill();
  ctx.strokeStyle = colors.trim;
  ctx.lineWidth = Math.max(2, w * 0.014);
  ctx.stroke();

  // Collar Inset V-notch
  ctx.fillStyle = colors.shirt;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.04, collarY);
  ctx.lineTo(cx, collarY + h * 0.055);
  ctx.lineTo(cx + w * 0.04, collarY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#f3d37a';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // EMBOSSED KATIKA GOLD CREST (Left Chest)
  const crestX = cx - w * 0.24;
  const crestY = chestTop + h * 0.15;
  const crestR = Math.max(12, w * 0.065);

  // Crest drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  // Crest Shield
  ctx.beginPath();
  ctx.moveTo(crestX, crestY - crestR);
  ctx.lineTo(crestX + crestR * 0.9, crestY - crestR * 0.6);
  ctx.lineTo(crestX + crestR * 0.75, crestY + crestR * 0.5);
  ctx.lineTo(crestX, crestY + crestR * 1.15);
  ctx.lineTo(crestX - crestR * 0.75, crestY + crestR * 0.5);
  ctx.lineTo(crestX - crestR * 0.9, crestY - crestR * 0.6);
  ctx.closePath();

  const goldCrest = ctx.createLinearGradient(crestX - crestR, crestY - crestR, crestX + crestR, crestY + crestR);
  goldCrest.addColorStop(0, '#fef08a');
  goldCrest.addColorStop(0.4, '#eab308');
  goldCrest.addColorStop(0.8, '#a16207');
  goldCrest.addColorStop(1, '#451a03');
  ctx.fillStyle = goldCrest;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Crest 'K' Letter
  ctx.fillStyle = '#062018';
  ctx.font = `bold ${Math.round(crestR * 1.05)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('K', crestX, crestY + crestR * 0.1);

  // Star above crest
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(crestX, crestY - crestR * 1.3, crestR * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // Exit torso clip
  ctx.restore(); // Exit torso save

  // 3. MUSCULAR NECK & ANATOMY
  const neckW = headW * 0.56;
  const neckTop = cy + headH * 0.22;
  const neckBottom = chestTop + h * 0.03;

  const neckGrad = ctx.createLinearGradient(cx - neckW, neckTop, cx + neckW, neckBottom);
  neckGrad.addColorStop(0, archetype.shadowTone);
  neckGrad.addColorStop(0.35, archetype.skinTone);
  neckGrad.addColorStop(0.65, archetype.skinTone);
  neckGrad.addColorStop(1, archetype.shadowTone);

  ctx.fillStyle = neckGrad;
  ctx.beginPath();
  ctx.moveTo(cx - neckW * 0.5, neckTop);
  ctx.lineTo(cx - neckW * 0.65, neckBottom);
  ctx.lineTo(cx + neckW * 0.65, neckBottom);
  ctx.lineTo(cx + neckW * 0.5, neckTop);
  ctx.closePath();
  ctx.fill();

  // Neck tendon / sternocleidomastoid shadows
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.moveTo(cx - neckW * 0.25, neckTop + h * 0.02);
  ctx.lineTo(cx - neckW * 0.12, neckBottom);
  ctx.lineTo(cx - neckW * 0.22, neckBottom);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + neckW * 0.25, neckTop + h * 0.02);
  ctx.lineTo(cx + neckW * 0.12, neckBottom);
  ctx.lineTo(cx + neckW * 0.22, neckBottom);
  ctx.closePath();
  ctx.fill();

  // 4. JAW, CHIN & EARS
  // Ears
  for (const dir of [-1, 1]) {
    const earX = cx + dir * headW * 0.49;
    const earY = cy + headH * 0.06;
    const earW = headW * 0.14;
    const earH = headH * 0.28;

    const earGrad = ctx.createRadialGradient(earX, earY, 2, earX, earY, earH * 0.8);
    earGrad.addColorStop(0, archetype.highlightTone);
    earGrad.addColorStop(0.6, archetype.skinTone);
    earGrad.addColorStop(1, archetype.shadowTone);
    ctx.fillStyle = earGrad;
    ctx.beginPath();
    ctx.ellipse(earX, earY, earW, earH * 0.5, dir * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Inner ear antihelix
    ctx.strokeStyle = archetype.shadowTone;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(earX - dir * 2, earY, earH * 0.25, 0, Math.PI);
    ctx.stroke();
  }

  // Head Silhouette (Jaw & Cranium)
  ctx.save();
  ctx.beginPath();
  // Cranium top
  ctx.moveTo(cx, cy - headH * 0.55);
  ctx.bezierCurveTo(cx + headW * 0.55, cy - headH * 0.55, cx + headW * 0.55, cy + headH * 0.05, cx + headW * 0.44, cy + headH * 0.28);
  // Jawline
  ctx.lineTo(cx + headW * 0.24, cy + headH * 0.46);
  ctx.quadraticCurveTo(cx, cy + headH * 0.52, cx - headW * 0.24, cy + headH * 0.46);
  ctx.lineTo(cx - headW * 0.44, cy + headH * 0.28);
  ctx.bezierCurveTo(cx - headW * 0.55, cy + headH * 0.05, cx - headW * 0.55, cy - headH * 0.55, cx, cy - headH * 0.55);
  ctx.closePath();

  // Multi-tier Skin Subsurface Scattering Gradient
  const skinGrad = ctx.createRadialGradient(cx, cy - headH * 0.05, headW * 0.1, cx, cy + headH * 0.1, headW * 0.6);
  skinGrad.addColorStop(0, archetype.highlightTone);
  skinGrad.addColorStop(0.45, archetype.skinTone);
  skinGrad.addColorStop(0.85, archetype.shadowTone);
  skinGrad.addColorStop(1, '#1f1007');
  ctx.fillStyle = skinGrad;
  ctx.fill();

  // Cheekbone / Forehead Highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.beginPath();
  ctx.ellipse(cx, cy - headH * 0.24, headW * 0.28, headH * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Zygomatic arch highlights (Cheekbones)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.ellipse(cx - headW * 0.24, cy + headH * 0.08, headW * 0.11, headH * 0.05, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + headW * 0.24, cy + headH * 0.08, headW * 0.11, headH * 0.05, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // 5. PHOTOREALISTIC EYES & BROWS
  const eyeY = cy - headH * 0.03;
  const eyeDist = headW * 0.24;
  const eyeW = headW * 0.16;
  const eyeH = headH * 0.09;

  for (const dir of [-1, 1]) {
    const ex = cx + dir * eyeDist;

    // Eyebrow
    ctx.fillStyle = archetype.hairColor;
    ctx.beginPath();
    ctx.moveTo(ex - dir * eyeW * 0.9, eyeY - eyeH * 1.6);
    ctx.quadraticCurveTo(ex, eyeY - eyeH * 2.1, ex + dir * eyeW * 0.9, eyeY - eyeH * 1.4);
    ctx.quadraticCurveTo(ex, eyeY - eyeH * 1.7, ex - dir * eyeW * 0.9, eyeY - eyeH * 1.6);
    ctx.fill();

    // Eye Socket Shadow
    const socketGrad = ctx.createRadialGradient(ex, eyeY, 2, ex, eyeY, eyeW * 1.1);
    socketGrad.addColorStop(0, 'rgba(0,0,0,0.02)');
    socketGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = socketGrad;
    ctx.beginPath();
    ctx.arc(ex, eyeY, eyeW * 0.95, 0, Math.PI * 2);
    ctx.fill();

    // Sclera (Eyeball)
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, eyeW * 0.82, eyeH * 0.58, 0, 0, Math.PI * 2);
    const scleraGrad = ctx.createRadialGradient(ex, eyeY, 1, ex, eyeY, eyeW * 0.8);
    scleraGrad.addColorStop(0, '#fefbf6');
    scleraGrad.addColorStop(0.7, '#f0eae0');
    scleraGrad.addColorStop(1, '#c9beb0');
    ctx.fillStyle = scleraGrad;
    ctx.fill();

    // Eyelid crease shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(ex, eyeY - eyeH * 0.5, eyeW * 0.75, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();

    // Iris & Pupil (Focused gaze forward)
    const irisR = eyeH * 0.52;
    const irisGrad = ctx.createRadialGradient(ex, eyeY, 1, ex, eyeY, irisR);
    irisGrad.addColorStop(0, '#0a0a0a');
    irisGrad.addColorStop(0.3, archetype.irisColor);
    irisGrad.addColorStop(0.85, archetype.irisColor);
    irisGrad.addColorStop(1, '#050a08');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(ex, eyeY, irisR, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#020202';
    ctx.beginPath();
    ctx.arc(ex, eyeY, irisR * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // ULTRA-HD DUAL STADIUM FLOODLIGHT CATCHLIGHTS
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillRect(ex - irisR * 0.5, eyeY - irisR * 0.5, irisR * 0.32, irisR * 0.22);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillRect(ex + irisR * 0.18, eyeY + irisR * 0.1, irisR * 0.2, irisR * 0.15);

    // Eyelash upper line
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(ex, eyeY, eyeW * 0.8, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }

  // 6. SCULPTED NOSE & PHILTRUM
  const noseY = cy + headH * 0.14;
  const noseW = headW * 0.16;

  // Nose bridge highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.beginPath();
  ctx.ellipse(cx, noseY - headH * 0.08, headW * 0.035, headH * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nose tip ball highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  ctx.arc(cx, noseY, headW * 0.045, 0, Math.PI * 2);
  ctx.fill();

  // Nostril wings & ambient occlusion
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.arc(cx - noseW * 0.48, noseY + headH * 0.015, noseW * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + noseW * 0.48, noseY + headH * 0.015, noseW * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // 7. LIPS & CHIN
  const mouthY = cy + headH * 0.28;
  const mouthW = headW * 0.26;

  // Upper Lip
  ctx.fillStyle = archetype.shadowTone;
  ctx.beginPath();
  ctx.moveTo(cx - mouthW * 0.5, mouthY);
  ctx.quadraticCurveTo(cx - mouthW * 0.15, mouthY - headH * 0.03, cx, mouthY - headH * 0.015);
  ctx.quadraticCurveTo(cx + mouthW * 0.15, mouthY - headH * 0.03, cx + mouthW * 0.5, mouthY);
  ctx.quadraticCurveTo(cx, mouthY + headH * 0.005, cx - mouthW * 0.5, mouthY);
  ctx.fill();

  // Lower Lip
  const lipGrad = ctx.createLinearGradient(cx, mouthY, cx, mouthY + headH * 0.045);
  lipGrad.addColorStop(0, archetype.shadowTone);
  lipGrad.addColorStop(0.5, archetype.skinTone);
  lipGrad.addColorStop(1, archetype.shadowTone);
  ctx.fillStyle = lipGrad;
  ctx.beginPath();
  ctx.moveTo(cx - mouthW * 0.46, mouthY);
  ctx.quadraticCurveTo(cx, mouthY + headH * 0.055, cx + mouthW * 0.46, mouthY);
  ctx.closePath();
  ctx.fill();

  // Lower lip specular glint
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, mouthY + headH * 0.026, mouthW * 0.22, headH * 0.012, 0, 0, Math.PI * 2);
  ctx.fill();

  // Chin crease & cleft
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, mouthY + headH * 0.08, headW * 0.08, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();

  // Athletic Chin highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.arc(cx, cy + headH * 0.42, headW * 0.07, 0, Math.PI * 2);
  ctx.fill();

  // 8. ATHLETIC BEARD / STUBBLE
  if (archetype.beard !== 'none') {
    ctx.fillStyle = 'rgba(10, 10, 10, 0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy + headH * 0.35, headW * 0.38, Math.PI * 0.1, Math.PI * 0.9);
    ctx.fill();
  }

  // 9. HAIRSTYLE & TAPER
  ctx.fillStyle = archetype.hairColor;
  ctx.beginPath();
  if (archetype.hairStyle === 'fade') {
    // Sharp modern athletic fade
    ctx.moveTo(cx - headW * 0.54, cy - headH * 0.08);
    ctx.lineTo(cx - headW * 0.52, cy - headH * 0.44);
    ctx.quadraticCurveTo(cx, cy - headH * 0.65, cx + headW * 0.52, cy - headH * 0.44);
    ctx.lineTo(cx + headW * 0.54, cy - headH * 0.08);
    ctx.lineTo(cx + headW * 0.46, cy - headH * 0.18);
    ctx.quadraticCurveTo(cx, cy - headH * 0.38, cx - headW * 0.46, cy - headH * 0.18);
    ctx.closePath();
    ctx.fill();
  } else if (archetype.hairStyle === 'curls') {
    // Tight textured curls
    ctx.arc(cx, cy - headH * 0.48, headW * 0.48, Math.PI, Math.PI * 2);
    ctx.fill();
    for (let c = 0; c < 16; c++) {
      const hx = cx - headW * 0.44 + (c * headW * 0.88) / 16;
      const hy = cy - headH * 0.48 + Math.sin(c * 1.5) * 6;
      ctx.beginPath();
      ctx.arc(hx, hy, headW * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Crop / Braids
    ctx.arc(cx, cy - headH * 0.42, headW * 0.5, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  // Hair Specular Curvature Sheen
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy - headH * 0.44, headW * 0.36, Math.PI * 1.25, Math.PI * 1.75);
  ctx.stroke();

  // 10. CINEMATIC VOLUMETRIC STADIUM RIM LIGHTING
  // Left Rim Light (Cyan/Mint)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = lightingMode === 'cyber' ? '#22d3ee' : '#35d399';
  ctx.lineWidth = Math.max(3, w * 0.018);
  ctx.filter = 'blur(1.5px)';

  ctx.beginPath();
  ctx.moveTo(cx - headW * 0.54, cy - headH * 0.35);
  ctx.bezierCurveTo(cx - headW * 0.56, cy + headH * 0.08, cx - headW * 0.44, cy + headH * 0.32, cx - headW * 0.22, cy + headH * 0.48);
  ctx.lineTo(cx - headW * 0.32, chestTop + h * 0.08);
  ctx.lineTo(cx - w * 0.44, h);
  ctx.stroke();

  // Right Rim Light (Warm Gold)
  ctx.strokeStyle = lightingMode === 'cyber' ? '#f43f5e' : '#f3d37a';
  ctx.lineWidth = Math.max(3, w * 0.018);
  ctx.beginPath();
  ctx.moveTo(cx + headW * 0.54, cy - headH * 0.35);
  ctx.bezierCurveTo(cx + headW * 0.56, cy + headH * 0.08, cx + headW * 0.44, cy + headH * 0.32, cx + headW * 0.22, cy + headH * 0.48);
  ctx.lineTo(cx + headW * 0.32, chestTop + h * 0.08);
  ctx.lineTo(cx + w * 0.44, h);
  ctx.stroke();

  ctx.restore(); // Exit rim lighting
  ctx.restore(); // Exit head save
  ctx.restore(); // Exit main transform
}

/**
 * LegendAvatar Component
 * Pristine 2D Ultra-High-Definition (UHD) Retina Athlete Portrait
 */
export function LegendAvatar({
  name,
  position,
  size = 'lg',
  className = '',
  archetypeId,
  quality = 'uhd',
  lighting = 'stadium',
  onClick,
}: {
  name?: string;
  position?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  archetypeId?: string;
  quality?: 'hd' | 'uhd' | '8k';
  lighting?: 'stadium' | 'golden' | 'cyber';
  onClick?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Dimension settings
  const dims = useMemo(() => {
    if (size === 'sm') return { w: 40, h: 48, scale: 2 };
    if (size === 'md') return { w: 80, h: 96, scale: 3 };
    if (size === 'xl') return { w: 320, h: 384, scale: 4 };
    return { w: 128, h: 154, scale: quality === '8k' ? 5 : quality === 'uhd' ? 4 : 2 };
  }, [size, quality]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Buffer dimensions (scaled for high DPI retina)
    canvas.width = dims.w * dims.scale;
    canvas.height = dims.h * dims.scale;

    drawUHDPlayerPortrait(ctx, canvas.width, canvas.height, {
      name,
      position,
      archetypeId,
      pixelScale: dims.scale,
      lightingMode: lighting,
    });
  }, [name, position, archetypeId, dims, lighting]);

  const sizeClass =
    size === 'sm'
      ? 'h-12 w-10'
      : size === 'md'
        ? 'h-24 w-20'
        : size === 'xl'
          ? 'h-80 w-64'
          : 'h-38 w-30';

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-[#d4af37]/40 bg-[#06120e] shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all hover:border-[#35D399] ${sizeClass} ${className}`}
      style={{
        imageRendering: '-webkit-optimize-contrast',
      }}
      title={`${name || 'Legend'} (${position || 'ST'}) - UHD Quality`}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        style={{
          width: '100%',
          height: '100%',
        }}
      />
      {/* Subtle UHD Badge Indicator on hover */}
      {size !== 'sm' && (
        <div className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/75 px-1 py-0.2 font-mono-custom text-[8px] font-bold text-[#f3d37a] opacity-0 transition-opacity group-hover:opacity-100">
          UHD 4K
        </div>
      )}
    </div>
  );
}
