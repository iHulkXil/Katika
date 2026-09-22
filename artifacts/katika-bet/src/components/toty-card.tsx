import React, { useMemo, useRef, useState } from 'react';
import { Camera, Sparkles, Upload, RotateCw, ZoomIn, ShieldCheck, Flame } from 'lucide-react';
import type { LegendCardData } from './legend-card';
import { ARCHETYPES } from './legend-avatar';

interface TotyCardProps {
  legend: LegendCardData | null;
  overall?: number;
  playable?: number;
  isFlipped?: boolean;
  onFlip?: () => void;
  onInspect?: () => void;
  onMint?: () => void;
  onUploadClick?: () => void;
  interactive?: boolean;
  className?: string;
  size?: 'normal' | 'compact' | 'hero';
}

export function TotyCard({
  legend,
  overall: propOverall,
  playable,
  isFlipped = false,
  onFlip,
  onInspect,
  onMint,
  onUploadClick,
  interactive = true,
  className = '',
  size = 'normal',
}: TotyCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [rot, setRot] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });
  const cardRef = useRef<HTMLDivElement>(null);

  const overall = useMemo(() => {
    if (typeof propOverall === 'number') return propOverall;
    if (!legend) return 96;
    return Math.round(
      ((legend.pace ?? 50) +
        (legend.shooting ?? 50) +
        (legend.passing ?? 50) +
        (legend.dribbling ?? 50) +
        (legend.defending ?? 50) +
        (legend.physical ?? 50)) /
        6,
    );
  }, [legend, propOverall]);

  // Determine active photo and country flag
  const matchedArchetype = useMemo(() => {
    if (!legend) return ARCHETYPES[0];
    const pos = legend.position || 'ST';
    if (pos === 'GK') return ARCHETYPES[5] || ARCHETYPES[0];
    if (pos === 'CB' || pos === 'LB' || pos === 'RB') return ARCHETYPES[3] || ARCHETYPES[0];
    if (pos === 'CDM' || pos === 'CM' || pos === 'CAM') return ARCHETYPES[2] || ARCHETYPES[0];
    if (pos === 'RW' || pos === 'LW') return ARCHETYPES[4] || ARCHETYPES[0];
    return ARCHETYPES[0]; // Nordic Striker (Haaland inspired)
  }, [legend]);

  const activePhoto = legend?.photoUrl || matchedArchetype.photoUrl;
  const activeFlag = legend?.nationFlag || matchedArchetype.nation.flag;
  const activePosition = legend?.position || 'ST';
  const activeName = (legend?.name || 'HAALAND').toUpperCase();

  const isMinted = Boolean(legend?.mint);
  const cardAlloc = Number(legend?.allocatedKchip ?? legend?.allocatedKtk ?? 330);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || e.pointerType === 'touch' || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (py - 0.5) * -16;
    const ry = (px - 0.5) * 16;
    setRot({
      x: rx,
      y: ry,
      glareX: px * 100,
      glareY: py * 100,
    });
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setRot({ x: 0, y: 0, glareX: 50, glareY: 50 });
  };

  const stats = [
    { key: 'pace', label: 'PAC', val: legend?.pace ?? 96 },
    { key: 'shooting', label: 'SHO', val: legend?.shooting ?? 96 },
    { key: 'passing', label: 'PAS', val: legend?.passing ?? 80 },
    { key: 'dribbling', label: 'DRI', val: legend?.dribbling ?? 88 },
    { key: 'defending', label: 'DEF', val: legend?.defending ?? 60 },
    { key: 'physical', label: 'PHY', val: legend?.physical ?? 94 },
  ];

  const leftStats = stats.slice(0, 3);
  const rightStats = stats.slice(3, 6);

  // HOUSE OF THE DRAGON (HOTD) KNIGHT'S HEATER SHIELD CONTOUR
  // Authentic curved top arch, reinforced shoulder chamfers, vertical flank drop, and curved spearhead taper
  const hotdShieldOuterClip =
    'polygon(50% 0.5%, 72% 0.5%, 88% 1.2%, 96% 4%, 100% 9%, 100% 62%, 95% 72%, 86% 81%, 73% 89%, 58% 95.5%, 50% 99.8%, 42% 95.5%, 27% 89%, 14% 81%, 5% 72%, 0% 62%, 0% 9%, 4% 4%, 12% 1.2%, 28% 0.5%)';

  const hotdShieldInnerClip =
    'polygon(50% 1.2%, 71.5% 1.2%, 87% 1.8%, 94.5% 4.5%, 98.2% 9.2%, 98.2% 61.5%, 93.5% 71.2%, 84.8% 80%, 72.2% 88%, 57.5% 94.5%, 50% 98.8%, 42.5% 94.5%, 27.8% 88%, 15.2% 80%, 6.5% 71.2%, 1.8% 61.5%, 1.8% 9.2%, 5.5% 4.5%, 13% 1.8%, 28.5% 1.2%)';

  return (
    <div
      className={`relative select-none ${className}`}
      style={{ perspective: interactive ? '1200px' : 'none' }}
    >
      <div
        ref={cardRef}
        onPointerEnter={(e) => {
          if (e.pointerType !== 'touch' && interactive) setIsHovered(true);
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="relative mx-auto h-[505px] w-[332px] transition-transform duration-200 ease-out"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped
            ? `rotateY(180deg) rotateX(${rot.x * 0.3}deg)`
            : interactive
              ? `rotateX(${rot.x}deg) rotateY(${rot.y}deg) scale3d(${isHovered ? 1.02 : 1}, ${isHovered ? 1.02 : 1}, 1)`
              : 'none',
        }}
      >
        {/* ================================================================= */}
        {/* FRONT FACE: HOUSE OF THE DRAGON KNIGHT'S WOODEN HEATER SHIELD      */}
        {/* ================================================================= */}
        <div
          className="absolute inset-0 select-none overflow-visible"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* AMBIENT TORCHLIGHT & DRAGON-FIRE EMBER GLOW */}
          <div
            className="pointer-events-none absolute -inset-6 -z-10 rounded-[40px] opacity-70 blur-xl transition-opacity duration-300"
            style={{
              background:
                'radial-gradient(circle at 50% 25%, rgba(245, 158, 11, 0.35) 0%, rgba(180, 83, 9, 0.2) 40%, rgba(0, 0, 0, 0.8) 75%)',
            }}
          />

          {/* ============================================================= */}
          {/* BLACKENED HAMMERED IRON RIM & FORGED REINFORCEMENT FRAME      */}
          {/* ============================================================= */}
          <div
            className="relative h-full w-full p-[4px] shadow-[0_24px_60px_rgba(0,0,0,0.98),0_4px_16px_rgba(20,10,5,0.9)]"
            style={{
              clipPath: hotdShieldOuterClip,
              background:
                'linear-gradient(145deg, #4b5563 0%, #1f2428 15%, #111417 35%, #374151 50%, #111417 65%, #2a3138 85%, #4b5563 100%)',
            }}
          >
            {/* INNER CHISELED IRON REBATE */}
            <div
              className="relative h-full w-full p-[2.5px]"
              style={{
                clipPath: hotdShieldInnerClip,
                background:
                  'linear-gradient(180deg, #181d22 0%, #0d1012 30%, #222830 50%, #0b0d0f 75%, #1c2229 100%)',
              }}
            >
              {/* ============================================================= */}
              {/* THE WOODEN SHIELD BODY: DARK OAK & CHARRED TIMBER PLANKS     */}
              {/* ============================================================= */}
              <div
                className="relative h-full w-full overflow-hidden"
                style={{
                  clipPath: hotdShieldInnerClip,
                  backgroundColor: '#1b0f07',
                }}
              >
                {/* SVG PROCEDURAL REALISTIC WOOD GRAIN & VERTICAL TIMBER PLANKS */}
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 332 505"
                  preserveAspectRatio="none"
                >
                  <defs>
                    {/* Gradients for each distinct vertical oak plank */}
                    <linearGradient id="oakPlank1" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#221208" />
                      <stop offset="35%" stopColor="#361e10" />
                      <stop offset="70%" stopColor="#2b160b" />
                      <stop offset="100%" stopColor="#180c05" />
                    </linearGradient>
                    <linearGradient id="oakPlank2" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#1a0d06" />
                      <stop offset="30%" stopColor="#3f2313" />
                      <stop offset="65%" stopColor="#321a0d" />
                      <stop offset="100%" stopColor="#1e0f07" />
                    </linearGradient>
                    <linearGradient id="oakPlank3" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#1e0f07" />
                      <stop offset="35%" stopColor="#381e10" />
                      <stop offset="70%" stopColor="#442615" />
                      <stop offset="100%" stopColor="#1c0e06" />
                    </linearGradient>
                    <linearGradient id="oakPlank4" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#180c05" />
                      <stop offset="30%" stopColor="#2f190d" />
                      <stop offset="65%" stopColor="#3a2011" />
                      <stop offset="100%" stopColor="#201007" />
                    </linearGradient>

                    {/* Dark Iron Banding Gradient */}
                    <linearGradient id="forgedIronBand" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#4b5563" />
                      <stop offset="25%" stopColor="#1f2428" />
                      <stop offset="50%" stopColor="#374151" />
                      <stop offset="75%" stopColor="#111417" />
                      <stop offset="100%" stopColor="#4b5563" />
                    </linearGradient>

                    {/* Specular Rivet Cap */}
                    <radialGradient id="ironRivetGrad" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#9ca3af" />
                      <stop offset="45%" stopColor="#374151" />
                      <stop offset="85%" stopColor="#111417" />
                      <stop offset="100%" stopColor="#050708" />
                    </radialGradient>
                  </defs>

                  {/* 4 Distinct Vertical Wooden Planks of the Knight's Shield */}
                  <rect x="0" y="0" width="82" height="505" fill="url(#oakPlank1)" />
                  <rect x="82" y="0" width="84" height="505" fill="url(#oakPlank2)" />
                  <rect x="166" y="0" width="84" height="505" fill="url(#oakPlank3)" />
                  <rect x="250" y="0" width="82" height="505" fill="url(#oakPlank4)" />

                  {/* Deep Recessed Seams / Gaps Between Planks with Shadow & Lip Highlight */}
                  <g>
                    {/* Seam 1 (x = 82) */}
                    <line x1="81.5" y1="0" x2="81.5" y2="505" stroke="#050201" strokeWidth="2.5" />
                    <line x1="83" y1="0" x2="83" y2="505" stroke="#5c341b" strokeWidth="0.8" opacity="0.6" />

                    {/* Seam 2 (x = 166 - Shield Centerline) */}
                    <line x1="165" y1="0" x2="165" y2="505" stroke="#050201" strokeWidth="3" />
                    <line x1="167" y1="0" x2="167" y2="505" stroke="#683b1f" strokeWidth="0.8" opacity="0.7" />

                    {/* Seam 3 (x = 250) */}
                    <line x1="249.5" y1="0" x2="249.5" y2="505" stroke="#050201" strokeWidth="2.5" />
                    <line x1="251" y1="0" x2="251" y2="505" stroke="#5c341b" strokeWidth="0.8" opacity="0.6" />
                  </g>

                  {/* Organic Wood Grain Striations & Fiber Knots */}
                  <g stroke="#120803" strokeWidth="0.9" fill="none" opacity="0.55">
                    {/* Plank 1 Grain */}
                    <path d="M 12 0 Q 18 120 14 260 T 18 505" />
                    <path d="M 32 0 Q 24 150 36 320 T 30 505" />
                    <path d="M 52 0 Q 60 180 50 360 T 56 505" />
                    <path d="M 70 0 Q 76 90 68 280 T 74 505" />

                    {/* Plank 2 Grain & Knot */}
                    <path d="M 96 0 Q 106 140 100 310 T 104 505" />
                    <path d="M 118 0 Q 128 200 120 380 T 126 505" />
                    {/* Oak knot */}
                    <ellipse cx="138" cy="180" rx="9" ry="24" stroke="#0c0502" strokeWidth="1.2" />
                    <ellipse cx="138" cy="180" rx="4" ry="12" stroke="#0c0502" strokeWidth="1.5" />
                    <path d="M 138 0 Q 146 130 134 160 M 134 200 Q 142 270 146 505" />
                    <path d="M 152 0 Q 158 110 152 260 T 156 505" />

                    {/* Plank 3 Grain */}
                    <path d="M 176 0 Q 170 120 178 300 T 174 505" />
                    <path d="M 194 0 Q 204 160 196 340 T 202 505" />
                    <path d="M 216 0 Q 210 200 220 390 T 214 505" />
                    <path d="M 236 0 Q 244 140 234 320 T 240 505" />

                    {/* Plank 4 Grain & Knot */}
                    <path d="M 262 0 Q 256 120 264 280 T 260 505" />
                    <ellipse cx="284" cy="340" rx="8" ry="20" stroke="#0c0502" strokeWidth="1.2" />
                    <ellipse cx="284" cy="340" rx="3.5" ry="9" stroke="#0c0502" strokeWidth="1.5" />
                    <path d="M 284 0 Q 290 190 280 320 M 280 360 Q 288 430 286 505" />
                    <path d="M 306 0 Q 300 140 310 320 T 304 505" />
                    <path d="M 322 0 Q 326 210 318 410 T 324 505" />
                  </g>

                  {/* Battle Cuts, Sword Nicks, and Timber Gouges */}
                  <g stroke="#080301" strokeWidth="1.2" opacity="0.6">
                    <line x1="28" y1="95" x2="52" y2="108" />
                    <line x1="290" y1="140" x2="315" y2="152" />
                    <line x1="110" y1="390" x2="135" y2="380" />
                    <line x1="210" y1="430" x2="230" y2="445" />
                    <line x1="45" y1="280" x2="68" y2="295" strokeWidth="1.6" />
                  </g>

                  {/* Battle Scuff Highlight Lips */}
                  <g stroke="#5a3118" strokeWidth="0.6" opacity="0.5">
                    <line x1="29" y1="96" x2="53" y2="109" />
                    <line x1="291" y1="141" x2="316" y2="153" />
                    <line x1="46" y1="281" x2="69" y2="296" />
                  </g>

                  {/* ========================================================= */}
                  {/* FORGED IRON BARS & SHIELD REINFORCEMENTS                  */}
                  {/* ========================================================= */}
                  {/* Heavy Top Rim Iron Band */}
                  <path
                    d="M 12 4 L 320 4 L 320 22 L 12 22 Z"
                    fill="url(#forgedIronBand)"
                    stroke="#111417"
                    strokeWidth="1"
                    opacity="0.9"
                  />
                  {/* Mid-Plank Iron Tie Strap */}
                  <path
                    d="M 6 250 L 326 250 L 326 256 L 6 256 Z"
                    fill="#15191d"
                    stroke="#2e353e"
                    strokeWidth="0.6"
                    opacity="0.85"
                  />

                  {/* Bottom Reinforced Spearhead Chape (Bottom Tip Protector) */}
                  <path
                    d="M 130 465 L 166 498 L 202 465 L 194 455 L 166 478 L 138 455 Z"
                    fill="url(#forgedIronBand)"
                    stroke="#0a0c0e"
                    strokeWidth="1.2"
                  />

                  {/* ========================================================= */}
                  {/* HAND-FORGED ROUND IRON RIVETS AROUND THE ENTIRE PERIMETER */}
                  {/* ========================================================= */}
                  {[
                    // Top Header Rivets
                    [24, 13],
                    [70, 13],
                    [118, 13],
                    [166, 13],
                    [214, 13],
                    [262, 13],
                    [308, 13],
                    // Left Flank Rivets
                    [10, 60],
                    [10, 120],
                    [10, 185],
                    [10, 253],
                    [10, 315],
                    [18, 370],
                    [42, 420],
                    [84, 458],
                    [134, 484],
                    // Right Flank Rivets
                    [322, 60],
                    [322, 120],
                    [322, 185],
                    [322, 253],
                    [322, 315],
                    [314, 370],
                    [290, 420],
                    [248, 458],
                    [198, 484],
                    // Bottom Tip Spear Rivet
                    [166, 486],
                  ].map(([rx, ry], idx) => (
                    <g key={idx}>
                      {/* Cast Drop Shadow under Rivet */}
                      <circle cx={rx + 1} cy={ry + 1.5} r="4" fill="#000000" opacity="0.75" />
                      {/* Forged Iron Rivet Head */}
                      <circle cx={rx} cy={ry} r="3.6" fill="url(#ironRivetGrad)" stroke="#111417" strokeWidth="0.6" />
                      {/* Metallic Specular Gleam */}
                      <circle cx={rx - 1} cy={ry - 1} r="1" fill="#e2e8f0" opacity="0.65" />
                    </g>
                  ))}
                </svg>

                {/* HOLOGRAPHIC AMBIENT EMBER & TORCHLIGHT SHEEN */}
                <div
                  className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-200"
                  style={{
                    opacity: isHovered ? 0.6 : 0.25,
                    background: `radial-gradient(circle at ${rot.glareX}% ${rot.glareY}%, rgba(254, 215, 170, 0.45) 0%, rgba(217, 119, 6, 0.2) 35%, rgba(0,0,0,0.85) 75%)`,
                    mixBlendMode: 'screen',
                  }}
                />

                {/* ============================================================= */}
                {/* 1. TOP HEADER: FORGED DRAGON IRON CROWN BANNER                */}
                {/* ============================================================= */}
                <div className="relative z-20 flex flex-col items-center pt-2.5">
                  <div className="relative flex items-center justify-center">
                    <div className="flex items-center gap-2 rounded-sm border-b border-x border-[#374151] bg-gradient-to-b from-[#181d22] via-[#0d1012] to-[#050708] px-3.5 py-0.5 shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
                      <Flame size={10} className="text-[#f59e0b] animate-pulse" />
                      <span className="font-mono-custom text-[8.5px] font-black tracking-[0.28em] text-[#d1d5db] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                        HOUSE OF THE DRAGON · CHAMPION
                      </span>
                      <Flame size={10} className="text-[#f59e0b] animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* 2. REPOSITIONED UPPER FLANKS & CENTER NAILED PORTRAIT         */}
                {/* ============================================================= */}
                <div className="relative z-20 mt-1 flex w-full items-start justify-between px-3">
                  {/* TOP-LEFT FLANK: HAMMERED IRON ESCUTCHEON (OVR & POSITION) */}
                  <div className="z-30 flex flex-col items-center">
                    <div className="relative flex flex-col items-center rounded-md border border-[#374151] bg-gradient-to-b from-[#1f2428] via-[#121619] to-[#080a0c] p-1.5 shadow-[0_8px_16px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.15)]">
                      {/* Four Corner Mini Iron Studs */}
                      <span className="absolute -left-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#4b5563] border border-[#111417]" />
                      <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#4b5563] border border-[#111417]" />
                      <span className="absolute -bottom-1 -left-1 h-1.5 w-1.5 rounded-full bg-[#4b5563] border border-[#111417]" />
                      <span className="absolute -bottom-1 -right-1 h-1.5 w-1.5 rounded-full bg-[#4b5563] border border-[#111417]" />

                      {/* ENGRAVED OVR RATING */}
                      <span
                        className="font-mono-custom text-[38px] font-black leading-none tracking-tighter text-[#e5b369]"
                        style={{
                          textShadow:
                            '-1.5px -1.5px 0 #050201, 0 -1.5px 1px #050201, 1px 1.5px 0 rgba(255,225,160,0.4), 1px 2px 3px rgba(245,180,100,0.25)',
                        }}
                      >
                        {overall}
                      </span>

                      {/* ENGRAVED POSITION */}
                      <span
                        className="mt-0.5 font-mono-custom text-xs font-black tracking-widest text-[#d49d5a]"
                        style={{
                          textShadow: '-1px -1px 0 #060201, 1px 1px 0 rgba(255,215,140,0.3)',
                        }}
                      >
                        {activePosition}
                      </span>
                    </div>
                  </div>

                  {/* =========================================================== */}
                  {/* CENTERPIECE: THE ATHLETE PORTRAIT NAILED ONTO THE SHIELD    */}
                  {/* =========================================================== */}
                  <div className="relative mx-1.5 flex-1">
                    {/* The Weathered Tournament Parchment / Canvas Sheet */}
                    <div
                      className="group relative mx-auto h-[215px] w-[184px] overflow-hidden rounded-[3px] border border-[#3a291a] shadow-[0_16px_28px_rgba(0,0,0,0.95),0_3px_8px_rgba(0,0,0,0.85)] transition-transform duration-300"
                      style={{
                        background:
                          'linear-gradient(175deg, #2b1c11 0%, #1c1109 45%, #120904 100%)',
                      }}
                    >
                      {/* Parchment Aged Texture & Burnt Edge Vignette */}
                      <div className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_0_24px_rgba(0,0,0,0.95),inset_0_0_6px_rgba(0,0,0,0.9)]" />

                      {/* Ambient Torchlight Warmth behind player */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(245,158,11,0.28)_0%,rgba(180,83,9,0.15)_40%,transparent_75%)]" />

                      {/* Athlete Cutout / Photo Image */}
                      <img
                        src={activePhoto}
                        alt={activeName}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="absolute inset-0 h-full w-full object-contain object-bottom scale-110 drop-shadow-[0_12px_18px_rgba(0,0,0,0.95)] transition-transform duration-300 group-hover:scale-115"
                      />

                      {/* Torch Smoke & Dark Timber Dissolve at base of portrait */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#140b05] via-[#140b05]/80 to-transparent" />

                      {/* Quick Photo Upload / Change Overlay Button */}
                      {onUploadClick && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUploadClick();
                          }}
                          className="absolute bottom-2 left-1/2 z-30 -translate-x-1/2 inline-flex items-center gap-1 rounded-sm border border-[#78350f] bg-black/85 px-2 py-0.5 text-[8px] font-bold text-[#f59e0b] shadow-md hover:bg-[#78350f]/60 hover:text-white transition-all opacity-80 hover:opacity-100"
                          title="Change or upload portrait photo"
                        >
                          <Camera size={9} />
                          <span>Photo</span>
                        </button>
                      )}

                      {/* ===================================================== */}
                      {/* FOUR HAND-FORGED IRON NAILS DRIVEN INTO THE FOUR CORNERS */}
                      {/* ===================================================== */}
                      {/* Top-Left Forged Nail */}
                      <div className="pointer-events-none absolute left-2 top-2 z-30">
                        {/* Paper compression dent */}
                        <div className="absolute -inset-1 rounded-full bg-black/85 blur-[0.5px]" />
                        {/* Square Forged Iron Nail Head */}
                        <div className="relative h-3 w-3 rotate-12 rounded-[1.5px] border border-[#0d0f11] bg-gradient-to-br from-[#4b5563] via-[#1f2428] to-[#090b0d] shadow-[2px_3px_4px_rgba(0,0,0,0.9)]">
                          <span className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-[#cbd5e1] opacity-75" />
                        </div>
                      </div>

                      {/* Top-Right Forged Nail */}
                      <div className="pointer-events-none absolute right-2 top-2 z-30">
                        <div className="absolute -inset-1 rounded-full bg-black/85 blur-[0.5px]" />
                        <div className="relative h-3 w-3 -rotate-12 rounded-[1.5px] border border-[#0d0f11] bg-gradient-to-br from-[#4b5563] via-[#1f2428] to-[#090b0d] shadow-[2px_3px_4px_rgba(0,0,0,0.9)]">
                          <span className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-[#cbd5e1] opacity-75" />
                        </div>
                      </div>

                      {/* Bottom-Left Forged Nail */}
                      <div className="pointer-events-none absolute bottom-2 left-2 z-30">
                        <div className="absolute -inset-1 rounded-full bg-black/85 blur-[0.5px]" />
                        <div className="relative h-3 w-3 -rotate-45 rounded-[1.5px] border border-[#0d0f11] bg-gradient-to-br from-[#4b5563] via-[#1f2428] to-[#090b0d] shadow-[2px_3px_4px_rgba(0,0,0,0.9)]">
                          <span className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-[#cbd5e1] opacity-75" />
                        </div>
                      </div>

                      {/* Bottom-Right Forged Nail */}
                      <div className="pointer-events-none absolute bottom-2 right-2 z-30">
                        <div className="absolute -inset-1 rounded-full bg-black/85 blur-[0.5px]" />
                        <div className="relative h-3 w-3 rotate-45 rounded-[1.5px] border border-[#0d0f11] bg-gradient-to-br from-[#4b5563] via-[#1f2428] to-[#090b0d] shadow-[2px_3px_4px_rgba(0,0,0,0.9)]">
                          <span className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-[#cbd5e1] opacity-75" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TOP-RIGHT FLANK: NATION TOURNEY SEAL & KTK CREST */}
                  <div className="z-30 flex flex-col items-center">
                    <div className="relative flex flex-col items-center rounded-md border border-[#374151] bg-gradient-to-b from-[#1f2428] via-[#121619] to-[#080a0c] p-1.5 shadow-[0_8px_16px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.15)]">
                      {/* Four Corner Mini Iron Studs */}
                      <span className="absolute -left-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#4b5563] border border-[#111417]" />
                      <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#4b5563] border border-[#111417]" />
                      <span className="absolute -bottom-1 -left-1 h-1.5 w-1.5 rounded-full bg-[#4b5563] border border-[#111417]" />
                      <span className="absolute -bottom-1 -right-1 h-1.5 w-1.5 rounded-full bg-[#4b5563] border border-[#111417]" />

                      {/* Country Flag Badge */}
                      <div
                        className="rounded-sm border border-[#78350f]/60 bg-black/70 px-1 py-0.5 text-lg shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                        title={matchedArchetype.nation.name}
                      >
                        {activeFlag}
                      </div>

                      {/* Iron Monogram Seal */}
                      <div className="mt-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-[#4b5563] bg-gradient-to-br from-[#1f2428] to-[#090b0d] shadow-inner">
                        <span className="font-mono-custom text-[8px] font-black tracking-wider text-[#d1d5db]">
                          KTK
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* 3. ENGRAVED PLAYER NAME IN REINFORCED TIMBER CROSS-BEAM       */}
                {/* ============================================================= */}
                <div className="relative z-20 mt-2 px-4 text-center">
                  <div className="relative mx-auto flex max-w-[280px] items-center justify-center rounded-sm border-y border-[#3d200e] bg-gradient-to-r from-transparent via-[#140b05]/95 to-transparent px-3 py-1 shadow-inner">
                    {/* Forged Iron Stud (Left) */}
                    <div className="mr-2 flex items-center gap-1 opacity-85">
                      <div className="h-2 w-2 rounded-full border border-[#111417] bg-[#374151] shadow" />
                      <div className="h-0.5 w-4 bg-[#78350f]/70" />
                    </div>

                    {/* DEEPLY ENGRAVED / HEAT-BRANDED NAME */}
                    <h3
                      className="truncate font-mono-custom text-[20px] font-black uppercase tracking-wider text-[#e8b572]"
                      style={{
                        textShadow:
                          '-2px -2px 0px #050201, 0 -2px 1px #050201, 1px 1.5px 0px rgba(255, 225, 160, 0.4), 1px 2px 3px rgba(245, 180, 100, 0.3)',
                      }}
                    >
                      {activeName}
                    </h3>

                    {/* Forged Iron Stud (Right) */}
                    <div className="ml-2 flex items-center gap-1 opacity-85">
                      <div className="h-0.5 w-4 bg-[#78350f]/70" />
                      <div className="h-2 w-2 rounded-full border border-[#111417] bg-[#374151] shadow" />
                    </div>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* 4. THE ENGRAVED ATTRIBUTES MATRIX (PAC, SHO, PAS, DRI, DEF)   */}
                {/* ============================================================= */}
                <div className="relative z-20 mt-2 px-5">
                  <div className="relative rounded-md border border-[#3d200e]/80 bg-gradient-to-b from-[#120a04]/90 via-[#0d0602]/95 to-[#070301]/98 px-3.5 py-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.95)]">
                    {/* Corner Chiseled Notches */}
                    <span className="absolute left-1 top-1 font-mono text-[8px] text-[#78350f]/60">╔</span>
                    <span className="absolute right-1 top-1 font-mono text-[8px] text-[#78350f]/60">╗</span>
                    <span className="absolute bottom-1 left-1 font-mono text-[8px] text-[#78350f]/60">╚</span>
                    <span className="absolute bottom-1 right-1 font-mono text-[8px] text-[#78350f]/60">╝</span>

                    <div className="flex items-center justify-between font-mono-custom">
                      {/* LEFT COLUMN: PAC, SHO, PAS (DEEPLY ENGRAVED) */}
                      <div className="flex-1 space-y-1 pr-3 text-right">
                        {leftStats.map((st) => (
                          <div key={st.label} className="flex items-center justify-end gap-2">
                            <span
                              className="text-[17px] font-black leading-tight text-[#f4c172]"
                              style={{
                                textShadow:
                                  '-1.5px -1.5px 0 #050201, 0 -1.5px 1px #050201, 1px 1px 0 rgba(255,225,170,0.45)',
                              }}
                            >
                              {st.val}
                            </span>
                            <span
                              className="text-xs font-black tracking-wider text-[#b88042]"
                              style={{
                                textShadow: '-1px -1px 0 #060201, 1px 1px 0 rgba(255,215,140,0.25)',
                              }}
                            >
                              {st.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* ENGRAVED CHISEL BROADSWORD DIVIDER */}
                      <div className="relative flex flex-col items-center px-1">
                        <div className="h-6 w-[1px] bg-gradient-to-b from-transparent via-[#78350f] to-[#e5b369]/60" />
                        <div className="my-0.5 h-2 w-2 rotate-45 border border-[#111417] bg-[#374151] shadow" />
                        <div className="h-6 w-[1px] bg-gradient-to-t from-transparent via-[#78350f] to-[#e5b369]/60" />
                      </div>

                      {/* RIGHT COLUMN: DRI, DEF, PHY (DEEPLY ENGRAVED) */}
                      <div className="flex-1 space-y-1 pl-3 text-left">
                        {rightStats.map((st) => (
                          <div key={st.label} className="flex items-center justify-start gap-2">
                            <span
                              className="text-[17px] font-black leading-tight text-[#f4c172]"
                              style={{
                                textShadow:
                                  '-1.5px -1.5px 0 #050201, 0 -1.5px 1px #050201, 1px 1px 0 rgba(255,225,170,0.45)',
                              }}
                            >
                              {st.val}
                            </span>
                            <span
                              className="text-xs font-black tracking-wider text-[#b88042]"
                              style={{
                                textShadow: '-1px -1px 0 #060201, 1px 1px 0 rgba(255,215,140,0.25)',
                              }}
                            >
                              {st.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* 5. BOTTOM POINT / CHAPE: SPEARHEAD HALLMARK & WAGER STACK     */}
                {/* ============================================================= */}
                <div className="relative z-20 mt-1.5 flex flex-col items-center justify-center pb-3">
                  <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-[#a8a29e]">
                    <span>TOURNEY</span>
                    <span className="flex gap-0.5 text-[#f59e0b]">
                      <span>◆</span>
                      <span>◆</span>
                      <span>◆</span>
                    </span>
                    <span>·</span>
                    <span className="text-[#f4c172] font-black">{cardAlloc} KTK STAKE</span>
                  </div>

                  {/* Blacksmith Touchmark Hallmark Escutcheon */}
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <div className="h-[1px] w-6 bg-gradient-to-r from-transparent to-[#78350f]" />
                    <div className="flex h-5 w-5 items-center justify-center rounded-sm border border-[#4b5563] bg-gradient-to-b from-[#1f2428] to-[#07090b] shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#e5b369]">
                        <path
                          d="M 6,3 L 10,3 L 10,10 L 15,3 L 19,3 L 13,12 L 20,21 L 16,21 L 10,13 L 10,21 L 6,21 Z"
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                    <div className="h-[1px] w-6 bg-gradient-to-l from-transparent to-[#78350f]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* REVERSE FACE: SEPOLIA ON-CHAIN ERC-721 LIVING PASSPORT            */}
        {/* ================================================================= */}
        <div
          className="absolute inset-0 select-none overflow-visible"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div
            className="relative h-full w-full p-[4px] shadow-[0_24px_60px_rgba(0,0,0,0.98)]"
            style={{
              clipPath: hotdShieldOuterClip,
              background:
                'linear-gradient(145deg, #4b5563 0%, #1f2428 15%, #111417 35%, #374151 50%, #111417 65%, #2a3138 85%, #4b5563 100%)',
            }}
          >
            <div
              className="relative h-full w-full overflow-hidden p-4 font-mono-custom text-xs"
              style={{
                clipPath: hotdShieldInnerClip,
                background:
                  'radial-gradient(ellipse at 50% 30%, #1c1109 0%, #0d0603 50%, #050201 100%)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#78350f]/50 pb-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#35D399]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#f4c172]">
                    SEPOLIA PASSPORT
                  </span>
                </div>
                <span className="text-[9px] text-[#35D399]">ERC-721</span>
              </div>

              {/* Identity Box */}
              <div className="mt-3 rounded-sm border border-[#78350f]/50 bg-black/70 p-2.5 shadow-inner">
                <p className="text-[9px] uppercase text-[#a8a29e]">Champion Identity</p>
                <p className="text-sm font-bold text-white mt-0.5">
                  {activeName} ({activePosition})
                </p>
                <p className="text-[10px] text-[#f4c172] mt-0.5">
                  {activeFlag} {matchedArchetype.nation.name} · {overall} OVR
                </p>
              </div>

              {/* Contract & Token Metadata */}
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="rounded-sm border border-[#3d200e] bg-black/70 p-2">
                  <p className="text-[8px] uppercase text-[#a8a29e]">Contract</p>
                  <p className="truncate text-[10px] font-semibold text-[#f4c172]">0x613C...7B41</p>
                  <p className="text-[8px] text-[#a8a29e]">Sepolia Testnet</p>
                </div>
                <div className="rounded-sm border border-[#3d200e] bg-black/70 p-2">
                  <p className="text-[8px] uppercase text-[#a8a29e]">Token Status</p>
                  <p className="text-[10px] font-semibold text-[#35D399]">
                    {isMinted ? `#${legend?.mint?.tokenId}` : 'Ready to Mint'}
                  </p>
                  <p className="text-[8px] text-[#a8a29e]">Dynamic Shield</p>
                </div>
              </div>

              {/* Rollover & Proof */}
              <div className="mt-2.5 rounded-sm border border-[#3d200e] bg-black/70 p-2.5">
                <p className="text-[9px] uppercase text-[#a8a29e]">Shield Allocation</p>
                <p className="text-xs font-bold text-[#f4c172] mt-0.5">{cardAlloc} KTK Stack</p>
                {typeof playable === 'number' && !Number.isNaN(playable) ? (
                  <p className="text-[10px] text-[#35D399] mt-0.5">
                    Playable Roll: {playable.toLocaleString()} KTK
                  </p>
                ) : null}
                <p className="mt-1 text-[9px] text-[#a8a29e] leading-relaxed">
                  Knight shield stats evolve with floor play. Verifiable on Ethereum Sepolia Explorer.
                </p>
              </div>

              {/* Quick Flip Button */}
              {onFlip && (
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFlip();
                    }}
                    className="inline-flex items-center gap-1 rounded-sm border border-[#78350f] bg-[#78350f]/20 px-3 py-1 text-[10px] font-bold text-[#f4c172] hover:bg-[#78350f]/40"
                  >
                    <RotateCw size={10} /> Back to Shield
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
