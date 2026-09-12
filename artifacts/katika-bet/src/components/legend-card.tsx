import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';

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

  useEffect(() => {
    if (!ready || !authenticated) {
      setLegend(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const token = await getAccessToken();
      if (!token) return;
      const response = await fetch('/api/legends/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const body = await response.json();
      if (!cancelled) setLegend(body as LegendCardData | null);
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, getAccessToken]);

  return { legend, loading, authenticated, ready };
}

export function LegendCard({
  legend,
  playable,
  variant = 'full',
}: {
  legend: LegendCardData | null;
  playable?: number;
  variant?: 'full' | 'compact' | 'ghost';
}) {
  if (!legend || !legend.profileComplete || variant === 'ghost') {
    return (
      <div className="rounded-[28px] border border-[#1C3A2E] bg-[#0E1A16] px-5 pb-7 pt-6 text-center">
        <div className="flex items-start justify-between px-2">
          <div className="grid h-16 w-14 place-items-center rounded-xl border border-dashed border-[#2A4A3C]">
            <span className="font-mono-custom text-[10px] uppercase tracking-widest text-[#4A6B5C]">OVR</span>
            <span className="-mt-1 text-lg text-[#4A6B5C]">—</span>
          </div>
          <div className="grid h-16 w-14 place-items-center rounded-xl border border-[#2A4A3C] bg-[#122019]">
            <span className="text-lg font-semibold text-[#35D399]">K.</span>
          </div>
        </div>
        <p className="mt-8 font-mono-custom text-[11px] tracking-[0.28em] text-[#8FA39A]">NO LEGEND</p>
        <p className="mx-auto mt-2 max-w-[220px] text-sm leading-5 text-[#8FA39A]">Set up your FIFA card<br />to unlock the floor.</p>
        <Link href="/legend" className="mt-6 inline-flex rounded-full bg-[#35D399] px-6 py-3 text-sm font-semibold text-[#062018] shadow-[0_0_24px_rgba(53,211,153,.35)]">
          Create your legend
        </Link>
      </div>
    );
  }

  const overall = Math.round(
    (legend.pace + legend.shooting + legend.passing + legend.dribbling + legend.defending + legend.physical) / 6,
  );

  if (variant === 'compact') {
    return (
      <Link href="/legend" className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-accent to-card p-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary font-mono-custom text-lg font-bold text-primary-foreground">
          {overall}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{legend.name}</span>
          <span className="font-mono-custom text-[11px] text-muted-foreground">{legend.position} · {legend.allocatedKchip} alloc</span>
        </span>
        {typeof playable === 'number' ? (
          <span className="font-mono-custom text-xs text-primary">{playable} P</span>
        ) : null}
      </Link>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-primary/35 bg-gradient-to-br from-accent via-card to-background p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono-custom text-[10px] tracking-[.22em] text-primary">PLAYER CARD</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{legend.name}</h2>
          <p className="mt-1 inline-block rounded-full border border-primary/30 px-2 py-0.5 text-[11px] text-primary">{legend.position}</p>
        </div>
        <div className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_24px_rgba(53,211,153,.35)]">
          <span className="font-mono-custom text-[10px] uppercase">OVR</span>
          <span className="-mt-1 font-mono-custom text-3xl font-bold leading-none">{overall}</span>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {STATS.map(({ key, label }) => (
          <div key={label} className="rounded-xl border border-border/80 bg-background/40 px-2 py-2 text-center">
            <p className="font-mono-custom text-[9px] text-muted-foreground">{label}</p>
            <p className="font-mono-custom text-lg font-semibold">{legend[key]}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between font-mono-custom text-[11px]">
        <span className="text-secondary">{legend.allocatedKchip} ALLOCATED</span>
        {typeof playable === 'number' ? <span className="text-primary">{playable} PLAYABLE</span> : null}
      </div>
    </div>
  );
}

export function HomeLegendHero() {
  const { legend, loading, authenticated } = useLegend();
  const { serverUser } = useServerSession();
  if (!authenticated || !legend?.profileComplete) return <LegendCard legend={null} variant="ghost" />;
  if (loading && !legend) return <div className="h-52 animate-pulse rounded-[28px] bg-[#0E1A16]" />;
  return <LegendCard legend={legend} playable={serverUser?.demoCredits} />;
}
