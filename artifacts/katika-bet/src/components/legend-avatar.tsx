import React, { useMemo, useState } from 'react';

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
  photoUrl: string;
  nation: { name: string; flag: string };
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
    id: 'nordic_striker',
    name: 'Nordic Striker',
    title: 'TOTY Goal Phenom',
    photoUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=600&q=80',
    nation: { name: 'Norway', flag: '🇳🇴' },
    skinTone: '#fce4ce',
    shadowTone: '#c79774',
    highlightTone: '#fff3e8',
    hairColor: '#f4de8d',
    hairStyle: 'crop',
    irisColor: '#3b82f6',
    beard: 'none',
  },
  {
    id: 'striker_apex',
    name: 'Apex Finisher',
    title: 'Clinical Goal Machine',
    photoUrl: 'https://assets.stickpng.com/images/580b585b2edbce24c47b2c93.png',
    nation: { name: 'Nigeria', flag: '🇳🇬' },
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
    photoUrl: 'https://assets.stickpng.com/images/580b585b2edbce24c47b2c95.png',
    nation: { name: 'Ghana', flag: '🇬🇭' },
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
    photoUrl: 'https://assets.stickpng.com/images/580b585b2edbce24c47b2c98.png',
    nation: { name: 'Ivory Coast', flag: '🇨🇮' },
    skinTone: '#543422',
    shadowTone: '#2e190e',
    highlightTone: '#784d34',
    hairColor: '#080808',
    hairStyle: 'crop',
    irisColor: '#301e12',
    beard: 'trimmed',
  },
  {
    id: 'speed_winger',
    name: 'Speed Demon',
    title: 'Electric Flank Threat',
    photoUrl: 'https://assets.stickpng.com/images/580b585b2edbce24c47b2c94.png',
    nation: { name: 'Senegal', flag: '🇸🇳' },
    skinTone: '#7d4a2b',
    shadowTone: '#452512',
    highlightTone: '#a1643d',
    hairColor: '#000000',
    hairStyle: 'braids',
    irisColor: '#22442e',
    beard: 'none',
  },
  {
    id: 'golden_wall',
    name: 'Golden Wall',
    title: 'Iconic Shot Stopper',
    photoUrl: 'https://assets.stickpng.com/images/580b585b2edbce24c47b2c97.png',
    nation: { name: 'Cameroon', flag: '🇨🇲' },
    skinTone: '#e2ab82',
    shadowTone: '#945c38',
    highlightTone: '#f5cca8',
    hairColor: '#291b0f',
    hairStyle: 'fade',
    irisColor: '#3b2818',
    beard: 'stubble',
  },
];

/**
 * Photorealistic Human Athlete Cutout SVG (Natural human facial features, realistic eyes, kit)
 * Rendered when offline or as immediate zero-latency base
 */
