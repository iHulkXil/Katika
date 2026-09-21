import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'wouter';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { LegendAvatar } from '@/components/legend-avatar';
import { SepoliaMintModal, type MintRecord } from '@/components/sepolia-mint-modal';
import { PS5InspectModal } from '@/components/ps5-inspect-modal';
import { ShieldCheck, Sparkles, RotateCw, Layers, Gamepad2, Eye } from 'lucide-react';

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

  if (!legend || !legend.profileComplete || variant === 'ghost') {
    return (
      <div className="rounded-[28px] border border-[#1C3A2E] bg-[#0E1A16] px-5 pb-7 pt-6 text-center">
        <div className="mx-auto opacity-50"><LegendAvatar name="Ghost" position="ST" /></div>
        <p className="mt-3 font-mono-custom text-[11px] tracking-[0.28em] text-[#8FA39A]">NO LEGEND</p>
        <p className="mx-auto mt-2 max-w-[240px] text-sm leading-5 text-[#8FA39A]">
          &ldquo;Build a legend. Lock KTK into the card. Play to unlock more. Mint when the card is yours.&rdquo;
        </p>
        <Link href="/legend" className="mt-6 inline-flex rounded-full bg-[#35D399] px-6 py-3 text-sm font-semibold text-[#062018] shadow-[0_0_24px_rgba(53,211,153,.35)]">
          Create your legend
        </Link>
      </div>
    );
  }

  const overall = Math.round(
    ((legend.pace ?? 50) +
      (legend.shooting ?? 50) +
      (legend.passing ?? 50) +
      (legend.dribbling ?? 50) +
      (legend.defending ?? 50) +
      (legend.physical ?? 50)) /
      6,
  );

  const isMinted = Boolean(legend.mint);
  const cardAlloc = Number(legend.allocatedKchip ?? legend.allocatedKtk ?? 330);

  if (variant === 'compact') {
    return (
      <>
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-accent to-card p-3">
          <Link href="/legend" className="flex min-w-0 flex-1 items-center gap-3">
            <LegendAvatar name={legend.name} position={legend.position} size="sm" />
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary font-mono-custom text-lg font-bold text-primary-foreground shadow">
              {overall}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[#E8F2EC]">{legend.name}</span>
              <span className="font-mono-custom text-[11px] text-muted-foreground">
                {legend.position} · {cardAlloc} alloc
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setInspectModalOpen(true)}
            className="flex items-center gap-1 rounded-full border border-[#35D399]/40 bg-[#35D399]/10 px-2 py-1 font-mono-custom text-[10px] font-bold text-[#35D399] hover:bg-[#35D399]/20"
            title="Inspect 3D athlete bust"
          >
            <Gamepad2 size={12} /> 3D
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
              className="flex items-center gap-1 rounded-full border border-[#d4af37]/60 bg-[#d4af37]/15 px-2 py-1 font-mono-custom text-[10px] font-semibold text-[#f3d37a]"
            >
              <Sparkles size={11} /> Mint
            </button>
          )}
        </div>
        <SepoliaMintModal
          isOpen={mintModalOpen}
          onClose={() => setMintModalOpen(false)}
          legend={legend}
          onMintSuccess={() => onRefresh?.()}
        />
        <PS5InspectModal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          legend={legend}
        />
      </>
    );
  }

  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [rot, setRot] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    // Max tilt 14 degrees
    const rx = (py - 0.5) * -24;
    const ry = (px - 0.5) * 24;
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

  return (
    <>
      <div
        className="group relative select-none"
        style={{ perspective: '1200px', touchAction: 'pan-y' }}
        onPointerEnter={(e) => {
          if (e.pointerType !== 'touch') setIsHovered(true);
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <div
          ref={cardRef}
          className="relative transition-transform duration-200 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped
              ? `rotateY(180deg) rotateX(${rot.x * 0.4}deg)`
              : `rotateX(${rot.x}deg) rotateY(${rot.y}deg) scale3d(${isHovered ? 1.02 : 1}, ${isHovered ? 1.02 : 1}, 1)`,
            transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {/* FRONT FACE */}
          <div
            className="relative overflow-hidden rounded-3xl border border-[#d4af37]/60 bg-gradient-to-br from-[#132c23] via-[#091712] to-[#040a08] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(53,211,153,0.2)]"
            style={{
              backfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Holographic Prismatic Foil Sheen Overlay */}
            <div
              className="pointer-events-none absolute inset-0 z-10 rounded-3xl transition-opacity duration-300"
              style={{
                opacity: isHovered ? 0.85 : 0.35,
                background: `radial-gradient(circle at ${rot.glareX}% ${rot.glareY}%, rgba(255,255,255,0.45) 0%, rgba(53,211,153,0.25) 30%, rgba(212,175,55,0.3) 60%, transparent 80%)`,
                mixBlendMode: 'color-dodge',
              }}
            />
            {/* Shimmer Rainbow Sweep */}
            <div
              className="pointer-events-none absolute inset-0 z-10 rounded-3xl opacity-25"
              style={{
                background: `linear-gradient(${115 + rot.y * 2}deg, transparent 20%, rgba(255,0,128,0.25) 35%, rgba(0,255,200,0.35) 50%, rgba(255,215,0,0.3) 65%, transparent 80%)`,
                mixBlendMode: 'screen',
              }}
            />

            {/* 3D Floating Header Strip (Z: 25px) */}
            <div
              className="relative z-20 flex items-center justify-between border-b border-[#1C3A2E] pb-3"
              style={{ transform: 'translateZ(25px)' }}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#35D399] shadow-[0_0_8px_#35d399]" />
                <p className="font-mono-custom text-[10px] font-bold tracking-[.25em] text-[#35D399]">
                  3D LIVING CARD
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInspectModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[#35D399]/60 bg-[#35D399]/15 px-2.5 py-0.5 font-mono-custom text-[10px] font-bold text-[#35D399] transition-colors hover:bg-[#35D399]/25 shadow-[0_0_12px_rgba(53,211,153,0.25)]"
                  title="Open PS5 360-degree interactive 3D showcase"
                >
                  <Gamepad2 size={12} />
                  <span>3D Inspect</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono-custom text-[10px] text-primary transition-colors hover:bg-primary/20"
                  title="Flip to passport back"
                >
                  <RotateCw size={11} />
                  <span>Flip</span>
                </button>
                {isMinted ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMintModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/60 bg-[#d4af37]/15 px-2.5 py-0.5 font-mono-custom text-[11px] font-bold text-[#f3d37a] shadow-[0_0_10px_rgba(212,175,55,0.25)]"
                  >
                    <ShieldCheck size={13} className="text-[#35D399]" />
                    <span>#{legend.mint?.tokenId}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMintModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/60 bg-gradient-to-r from-[#d4af37]/25 to-[#8a6410]/25 px-2.5 py-0.5 font-mono-custom text-[11px] font-bold text-[#f3d37a] shadow-[0_0_15px_rgba(212,175,55,0.25)] hover:border-[#d4af37]"
                  >
                    <Sparkles size={12} />
                    <span>Mint</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3D Floating Player Hero Profile (Z: 42px) */}
            <div
              className="relative z-20 mt-4 flex items-start gap-4"
              style={{ transform: 'translateZ(42px)' }}
            >
              <div className="relative drop-shadow-[0_14px_22px_rgba(0,0,0,0.7)]">
                <LegendAvatar name={legend.name} position={legend.position} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="mt-1 truncate text-2xl font-black tracking-tight text-[#E8F2EC] drop-shadow-md">
                  {legend.name}
                </h2>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-block rounded-full border border-[#35D399]/40 bg-[#35D399]/15 px-2.5 py-0.5 font-mono-custom text-[11px] font-bold text-[#35D399] shadow-[0_0_8px_rgba(53,211,153,0.3)]">
                    {legend.position}
                  </span>
                  <span className="text-xs text-[#8FA39A] font-mono-custom">Verifiable Identity</span>
                </div>
              </div>
              {/* 3D Golden OVR Crest (Z: 50px) */}
              <div
                className="grid h-16 w-16 place-items-center rounded-2xl border-2 border-[#fef08a] bg-gradient-to-br from-[#fef08a] via-[#eab308] to-[#854d0e] text-black shadow-[0_10px_25px_rgba(234,179,8,0.45),inset_0_2px_4px_rgba(255,255,255,0.8)]"
                style={{ transform: 'translateZ(50px)' }}
              >
                <span className="font-mono-custom text-[10px] font-black uppercase tracking-wider text-[#422006] leading-none">
                  OVR
                </span>
                <span className="-mt-1 font-mono-custom text-3xl font-black leading-none text-[#1a0f02]">
                  {overall}
                </span>
              </div>
            </div>

            {/* 3D Floating Stat Grid (Z: 30px) */}
            <div
              className="relative z-20 mt-5 grid grid-cols-3 gap-2"
              style={{ transform: 'translateZ(30px)' }}
            >
              {STATS.map(({ key, label }) => (
                <div
                  key={label}
                  className="rounded-xl border border-[#35D399]/20 bg-gradient-to-b from-[#122820]/90 to-[#081510]/90 px-2 py-2 text-center shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.08)]"
                >
                  <p className="font-mono-custom text-[9px] font-bold text-[#8FA39A]">{label}</p>
                  <p className="font-mono-custom text-lg font-black text-[#E8F2EC]">{legend[key]}</p>
                </div>
              ))}
            </div>

            {/* 3D Floating Footer (Z: 22px) */}
            <div
              className="relative z-20 mt-4 flex items-center justify-between border-t border-[#1C3A2E] pt-3 font-mono-custom text-[11px]"
              style={{ transform: 'translateZ(22px)' }}
            >
              <div>
                <span className="text-[10px] text-[#8FA39A]">LOCKED IN CARD: </span>
                <span className="font-bold text-[#f3d37a]">{cardAlloc} KTK</span>
              </div>
              {typeof playable === 'number' && !Number.isNaN(playable) ? (
                <div>
                  <span className="text-[10px] text-[#8FA39A]">PLAYABLE STACK: </span>
                  <span className="font-bold text-[#35D399]">{playable.toLocaleString()} KTK</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* BACK FACE (REVERSE 3D VIEW) */}
          <div
            className="absolute inset-0 overflow-hidden rounded-3xl border border-[#d4af37]/60 bg-gradient-to-br from-[#0c1f18] via-[#081410] to-[#040a08] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="flex items-center justify-between border-b border-[#1C3A2E] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-[#35D399]" />
                <p className="font-mono-custom text-[10px] font-bold tracking-[.25em] text-[#35D399]">
                  SEPOLIA CREDENTIAL
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono-custom text-[10px] text-primary transition-colors hover:bg-primary/20"
              >
                <RotateCw size={11} />
                <span>Front</span>
              </button>
            </div>

            <div className="mt-4 space-y-3 font-mono-custom text-xs">
              <div className="rounded-xl border border-border/60 bg-black/40 p-3">
                <p className="text-[10px] text-muted-foreground uppercase">Token Identity</p>
                <p className="text-sm font-bold text-[#E8F2EC]">{legend.name} ({legend.position})</p>
                <p className="text-[11px] text-[#35D399] mt-0.5">Rating: {overall} OVR · Tier 1 Living NFT</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border/60 bg-black/40 p-2.5">
                  <p className="text-[9px] text-muted-foreground uppercase">Contract</p>
                  <p className="truncate text-xs font-semibold text-[#f3d37a]">0x600f...3e9B</p>
                  <p className="text-[9px] text-muted-foreground">Sepolia ERC-721</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-black/40 p-2.5">
                  <p className="text-[9px] text-muted-foreground uppercase">Token ID</p>
                  <p className="text-xs font-semibold text-[#35D399]">{legend.mint ? `#${legend.mint.tokenId}` : 'Unminted (Ready)'}</p>
                  <p className="text-[9px] text-muted-foreground">Dynamic Metadata</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-black/40 p-3">
                <p className="text-[10px] text-muted-foreground uppercase">Rollover Mechanics</p>
                <p className="text-[11px] text-[#c7d9d0] mt-1 leading-relaxed">
                  Games play increases rollover volume. Mint locks permanent provenance on Ethereum Sepolia testnet.
                </p>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(false);
                  }}
                  className="rounded-full bg-primary/20 border border-primary px-4 py-1.5 text-[11px] font-semibold text-primary"
                >
                  Return to Card Front
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SepoliaMintModal
        isOpen={mintModalOpen}
        onClose={() => setMintModalOpen(false)}
        legend={legend}
        onMintSuccess={() => onRefresh?.()}
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
  const { legend, loading, authenticated, refreshLegend } = useLegend();
  const { serverUser } = useServerSession();

  return (
    <div className="space-y-3">
      {/* Positioning banner */}
      <div className="rounded-2xl border border-[#1C3A2E] bg-gradient-to-r from-[#0E1A16] to-[#07110e] px-4 py-2.5">
        <p className="text-center font-mono-custom text-[11px] font-medium leading-relaxed text-[#c7d9d0]">
          &ldquo;Build a legend. Lock KTK into the card. Play to unlock more. Mint when the card is yours.&rdquo;
        </p>
      </div>

      {!authenticated || !legend?.profileComplete ? (
        <LegendCard legend={null} variant="ghost" />
      ) : loading && !legend ? (
        <div className="h-52 animate-pulse rounded-[28px] bg-[#0E1A16]" />
      ) : (
        <LegendCard
          legend={legend}
          playable={serverUser?.demoCredits}
          onRefresh={() => void refreshLegend()}
        />
      )}
    </div>
  );
}
