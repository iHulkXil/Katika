import React from 'react';

interface SidebetLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
}

export function SidebetLogo({ className = 'h-8 w-8', size, showText = false }: SidebetLogoProps) {
  const dimension = size ? (typeof size === 'number' ? `${size}px` : size) : undefined;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={dimension ? { width: dimension, height: dimension } : undefined}
        className="h-full w-auto"
      >
        <defs>
          <linearGradient id="sbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill="url(#sbGrad)" />
        <path
          d="M12 26V14h6.5c2.2 0 4 1.6 4 3.6 0 1.4-.7 2.5-1.8 3.1L23 26h-3.2l-2.1-4.6H15.2V26H12zm3.2-7.2h3c1.1 0 1.8-.6 1.8-1.6s-.7-1.6-1.8-1.6h-3v3.2z"
          fill="white"
        />
        <path
          d="M22 26l4.2-12h3.1L33 26h-3.1l-.7-2.1h-3.5l-.7 2.1H22zm3.6-4.4h2.2l-1.1-3.3-1.1 3.3z"
          fill="white"
        />
      </svg>
      {showText && (
        <span className="font-bold tracking-tight text-white">
          SIDE<span className="text-blue-400">BET</span>
        </span>
      )}
    </div>
  );
}

// Legacy alias so old imports don't break during transition
export const KatikaLogo = SidebetLogo;
