import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { LegendAvatar } from '@/components/legend-avatar';
import { useLegend } from '@/components/legend-card';
import { Crown, ShieldCheck, Sparkles, Trophy, Flame } from 'lucide-react';

export type LeaderboardEntry = {
  id: number;
  rank: number;
  name: string;
  position: string;
  overall: number;
  allocatedKtk: number;
  volume: number;
  gamesPlayed: number;
  mintedTokenId: number | null;
  isMinted: boolean;
  form: ('W' | 'L' | 'D')[];
};

export function LeaderboardPage() {
  const { legend } = useLegend();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'ovr' | 'volume'>('ovr');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/leaderboard');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.leaderboard) {
          setEntries(data.leaderboard);
        }
      } catch {
        // Ignored
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = [...entries].sort((a, b) => {
    const aOvr = Number(a?.overall ?? 0);
    const bOvr = Number(b?.overall ?? 0);
    const aVol = Number(a?.volume ?? 0);
    const bVol = Number(b?.volume ?? 0);
    if (sortBy === 'ovr') {
      return bOvr - aOvr || bVol - aVol;
    }
    return bVol - aVol || bOvr - aOvr;
  });

  return (
    <div className="px-3 pt-3 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono-custom text-[10px] tracking-[.22em] text-[#35D399]">
            LEADERBOARD / OVR &amp; VOLUME
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#E8F2EC]">Legends of the Floor</h1>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-[#f3d37a]">
          <Trophy size={20} />
        </div>
      </div>

      {/* Positioning Callout */}
      <div className="mt-3 rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-3 text-xs text-[#8FA39A]">
        <p className="font-medium text-[#c7d9d0]">
          &ldquo;Build a legend. Lock KTK into the card. Play to unlock more. Mint when the card is yours.&rdquo;
        </p>
        <p className="mt-1 text-[11px] text-[#8FA39A]">
          Leaderboard is gated by OVR and Table Volume. Complete 10× rollovers to evolve your stats.
        </p>
      </div>

      {/* Sort Filter Tabs */}
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-[#1C3A2E] bg-[#08120e] p-1">
        <button
          type="button"
          onClick={() => setSortBy('ovr')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
            sortBy === 'ovr'
              ? 'bg-[#35D399] text-[#062018] shadow'
              : 'text-[#8FA39A] hover:text-[#E8F2EC]'
          }`}
        >
          <Crown size={14} /> Overall Rating (OVR)
        </button>
        <button
          type="button"
          onClick={() => setSortBy('volume')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
            sortBy === 'volume'
              ? 'bg-[#35D399] text-[#062018] shadow'
              : 'text-[#8FA39A] hover:text-[#E8F2EC]'
          }`}
        >
          <Flame size={14} /> Table Volume (KTK)
        </button>
      </div>

      {/* List */}
      <div className="mt-4 space-y-2.5">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-[#0E1A16]" />
            ))}
          </div>
        ) : (
          sorted.map((item, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;
            const isUser = Boolean(
              legend?.name &&
              item?.name &&
              legend.name.toLowerCase().trim() === item.name.toLowerCase().trim(),
            );
            const itemName = item?.name ?? 'Player';
            const itemPosition = item?.position ?? 'ST';
            const itemVol = Number(item?.volume ?? 0);
            const itemForm = Array.isArray(item?.form) ? item.form : [];

            return (
              <div
                key={item?.id ?? index}
                className={`relative flex items-center gap-3 rounded-2xl border p-3 transition-all ${
                  isUser
                    ? 'border-[#35D399] bg-[#0e241c] shadow-[0_0_20px_rgba(53,211,153,0.2)]'
                    : isTop3
                    ? 'border-[#d4af37]/40 bg-gradient-to-r from-[#14231c] via-[#0E1A16] to-[#0a1410]'
                    : 'border-[#1C3A2E] bg-[#0E1A16]'
                }`}
              >
                {/* Rank Badge */}
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl font-mono-custom text-xs font-bold ${
                    rank === 1
                      ? 'bg-gradient-to-br from-[#f3d37a] to-[#d4af37] text-black shadow'
                      : rank === 2
                      ? 'bg-slate-300 text-black'
                      : rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'border border-[#1C3A2E] bg-[#07110e] text-[#8FA39A]'
                  }`}
                >
                  {rank === 1 ? <Crown size={14} /> : `#${rank}`}
                </div>

                {/* Avatar */}
                <LegendAvatar name={itemName} position={itemPosition} size="sm" />

                {/* Identity & Stats */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-bold text-[#E8F2EC]">
                      {itemName}
                    </span>
                    <span className="rounded bg-[#35D399]/20 px-1 py-0.2 font-mono-custom text-[9px] font-bold text-[#35D399]">
                      {itemPosition}
                    </span>
                    {item?.isMinted && (
                      <span className="inline-flex items-center gap-0.5 font-mono-custom text-[9px] text-[#f3d37a]">
                        <ShieldCheck size={10} /> #{item.mintedTokenId}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 font-mono-custom text-[10px] text-[#8FA39A]">
                    <span>{itemVol.toLocaleString()} KTK Volume</span>
                    <span>·</span>
                    <div className="flex items-center gap-0.5">
                      {itemForm.map((res, idx) => (
                        <span
                          key={idx}
                          className={`inline-block h-3 w-3 rounded-full text-center text-[7px] font-bold leading-3 ${
                            res === 'W'
                              ? 'bg-[#35D399] text-black'
                              : res === 'L'
                              ? 'bg-red-500/80 text-white'
                              : 'bg-amber-500 text-black'
                          }`}
                        >
                          {res}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Overall Score */}
                <div className="text-right">
                  <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#d4af37]/50 bg-gradient-to-br from-[#f3d37a]/20 to-[#8a6410]/20 text-[#f3d37a]">
                    <span className="font-mono-custom text-[8px] font-bold uppercase leading-none">OVR</span>
                    <span className="-mt-0.5 font-mono-custom text-lg font-black leading-none">{item?.overall ?? 50}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer CTA */}
      <div className="mt-6 text-center">
        <Link
          href="/legend"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#35D399]/40 bg-[#35D399]/10 px-5 py-2.5 text-xs font-semibold text-[#35D399] hover:bg-[#35D399]/20"
        >
          <Sparkles size={14} /> Evolve Your Legend on the Pitch
        </Link>
      </div>
    </div>
  );
}
