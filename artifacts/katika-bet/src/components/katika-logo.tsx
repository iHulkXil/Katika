import React from 'react';

interface SidebetLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
}

export function SidebetLogo({ className = 'h-8 w-8', size, showText = false }: SidebetLogoProps) {
  const dimension = size ? (typeof size === 'number' ? `${size}px` : size) : undefined;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={dimension ? { width: dimension, height: dimension } : undefined}
        className="h-full w-auto shrink-0 drop-shadow-[0_0_12px_rgba(34,197,94,0.35)]"
      >
        <defs>
          <linearGradient id="sbDarkBase" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#141C24" />
            <stop offset="100%" stopColor="#0B1015" />
          </linearGradient>
          <linearGradient id="sbCartoonS" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ADE80" />
            <stop offset="35%" stopColor="#22C55E" />
            <stop offset="70%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="sbGlassGleam" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Outer squircle base */}
        <rect width="44" height="44" rx="12" fill="url(#sbDarkBase)" stroke="#22C55E" strokeWidth="1.2" strokeOpacity="0.4" />
        <rect x="1" y="1" width="42" height="20" rx="11" fill="url(#sbGlassGleam)" />

        {/* Energetic cartoon S glyph with cultural colors (green, yellow, blue, crimson) */}
        <path
          d="M 29 13.5 C 29 13.5 17 13.5 15.5 13.5 C 13 13.5 11.5 15.5 11.5 17.5 C 11.5 20 13.5 21.5 16.5 21.8 L 27.5 22.5 C 30.5 23 32.5 24.5 32.5 27 C 32.5 29.5 30.5 31.5 27.5 31.5 L 14.5 31.5"
          stroke="url(#sbCartoonS)"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Cultural accent orbs */}
        <circle cx="30" cy="13.5" r="2.6" fill="#FACC15" />
        <circle cx="13" cy="31.5" r="2.6" fill="#EF4444" />
        <circle cx="22" cy="22" r="1.8" fill="#3B82F6" />
      </svg>

      {showText && (
        <span className="font-display font-extrabold tracking-tight text-white text-base">
          SIDE<span className="text-[#22C55E]">BET</span>
        </span>
      )}
    </div>
  );
}

// Legacy alias
export const KatikaLogo = SidebetLogo;
