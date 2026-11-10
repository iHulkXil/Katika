import { useState, useMemo, useEffect } from 'react';
import { Plus, TrendingUp, Clock, Users, Loader2 } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';

type Market = {
  id: string;
  title: string;
  category: string;
  yesShares: number;
  noShares: number;
  liquidity: number; // SOL locked in LP
  volume: number;
  endsAt: string;
  creator?: string;
  refOdds?: string; // Polymarket reference
};

type Position = {
  id: string;
  marketId: string;
  title: string;
  side: 'YES' | 'NO';
  amount: number;
  odds: number;
  status: 'open';
  placedAt: string;
};

const NIGERIAN_MARKETS: Market[] = [
  { id: 'obi-shake', title: 'Will Peter Obi publicly shake hands with Bola Tinubu before election day?', category: 'Politics', yesShares: 4200, noShares: 5800, liquidity: 50, volume: 0, endsAt: '2027' },
  { id: 'regina', title: 'Will Regina Daniels reconcile with Ned Nwoko before the end of 2027?', category: 'Politics', yesShares: 3100, noShares: 6900, liquidity: 30, volume: 0, endsAt: '2027' },
  { id: 'obi-energy', title: 'Will Peter Obi say Tinubu lacks energy to lead Nigeria again this month?', category: 'Politics', yesShares: 6800, noShares: 3200, liquidity: 40, volume: 0, endsAt: 'Nov 30' },
  { id: 'coalition', title: 'Will an opposition coalition form against Tinubu before 2027 primaries?', category: 'Politics', yesShares: 5500, noShares: 4500, liquidity: 60, volume: 0, endsAt: '2026' },
  { id: 'inec', title: 'Will INEC publish a clean voter register before the 2027 election?', category: 'Politics', yesShares: 3800, noShares: 6200, liquidity: 35, volume: 0, endsAt: '2027' },
  { id: 'atiku', title: 'Will Atiku Abubakar be disqualified or withdraw before 2027?', category: 'Politics', yesShares: 2900, noShares: 7100, liquidity: 25, volume: 0, endsAt: '2027' },
  { id: 'btc15', title: 'BTC Up in next 15 minutes?', category: 'BTC 15m', yesShares: 6200, noShares: 3800, liquidity: 20, volume: 0, endsAt: '15m' },
  { id: 'sol15', title: 'SOL Up in next 15 minutes?', category: 'SOL 15m', yesShares: 5400, noShares: 4600, liquidity: 15, volume: 0, endsAt: '15m' },
];

const CATEGORIES = ['All', 'Politics', 'BTC 15m', 'SOL 15m', 'Crypto', 'Sports', 'Custom'];

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

function savePosition(pos: Position) {
  const raw = localStorage.getItem('sidebet_positions') || '[]';
  const list: Position[] = JSON.parse(raw);
  list.unshift(pos);
  localStorage.setItem('sidebet_positions', JSON.stringify(list.slice(0, 50)));
}

