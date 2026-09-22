import React, { useMemo, useRef, useState } from 'react';
import { Camera, Sparkles, Upload, RotateCw, ZoomIn, ShieldCheck } from 'lucide-react';
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

  // SVG TOTY Shield Clip-path (Stepped shoulder notches + pointed chevron base)
  const totyClipPath =
    'polygon(14% 0%, 86% 0%, 93% 4%, 100% 12%, 100% 78%, 50% 100%, 0% 78%, 0% 12%, 7% 4%)';

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
        className="relative mx-auto h-[490px] w-[326px] transition-transform duration-200 ease-out"
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
        {/* FRONT FACE: TOTY SAPPHIRE CRYSTAL & SCULPTED GOLD SHIELD CARD     */}
        {/* ================================================================= */}
        <div
          className="absolute inset-0 select-none overflow-visible"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* EXTERNAL 3D SAPPHIRE CRYSTAL CLUSTERS (PROTRUDING FROM BORDER) */}
          {/* Top Right Crystal Cluster */}
          <div className="pointer-events-none absolute -right-3 -top-3 z-30 h-28 w-24">
            <svg viewBox="0 0 100 110" className="h-full w-full filter drop-shadow-[0_0_12px_rgba(59,130,246,0.85)]">
              <defs>
                <linearGradient id="crys1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="40%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1e3a8a" />
                </linearGradient>
                <linearGradient id="crys2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#bfdbfe" />
                  <stop offset="50%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="crysGlint" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              {/* Primary Crystal Obelisk */}
              <polygon points="45,5 75,35 60,85 30,55" fill="url(#crys1)" />
              <polygon points="45,5 20,40 30,55" fill="url(#crys2)" opacity="0.95" />
              <polygon points="45,5 60,20 75,35" fill="url(#crysGlint)" opacity="0.8" />
              {/* Secondary Crystal Shards */}
              <polygon points="65,25 95,45 80,80 55,60" fill="url(#crys2)" />
              <polygon points="65,25 80,80 70,50" fill="url(#crys1)" opacity="0.9" />
              <polygon points="20,45 40,65 30,95 10,75" fill="url(#crys1)" />
              <polygon points="35,70 55,85 45,105 25,90" fill="url(#crys2)" opacity="0.85" />
            </svg>
          </div>

          {/* Lower Left Flank Crystal Shards */}
          <div className="pointer-events-none absolute -left-3.5 bottom-12 z-30 h-28 w-16">
            <svg viewBox="0 0 70 120" className="h-full w-full filter drop-shadow-[0_0_12px_rgba(59,130,246,0.8)]">
              <polygon points="35,10 55,40 40,90 20,60" fill="url(#crys2)" />
              <polygon points="35,10 15,45 20,60" fill="url(#crys1)" opacity="0.9" />
              <polygon points="20,55 35,75 25,115 10,95" fill="url(#crys2)" />
              <polygon points="20,55 10,95 5,75" fill="url(#crys1)" opacity="0.8" />
            </svg>
          </div>

          {/* Lower Right Flank Crystal Shards */}
          <div className="pointer-events-none absolute -right-3.5 bottom-12 z-30 h-28 w-16">
            <svg viewBox="0 0 70 120" className="h-full w-full filter drop-shadow-[0_0_12px_rgba(59,130,246,0.8)]">
              <polygon points="35,10 50,45 35,90 20,55" fill="url(#crys1)" />
              <polygon points="35,10 20,55 15,35" fill="url(#crys2)" opacity="0.9" />
              <polygon points="35,70 50,90 35,115 20,95" fill="url(#crys2)" />
            </svg>
          </div>

          {/* THE METALLIC SCULPTED GOLD FRAME CONTAINER */}
          <div
            className="relative h-full w-full p-[4px] shadow-[0_18px_45px_rgba(0,0,0,0.9),0_0_30px_rgba(212,175,55,0.4)]"
            style={{
              clipPath: totyClipPath,
              background:
                'linear-gradient(135deg, #FFF6BD 0%, #D4AF37 18%, #854D0E 38%, #F59E0B 52%, #D4AF37 72%, #FEF08A 90%, #854D0E 100%)',
            }}
          >
            {/* INNER INNER BEVELED GOLD ACCENT BORDER */}
            <div
              className="relative h-full w-full p-[2px]"
              style={{
                clipPath: totyClipPath,
                background: 'linear-gradient(180deg, #573A08 0%, #D4AF37 35%, #2A1A02 85%, #EAB308 100%)',
              }}
            >
              {/* INNER BLUE FIELD PLATE */}
              <div
                className="relative h-full w-full overflow-hidden"
                style={{
                  clipPath: totyClipPath,
                  background:
                    'radial-gradient(ellipse at 50% 25%, #153282 0%, #0c1c55 42%, #060e2c 75%, #020614 100%)',
                }}
              >
                {/* GEOMETRIC GOLD WATERMARK CROWN RAYS & LINES */}
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full opacity-25"
                  viewBox="0 0 320 480"
                >
                  <circle cx="160" cy="180" r="140" fill="none" stroke="#FEF08A" strokeWidth="0.8" />
                  <circle cx="160" cy="180" r="110" fill="none" stroke="#FEF08A" strokeWidth="0.5" strokeDasharray="3 3" />
                  <circle cx="160" cy="180" r="80" fill="none" stroke="#FEF08A" strokeWidth="0.8" />
                  {/* Subtle radiating lines */}
                  <line x1="160" y1="180" x2="40" y2="40" stroke="#FEF08A" strokeWidth="0.5" />
                  <line x1="160" y1="180" x2="280" y2="40" stroke="#FEF08A" strokeWidth="0.5" />
                  <line x1="160" y1="180" x2="20" y2="180" stroke="#FEF08A" strokeWidth="0.5" />
                  <line x1="160" y1="180" x2="300" y2="180" stroke="#FEF08A" strokeWidth="0.5" />
                </svg>

                {/* HOLOGRAPHIC PRISM FOIL GLEAM */}
                <div
                  className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-200"
                  style={{
                    opacity: isHovered ? 0.8 : 0.3,
                    background: `radial-gradient(circle at ${rot.glareX}% ${rot.glareY}%, rgba(255,255,255,0.7) 0%, rgba(147,197,253,0.35) 25%, rgba(254,240,138,0.2) 50%, transparent 70%)`,
                    mixBlendMode: 'color-dodge',
                  }}
                />

                {/* TOP APEX: TOTY CREST BADGE */}
                <div className="relative z-20 flex justify-center pt-1.5">
                  <div className="flex items-center gap-1 rounded-b-md border-b border-x border-[#FEF08A]/70 bg-gradient-to-b from-[#854D0E] to-[#1E1202] px-2.5 py-0.5 shadow-md">
                    <span className="font-mono-custom text-[8px] font-black tracking-widest text-[#FEF08A]">
                      TOTY
                    </span>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* MID SECTION: UPPER-LEFT RATINGS + CENTER PLAYER CUTOUT        */}
                {/* ============================================================= */}
                <div className="relative z-10 -mt-1 flex h-[260px] w-full px-2">
                  {/* LEFT RATINGS COLUMN */}
                  <div className="z-20 flex w-16 flex-col items-center pt-2 text-center">
                    {/* GIANT OVR NUMERAL */}
                    <span className="font-mono-custom text-[42px] font-black leading-none tracking-tighter text-[#FEF08A] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                      {overall}
                    </span>

                    {/* POSITION */}
                    <span className="mt-0.5 font-mono-custom text-base font-black tracking-wider text-[#FEF08A] drop-shadow">
                      {activePosition}
                    </span>

                    {/* GOLD DIVIDER */}
                    <div className="my-1.5 h-[1px] w-7 bg-gradient-to-r from-transparent via-[#FEF08A]/70 to-transparent" />

                    {/* COUNTRY FLAG */}
                    <div
                      className="rounded border border-[#FEF08A]/50 bg-black/40 px-1 py-0.5 text-xl shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
                      title={matchedArchetype.nation.name}
                    >
                      {activeFlag}
                    </div>

                    {/* GOLD DIVIDER */}
                    <div className="my-1.5 h-[1px] w-7 bg-gradient-to-r from-transparent via-[#FEF08A]/70 to-transparent" />

                    {/* CLUB CREST (KATIKA MONOGRAM MEDALLION) */}
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#FEF08A]/70 bg-gradient-to-br from-[#1e3a8a] to-[#020617] shadow-inner">
                      <span className="font-mono-custom text-[9px] font-black text-[#FEF08A]">
                        KTK
                      </span>
                    </div>

                    {/* QUICK CHANGE PHOTO BUTTON */}
                    {onUploadClick && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUploadClick();
                        }}
                        className="mt-2.5 inline-flex items-center gap-1 rounded-full border border-[#FEF08A]/60 bg-black/60 px-1.5 py-0.5 text-[8px] font-bold text-[#FEF08A] hover:bg-[#FEF08A]/20 transition-colors shadow"
                        title="Upload your photo"
                      >
                        <Camera size={10} />
                        <span>Photo</span>
                      </button>
                    )}
                  </div>

                  {/* CENTER & RIGHT: ATHLETE PHOTO CUTOUT */}
                  <div className="relative flex-1">
                    {/* Stadium glow behind player head */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_35%,rgba(96,165,250,0.3)_0%,rgba(254,240,138,0.15)_35%,transparent_65%)]" />

                    {/* Player cutout image */}
                    <img
                      src={activePhoto}
                      alt={activeName}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="absolute inset-0 h-full w-full object-contain object-bottom scale-110 drop-shadow-[0_14px_18px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:scale-115"
                    />

                    {/* Soft gradient fade at the torso so it dissolves into dark blue card plate */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#060e2c] via-[#060e2c]/80 to-transparent" />
                  </div>
                </div>

                {/* ============================================================= */}
                {/* PLAYER NAME RIBBON: BOLD CONDENSED GOLD TYPOGRAPHY            */}
                {/* ============================================================= */}
                <div className="relative z-20 -mt-2 px-3 text-center">
                  <h3 className="truncate font-mono-custom text-[22px] font-black uppercase tracking-wider text-[#FEF08A] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    {activeName}
                  </h3>
                </div>

                {/* ============================================================= */}
                {/* SIX-STAT FUT MATRIX: 2 COLUMNS WITH THIN GOLD VERTICAL DIVIDER */}
                {/* ============================================================= */}
                <div className="relative z-20 mt-1.5 px-6">
                  <div className="flex items-center justify-between font-mono-custom">
                    {/* LEFT COLUMN: PAC, SHO, PAS */}
                    <div className="flex-1 space-y-0.5 pr-3 text-right">
                      {leftStats.map((st) => (
                        <div key={st.label} className="flex items-center justify-end gap-1.5">
                          <span className="text-base font-black leading-tight text-[#FEF08A] drop-shadow">
                            {st.val}
                          </span>
                          <span className="text-xs font-black tracking-wider text-[#FEF08A]/90">
                            {st.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* THIN GOLD VERTICAL DIVIDER */}
                    <div className="h-14 w-[1.5px] bg-gradient-to-b from-transparent via-[#FEF08A]/80 to-transparent" />

                    {/* RIGHT COLUMN: DRI, DEF, PHY */}
                    <div className="flex-1 space-y-0.5 pl-3 text-left">
                      {rightStats.map((st) => (
                        <div key={st.label} className="flex items-center justify-start gap-1.5">
                          <span className="text-base font-black leading-tight text-[#FEF08A] drop-shadow">
                            {st.val}
                          </span>
                          <span className="text-xs font-black tracking-wider text-[#FEF08A]/90">
                            {st.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* BOTTOM CHEVRON TIP: STYLIZED KATIKA 'K' EMBLEM                */}
                {/* ============================================================= */}
                <div className="relative z-20 mt-2 flex flex-col items-center justify-center pb-2">
                  <div className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-[#93c5fd]">
                    <span>HUNTER</span>
                    <span className="text-[#35D399]">◆◆◆</span>
                    <span>·</span>
                    <span className="text-[#FEF08A]">{cardAlloc} KTK</span>
                  </div>

                  {/* Stylized Katika "K" shield logo at the bottom point */}
                  <div className="mt-1 flex h-6 w-6 items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#FEF08A] filter drop-shadow-[0_0_4px_#FEF08A]">
                      <path
                        d="M 6,3 L 10,3 L 10,10 L 15,3 L 19,3 L 13,12 L 20,21 L 16,21 L 10,13 L 10,21 L 6,21 Z"
                        fill="currentColor"
                      />
                    </svg>
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
            className="relative h-full w-full p-[4px] shadow-[0_18px_45px_rgba(0,0,0,0.9)]"
            style={{
              clipPath: totyClipPath,
              background:
                'linear-gradient(135deg, #FFF6BD 0%, #D4AF37 18%, #854D0E 38%, #F59E0B 52%, #D4AF37 72%, #FEF08A 90%, #854D0E 100%)',
            }}
          >
            <div
              className="relative h-full w-full overflow-hidden p-4 font-mono-custom text-xs"
              style={{
                clipPath: totyClipPath,
                background: 'linear-gradient(180deg, #07153b 0%, #030a20 50%, #01040f 100%)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#FEF08A]/30 pb-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#35D399]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#FEF08A]">
                    SEPOLIA TOTY PASSPORT
                  </span>
                </div>
                <span className="text-[9px] text-[#35D399]">ERC-721</span>
              </div>

              {/* Identity Box */}
              <div className="mt-3 rounded-lg border border-[#FEF08A]/30 bg-black/60 p-2.5">
                <p className="text-[9px] uppercase text-[#8FA39A]">Athlete Identity</p>
                <p className="text-sm font-bold text-white mt-0.5">
                  {activeName} ({activePosition})
                </p>
                <p className="text-[10px] text-[#FEF08A] mt-0.5">
                  {activeFlag} {matchedArchetype.nation.name} · {overall} OVR
                </p>
              </div>

              {/* Contract & Token Metadata */}
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/60 bg-black/60 p-2">
                  <p className="text-[8px] uppercase text-[#8FA39A]">Contract</p>
                  <p className="truncate text-[10px] font-semibold text-[#f3d37a]">0x613C...7B41</p>
                  <p className="text-[8px] text-[#8FA39A]">Sepolia Testnet</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-black/60 p-2">
                  <p className="text-[8px] uppercase text-[#8FA39A]">Token Status</p>
                  <p className="text-[10px] font-semibold text-[#35D399]">
                    {isMinted ? `#${legend?.mint?.tokenId}` : 'Ready to Mint'}
                  </p>
                  <p className="text-[8px] text-[#8FA39A]">TOTY Dynamic Token</p>
                </div>
              </div>

              {/* Rollover & Proof */}
              <div className="mt-2.5 rounded-lg border border-border/60 bg-black/60 p-2.5">
                <p className="text-[9px] uppercase text-[#8FA39A]">Card Allocation</p>
                <p className="text-xs font-bold text-[#FEF08A] mt-0.5">{cardAlloc} KTK Stack</p>
                {typeof playable === 'number' && !Number.isNaN(playable) ? (
                  <p className="text-[10px] text-[#35D399] mt-0.5">
                    Playable Roll: {playable.toLocaleString()} KTK
                  </p>
                ) : null}
                <p className="mt-1 text-[9px] text-[#8FA39A] leading-relaxed">
                  Card stats evolve with floor play. Verifiable on Ethereum Sepolia Explorer.
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
                    className="inline-flex items-center gap-1 rounded-full border border-[#FEF08A]/60 bg-[#FEF08A]/15 px-3 py-1 text-[10px] font-bold text-[#FEF08A] hover:bg-[#FEF08A]/25"
                  >
                    <RotateCw size={10} /> Back to Front
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
