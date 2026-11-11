import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Clock, TrendingUp } from 'lucide-react';

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
    <div className="pt-5 pb-8 space-y-5">
      {/* Positions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">My Portfolio & Wagers</h1>
          <p className="mt-1 text-xs text-slate-400">
            Open, won, and settled binary positions on Solana devnet.
          </p>
        </div>

        {/* Portfolio Mini Stats */}
        <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Total Stake</div>
            <div className="font-mono text-sm font-semibold text-slate-200 tabular-nums">{totalStaked.toFixed(2)} SOL</div>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Potential Payout</div>
            <div className="font-mono text-sm font-semibold text-emerald-400 tabular-nums">{potentialPayout.toFixed(2)} SOL</div>
          </div>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 py-16 px-4 text-center">
          <p className="text-sm font-medium text-slate-400">No active wagers found in this wallet session.</p>
          <p className="mt-1 text-xs text-slate-500">Pick an outcome from the live orderbooks to open a position.</p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            Explore Live Markets →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((p) => {
            const potentialWin = (p.amount * p.odds).toFixed(3);
            return (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition-all hover:border-slate-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-lg px-2 py-0.5 font-mono text-[11px] font-black uppercase ${
                        p.side === 'YES'
                          ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                          : 'border border-rose-500/40 bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {p.side}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">Odds {p.odds}×</span>
                  </div>

                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded self-start sm:self-auto">
                    {p.status}
                  </span>
                </div>

                <h2 className="mt-2 text-sm font-semibold text-white leading-snug">
                  {p.title}
                </h2>

                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-3">
                    <span>Stake: <strong className="text-slate-200">{p.amount} SOL</strong></span>
                    <span>·</span>
                    <span>Max Return: <strong className="text-emerald-400">+{potentialWin} SOL</strong></span>
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
