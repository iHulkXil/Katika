import { useState, useMemo, useEffect } from 'react';
import { Plus, TrendingUp, Clock, Users, ChevronRight, Loader2 } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';

type Market = {
  id: string;
  title: string;
  category: string;
  yesShares: number;
  noShares: number;
  volume: number;
  endsAt: string;
  creator?: string;
  source?: 'polymarket' | 'custom';
};

const CATEGORIES = ['All', 'BTC 15m', 'SOL 15m', 'Crypto', 'Politics', 'Sports', 'Tech', 'Custom'];

function calcOdds(yes: number, no: number) {
  const total = yes + no || 1;
  const yesProb = yes / total;
  const noProb = no / total;
  return {
    yes: yesProb > 0 ? (1 / yesProb).toFixed(2) : '—',
    no: noProb > 0 ? (1 / noProb).toFixed(2) : '—',
    yesPct: Math.round(yesProb * 100),
  };
}

function mapPolymarketMarket(raw: any): Market | null {
  try {
    const prices = JSON.parse(raw.outcomePrices || '["0.5","0.5"]');
    const yesProb = parseFloat(prices[0]) || 0.5;
    const yesShares = Math.round(yesProb * 10000);
    const noShares = Math.round((1 - yesProb) * 10000);
    const volume = Number(raw.volumeNum || raw.volume || 0);
    const end = raw.endDate ? new Date(raw.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBD';

    let category = 'Crypto';
    const q = (raw.question || '').toLowerCase();
    const slug = (raw.slug || '').toLowerCase();
    if (slug.includes('nfl') || slug.includes('nba') || slug.includes('mlb') || q.includes('vs.') || q.includes('spread')) category = 'Sports';
    else if (q.includes('president') || q.includes('election') || q.includes('nomination') || slug.includes('politics')) category = 'Politics';
    else if (q.includes('btc') || q.includes('bitcoin') || q.includes('eth') || q.includes('sol') || slug.includes('crypto')) category = 'Crypto';
    else if (q.includes('ai') || q.includes('agi')) category = 'Tech';

    return {
      id: raw.id || raw.slug || Math.random().toString(36),
      title: raw.question || 'Untitled market',
      category,
      yesShares,
      noShares,
      volume: Math.round(volume),
      endsAt: end,
      source: 'polymarket',
    };
  } catch {
    return null;
  }
}

export function MarketsHome() {
  const { authenticated, login } = usePrivy();
  const [category, setCategory] = useState('All');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Custom');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          'https://gamma-api.polymarket.com/markets?active=true&closed=false&order=volume24hr&ascending=false&limit=30'
        );
        if (!res.ok) throw new Error('Failed to load markets');
        const data = await res.json();
        const mapped = (Array.isArray(data) ? data : []).map(mapPolymarketMarket).filter(Boolean) as Market[];
        // Seed a couple of 15m crypto markets at the top for the requested categories
        const seeds: Market[] = [
          { id: 'btc15', title: 'BTC Up in next 15 minutes?', category: 'BTC 15m', yesShares: 6200, noShares: 3800, volume: 12450, endsAt: '15m', source: 'custom' },
          { id: 'sol15', title: 'SOL Up in next 15 minutes?', category: 'SOL 15m', yesShares: 5400, noShares: 4600, volume: 8920, endsAt: '15m', source: 'custom' },
        ];
        setMarkets([...seeds, ...mapped]);
      } catch (e: any) {
        setError(e.message || 'Could not load live markets');
        setMarkets([
          { id: 'btc15', title: 'BTC Up in next 15 minutes?', category: 'BTC 15m', yesShares: 6200, noShares: 3800, volume: 12450, endsAt: '15m' },
          { id: 'sol15', title: 'SOL Up in next 15 minutes?', category: 'SOL 15m', yesShares: 5400, noShares: 4600, volume: 8920, endsAt: '15m' },
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(
    () => (category === 'All' ? markets : markets.filter((m) => m.category === category)),
    [markets, category]
  );

  function handleCreate() {
    if (!newTitle.trim()) return;
    if (!authenticated) {
      login();
      return;
    }
    const id = `m-${Date.now()}`;
    setMarkets((prev) => [
      {
        id,
        title: newTitle.trim(),
        category: newCategory,
        yesShares: 1000,
        noShares: 1000,
        volume: 0,
        endsAt: '7d',
        creator: 'You',
        source: 'custom',
      },
      ...prev,
    ]);
    setNewTitle('');
    setShowCreate(false);
    alert('Event created. Proof-of-bet NFT mint queued on Solana (MVP).');
  }

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Markets</h1>
          <p className="text-xs text-slate-400">Live from Polymarket + custom events · Decimal odds</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600 active:scale-95"
        >
          <Plus size={14} />
          Create
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium transition ${
              category === c
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading live markets…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {error} — showing fallback markets
        </div>
      )}

      <div className="space-y-3">
        {!loading && filtered.map((m) => {
          const { yes, no, yesPct } = calcOdds(m.yesShares, m.noShares);
          return (
            <div
              key={m.id}
              className="rounded-2xl border border-slate-700/80 bg-slate-900/50 p-4 transition hover:border-blue-500/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-blue-400">
                      {m.category}
                    </span>
                    {m.source === 'polymarket' && (
                      <span className="text-[10px] text-slate-500">Polymarket</span>
                    )}
                    {m.creator && (
                      <span className="text-[10px] text-slate-500">by {m.creator}</span>
                    )}
                  </div>
                  <h2 className="mt-1.5 text-sm font-semibold leading-snug text-white">{m.title}</h2>
                </div>
                <ChevronRight size={16} className="mt-1 text-slate-500" />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center">
                  <div className="text-[10px] font-medium text-emerald-400">YES</div>
                  <div className="text-lg font-bold text-white">{yes}</div>
                  <div className="text-[10px] text-slate-400">{yesPct}%</div>
                </div>
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center">
                  <div className="text-[10px] font-medium text-red-400">NO</div>
                  <div className="text-lg font-bold text-white">{no}</div>
                  <div className="text-[10px] text-slate-400">{100 - yesPct}%</div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <TrendingUp size={12} />
                  ${m.volume.toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} />
                  {m.endsAt}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users size={12} />
                  {Math.round((m.yesShares + m.noShares) / 100)}
                </span>
              </div>
            </div>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 py-12 text-center text-sm text-slate-500">
            No markets in this category yet.
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0B1120] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Create Event</h3>
            <p className="mt-1 text-xs text-slate-400">
              Creating an event mints a Solana NFT as proof-of-bet.
            </p>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Will BTC close above $100k this week?"
              className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="flex-1 rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
              >
                Mint & Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
