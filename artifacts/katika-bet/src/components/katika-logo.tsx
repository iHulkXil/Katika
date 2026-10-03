import React from 'react';

interface KatikaLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
}

export function KatikaLogo({ className = 'h-8 w-8', size, showText = false }: KatikaLogoProps) {
  const dimension = size ? (typeof size === 'number' ? `${size}px` : size) : undefined;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={dimension ? { width: dimension, height: dimension } : undefined}
        className="h-full w-auto drop-shadow-[0_2px_10px_rgba(53,211,153,0.35)]"
      >
        <defs>
          {/* Metallic Lime Green Gradient */}
          <linearGradient id="logoLimeMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bef264" />
            <stop offset="25%" stopColor="#84cc16" />
            <stop offset="60%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>

          {/* Deep Emerald Green Gradient */}
          <linearGradient id="logoEmeraldDeep" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="40%" stopColor="#15803d" />
            <stop offset="80%" stopColor="#166534" />
            <stop offset="100%" stopColor="#052e16" />
          </linearGradient>

          {/* Specular Rim Gradient */}
          <linearGradient id="logoSpecular" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#84cc16" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#052e16" stopOpacity="0.8" />
          </linearGradient>

          <filter id="logoDepth" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000000" floodOpacity="0.85" />
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#4ade80" floodOpacity="0.3" />
          </filter>
        </defs>

        <g filter="url(#logoDepth)">
          {/* CROWN: 5 Points Divided Two-Tone */}
          <path d="M 250 50 L 220 120 L 175 65 L 185 145 L 250 145 Z" fill="url(#logoLimeMetal)" stroke="#a3e635" strokeWidth="2" />
          <path d="M 250 50 L 280 120 L 325 65 L 315 145 L 250 145 Z" fill="url(#logoEmeraldDeep)" stroke="#22c55e" strokeWidth="2" />
          <path d="M 175 145 L 325 145 L 320 160 L 180 160 Z" fill="url(#logoLimeMetal)" />

          {/* SHIELD LEFT FRAME */}
          <path
            d="M 180 125 C 145 150, 130 210, 135 295 C 140 360, 185 410, 235 440 L 215 460 C 160 425, 110 365, 105 285 C 100 195, 130 135, 175 110 Z"
            fill="url(#logoEmeraldDeep)"
            stroke="url(#logoSpecular)"
            strokeWidth="2"
          />

          {/* SHIELD RIGHT FRAME & BOTTOM CHEVRON HOOK */}
          <path
            d="M 320 125 C 355 150, 370 210, 365 295 C 360 360, 315 410, 265 440 L 250 480 L 215 450 L 235 430 L 250 450 C 290 415, 335 375, 340 300 C 345 220, 325 165, 290 125 Z"
            fill="url(#logoLimeMetal)"
            stroke="url(#logoSpecular)"
            strokeWidth="2"
          />

          {/* LETTER K: VERTICAL PILLAR */}
          <rect x="180" y="180" width="36" height="190" rx="4" fill="url(#logoLimeMetal)" stroke="#84cc16" strokeWidth="1.5" />

          {/* LETTER K: UPPER JOINT */}
          <path d="M 216 260 L 275 180 L 315 180 L 245 275 Z" fill="url(#logoLimeMetal)" stroke="#a3e635" strokeWidth="1.5" />

          {/* LETTER K: UPWARD VICTORY ARROW (↗) */}
          <g transform="translate(250, 195)">
            <polygon points="15,45 60,-5 45,-15 0,35" fill="url(#logoLimeMetal)" />
            <polygon points="50,-35 80,-30 75,0 60,-12 40,8 30,-2 50,-22" fill="url(#logoLimeMetal)" stroke="#bef264" strokeWidth="2" />
          </g>

          {/* LETTER K: LOWER RIGHT LEG */}
          <path d="M 230 260 L 315 375 L 270 375 L 205 285 Z" fill="url(#logoEmeraldDeep)" stroke="#16a34a" strokeWidth="1.5" />
        </g>
      </svg>

      {showText && (
        <span className="font-bold tracking-tight text-white">
          Katika<span className="text-[#35D399]">.</span>Bet
        </span>
      )}
    </div>
  );
}