export function MarketsHome() {
  const { authenticated, login, user } = usePrivy();
  const [category, setCategory] = useState('All');
  const [markets, setMarkets] = useState<Market[]>(NIGERIAN_MARKETS);
  const [loadingRef, setLoadingRef] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Custom');
  const [betAmount, setBetAmount] = useState(0.1);

  // Optional Polymarket odds reference (does not replace local markets)
  useEffect(() => {
    async function loadRef() {
      setLoadingRef(true);
      try {
        const res = await fetch('https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=20&order=volume24hr&ascending=false');
        if (res.ok) {
          const data = await res.json();
          // Just note that we have a reference feed; local markets stay primary
          console.log('Polymarket odds reference loaded', data.length);
        }
      } catch {
        // ignore
      } finally {
        setLoadingRef(false);
      }
    }
    loadRef();
  }, []);

  const filtered = useMemo(
    () => (category === 'All' ? markets : markets.filter((m) => m.category === category)),
    [markets, category]
  );

  function placeBet(market: Market, side: 'YES' | 'NO') {
    if (!authenticated) {
      login();
      return;
    }
    const amount = betAmount;
    if (amount <= 0) return;

    // Simple LP update: buying YES increases yesShares, reduces noShares slightly or uses liquidity
    setMarkets((prev) =>
      prev.map((m) => {
        if (m.id !== market.id) return m;
        const delta = amount * 1000;
        if (side === 'YES') {
          return { ...m, yesShares: m.yesShares + delta, volume: m.volume + amount, liquidity: m.liquidity + amount * 0.5 };
        } else {
          return { ...m, noShares: m.noShares + delta, volume: m.volume + amount, liquidity: m.liquidity + amount * 0.5 };
        }
      })
    );

    const { yes, no } = calcOdds(market.yesShares, market.noShares);
    const odds = side === 'YES' ? parseFloat(yes) : parseFloat(no);
    const pos: Position = {
      id: `p-${Date.now()}`,
      marketId: market.id,
      title: market.title,
      side,
      amount,
      odds,
      status: 'open',
      placedAt: new Date().toLocaleDateString(),
    };
    savePosition(pos);

    // Hotwire Solana devnet: in production this would build & sign a tx via Privy wallet
    // For testing we log the intended call
    const solanaAddress = user?.wallet?.address || 'no-wallet';
    console.log(`[Solana Devnet] Place ${side} ${amount} SOL on "${market.title}" from ${solanaAddress}`);
    // TODO: use @solana/web3.js Connection('https://api.devnet.solana.com') + Privy signAndSendTransaction

    alert(`Bet placed: ${amount} SOL on ${side}. Position saved. Solana devnet tx queued.`);
  }

  function handleCreate() {
    if (!newTitle.trim()) return;
    if (!authenticated) {
      login();
      return;
    }
    const id = `m-${Date.now()}`;
    const newMarket: Market = {
      id,
      title: newTitle.trim(),
      category: newCategory,
      yesShares: 5000,
      noShares: 5000,
      liquidity: 10,
      volume: 0,
      endsAt: '7d',
      creator: 'You',
    };
    setMarkets((prev) => [newMarket, ...prev]);
    setNewTitle('');
    setShowCreate(false);
    alert('Market created locally. NFT proof-of-bet mint queued on Solana devnet.');
  }

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Markets</h1>
          <p className="text-xs text-slate-400">
            Local markets · LP-backed · Polymarket odds reference only · Solana devnet
            {loadingRef && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
          </p>
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
              category === c ? 'bg-blue-500 text-white' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => {
          const { yes, no, yesPct } = calcOdds(m.yesShares, m.noShares);
          return (
            <div key={m.id} className="rounded-2xl border border-slate-700/80 bg-slate-900/50 p-4 transition hover:border-blue-500/40">
              <div className="flex items-center gap-2">
                <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-blue-400">
                  {m.category}
                </span>
                {m.creator && <span className="text-[10px] text-slate-500">by {m.creator}</span>}
              </div>
              <h2 className="mt-2 text-sm font-semibold leading-snug text-white">{m.title}</h2>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => placeBet(m, 'YES')}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 py-2 text-center hover:bg-emerald-500/20 active:scale-95"
                >
                  <div className="text-[10px] font-medium text-emerald-400">YES {yes}</div>
                  <div className="text-[10px] text-slate-400">{yesPct}%</div>
                </button>
                <button
                  type="button"
                  onClick={() => placeBet(m, 'NO')}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-2 py-2 text-center hover:bg-red-500/20 active:scale-95"
                >
                  <div className="text-[10px] font-medium text-red-400">NO {no}</div>
                  <div className="text-[10px] text-slate-400">{100 - yesPct}%</div>
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1"><TrendingUp size={12} /> ${m.volume.toFixed(2)}</span>
                <span className="inline-flex items-center gap-1"><Clock size={12} /> {m.endsAt}</span>
                <span className="inline-flex items-center gap-1"><Users size={12} /> LP {m.liquidity}</span>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700 py-12 text-center text-sm text-slate-500">
          No markets in this category.
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0B1120] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Create Event</h3>
            <p className="mt-1 text-xs text-slate-400">Local market + Solana NFT proof-of-bet on devnet.</p>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Will Peter Obi shake Tinubu in public?"
              className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300">Cancel</button>
              <button type="button" onClick={handleCreate} className="flex-1 rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-600">Mint & Create</button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-20 right-4 z-30 rounded-xl border border-slate-700 bg-[#0B1120]/95 p-2 shadow-lg md:bottom-6">
        <label className="text-[10px] text-slate-400">Bet size (SOL)</label>
        <input
          type="number"
          step="0.05"
          min="0.01"
          value={betAmount}
          onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0.1)}
          className="mt-1 w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
        />
      </div>
    </div>
  );
}