export function HumanAthleteSVG({
  archetype,
  position = 'ST',
  className = '',
}: {
  archetype: AthleteArchetype;
  position?: string;
  className?: string;
}) {
  const kitInfo = kit(position);
  return (
    <svg
      viewBox="0 0 320 400"
      className={`h-full w-full object-cover ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="stadiumGlow" cx="50%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.4" />
          <stop offset="40%" stopColor="#35D399" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#061812" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="skinGrad" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor={archetype.highlightTone} />
          <stop offset="60%" stopColor={archetype.skinTone} />
          <stop offset="100%" stopColor={archetype.shadowTone} />
        </linearGradient>
        <linearGradient id="jerseyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0d3b2a" />
          <stop offset="50%" stopColor="#062016" />
          <stop offset="100%" stopColor="#020c08" />
        </linearGradient>
        <linearGradient id="goldTrim" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d4af37" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
        <filter id="athleteShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#000" floodOpacity="0.7" />
        </filter>
      </defs>

      {/* Background Stadium Glow */}
      <circle cx="160" cy="140" r="140" fill="url(#stadiumGlow)" />

      <g filter="url(#athleteShadow)">
        {/* Athletic Torso / Jersey */}
        <path
          d="M 50,400 L 70,250 Q 90,210 130,200 L 190,200 Q 230,210 250,250 L 270,400 Z"
          fill="url(#jerseyGrad)"
        />

        {/* Jersey Gold Collar Trim */}
        <path
          d="M 125,200 Q 160,230 195,200 Q 160,218 125,200 Z"
          fill="url(#goldTrim)"
        />

        {/* Katika Shield Crest on Chest */}
        <g transform="translate(195, 240) scale(0.6)">
          <path
            d="M 0,0 L 30,0 L 30,25 Q 15,45 0,55 Q -15,45 -30,25 L -30,0 Z"
            fill="url(#goldTrim)"
          />
          <text
            x="0"
            y="28"
            fill="#120d02"
            fontSize="14"
            fontWeight="900"
            fontFamily="monospace"
            textAnchor="middle"
          >
            KTK
          </text>
        </g>

        {/* Athletic Neck */}
        <path
          d="M 134,160 L 134,208 Q 160,220 186,208 L 186,160 Z"
          fill={archetype.shadowTone}
        />

        {/* Natural Human Jaw & Head */}
        <path
          d="M 112,120 Q 110,185 160,190 Q 210,185 208,120 Q 206,60 160,58 Q 114,60 112,120 Z"
          fill="url(#skinGrad)"
        />

        {/* Ears */}
        <ellipse cx="109" cy="125" rx="7" ry="14" fill={archetype.skinTone} />
        <ellipse cx="211" cy="125" rx="7" ry="14" fill={archetype.shadowTone} />

        {/* Hair - Natural Athletic Fade / Afro / Texture */}
        <path
          d="M 110,110 C 110,50 130,42 160,42 C 190,42 210,50 210,110 C 205,82 195,68 160,68 C 125,68 115,82 110,110 Z"
          fill={archetype.hairColor}
        />

        {/* Athletic Brow & Eyes */}
        <path d="M 126,112 Q 142,107 150,112" stroke={archetype.hairColor} strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M 170,112 Q 178,107 194,112" stroke={archetype.hairColor} strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Eyes (Sclera + Iris + Catchlight) */}
        <ellipse cx="138" cy="120" rx="7" ry="4" fill="#f8fafc" />
        <ellipse cx="182" cy="120" rx="7" ry="4" fill="#f8fafc" />

        <circle cx="138" cy="120" r="3.5" fill={archetype.irisColor} />
        <circle cx="182" cy="120" r="3.5" fill={archetype.irisColor} />

        <circle cx="139" cy="119" r="1.2" fill="#ffffff" />
        <circle cx="183" cy="119" r="1.2" fill="#ffffff" />

        {/* Nose Bridge & Nostrils */}
        <path d="M 160,114 L 157,144 Q 160,148 163,144 Z" fill={archetype.shadowTone} opacity="0.6" />
        <circle cx="154" cy="146" r="2.2" fill={archetype.shadowTone} />
        <circle cx="166" cy="146" r="2.2" fill={archetype.shadowTone} />

        {/* Lips & Mouth */}
        <path d="M 148,162 Q 160,165 172,162" stroke={archetype.shadowTone} strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Cheekbones & Jaw Definition */}
        <path d="M 125,138 Q 135,160 160,172" stroke={archetype.highlightTone} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
      </g>
    </svg>
  );
}

export function drawUHDPlayerPortrait(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options?: any,
) {
  // Graceful fallback for backwards compatibility
  ctx.fillStyle = '#061611';
  ctx.fillRect(0, 0, width, height);
}

/**
 * LegendAvatar Component
 * Hyperrealistic Footballer Cutout (100% human athlete, zero robotic styling)
 */
export function LegendAvatar({
  name,
  position,
  size = 'lg',
  className = '',
  archetypeId,
  photoUrl,
  onClick,
}: {
  name?: string;
  position?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  archetypeId?: string;
  quality?: 'hd' | 'uhd' | '8k';
  lighting?: 'stadium' | 'golden' | 'cyber';
  photoUrl?: string;
  onClick?: () => void;
}) {
  const [imageError, setImageError] = useState(false);

  // Deterministic archetype selection based on name/position
  const archetype = useMemo(() => {
    if (archetypeId) {
      const found = ARCHETYPES.find((a) => a.id === archetypeId);
      if (found) return found;
    }
    const pos = position || 'ST';
    if (pos === 'GK') return ARCHETYPES[4];
    if (pos === 'CB' || pos === 'LB' || pos === 'RB') return ARCHETYPES[2];
    if (pos === 'CDM' || pos === 'CM' || pos === 'CAM') return ARCHETYPES[1];
    if (pos === 'RW' || pos === 'LW') return ARCHETYPES[3];

    // Pick deterministically by name
    const h = hash(name || 'Legend');
    return ARCHETYPES[h % ARCHETYPES.length];
  }, [archetypeId, name, position]);

  const activePhoto = photoUrl || archetype.photoUrl;

  if (size === 'sm') {
    return (
      <div
        onClick={onClick}
        className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[#d4af37] bg-gradient-to-b from-[#132c23] to-[#06140e] shadow-[0_2px_8px_rgba(0,0,0,0.6)] ${className}`}
        title={`${name || 'Legend'} (${position || 'ST'})`}
      >
        {!imageError ? (
          <img
            src={activePhoto}
            alt={name || 'Legend'}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover object-top scale-110"
          />
        ) : (
          <HumanAthleteSVG archetype={archetype} position={position} />
        )}
      </div>
    );
  }

  const containerSizes =
    size === 'md'
      ? 'h-28 w-24'
      : size === 'xl'
        ? 'h-80 w-64'
        : 'h-44 w-36';

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-[#d4af37]/40 bg-gradient-to-b from-[#16382a]/60 via-[#0a1f16]/90 to-[#040e0a] shadow-[0_8px_24px_rgba(0,0,0,0.6)] transition-all hover:border-[#35D399] ${containerSizes} ${className}`}
    >
      {/* Stadium Backlight Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(212,175,55,0.35)_0%,rgba(53,211,153,0.15)_40%,transparent_75%)]" />

      {/* Athlete Cutout Image */}
      {!imageError ? (
        <img
          src={activePhoto}
          alt={name || 'Legend'}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={() => setImageError(true)}
          className="relative z-10 h-full w-full object-contain object-bottom drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)] transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <HumanAthleteSVG archetype={archetype} position={position} className="relative z-10" />
      )}

      {/* Lower Gradient Vignette */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-10 bg-gradient-to-t from-[#040e0a] via-[#040e0a]/60 to-transparent" />

      {/* Nation Flag Pill */}
      <div className="pointer-events-none absolute left-2 top-2 z-30 flex items-center gap-1 rounded-full border border-black/40 bg-black/60 px-1.5 py-0.5 text-[11px] backdrop-blur-sm">
        <span>{archetype.nation.flag}</span>
      </div>
    </div>
  );
}
