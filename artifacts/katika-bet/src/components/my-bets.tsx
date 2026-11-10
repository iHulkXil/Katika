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
    // Load from localStorage for MVP; later replace with Solana account reads
    const raw = localStorage.getItem('sidebet_positions');
    if (raw) {
      try {
        setPositions(JSON.parse(raw));
      } catch {
        setPositions([]);
      }
    }
  }, []);

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 className="text-xl font-bold text-white">My Bets</h1>
      <p className="mt-1 text-xs text-slate-400">Your open and settled positions on Solana devnet</p>

      {positions.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-700 py-16 text-center">
          <p className="text-sm text-slate-500">No bets yet.</p>
          <Link href="/" className="mt-3 inline-block text-sm text-blue-400 underline">
            Browse markets
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {positions.map((p) => (
            <div key={p.id} className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-medium uppercase text-blue-400">{p.side}</div>
                  <h2 className="mt-1 text-sm font-semibold text-white">{p.title}</h2>
                </div>
                <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                  p.status === 'open' ? 'bg-blue-500/15 text-blue-400' :
                  p.status === 'won' ? 'bg-emerald-500/15 text-emerald-400' :
                  'bg-red-500/15 text-red-400'
                }`}>
                  {p.status}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1"><TrendingUp size={12} /> {p.amount} SOL @ {p.odds}</span>
                <span className="inline-flex items-center gap-1"><Clock size={12} /> {p.placedAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
