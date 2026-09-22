import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link } from 'wouter';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { LegendAvatar, ARCHETYPES, kit } from '@/components/legend-avatar';
import { SepoliaMintModal, type MintRecord } from '@/components/sepolia-mint-modal';
import { PS5InspectModal } from '@/components/ps5-inspect-modal';
import { ShieldCheck, Sparkles, RotateCw, ZoomIn, Award, Star } from 'lucide-react';

export { type MintRecord };

export type LegendCardData = {
  name: string;
  position: string;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  profileComplete: boolean;
  allocatedKchip: number;
  allocatedKtk?: number;
  overall?: number;
  mint?: MintRecord | null;
  photoUrl?: string;
  nationFlag?: string;
};

const STATS: { key: keyof LegendCardData; label: string }[] = [
  { key: 'pace', label: 'PAC' },
  { key: 'shooting', label: 'SHO' },
  { key: 'passing', label: 'PAS' },
  { key: 'dribbling', label: 'DRI' },
  { key: 'defending', label: 'DEF' },
  { key: 'physical', label: 'PHY' },
];

export function useLegend() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [legend, setLegend] = useState<LegendCardData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLegend = useCallback(async () => {
    if (!ready || !authenticated) {
      setLegend(null);
      return;
    }
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const response = await fetch('/api/legends/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const body = await response.json();
      setLegend(body as LegendCardData | null);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, [ready, authenticated, getAccessToken]);

  useEffect(() => {
    void fetchLegend();
  }, [fetchLegend]);

  return { legend, loading, authenticated, ready, refreshLegend: fetchLegend };
}

export function LegendCard({
  legend,
  playable,
  variant = 'full',
  onRefresh,
}: {
  legend: LegendCardData | null;
  playable?: number;
  variant?: 'full' | 'compact' | 'ghost';
  onRefresh?: () => void;
}) {
  const [mintModalOpen, setMintModalOpen] = useState(false);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [rot, setRot] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });
  const cardRef = useRef<HTMLDivElement>(null);

  const overall = useMemo(() => {
    if (!legend) return 75;
    return Math.round(
      ((legend.pace ?? 50) +
        (legend.shooting ?? 50) +
        (legend.passing ?? 50) +
        (legend.dribbling ?? 50) +
        (legend.defending ?? 50) +
        (legend.physical ?? 50)) /
        6,
    );
  }, [legend]);

  const isMinted = Boolean(legend?.mint);
  const cardAlloc = Number(legend?.allocatedKchip ?? legend?.allocatedKtk ?? 330);

  // Match archetype based on position/name
  const matchedArchetype = useMemo(() => {
    if (!legend) return ARCHETYPES[0];
    const pos = legend.position || 'ST';
    if (pos === 'GK') return ARCHETYPES[4];
    if (pos === 'CB' || pos === 'LB' || pos === 'RB') return ARCHETYPES[2];
    if (pos === 'CDM' || pos === 'CM' || pos === 'CAM') return ARCHETYPES[1];
    if (pos === 'RW' || pos === 'LW') return ARCHETYPES[3];
    return ARCHETYPES[0];
  }, [legend]);

  const activeFlag = legend?.nationFlag || matchedArchetype.nation.flag;
  const activePhoto = legend?.photoUrl || matchedArchetype.photoUrl;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    // Smooth responsive tilt
    const rx = (py - 0.5) * -18;
    const ry = (px - 0.5) * 18;
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

  if (!legend || !legend.profileComplete || variant === 'ghost') {
    return (
      <div className="rounded-[28px] border border-[#1C3A2E] bg-[#0E1A16] px-5 pb-7 pt-6 text-center">
        <div className="mx-auto opacity-50">
          <LegendAvatar name="Ghost" position="ST" />
        </div>
        <p className="mt-3 font-mono-custom text-[11px] tracking-[0.28em] text-[#8FA39A]">NO LEGEND</p>
        <p className="mx-auto mt-2 max-w-[240px] text-sm leading-5 text-[#8FA39A]">
          &ldquo;Build a legend. Lock KTK into the card. Play to unlock more. Mint when the card is yours.&rdquo;
        </p>
        <Link
          href="/legend"
          className="mt-6 inline-flex rounded-full bg-[#35D399] px-6 py-3 text-sm font-semibold text-[#062018] shadow-[0_0_24px_rgba(53,211,153,.35)]"
        >
          Create your legend
        </Link>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <div className="flex items-center gap-3 rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#0d261c] to-[#040e0a] p-3 shadow-md">
          <Link href="/legend" className="flex min-w-0 flex-1 items-center gap-3">
            <LegendAvatar name={legend.name} position={legend.position} size="sm" photoUrl={activePhoto} />
            <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-[#fef08a]/60 bg-gradient-to-br from-[#fef08a] via-[#eab308] to-[#854d0e] font-mono-custom font-black leading-none text-black shadow">
              <span className="text-base font-black">{overall}</span>
              <span className="text-[9px] uppercase tracking-tighter">{legend.position}</span>
            </div>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-[#E8F2EC]">{legend.name}</span>
              <span className="font-mono-custom text-[11px] text-[#f3d37a]">
                {activeFlag} {legend.position} · {cardAlloc} alloc
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setInspectModalOpen(true)}
            className="flex items-center gap-1 rounded-full border border-[#35D399]/40 bg-[#35D399]/10 px-2.5 py-1 font-mono-custom text-[10px] font-bold text-[#35D399] hover:bg-[#35D399]/20"
            title="Inspect FUT card showcase"
          >
            <ZoomIn size={12} /> FUT
          </button>

          {isMinted ? (
            <button
              type="button"
              onClick={() => setMintModalOpen(true)}
              className="flex items-center gap-1 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-2 py-1 font-mono-custom text-[10px] text-[#f3d37a]"
            >
              <ShieldCheck size={12} className="text-[#35D399]" /> #{legend.mint?.tokenId}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMintModalOpen(true)}
              className="flex items-center gap-1 rounded-full border border-[#d4af37]/60 bg-[#d4af37]/15 px-2 py-1 font-mono-custom text-[10px] font-bold text-[#f3d37a]"
            >
              <Sparkles size={11} /> Mint
            </button>
          )}
        </div>

        <SepoliaMintModal
          isOpen={mintModalOpen}
          onClose={() => setMintModalOpen(false)}
          legend={legend}
          overall={overall}
          onMintSuccess={() => {
            setMintModalOpen(false);
            onRefresh?.();
          }}
        />

        <PS5InspectModal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          legend={legend}
        />
      </>
    );
  }

  // Authentic FUT Shield Polygon
  const futShieldClip = 'polygon(7% 0%, 93% 0%, 100% 5%, 100% 83%, 50% 100%, 0% 83%, 0% 5%)';

  return (
    <>
      <div className="relative mx-auto flex max-w-[340px] flex-col items-center">
        {/* Quick Action Navigation Bar */}
        <div className="mb-3 flex w-full items-center justify-between px-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#fef08a] shadow-[0_0_8px_#fef08a]" />
            <p className="font-mono-custom text-[11px] font-black tracking-[.25em] text-[#fef08a]">
              FUT ULTIMATE CARD
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setInspectModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-[#35D399]/60 bg-[#35D399]/15 px-2.5 py-0.5 font-mono-custom text-[10px] font-bold text-[#35D399] transition-colors hover:bg-[#35D399]/25 shadow-[0_0_12px_rgba(53,211,153,0.25)]"
              title="Inspect FUT player showcase & attributes"
            >
              <ZoomIn size={12} />
              <span>Inspect</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFlipped((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/50 bg-[#d4af37]/15 px-2.5 py-0.5 font-mono-custom text-[10px] font-bold text-[#f3d37a] transition-colors hover:bg-[#d4af37]/25"
              title="Flip to Sepolia passport back"
            >
              <RotateCw size={11} />
              <span>{isFlipped ? 'Front' : 'Passport'}</span>
            </button>
            {isMinted ? (
              <button
                type="button"
                onClick={() => setMintModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-[#35D399]/60 bg-[#35D399]/15 px-2.5 py-0.5 font-mono-custom text-[10px] font-bold text-[#35D399]"
              >
                <ShieldCheck size={12} />
                <span>#{legend.mint?.tokenId}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMintModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-[#d4af37] bg-gradient-to-r from-[#d4af37]/30 to-[#8a6410]/30 px-2.5 py-0.5 font-mono-custom text-[10px] font-bold text-[#fef08a] shadow-[0_0_12px_rgba(212,175,55,0.3)] hover:scale-105"
              >
                <Sparkles size={11} />
                <span>Mint</span>
              </button>
            )}
          </div>
        </div>

        {/* 3D TILT WRAPPER */}
        <div
          className="group relative select-none w-[320px] h-[480px]"
          style={{ perspective: '1200px', touchAction: 'pan-y' }}
          onPointerEnter={(e) => {
            if (e.pointerType !== 'touch') setIsHovered(true);
          }}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <div
            ref={cardRef}
            className="relative h-full w-full transition-transform duration-200 ease-out"
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped
                ? `rotateY(180deg) rotateX(${rot.x * 0.3}deg)`
                : `rotateX(${rot.x}deg) rotateY(${rot.y}deg) scale3d(${isHovered ? 1.02 : 1}, ${isHovered ? 1.02 : 1}, 1)`,
              transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            {/* ======================================================== */}
            {/* FRONT FACE: AUTHENTIC EA SPORTS FC / FUT SHIELD CARD */}
            {/* ======================================================== */}
            <div
              className="absolute inset-0 select-none p-[3px]"
              style={{
                backfaceVisibility: 'hidden',
                clipPath: futShieldClip,
                background: 'linear-gradient(135deg, #FFE57F 0%, #D4AF37 25%, #8A6410 50%, #D4AF37 75%, #FFE57F 100%)',
                boxShadow: '0 15px 35px rgba(0,0,0,0.8), 0 0 25px rgba(212,175,55,0.35)',
              }}
            >
              {/* Inner Shield Frame */}
              <div
                className="relative h-full w-full overflow-hidden p-3"
                style={{
                  clipPath: futShieldClip,
                  background: 'linear-gradient(180deg, #133a2a 0%, #0a2117 35%, #05130e 75%, #020906 100%)',
                }}
              >
                {/* Sunburst Radial Ray Background (FUT Icon Style) */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-40"
                  style={{
                    background:
                      'radial-gradient(circle at 65% 30%, rgba(254,240,138,0.35) 0%, rgba(53,211,153,0.18) 45%, transparent 75%)',
                  }}
                />

                {/* Subtle Prismatic Rainbow Glare Sweep */}
                <div
                  className="pointer-events-none absolute inset-0 z-40 transition-opacity duration-200"
                  style={{
                    opacity: isHovered ? 0.75 : 0.25,
                    background: `radial-gradient(circle at ${rot.glareX}% ${rot.glareY}%, rgba(255,255,255,0.65) 0%, rgba(254,240,138,0.3) 25%, rgba(53,211,153,0.2) 50%, transparent 75%)`,
                    mixBlendMode: 'color-dodge',
                  }}
                />

                {/* Top Strip Watermark */}
                <div className="absolute right-4 top-2 z-10 flex items-center gap-1 opacity-60">
                  <Star size={10} className="fill-[#fef08a] text-[#fef08a]" />
                  <span className="font-mono-custom text-[8px] font-black uppercase tracking-widest text-[#fef08a]">
                    KATIKA ICON
                  </span>
                  <Star size={10} className="fill-[#fef08a] text-[#fef08a]" />
                </div>

                {/* ==================================================== */}
                {/* UPPER HALF: RATINGS BLOCK (LEFT) + REAL PLAYER (RIGHT) */}
                {/* ==================================================== */}
                <div className="relative z-20 mt-1 flex h-[230px] w-full">
                  {/* LEFT RATINGS COLUMN */}
                  <div className="flex w-20 flex-col items-center pt-2 text-center">
                    {/* Big Bold OVR Rating */}
                    <span className="font-mono-custom text-4xl font-black leading-none tracking-tighter text-[#fef08a] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                      {overall}
                    </span>

                    {/* Position */}
                    <span className="mt-0.5 font-mono-custom text-base font-black tracking-wider text-[#E8F2EC] drop-shadow">
                      {legend.position}
                    </span>

                    {/* Gold Divider Line */}
                    <div className="my-2 h-[1px] w-8 bg-gradient-to-r from-transparent via-[#fef08a]/80 to-transparent" />

                    {/* Nation Flag */}
                    <div
                      className="text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
                      title={matchedArchetype.nation.name}
                    >
                      {activeFlag}
                    </div>

                    {/* Gold Divider Line */}
                    <div className="my-2 h-[1px] w-8 bg-gradient-to-r from-transparent via-[#fef08a]/80 to-transparent" />

                    {/* Club Monogram Crest */}
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#fef08a]/60 bg-gradient-to-br from-[#d4af37]/30 to-[#8a6410]/30 shadow-inner">
                      <span className="font-mono-custom text-[10px] font-black text-[#fef08a]">
                        KTK
                      </span>
                    </div>
                  </div>

                  {/* RIGHT: REAL FOOTBALLER CUTOUT (NO ROBOT!) */}
                  <div className="relative flex-1">
                    {/* Stadium Flare behind player */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(254,240,138,0.25)_0%,rgba(53,211,153,0.1)_45%,transparent_70%)]" />

                    {/* Real Football Player Photo Cutout */}
                    <img
                      src={activePhoto}
                      alt={legend.name}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="absolute inset-0 h-full w-full object-contain object-bottom scale-110 drop-shadow-[0_12px_16px_rgba(0,0,0,0.85)] transition-transform duration-300 group-hover:scale-115"
                    />

                    {/* Soft bottom fade so player integrates smoothly into name banner */}
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#081f16] to-transparent" />
                  </div>
                </div>

                {/* ==================================================== */}
                {/* NAME BANNER RIBBON (FUT GOLD BAR) */}
                {/* ==================================================== */}
                <div className="relative z-30 mt-1">
                  <div className="flex h-9 items-center justify-center rounded-lg border border-[#fef08a]/70 bg-gradient-to-r from-[#854d0e] via-[#fef08a] to-[#854d0e] px-2 shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
                    <span className="truncate font-mono-custom text-sm font-black uppercase tracking-wider text-[#140b02] drop-shadow-sm">
                      {legend.name}
                    </span>
                  </div>
                </div>

                {/* ==================================================== */}
                {/* THE 6 CORE FUT STATS MATRIX (2 COLUMNS OF 3 STATS) */}
                {/* ==================================================== */}
                <div className="relative z-30 mt-3 rounded-xl border border-[#d4af37]/30 bg-black/40 px-3 py-2 backdrop-blur-sm">
                  <div className="grid grid-cols-2 divide-x divide-[#fef08a]/20">
                    {/* LEFT COLUMN: PAC, SHO, PAS */}
                    <div className="space-y-1 pr-2 font-mono-custom">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-sm font-black text-white">{legend.pace}</span>
                        <span className="font-bold text-[#fef08a]">PAC</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-sm font-black text-white">{legend.shooting}</span>
                        <span className="font-bold text-[#fef08a]">SHO</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-sm font-black text-white">{legend.passing}</span>
                        <span className="font-bold text-[#fef08a]">PAS</span>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: DRI, DEF, PHY */}
                    <div className="space-y-1 pl-2 font-mono-custom">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-sm font-black text-white">{legend.dribbling}</span>
                        <span className="font-bold text-[#fef08a]">DRI</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-sm font-black text-white">{legend.defending}</span>
                        <span className="font-bold text-[#fef08a]">DEF</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-sm font-black text-white">{legend.physical}</span>
                        <span className="font-bold text-[#fef08a]">PHY</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ==================================================== */}
                {/* BOTTOM SHIELD TIP: CHEMISTRY / TOKEN ALLOCATION */}
                {/* ==================================================== */}
                <div className="relative z-30 mt-2 flex flex-col items-center justify-center text-center font-mono-custom">
                  {/* Chemistry Style with 3 Diamonds */}
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#35D399]">
                    <span>HUNTER</span>
                    <span className="flex gap-0.5 text-[#35D399]">◆◆◆</span>
                    <span className="text-[#8FA39A]">·</span>
                    <span className="text-[#f3d37a]">{cardAlloc} KTK</span>
                  </div>

                  {/* Mint Status Pill */}
                  <div className="mt-1 flex items-center gap-1 text-[8px] uppercase tracking-wider text-[#8FA39A]">
                    {isMinted ? (
                      <span className="text-[#35D399] font-bold">
                        ERC-721 #{legend.mint?.tokenId} VERIFIED
                      </span>
                    ) : (
                      <span>READY FOR SEPOLIA MINT</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* BACK FACE: AUTHENTIC FUT PASSPORT & ON-CHAIN CREDENTIAL */}
            {/* ======================================================== */}
            <div
              className="absolute inset-0 select-none p-[3px]"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                clipPath: futShieldClip,
                background: 'linear-gradient(135deg, #FFE57F 0%, #D4AF37 25%, #8A6410 50%, #D4AF37 75%, #FFE57F 100%)',
                boxShadow: '0 15px 35px rgba(0,0,0,0.8)',
              }}
            >
              <div
                className="relative h-full w-full overflow-hidden p-4 font-mono-custom text-xs"
                style={{
                  clipPath: futShieldClip,
                  background: 'linear-gradient(180deg, #0d261c 0%, #061711 40%, #020906 100%)',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#fef08a]/30 pb-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-[#35D399]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#fef08a]">
                      SEPOLIA PASSPORT
                    </span>
                  </div>
                  <span className="text-[9px] text-[#35D399]">ON-CHAIN</span>
                </div>

                {/* Identity Box */}
                <div className="mt-3 rounded-lg border border-[#fef08a]/30 bg-black/50 p-2.5">
                  <p className="text-[9px] uppercase text-[#8FA39A]">Athlete Identity</p>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {legend.name} ({legend.position})
                  </p>
                  <p className="text-[10px] text-[#fef08a] mt-0.5">
                    {activeFlag} {matchedArchetype.nation.name} · {overall} OVR
                  </p>
                </div>

                {/* Contract & Token Metadata */}
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/60 bg-black/50 p-2">
                    <p className="text-[8px] uppercase text-[#8FA39A]">Contract</p>
                    <p className="truncate text-[10px] font-semibold text-[#f3d37a]">0x600f...3e9B</p>
                    <p className="text-[8px] text-[#8FA39A]">Sepolia ERC-721</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-black/50 p-2">
                    <p className="text-[8px] uppercase text-[#8FA39A]">Token Status</p>
                    <p className="text-[10px] font-semibold text-[#35D399]">
                      {isMinted ? `#${legend.mint?.tokenId}` : 'Ready to Mint'}
                    </p>
                    <p className="text-[8px] text-[#8FA39A]">Dynamic Metadata</p>
                  </div>
                </div>

                {/* Rollover & Proof */}
                <div className="mt-2.5 rounded-lg border border-border/60 bg-black/50 p-2.5">
                  <p className="text-[9px] uppercase text-[#8FA39A]">Card Allocation</p>
                  <p className="text-xs font-bold text-[#fef08a] mt-0.5">{cardAlloc} KTK Stack</p>
                  {typeof playable === 'number' && !Number.isNaN(playable) ? (
                    <p className="text-[10px] text-[#35D399] mt-0.5">
                      Playable Roll: {playable.toLocaleString()} KTK
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-[9px] text-[#8FA39A] leading-relaxed">
                    Card stats evolve through live casino play. Provenance verified on Ethereum Sepolia.
                  </p>
                </div>

                {/* Quick Flip Action */}
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFlipped(false);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-[#fef08a]/60 bg-[#fef08a]/15 px-3 py-1 text-[10px] font-bold text-[#fef08a] hover:bg-[#fef08a]/25"
                  >
                    <RotateCw size={10} /> Back to Front
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SepoliaMintModal
        isOpen={mintModalOpen}
        onClose={() => setMintModalOpen(false)}
        legend={legend}
        overall={overall}
        onMintSuccess={() => {
          setMintModalOpen(false);
          onRefresh?.();
        }}
      />

      <PS5InspectModal
        isOpen={inspectModalOpen}
        onClose={() => setInspectModalOpen(false)}
        legend={legend}
      />
    </>
  );
}

export function HomeLegendHero() {
  const { legend, loading } = useLegend();
  const { serverUser } = useServerSession();

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#1C3A2E] bg-[#0E1A16] p-6 text-center animate-pulse">
        <div className="h-6 w-32 mx-auto bg-white/10 rounded-full" />
        <div className="h-48 w-36 mx-auto mt-4 bg-white/5 rounded-2xl" />
      </div>
    );
  }

  if (!legend || !legend.profileComplete) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/40 bg-gradient-to-br from-[#0c261c] via-[#06140e] to-[#020805] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.6)]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <LegendAvatar name="Novice" position="ST" size="md" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#fef08a] shadow-[0_0_6px_#fef08a]" />
                <span className="font-mono-custom text-[10px] font-black uppercase tracking-widest text-[#fef08a]">
                  EA FC ULTIMATE CARD
                </span>
              </div>
              <h2 className="mt-1 text-lg font-bold text-white">Create Your Legend Card</h2>
              <p className="text-xs text-[#8FA39A] mt-0.5 max-w-xs">
                Build your athlete, lock KTK into your card, and mint to Sepolia ERC-721.
              </p>
            </div>
          </div>
          <Link
            href="/legend"
            className="shrink-0 rounded-full bg-gradient-to-r from-[#fef08a] via-[#eab308] to-[#854d0e] px-5 py-2.5 font-mono-custom text-xs font-black uppercase text-black shadow-[0_0_20px_rgba(254,240,138,0.3)] hover:scale-105 transition-transform"
          >
            Build Legend →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/50 bg-gradient-to-br from-[#0f2d21] via-[#071710] to-[#020906] p-4 sm:p-5 shadow-[0_15px_40px_rgba(0,0,0,0.7)]">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="w-full md:w-auto flex justify-center">
          <LegendCard
            legend={legend}
            playable={serverUser?.demoCredits}
            variant="full"
          />
        </div>
        <div className="flex-1 space-y-3 font-mono-custom text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#fef08a]/40 bg-[#fef08a]/10 px-3 py-1 text-[10px] font-black text-[#fef08a]">
            <Sparkles size={12} />
            <span>AUTHENTIC FUT LEGEND ACTIVE</span>
          </div>
          <h2 className="text-xl font-black text-white">{legend.name}</h2>
          <p className="text-xs text-[#8FA39A]">
            Position: <span className="text-[#fef08a] font-bold">{legend.position}</span> · Stats locked into your Sepolia ERC-721 passport.
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
            <Link
              href="/legend"
              className="rounded-full border border-[#fef08a]/70 bg-[#fef08a]/15 px-4 py-2 text-xs font-bold text-[#fef08a] hover:bg-[#fef08a]/25 transition-colors"
            >
              Tune Attributes
            </Link>
            <Link
              href="/pvp"
              className="rounded-full bg-[#35D399] px-4 py-2 text-xs font-black text-[#062018] shadow-[0_0_16px_rgba(53,211,153,0.35)] hover:bg-[#35D399]/90 transition-colors"
            >
              Play With Legend →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
