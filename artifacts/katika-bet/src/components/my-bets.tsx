import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Clock, TrendingUp, Sparkles, ArrowUpRight } from 'lucide-react';

type Position = {
  id: string;
  marketId: string;
  title: string;
  side: 'YES' | 'NO';
  amount: number;
  odds: number;
  status: 'open' | 'won' | 'lost' | 'settled';
  placedAt: string;
};

export function MyBets() {
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('sidebet_positions');
    if (raw) {
      try {
        setPositions(JSON.parse(raw));
      } catch {
        setPositions([]);
      }
    }
  }, []);

  const totalStaked = positions.reduce((acc, p) => acc + (p.amount || 0), 0);
  const potentialPayout = positions.reduce((acc, p) => acc + ((p.amount || 0) * (p.odds || 1)), 0);

  return (
    <div className="space-y-5">
      {/* Positions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white font-display">Active Wagers & Positions</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Open, won, and settled prediction positions on Solana Mainnet & internal book.
          </p>
        </div>

        {/* Portfolio Mini Stats */}
        <div className="flex items-center gap-4 bg-[#121820] border border-white/[0.08] rounded-2xl px-4 py-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Total Stake</div>
            <div className="font-mono text-sm font-bold text-white tabular-nums">{totalStaked.toFixed(2)} SOL</div>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Potential Return</div>
            <div className="font-mono text-sm font-bold text-[#4ade80] tabular-nums">+{potentialPayout.toFixed(2)} SOL</div>
          </div>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#0E1318]/40 py-16 px-4 text-center">
          <p className="text-sm font-medium text-slate-300">No active wagers found in this wallet session.</p>
          <p className="mt-1 text-xs text-slate-500">Pick an outcome from the live orderbooks to open a position.</p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] hover:bg-[#16a34a] px-4 py-2 text-xs font-bold text-black shadow-md shadow-[#22c55e]/20 transition-all active:scale-95"
          >
            Explore Live Markets <ArrowUpRight size={13} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((p) => {
            const potentialWin = (p.amount * p.odds).toFixed(3);
            const isYes = p.side === 'YES';

            return (
              <div
                key={p.id}
                className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-4 transition-all hover:border-white/20 hover:bg-[#121820]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                        isYes
                          ? 'border border-[#22c55e]/40 bg-[#22c55e]/15 text-[#4ade80]'
                          : 'border border-[#ec4899]/40 bg-[#ec4899]/15 text-[#f472b6]'
                      }`}
                    >
                      {p.side}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Odds {p.odds}×</span>
                  </div>

                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#4ade80] font-semibold bg-[#22c55e]/10 border border-[#22c55e]/20 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                    {p.status}
                  </span>
                </div>

                <h3 className="mt-2 text-sm font-bold text-white leading-snug">
                  {p.title}
                </h3>

                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-3">
                    <span>Stake: <strong className="text-white font-bold">{p.amount} SOL</strong></span>
                    <span>·</span>
                    <span>Max Return: <strong className="text-[#4ade80] font-bold">+{potentialWin} SOL</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><Clock size={12} /> {p.placedAt}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
