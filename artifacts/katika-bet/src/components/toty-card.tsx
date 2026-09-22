import React, { useMemo, useRef, useState } from 'react';
import { Camera, RotateCw, ShieldCheck } from 'lucide-react';
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
    const rx = (py - 0.5) * -14;
    const ry = (px - 0.5) * 14;
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

  // AUTHENTIC MEDIEVAL KNIGHT'S HEATER SHIELD CONTOUR
  // Curved upper brow, rounded shoulders, vertical flank drop, and smooth tapering arc down to the base point
  const knightShieldOuterClip =
    'polygon(50% 0.5%, 72% 0.5%, 88% 1.2%, 96% 4%, 100% 9%, 100% 62%, 95% 72%, 86% 81%, 73% 89%, 58% 95.5%, 50% 99.8%, 42% 95.5%, 27% 89%, 14% 81%, 5% 72%, 0% 62%, 0% 9%, 4% 4%, 12% 1.2%, 28% 0.5%)';

  const knightShieldInnerClip =
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
        {/* FRONT FACE: REALISTIC AUTHENTIC MEDIEVAL OAK KNIGHT HEATER SHIELD */}
        {/* ================================================================= */}
        <div
          className="absolute inset-0 select-none overflow-visible"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* AMBIENT NATURAL WARM SHIELD DROP SHADOW & REAR REFLECTION */}
          <div
            className="pointer-events-none absolute -inset-6 -z-10 rounded-[44px] opacity-80 blur-xl transition-opacity duration-300"
            style={{
              background:
                'radial-gradient(circle at 50% 30%, rgba(180, 83, 9, 0.28) 0%, rgba(30, 20, 10, 0.6) 45%, rgba(0, 0, 0, 0.95) 80%)',
            }}
          />

          {/* ============================================================= */}
          {/* BLACKENED HAMMERED WROUGHT-IRON RIM & FORGED PERIMETER FRAME  */}
          {/* ============================================================= */}
          <div
            className="relative h-full w-full p-[4.5px] shadow-[0_26px_65px_rgba(0,0,0,0.98),0_6px_20px_rgba(10,5,2,0.95)]"
            style={{
              clipPath: knightShieldOuterClip,
              background:
                'linear-gradient(140deg, #5b646e 0%, #2b3036 12%, #14171a 30%, #474f58 50%, #16191c 70%, #2f353c 86%, #525a64 100%)',
            }}
          >
            {/* INNER CHISELED IRON REBATE WITH BEVELED SHADOW */}
            <div
              className="relative h-full w-full p-[2.5px]"
              style={{
                clipPath: knightShieldInnerClip,
                background:
                  'linear-gradient(180deg, #1b2025 0%, #0e1113 25%, #2a3138 50%, #0c0e10 75%, #1d2228 100%)',
              }}
            >
              {/* ============================================================= */}
              {/* THE WOODEN SHIELD BODY: SEASONED MEDIEVAL OAK PLANKS          */}
              {/* ============================================================= */}
              <div
                className="relative h-full w-full overflow-hidden"
                style={{
                  clipPath: knightShieldInnerClip,
                  backgroundColor: '#1b0f07',
                }}
              >
                {/* SVG PROCEDURAL REALISTIC OAK WOOD GRAIN & FORGED IRON FITTINGS */}
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 332 505"
                  preserveAspectRatio="none"
                >
                  <defs>
                    {/* Realistic Seasoned Quartersawn Oak Planks */}
                    <linearGradient id="oakPlank1" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#1e0f06" />
                      <stop offset="35%" stopColor="#371e10" />
                      <stop offset="70%" stopColor="#2c160b" />
                      <stop offset="100%" stopColor="#1a0c05" />
                    </linearGradient>
                    <linearGradient id="oakPlank2" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#180c05" />
                      <stop offset="28%" stopColor="#3d2112" />
                      <stop offset="68%" stopColor="#331a0e" />
                      <stop offset="100%" stopColor="#1c0e06" />
                    </linearGradient>
                    <linearGradient id="oakPlank3" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#1d0e06" />
                      <stop offset="32%" stopColor="#391e10" />
                      <stop offset="72%" stopColor="#412414" />
                      <stop offset="100%" stopColor="#1a0c05" />
                    </linearGradient>
                    <linearGradient id="oakPlank4" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#180c05" />
                      <stop offset="30%" stopColor="#301a0d" />
                      <stop offset="68%" stopColor="#3a2011" />
                      <stop offset="100%" stopColor="#1f1007" />
                    </linearGradient>

                    {/* Blackened Wrought Iron Banding */}
                    <linearGradient id="forgedIronBand" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#555d66" />
                      <stop offset="22%" stopColor="#21262b" />
                      <stop offset="50%" stopColor="#3d464f" />
                      <stop offset="78%" stopColor="#131619" />
                      <stop offset="100%" stopColor="#4e565f" />
                    </linearGradient>

                    {/* Specular Hand-Hammered Domed Iron Rivet */}
                    <radialGradient id="ironRivetGrad" cx="34%" cy="32%" r="66%">
                      <stop offset="0%" stopColor="#b4bcc6" />
                      <stop offset="35%" stopColor="#47505a" />
                      <stop offset="75%" stopColor="#1b2024" />
                      <stop offset="100%" stopColor="#080a0c" />
                    </radialGradient>
                  </defs>

                  {/* 4 Distinct Vertical Wooden Planks of the Knight's Shield */}
                  <rect x="0" y="0" width="82" height="505" fill="url(#oakPlank1)" />
                  <rect x="82" y="0" width="84" height="505" fill="url(#oakPlank2)" />
                  <rect x="166" y="0" width="84" height="505" fill="url(#oakPlank3)" />
                  <rect x="250" y="0" width="82" height="505" fill="url(#oakPlank4)" />

                  {/* Recessed Plank Joints with Dark Ambient Shadow & Timber Lip Highlights */}
                  <g>
                    {/* Seam 1 (x = 82) */}
                    <line x1="81" y1="0" x2="81" y2="505" stroke="#040100" strokeWidth="2.8" />
                    <line x1="83" y1="0" x2="83" y2="505" stroke="#683a1d" strokeWidth="0.8" opacity="0.65" />

                    {/* Seam 2 (x = 166 - Shield Centerline Mortise) */}
                    <line x1="165" y1="0" x2="165" y2="505" stroke="#040100" strokeWidth="3.2" />
                    <line x1="167" y1="0" x2="167" y2="505" stroke="#713e20" strokeWidth="0.8" opacity="0.7" />

                    {/* Seam 3 (x = 250) */}
                    <line x1="249" y1="0" x2="249" y2="505" stroke="#040100" strokeWidth="2.8" />
                    <line x1="251" y1="0" x2="251" y2="505" stroke="#683a1d" strokeWidth="0.8" opacity="0.65" />
                  </g>

                  {/* Authentic Wood Grain Striations, Rays & Organic Fiber Knots */}
                  <g stroke="#110702" strokeWidth="0.9" fill="none" opacity="0.6">
                    {/* Plank 1 Medullary Fibers */}
                    <path d="M 12 0 Q 18 110 14 240 T 18 505" />
                    <path d="M 28 0 Q 22 140 34 310 T 26 505" />
                    <path d="M 48 0 Q 56 170 46 350 T 52 505" />
                    <path d="M 66 0 Q 72 85 64 270 T 70 505" />

                    {/* Plank 2 Grain & Heartwood Knot */}
                    <path d="M 94 0 Q 104 130 98 300 T 102 505" />
                    <path d="M 114 0 Q 124 190 116 370 T 122 505" />
                    {/* Natural Oak Knot */}
                    <ellipse cx="136" cy="175" rx="8.5" ry="22" stroke="#0a0401" strokeWidth="1.2" />
                    <ellipse cx="136" cy="175" rx="3.5" ry="11" stroke="#0a0401" strokeWidth="1.4" />
                    <path d="M 136 0 Q 144 125 132 155 M 132 195 Q 140 265 144 505" />
                    <path d="M 150 0 Q 156 105 150 250 T 154 505" />

                    {/* Plank 3 Grain */}
                    <path d="M 174 0 Q 168 115 176 290 T 172 505" />
                    <path d="M 192 0 Q 202 150 194 330 T 200 505" />
                    <path d="M 214 0 Q 208 190 218 380 T 212 505" />
                    <path d="M 234 0 Q 242 135 232 310 T 238 505" />

                    {/* Plank 4 Grain & Lower Knot */}
                    <path d="M 260 0 Q 254 115 262 270 T 258 505" />
                    <ellipse cx="282" cy="335" rx="7.5" ry="18" stroke="#0a0401" strokeWidth="1.2" />
                    <ellipse cx="282" cy="335" rx="3.2" ry="8" stroke="#0a0401" strokeWidth="1.4" />
                    <path d="M 282 0 Q 288 185 278 315 M 278 355 Q 286 425 284 505" />
                    <path d="M 304 0 Q 298 135 308 310 T 302 505" />
                    <path d="M 320 0 Q 324 200 316 400 T 322 505" />
                  </g>

                  {/* Battle Gouges, Sword Nicks & Adze Marks */}
                  <g stroke="#060201" strokeWidth="1.3" opacity="0.65">
                    <line x1="26" y1="92" x2="50" y2="105" />
                    <line x1="288" y1="138" x2="313" y2="150" />
                    <line x1="108" y1="388" x2="133" y2="378" />
                    <line x1="208" y1="428" x2="228" y2="443" />
                    <line x1="43" y1="278" x2="66" y2="293" strokeWidth="1.6" />
                  </g>

                  {/* Wood Chisel Highlight Lips */}
                  <g stroke="#61341a" strokeWidth="0.7" opacity="0.55">
                    <line x1="27" y1="93" x2="51" y2="106" />
                    <line x1="289" y1="139" x2="314" y2="151" />
                    <line x1="44" y1="279" x2="67" y2="294" />
                  </g>

                  {/* ========================================================= */}
                  {/* FORGED IRON BARS & SHIELD REINFORCEMENTS                  */}
                  {/* ========================================================= */}
                  {/* Heavy Top Rim Forged Iron Band */}
                  <path
                    d="M 12 4 L 320 4 L 320 22 L 12 22 Z"
                    fill="url(#forgedIronBand)"
                    stroke="#111417"
                    strokeWidth="1"
                    opacity="0.92"
                  />
                  {/* Mid-Plank Forged Iron Tie Strap */}
                  <path
                    d="M 6 250 L 326 250 L 326 256 L 6 256 Z"
                    fill="#15191d"
                    stroke="#2e353e"
                    strokeWidth="0.6"
                    opacity="0.88"
                  />

                  {/* Bottom Reinforced Spearhead Chape (Protects Base Tip) */}
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
                      <circle cx={rx + 1} cy={ry + 1.5} r="4.2" fill="#000000" opacity="0.8" />
                      {/* Wood Compression Indent Ring */}
                      <circle cx={rx} cy={ry} r="4.8" fill="none" stroke="#0a0401" strokeWidth="0.8" opacity="0.6" />
                      {/* Forged Iron Rivet Head */}
                      <circle cx={rx} cy={ry} r="3.7" fill="url(#ironRivetGrad)" stroke="#111417" strokeWidth="0.6" />
                      {/* Specular Highlight Catch */}
                      <circle cx={rx - 1} cy={ry - 1} r="1.1" fill="#e2e8f0" opacity="0.75" />
                    </g>
                  ))}
                </svg>

                {/* NATURAL WARM TORCHLIGHT SHEEN & TILT REFLECTION */}
                <div
                  className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-200"
                  style={{
                    opacity: isHovered ? 0.45 : 0.18,
                    background: `radial-gradient(circle at ${rot.glareX}% ${rot.glareY}%, rgba(254, 215, 170, 0.4) 0%, rgba(200, 120, 30, 0.15) 35%, rgba(0,0,0,0.85) 75%)`,
                    mixBlendMode: 'screen',
                  }}
                />

                {/* ============================================================= */}
                {/* 1. TOP HEADER: CHIVALRIC HERALDIC CROWN BARREL               */}
                {/* ============================================================= */}
                <div className="relative z-20 flex flex-col items-center pt-2.5">
                  <div className="relative flex items-center justify-center">
                    <div className="flex items-center gap-2 rounded-sm border-b border-x border-[#3b434a] bg-gradient-to-b from-[#1c2126] via-[#101316] to-[#07090a] px-4 py-0.5 shadow-[0_4px_10px_rgba(0,0,0,0.95)]">
                      {/* Forged Stud Left */}
                      <span className="h-1.5 w-1.5 rotate-45 border border-[#111417] bg-[#555d66]" />
                      <span className="font-mono-custom text-[8.5px] font-black tracking-[0.28em] text-[#d6dadf] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                        KATIKA LEGEND · KNIGHT HEATER SHIELD
                      </span>
                      {/* Forged Stud Right */}
                      <span className="h-1.5 w-1.5 rotate-45 border border-[#111417] bg-[#555d66]" />
                    </div>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* 2. REPOSITIONED UPPER FLANKS & CENTER NAILED PORTRAIT         */}
                {/* ============================================================= */}
                <div className="relative z-20 mt-1 flex w-full items-start justify-between px-3">
                  {/* TOP-LEFT FLANK: HAMMERED IRON ESCUTCHEON (OVR & POSITION) */}
                  <div className="z-30 flex flex-col items-center">
                    <div className="relative flex flex-col items-center rounded-md border border-[#3b434a] bg-gradient-to-b from-[#21262b] via-[#13171a] to-[#090b0d] p-1.5 shadow-[0_8px_16px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.18)]">
                      {/* Four Corner Mini Iron Studs */}
                      <span className="absolute -left-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#4e565f] border border-[#111417]" />
                      <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#4e565f] border border-[#111417]" />
                      <span className="absolute -bottom-1 -left-1 h-1.5 w-1.5 rounded-full bg-[#4e565f] border border-[#111417]" />
                      <span className="absolute -bottom-1 -right-1 h-1.5 w-1.5 rounded-full bg-[#4e565f] border border-[#111417]" />

                      {/* DEEPLY ENGRAVED OVR RATING */}
                      <span
                        className="font-mono-custom text-[38px] font-black leading-none tracking-tighter text-[#e5b369]"
                        style={{
                          textShadow:
                            '-1.5px -1.5px 0 #050201, 0 -1.5px 1px #050201, 1px 1.5px 0 rgba(255,225,160,0.4), 1px 2px 3px rgba(245,180,100,0.25)',
                        }}
                      >
                        {overall}
                      </span>

                      {/* DEEPLY ENGRAVED POSITION */}
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
                    {/* The Weathered Tournament Parchment / Heavy Linen Canvas Panel */}
                    <div
                      className="group relative mx-auto h-[215px] w-[184px] overflow-hidden rounded-[3px] border border-[#44301f] shadow-[0_18px_32px_rgba(0,0,0,0.95),0_4px_10px_rgba(0,0,0,0.85)] transition-transform duration-300"
                      style={{
                        background:
                          'linear-gradient(175deg, #2e1d12 0%, #1e120a 45%, #130a05 100%)',
                      }}
                    >
                      {/* Aged Parchment Vellum Vignette & Deckled Border Patina */}
                      <div className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_0_24px_rgba(0,0,0,0.95),inset_0_0_6px_rgba(0,0,0,0.9)]" />

                      {/* Natural Warm Torchlight glow behind player */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(245,158,11,0.25)_0%,rgba(180,83,9,0.12)_45%,transparent_75%)]" />

                      {/* Athlete Cutout / Photo Image */}
                      <img
                        src={activePhoto}
                        alt={activeName}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="absolute inset-0 h-full w-full object-contain object-bottom scale-110 drop-shadow-[0_12px_18px_rgba(0,0,0,0.95)] transition-transform duration-300 group-hover:scale-115"
                      />

                      {/* Dark Timber Dissolve at base of portrait */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#140b05] via-[#140b05]/85 to-transparent" />

                      {/* Convenient Photo Upload / Change Overlay Button */}
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
                      {/* FOUR REALISTIC HAND-FORGED BLACKSMITH ROSEHEAD NAILS  */}
                      {/* Driven through the four corners into the oak timbers  */}
                      {/* ===================================================== */}
                      {/* Top-Left Forged Nail */}
                      <div className="pointer-events-none absolute left-2 top-2 z-30">
                        {/* Paper Creasing & Compression Indent Ring */}
                        <div className="absolute -inset-1 rounded-full bg-black/85 blur-[0.6px]" />
                        {/* Square-Faceted Blacksmith Rosehead Nail Head */}
                        <div className="relative h-3 w-3 rotate-12 rounded-[1.5px] border border-[#0d0f11] bg-gradient-to-br from-[#555d66] via-[#21262b] to-[#090b0d] shadow-[2px_3px_5px_rgba(0,0,0,0.95)]">
                          <span className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-[#cbd5e1] opacity-75" />
                        </div>
                      </div>

                      {/* Top-Right Forged Nail */}
                      <div className="pointer-events-none absolute right-2 top-2 z-30">
                        <div className="absolute -inset-1 rounded-full bg-black/85 blur-[0.6px]" />
                        <div className="relative h-3 w-3 -rotate-12 rounded-[1.5px] border border-[#0d0f11] bg-gradient-to-br from-[#555d66] via-[#21262b] to-[#090b0d] shadow-[2px_3px_5px_rgba(0,0,0,0.95)]">
                          <span className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-[#cbd5e1] opacity-75" />
                        </div>
                      </div>

                      {/* Bottom-Left Forged Nail */}
                      <div className="pointer-events-none absolute bottom-2 left-2 z-30">
                        <div className="absolute -inset-1 rounded-full bg-black/85 blur-[0.6px]" />
                        <div className="relative h-3 w-3 -rotate-45 rounded-[1.5px] border border-[#0d0f11] bg-gradient-to-br from-[#555d66] via-[#21262b] to-[#090b0d] shadow-[2px_3px_5px_rgba(0,0,0,0.95)]">
                          <span className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-[#cbd5e1] opacity-75" />
                        </div>
                      </div>

                      {/* Bottom-Right Forged Nail */}
                      <div className="pointer-events-none absolute bottom-2 right-2 z-30">
                        <div className="absolute -inset-1 rounded-full bg-black/85 blur-[0.6px]" />
                        <div className="relative h-3 w-3 rotate-45 rounded-[1.5px] border border-[#0d0f11] bg-gradient-to-br from-[#555d66] via-[#21262b] to-[#090b0d] shadow-[2px_3px_5px_rgba(0,0,0,0.95)]">
                          <span className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-[#cbd5e1] opacity-75" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TOP-RIGHT FLANK: NATION TOURNEY SEAL & KTK CREST */}
                  <div className="z-30 flex flex-col items-center">
                    <div className="relative flex flex-col items-center rounded-md border border-[#3b434a] bg-gradient-to-b from-[#21262b] via-[#13171a] to-[#090b0d] p-1.5 shadow-[0_8px_16px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.18)]">
                      {/* Four Corner Mini Iron Studs */}
                      <span className="absolute -left-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#4e565f] border border-[#111417]" />
                      <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#4e565f] border border-[#111417]" />
                      <span className="absolute -bottom-1 -left-1 h-1.5 w-1.5 rounded-full bg-[#4e565f] border border-[#111417]" />
                      <span className="absolute -bottom-1 -right-1 h-1.5 w-1.5 rounded-full bg-[#4e565f] border border-[#111417]" />

                      {/* Country Flag Badge */}
                      <div
                        className="rounded-sm border border-[#78350f]/60 bg-black/70 px-1 py-0.5 text-lg shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                        title={matchedArchetype.nation.name}
                      >
                        {activeFlag}
                      </div>

                      {/* Iron Monogram Seal */}
                      <div className="mt-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-[#4e565f] bg-gradient-to-br from-[#21262b] to-[#090b0d] shadow-inner">
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
                      <div className="h-2 w-2 rounded-full border border-[#111417] bg-[#3b434a] shadow" />
                      <div className="h-0.5 w-4 bg-[#78350f]/70" />
                    </div>

                    {/* DEEPLY ENGRAVED / HEAT-BRANDED NAME */}
                    <h3
                      className="truncate font-mono-custom text-[20px] font-black uppercase tracking-wider text-[#e8b572]"
                      style={{
                        textShadow:
                          '-2px -2px 0px #050201, 0 -2px 1px #050201, 1px 1.5px 0px rgba(255, 225, 160, 0.45), 1px 2px 3px rgba(245, 180, 100, 0.3)',
                      }}
                    >
                      {activeName}
                    </h3>

                    {/* Forged Iron Stud (Right) */}
                    <div className="ml-2 flex items-center gap-1 opacity-85">
                      <div className="h-0.5 w-4 bg-[#78350f]/70" />
                      <div className="h-2 w-2 rounded-full border border-[#111417] bg-[#3b434a] shadow" />
                    </div>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* 4. THE DEEPLY ENGRAVED ATTRIBUTES MATRIX (PAC, SHO, PAS...)   */}
                {/* ============================================================= */}
                <div className="relative z-20 mt-2 px-5">
                  <div className="relative rounded-md border border-[#3d200e]/85 bg-gradient-to-b from-[#120a04]/90 via-[#0d0602]/95 to-[#070301]/98 px-3.5 py-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.95)]">
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
                        <div className="my-0.5 h-2 w-2 rotate-45 border border-[#111417] bg-[#3b434a] shadow" />
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
                    <div className="flex h-5 w-5 items-center justify-center rounded-sm border border-[#4e565f] bg-gradient-to-b from-[#21262b] to-[#07090b] shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
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
            className="relative h-full w-full p-[4.5px] shadow-[0_26px_65px_rgba(0,0,0,0.98)]"
            style={{
              clipPath: knightShieldOuterClip,
              background:
                'linear-gradient(140deg, #5b646e 0%, #2b3036 12%, #14171a 30%, #474f58 50%, #16191c 70%, #2f353c 86%, #525a64 100%)',
            }}
          >
            <div
              className="relative h-full w-full overflow-hidden p-4 font-mono-custom text-xs"
              style={{
                clipPath: knightShieldInnerClip,
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
