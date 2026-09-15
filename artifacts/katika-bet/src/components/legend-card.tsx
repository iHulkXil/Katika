import { useEffect, useState, useCallback } from 'react';
import { Link } from 'wouter';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { LegendAvatar } from '@/components/legend-avatar';
import { SepoliaMintModal, type MintRecord } from '@/components/sepolia-mint-modal';
import { ShieldCheck, Sparkles } from 'lucide-react';

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
    (legend.pace + legend.shooting + legend.passing + legend.dribbling + legend.defending + legend.physical) / 6,
  );

  const isMinted = Boolean(legend.mint);

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
                {legend.position} · {legend.allocatedKchip} alloc
              </span>
            </span>
          </Link>
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
      </>
    );
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/40 bg-gradient-to-br from-[#122820] via-card to-background p-5 shadow-[0_0_30px_rgba(28,58,46,0.5)]">
        {/* Holographic Header Strip */}
        <div className="flex items-center justify-between border-b border-[#1C3A2E] pb-3">
          <p className="font-mono-custom text-[10px] tracking-[.22em] text-[#35D399]">LIVING PLAYER CARD</p>
          {isMinted ? (
            <button
              type="button"
              onClick={() => setMintModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/60 bg-[#d4af37]/15 px-2.5 py-0.5 font-mono-custom text-[11px] font-bold text-[#f3d37a] shadow-[0_0_10px_rgba(212,175,55,0.25)]"
            >
              <ShieldCheck size={13} className="text-[#35D399]" />
              <span>Sepolia #{legend.mint?.tokenId}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMintModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/60 bg-gradient-to-r from-[#d4af37]/25 to-[#8a6410]/25 px-2.5 py-0.5 font-mono-custom text-[11px] font-bold text-[#f3d37a] shadow-[0_0_15px_rgba(212,175,55,0.25)] hover:border-[#d4af37]"
            >
              <Sparkles size={12} />
              <span>Mint on Sepolia</span>
            </button>
          )}
        </div>

        <div className="mt-4 flex items-start gap-4">
          <LegendAvatar name={legend.name} position={legend.position} />
          <div className="min-w-0 flex-1">
            <h2 className="mt-1 truncate text-2xl font-bold tracking-tight text-[#E8F2EC]">{legend.name}</h2>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block rounded-full border border-primary/30 px-2 py-0.5 font-mono-custom text-[11px] text-primary">
                {legend.position}
              </span>
              <span className="text-xs text-[#8FA39A]">Floor Identity</span>
            </div>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-[#d4af37]/50 bg-gradient-to-br from-[#f3d37a] to-[#8a6410] text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]">
            <span className="font-mono-custom text-[10px] font-extrabold uppercase leading-none">OVR</span>
            <span className="-mt-1 font-mono-custom text-3xl font-black leading-none">{overall}</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {STATS.map(({ key, label }) => (
            <div key={label} className="rounded-xl border border-border/80 bg-background/50 px-2 py-2 text-center">
              <p className="font-mono-custom text-[9px] text-muted-foreground">{label}</p>
              <p className="font-mono-custom text-lg font-bold text-[#E8F2EC]">{legend[key]}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#1C3A2E] pt-3 font-mono-custom text-[11px]">
          <div>
            <span className="text-[10px] text-[#8FA39A]">LOCKED IN CARD: </span>
            <span className="font-bold text-[#f3d37a]">{legend.allocatedKchip} KTK</span>
          </div>
          {typeof playable === 'number' ? (
            <div>
              <span className="text-[10px] text-[#8FA39A]">PLAYABLE STACK: </span>
              <span className="font-bold text-[#35D399]">{playable.toLocaleString()} KTK</span>
            </div>
          ) : null}
        </div>
      </div>

      <SepoliaMintModal
        isOpen={mintModalOpen}
        onClose={() => setMintModalOpen(false)}
        legend={legend}
        onMintSuccess={() => onRefresh?.()}
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
