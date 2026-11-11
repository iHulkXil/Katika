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
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={dimension ? { width: dimension, height: dimension } : undefined}
        className="h-full w-auto shrink-0 drop-shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
      >
        <defs>
          <linearGradient id="sbBase" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="sbAccent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id="sbSpecular" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Outer squircle base */}
        <rect width="40" height="40" rx="10" fill="url(#sbBase)" stroke="#334155" strokeWidth="1" />
        <rect x="0.5" y="0.5" width="39" height="19.5" rx="9.5" fill="url(#sbSpecular)" />

        {/* Dynamic angled S-lightning brand glyph */}
        <path
          d="M 26 12 L 15.5 12 C 13.5 12 12 13.5 12 15.5 C 12 17.5 13.5 19 15.5 19 L 24.5 21 C 26.5 21 28 22.5 28 24.5 C 28 26.5 26.5 28 24.5 28 L 14 28"
          stroke="url(#sbAccent)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Directional upward micro-arrow showing prediction & odds growth */}
        <circle cx="27" cy="12" r="2.2" fill="#38BDF8" />
        <circle cx="13" cy="28" r="2.2" fill="#3B82F6" />
      </svg>
      {showText && (
        <span className="font-bold tracking-tight text-white text-[15px]">
          SIDE<span className="text-blue-400">BET</span>
        </span>
      )}
    </div>
  );
}

// Legacy alias so old imports don't break during transition
export const KatikaLogo = SidebetLogo;
