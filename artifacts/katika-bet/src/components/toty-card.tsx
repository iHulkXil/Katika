import React, { useMemo, useRef, useState } from 'react';
import { Camera, RotateCw, ShieldCheck, Sparkles, Zap, Target, Shield, Flame, Award, ChevronRight } from 'lucide-react';
import type { LegendCardData } from './legend-card';
import { ARCHETYPES } from './legend-avatar';

export type CardTheme = 'emerald' | 'knight' | 'icon';

interface TotyCardProps {
  legend: LegendCardData | null;
  overall?: number;
  playable?: number;
  isFlipped?: boolean;
  theme?: CardTheme;
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
  theme = 'emerald',
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
    return ARCHETYPES[0];
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

  // Professional sculpted tournament shield polygon
  // Top chamfers, vertical flank drop, and lower multi-tier chevron point
  const shieldOuterClip =
    'polygon(20px 0%, calc(100% - 20px) 0%, 100% 20px, 100% calc(100% - 72px), calc(100% - 32px) calc(100% - 32px), 50% 100%, 32px calc(100% - 32px), 0% calc(100% - 72px), 0% 20px)';
  const shieldInnerClip =
    'polygon(18px 0%, calc(100% - 18px) 0%, 100% 18px, 100% calc(100% - 70px), calc(100% - 30px) calc(100% - 30px), 50% 100%, 30px calc(100% - 30px), 0% calc(100% - 70px), 0% 18px)';

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
        {/* FRONT FACE: KATIKA EMERALD ELITE / EA-FC FIT ULTIMATE CARD      */}
        {/* ================================================================= */}
        <div
          className="absolute inset-0 select-none overflow-visible"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* AMBIENT EMERALD & GOLD HALO GLOW */}
          <div
            className="pointer-events-none absolute -inset-6 -z-10 rounded-[44px] opacity-75 blur-2xl transition-opacity duration-300"
            style={{
              background:
                'radial-gradient(circle at 50% 35%, rgba(52, 211, 153, 0.35) 0%, rgba(234, 179, 8, 0.25) 40%, rgba(2, 44, 34, 0.8) 70%, rgba(0, 0, 0, 0.95) 90%)',
            }}
          />

          {/* ============================================================= */}
          {/* SCULPTED METALLIC CHAMPAGNE GOLD OUTER RIM                    */}
          {/* ============================================================= */}
          <div
            className="relative h-full w-full p-[4px] shadow-[0_24px_60px_rgba(0,0,0,0.95),0_6px_20px_rgba(6,78,59,0.5)]"
            style={{
              clipPath: shieldOuterClip,
              background:
                'linear-gradient(135deg, #fef08a 0%, #ca8a04 18%, #854d0e 32%, #eab308 50%, #713f12 68%, #d4af37 84%, #fef9c3 100%)',
            }}
          >
            {/* INNER CHISELED DARK EMERALD BEVEL WITH GOLD INLAYS */}
            <div
              className="relative h-full w-full p-[2.5px]"
              style={{
                clipPath: shieldInnerClip,
                background:
                  'linear-gradient(180deg, #134e4a 0%, #064e3b 25%, #022c22 55%, #041f18 80%, #0c3327 100%)',
              }}
            >
              {/* ============================================================= */}
              {/* THE CARD BODY: FACETED EMERALD CRYSTAL & GOLD LEAF VEINS      */}
              {/* ============================================================= */}
              <div
                className="relative h-full w-full overflow-hidden"
                style={{
                  clipPath: shieldInnerClip,
                  background: 'radial-gradient(circle at 50% 25%, #065f46 0%, #044332 40%, #022c22 75%, #011913 100%)',
                }}
              >
                {/* SVG FACETED CRYSTALS & GEOMETRIC GOLD MATRIX */}
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 332 505"
                  preserveAspectRatio="none"
                >
                  <defs>
                    {/* Shimmering Emerald Facet Gradients */}
                    <linearGradient id="facetGreen1" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                      <stop offset="50%" stopColor="#047857" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#064e3b" stopOpacity="0.6" />
                    </linearGradient>
                    <linearGradient id="facetGreen2" x1="1" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
                      <stop offset="60%" stopColor="#059669" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#022c22" stopOpacity="0.7" />
                    </linearGradient>
                    <linearGradient id="facetGreen3" x1="0.5" y1="0" x2="0.5" y2="1">
                      <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#064e3b" stopOpacity="0.1" />
                    </linearGradient>

                    {/* Gold Leaf Vein Gradient */}
                    <linearGradient id="goldVein" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#eab308" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#854d0e" stopOpacity="0.6" />
                    </linearGradient>

                    {/* Radial Caustic Light Burst */}
                    <radialGradient id="causticLight" cx="50%" cy="30%" r="60%">
                      <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
                      <stop offset="35%" stopColor="#059669" stopOpacity="0.25" />
                      <stop offset="70%" stopColor="#022c22" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Caustic Ambient Burst */}
                  <rect x="0" y="0" width="332" height="505" fill="url(#causticLight)" />

                  {/* 3D Geometric Crystal Facets (Low-Poly Gemstone Cuts) */}
                  <g opacity="0.85">
                    {/* Top Apex Facets */}
                    <polygon points="166,0 240,40 166,95 92,40" fill="url(#facetGreen1)" />
                    <polygon points="92,40 166,95 80,150 0,90" fill="url(#facetGreen2)" />
                    <polygon points="240,40 332,90 252,150 166,95" fill="url(#facetGreen3)" />

                    {/* Left Flank Facets */}
                    <polygon points="0,90 80,150 50,260 0,220" fill="url(#facetGreen1)" />
                    <polygon points="80,150 166,95 140,240 50,260" fill="url(#facetGreen2)" />

                    {/* Right Flank Facets */}
                    <polygon points="332,90 252,150 282,260 332,220" fill="url(#facetGreen2)" />
                    <polygon points="252,150 166,95 192,240 282,260" fill="url(#facetGreen1)" />

                    {/* Lower Chevron Facets */}
                    <polygon points="50,260 140,240 166,350 70,360" fill="url(#facetGreen3)" />
                    <polygon points="282,260 192,240 166,350 262,360" fill="url(#facetGreen2)" />
                    <polygon points="70,360 166,350 166,470 32,435" fill="url(#facetGreen1)" />
                    <polygon points="262,360 166,350 166,470 300,435" fill="url(#facetGreen2)" />
                    <polygon points="32,435 166,470 166,505 0,435" fill="url(#facetGreen3)" />
                    <polygon points="300,435 166,470 166,505 332,435" fill="url(#facetGreen1)" />
                  </g>

                  {/* Gold Crystalline Facet Seams & Inlay Lines */}
                  <g stroke="url(#goldVein)" strokeWidth="0.8" opacity="0.75">
                    <line x1="166" y1="0" x2="240" y2="40" />
                    <line x1="166" y1="0" x2="92" y2="40" />
                    <line x1="92" y1="40" x2="166" y2="95" />
                    <line x1="240" y1="40" x2="166" y2="95" />
                    <line x1="0" y1="90" x2="80" y2="150" />
                    <line x1="332" y1="90" x2="252" y2="150" />
                    <line x1="80" y1="150" x2="140" y2="240" />
                    <line x1="252" y1="150" x2="192" y2="240" />
                    <line x1="140" y1="240" x2="166" y2="350" />
                    <line x1="192" y1="240" x2="166" y2="350" />
                    <line x1="166" y1="350" x2="166" y2="505" />
                    <line x1="70" y1="360" x2="166" y2="350" />
                    <line x1="262" y1="360" x2="166" y2="350" />
                    <line x1="32" y1="435" x2="166" y2="470" />
                    <line x1="300" y1="435" x2="166" y2="470" />
                  </g>

                  {/* Subtle Tech Hexagon Mesh Overlay in Bottom Half */}
                  <pattern id="hexGrid" width="16" height="27.7" patternUnits="userSpaceOnUse">
                    <path
                      d="M8 0 L16 4.6 L16 13.9 L8 18.5 L0 13.9 L0 4.6 Z M8 27.7 L16 23.1 L16 13.9 M0 13.9 L0 23.1 L8 27.7"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="0.5"
                      opacity="0.12"
                    />
                  </pattern>
                  <rect x="0" y="220" width="332" height="285" fill="url(#hexGrid)" />
                </svg>

                {/* DYNAMIC HOLOGRAPHIC LIGHT SHEEN OVERLAY (MOUSE INTERACTION) */}
                {interactive && (
                  <div
                    className="pointer-events-none absolute inset-0 opacity-40 mix-blend-color-dodge transition-opacity duration-300"
                    style={{
                      background: `radial-gradient(circle 220px at ${rot.glareX}% ${rot.glareY}%, rgba(254, 240, 138, 0.8) 0%, rgba(52, 211, 153, 0.4) 40%, transparent 75%)`,
                    }}
                  />
                )}

                {/* ========================================================= */}
                {/* ATHLETE CUTOUT CENTERPIECE                                */}
                {/* ========================================================= */}
                <div className="absolute right-[-15px] top-[40px] z-10 h-[300px] w-[270px]">
                  {/* Subtle backlight halo around player */}
                  <div
                    className="absolute inset-4 rounded-full opacity-60 blur-xl"
                    style={{
                      background: 'radial-gradient(circle, rgba(52, 211, 153, 0.6) 0%, rgba(234, 179, 8, 0.3) 50%, transparent 80%)',
                    }}
                  />
                  <img
                    src={activePhoto}
                    alt={activeName}
                    className="relative h-full w-full object-contain object-bottom drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)] filter"
                    style={{
                      maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                    }}
                  />
                </div>

                {/* ========================================================= */}
                {/* TOP-LEFT ATHLETIC IDENTITY PILLAR (STACKED EA FC STYLE)   */}
                {/* ========================================================= */}
                <div className="absolute left-[18px] top-[26px] z-20 flex flex-col items-center">
                  {/* Overall Rating (Big Metallic Gold Numbers) */}
                  <div className="relative leading-none">
                    <span
                      className="font-mono-custom text-[46px] font-black tracking-[-0.06em] text-transparent drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]"
                      style={{
                        background: 'linear-gradient(180deg, #ffffff 0%, #fef08a 35%, #eab308 70%, #ca8a04 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                      }}
                    >
                      {overall}
                    </span>
                  </div>

                  {/* Position Badge */}
                  <span
                    className="mt-0.5 font-mono-custom text-[15px] font-black tracking-tight text-[#fef08a] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                  >
                    {activePosition}
                  </span>

                  {/* Thin Gold Horizontal Separator */}
                  <div className="my-1.5 h-[1.5px] w-7 bg-gradient-to-r from-transparent via-[#fef08a]/80 to-transparent" />

                  {/* Real Nation Flag */}
                  <div className="flex h-6 w-8 items-center justify-center rounded-[4px] border border-[#fef08a]/60 bg-black/40 text-lg shadow-sm">
                    <span>{activeFlag}</span>
                  </div>

                  {/* Custom Katika Heraldic Shield Crest */}
                  <div className="mt-2 flex h-8 w-8 items-center justify-center rounded-full border border-[#fef08a]/80 bg-gradient-to-b from-[#134e4a] to-[#022c22] shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                    <div className="relative flex items-center justify-center">
                      <Shield className="h-6 w-6 text-[#fef08a]" />
                      <span className="absolute font-mono-custom text-[9px] font-black text-black">
                        K
                      </span>
                    </div>
                  </div>

                  {/* PlayStyle+ / Perk Diamond Crest */}
                  <div
                    className="mt-2.5 flex h-7 w-7 rotate-45 items-center justify-center rounded-[4px] border border-[#fef08a] bg-gradient-to-br from-[#fef08a] via-[#eab308] to-[#854d0e] shadow-[0_0_10px_rgba(254,240,138,0.4)]"
                    title="PlayStyle+ Golden Trait"
                  >
                    <div className="-rotate-45">
                      {legend?.position === 'GK' ? (
                        <Shield className="h-3.5 w-3.5 text-black" />
                      ) : legend?.position === 'CB' || legend?.position === 'LB' || legend?.position === 'RB' ? (
                        <Target className="h-3.5 w-3.5 text-black" />
                      ) : legend?.position === 'ST' ? (
                        <Zap className="h-3.5 w-3.5 text-black" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-black" />
                      )}
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* LOWER HALF: SCULPTED GOLD NAMEPLATE & ATTRIBUTE MATRIX    */}
                {/* ========================================================= */}
                <div className="absolute bottom-[24px] left-[14px] right-[14px] z-20 flex flex-col items-center">
                  {/* Sculpted Champagne Gold Nameplate */}
                  <div
                    className="relative flex w-full items-center justify-center rounded-lg border border-[#fef08a] px-3 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                    style={{
                      background:
                        'linear-gradient(180deg, #fef9c3 0%, #fef08a 25%, #eab308 65%, #ca8a04 85%, #854d0e 100%)',
                    }}
                  >
                    {/* Metallic Name Typography */}
                    <span
                      className="truncate font-mono-custom text-[17px] font-black uppercase tracking-[0.14em] text-[#022c22] drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]"
                    >
                      {activeName}
                    </span>

                    {/* Small Corner Rivets */}
                    <div className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#713f12] shadow-inner" />
                    <div className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#713f12] shadow-inner" />
                  </div>

                  {/* 6 Core Attributes Matrix */}
                  <div className="mt-2.5 w-full rounded-lg border border-[#fef08a]/30 bg-black/60 px-3 py-2 backdrop-blur-md">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {/* Left 3 Stats (PAC, SHO, PAS) */}
                      <div className="flex flex-col gap-1">
                        {stats.slice(0, 3).map((st) => (
                          <div key={st.key} className="flex items-center justify-between font-mono-custom leading-tight">
                            <span className="text-[12px] font-bold text-[#c7d9d0]">{st.label}</span>
                            <span className="text-[14px] font-black text-[#fef08a]">{st.val}</span>
                          </div>
                        ))}
                      </div>

                      {/* Vertical Divider */}
                      <div className="flex flex-col gap-1 border-l border-[#fef08a]/20 pl-4">
                        {stats.slice(3, 6).map((st) => (
                          <div key={st.key} className="flex items-center justify-between font-mono-custom leading-tight">
                            <span className="text-[12px] font-bold text-[#c7d9d0]">{st.label}</span>
                            <span className="text-[14px] font-black text-[#fef08a]">{st.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Heraldry Brand Badge */}
                  <div className="mt-2 flex items-center justify-center gap-1.5">
                    <div className="h-[1px] w-6 bg-gradient-to-r from-transparent to-[#fef08a]/60" />
                    <span className="font-mono-custom text-[9px] font-black uppercase tracking-[0.25em] text-[#fef08a]">
                      KATIKA ELITE · FC
                    </span>
                    <div className="h-[1px] w-6 bg-gradient-to-l from-transparent to-[#fef08a]/60" />
                  </div>
                </div>

                {/* Top Subtle Apex Ribbon */}
                <div className="pointer-events-none absolute left-0 right-0 top-1.5 z-20 flex justify-center">
                  <span className="font-mono-custom text-[8px] font-black uppercase tracking-[0.3em] text-[#fef08a]/70">
                    LEGEND EDITION
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* REVERSE FACE: SEPOLIA ON-CHAIN PASSPORT & SMART CONTRACT PROOF    */}
        {/* ================================================================= */}
        <div
          className="absolute inset-0 select-none overflow-hidden rounded-[26px] border border-[#fef08a]/80 bg-gradient-to-b from-[#064e3b] via-[#022c22] to-[#01140e] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.95)]"
          style={{
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
          }}
        >
          <div className="flex h-full flex-col justify-between">
            {/* Passport Header */}
            <div>
              <div className="flex items-center justify-between border-b border-[#fef08a]/30 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#fef08a]" />
                  <span className="font-mono-custom text-xs font-black uppercase tracking-wider text-[#fef08a]">
                    Sepolia Passport
                  </span>
                </div>
                <span className="rounded bg-[#fef08a]/15 px-2 py-0.5 font-mono-custom text-[10px] font-black text-[#fef08a]">
                  ERC-721
                </span>
              </div>

              <div className="mt-4 space-y-2.5 text-left font-mono-custom">
                <div>
                  <span className="text-[10px] text-[#8FA39A]">Athlete:</span>
                  <p className="text-sm font-bold text-[#E8F2EC]">{activeName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#8FA39A]">Card Allocation:</span>
                  <p className="text-sm font-bold text-[#fef08a]">{cardAlloc} $KTK Staked</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#8FA39A]">Token Status:</span>
                  <p className="text-xs text-[#35D399]">
                    {isMinted ? `Minted #${legend?.mint?.tokenId}` : 'Off-Chain Ready to Mint'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#8FA39A]">Overall OVR:</span>
                  <p className="text-sm font-bold text-white">{overall} Rating</p>
                </div>
              </div>
            </div>

            {/* Micro Verification QR & Action */}
            <div className="border-t border-[#fef08a]/20 pt-3">
              <div className="flex items-center justify-between">
                <div className="text-[9px] text-[#8FA39A]">
                  <p>Katika Protocol</p>
                  <p className="font-mono">SHA-256 Verified</p>
                </div>
                <button
                  type="button"
                  onClick={onFlip}
                  className="rounded-full border border-[#fef08a]/40 bg-[#fef08a]/10 px-3 py-1 font-mono-custom text-[10px] font-bold text-[#fef08a] hover:bg-[#fef08a]/25"
                >
                  View Front
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
