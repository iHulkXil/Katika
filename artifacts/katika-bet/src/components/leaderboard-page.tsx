import { useEffect, useState } from 'react';
import { Crown, Trophy, Flame } from 'lucide-react';

export type LeaderboardEntry = {
  id: number;
  rank: number;
  name: string;
  volume: number;
  gamesPlayed: number;
  form: ('W' | 'L' | 'D')[];
};

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'volume' | 'games'>('volume');

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
    const aVol = Number(a?.volume ?? 0);
    const bVol = Number(b?.volume ?? 0);
    const aGames = Number(a?.gamesPlayed ?? 0);
    const bGames = Number(b?.gamesPlayed ?? 0);
    if (sortBy === 'volume') {
      return bVol - aVol || bGames - aGames;
    }
    return bGames - aGames || bVol - aVol;
  });

  return (
    <div className="px-3 pt-3 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono-custom text-[10px] tracking-[.22em] text-[#35D399]">
            LEADERBOARD
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#E8F2EC]">Top Players</h1>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-[#f3d37a]">
          <Trophy size={20} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-[#1C3A2E] bg-[#08120e] p-1">
        <button
          type="button"
          onClick={() => setSortBy('volume')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
            sortBy === 'volume'
              ? 'bg-[#35D399] text-[#062018] shadow'
              : 'text-[#8FA39A] hover:text-[#E8F2EC]'
          }`}
        >
          <Flame size={14} /> Volume
        </button>
        <button
          type="button"
          onClick={() => setSortBy('games')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
            sortBy === 'games'
              ? 'bg-[#35D399] text-[#062018] shadow'
              : 'text-[#8FA39A] hover:text-[#E8F2EC]'
          }`}
        >
          <Crown size={14} /> Games Played
        </button>
      </div>

      <div className="mt-4 space-y-2.5">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-[#0E1A16]" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-6 text-center text-sm text-[#8FA39A]">
            No players yet. Be the first.
          </div>
        ) : (
          sorted.map((item, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;
            const itemName = item?.name ?? 'Player';
            const itemVol = Number(item?.volume ?? 0);
            const itemGames = Number(item?.gamesPlayed ?? 0);
            const itemForm = Array.isArray(item?.form) ? item.form : [];

            return (
              <div
                key={item?.id ?? index}
                className={`relative flex items-center gap-3 rounded-2xl border p-3 transition-all ${
                  isTop3
                    ? 'border-[#d4af37]/40 bg-gradient-to-r from-[#14231c] via-[#0E1A16] to-[#0a1410]'
                    : 'border-[#1C3A2E] bg-[#0E1A16]'
                }`}
              >
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

                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#35D399]/20 text-sm font-bold text-[#35D399]">
                  {itemName.slice(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-[#E8F2EC]">{itemName}</div>
                  <div className="mt-0.5 flex items-center gap-2 font-mono-custom text-[10px] text-[#8FA39A]">
                    <span>{itemVol.toLocaleString()} vol</span>
                    <span>·</span>
                    <span>{itemGames} games</span>
                    {itemForm.length > 0 && (
                      <>
                        <span>·</span>
                        <div className="flex items-center gap-0.5">
                          {itemForm.slice(0, 5).map((res, idx) => (
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
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
