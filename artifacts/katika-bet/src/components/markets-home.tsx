import { useState, useMemo } from 'react';
import { Plus, TrendingUp, Flame, Bitcoin, Landmark, Trophy } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

type Market = {
  id: string;
  title: string;
  category: string;
  yesShares: number;
  noShares: number;
  liquidity: number;
  volume: number;
  endsAt: string;
  creator?: string;
  icon?: string;
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
  txSig?: string;
};

const NIGERIAN_MARKETS: Market[] = [
  { id: 'obi-shake', title: 'Will Peter Obi publicly shake hands with Bola Tinubu before election day?', category: 'Politics', yesShares: 4200, noShares: 5800, liquidity: 50, volume: 124500, endsAt: '2027', icon: 'obi' },
  { id: 'regina', title: 'Will Regina Daniels reconcile with Ned Nwoko before the end of 2027?', category: 'Politics', yesShares: 3100, noShares: 6900, liquidity: 30, volume: 89200, endsAt: '2027', icon: 'regina' },
  { id: 'obi-energy', title: 'Will Peter Obi say Tinubu lacks energy to lead Nigeria again this month?', category: 'Politics', yesShares: 6800, noShares: 3200, liquidity: 40, volume: 210400, endsAt: 'Nov 30', icon: 'obi' },
  { id: 'coalition', title: 'Will an opposition coalition form against Tinubu before 2027 primaries?', category: 'Politics', yesShares: 5500, noShares: 4500, liquidity: 60, volume: 156800, endsAt: '2026', icon: 'coalition' },
  { id: 'inec', title: 'Will INEC publish a clean voter register before the 2027 election?', category: 'Politics', yesShares: 3800, noShares: 6200, liquidity: 35, volume: 73400, endsAt: '2027', icon: 'inec' },
  { id: 'btc15', title: 'BTC Up in next 15 minutes?', category: 'Crypto', yesShares: 6200, noShares: 3800, liquidity: 20, volume: 45200, endsAt: '15m', icon: 'btc' },
  { id: 'sol15', title: 'SOL Up in next 15 minutes?', category: 'Crypto', yesShares: 5400, noShares: 4600, liquidity: 15, volume: 32100, endsAt: '15m', icon: 'sol' },
  { id: 'arsenal', title: 'Will Arsenal win the Premier League 2026/27?', category: 'Sports', yesShares: 7200, noShares: 2800, liquidity: 80, volume: 890000, endsAt: 'May 2027', icon: 'arsenal' },
];

const TOP_MOVERS = [
  { name: 'Bitcoin', pct: 67, change: '+5%', icon: 'btc' },
  { name: 'Arsenal', pct: 72, change: '+3%', icon: 'arsenal' },
  { name: 'ETH', pct: 49, change: '-2%', icon: 'eth' },
  { name: 'Tinubu', pct: 54, change: '+1%', icon: 'tinubu' },
  { name: 'Economy', pct: 61, change: '+4%', icon: 'econ' },
];

function calcOdds(yes: number, no: number) {
  const total = yes + no || 1;
  const yesProb = yes / total;
  return {
    yes: yesProb > 0 ? (1 / yesProb).toFixed(2) : '—',
    no: (1 - yesProb) > 0 ? (1 / (1 - yesProb)).toFixed(2) : '—',
    yesPct: Math.round(yesProb * 100),
  };
}

function savePosition(pos: Position) {
  const raw = localStorage.getItem('sidebet_positions') || '[]';
  const list: Position[] = JSON.parse(raw);
  list.unshift(pos);
  localStorage.setItem('sidebet_positions', JSON.stringify(list.slice(0, 50)));
}

function MarketIcon({ type }: { type?: string }) {
  if (type === 'btc') return <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20 text-orange-400"><Bitcoin size={20} /></div>;
  if (type === 'arsenal') return <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600/20 text-red-400"><Trophy size={20} /></div>;
  return <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400"><Landmark size={20} /></div>;
}

export function MarketsHome() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [category, setCategory] = useState('All');
  const [markets, setMarkets] = useState<Market[]>(NIGERIAN_MARKETS);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Politics');
  const [pendingBet, setPendingBet] = useState<{ market: Market; side: 'YES' | 'NO' } | null>(null);
  const [betAmount, setBetAmount] = useState(0.1);
  const [placing, setPlacing] = useState(false);

  const filtered = useMemo(
    () => (category === 'All' ? markets : markets.filter((m) => m.category === category)),
    [markets, category]
  );

  function openBet(market: Market, side: 'YES' | 'NO') {
    if (!authenticated) {
      login();
      return;
    }
    setPendingBet({ market, side });
    setBetAmount(0.1);
  }

  async function confirmBet() {
    if (!pendingBet || betAmount <= 0) return;
    setPlacing(true);
    const { market, side } = pendingBet;
    const amount = betAmount;
    let txSig: string | undefined;
    try {
      const solWallet = wallets.find((w) => w.address) || wallets[0];
      if (solWallet && signAndSendTransaction) {
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        const from = new PublicKey(solWallet.address);
        const lamports = Math.max(1000, Math.floor(amount * LAMPORTS_PER_SOL * 0.001));
        const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: from, toPubkey: from, lamports }));
        tx.feePayer = from;
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        const serialized = tx.serialize({ requireAllSignatures: false });
        const result = await signAndSendTransaction({ transaction: serialized, wallet: solWallet, chain: 'solana:devnet' });
        txSig = Buffer.from(result.signature).toString('base64').slice(0, 12) + '...';
      }
    } catch (err) {
      console.warn('Solana tx failed:', err);
    }
    setMarkets((prev) => prev.map((m) => {
      if (m.id !== market.id) return m;
      const delta = amount * 1000;
      return side === 'YES'
        ? { ...m, yesShares: m.yesShares + delta, volume: m.volume + amount, liquidity: m.liquidity + amount * 0.5 }
        : { ...m, noShares: m.noShares + delta, volume: m.volume + amount, liquidity: m.liquidity + amount * 0.5 };
    }));
    const oddsObj = calcOdds(market.yesShares, market.noShares);
    savePosition({
      id: `p-${Date.now()}`,
      marketId: market.id,
      title: market.title,
      side,
      amount,
      odds: side === 'YES' ? parseFloat(oddsObj.yes) : parseFloat(oddsObj.no),
      status: 'open',
      placedAt: new Date().toLocaleDateString(),
      txSig,
    });
    setPendingBet(null);
    setPlacing(false);
    alert(`Bet placed: ${amount} SOL on ${side}.${txSig ? ` Tx: ${txSig}` : ''}`);
  }

  function handleCreate() {
    if (!newTitle.trim() || !authenticated) {
      if (!authenticated) login();
      return;
    }
    setMarkets((prev) => [{
      id: `m-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      yesShares: 5000,
      noShares: 5000,
      liquidity: 10,
      volume: 0,
      endsAt: '7d',
      creator: 'You',
    }, ...prev]);
    setNewTitle('');
    setShowCreate(false);
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-800/40 bg-gradient-to-br from-emerald-950 via-[#071210] to-black p-6 lg:p-8">
        <div className="relative z-10 max-w-lg">
          <h1 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">Predict. Trade. <span className="text-emerald-400">Win.</span></h1>
          <p className="mt-2 text-sm text-slate-300">The ultimate prediction market on Solana — Nigerian politics, crypto & more.</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400">Start Predicting →</button>
        </div>
        <div className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-8xl opacity-20 lg:block">🏆</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Flame size={18} className="text-orange-400" /> Trending Markets</h2>
            <button onClick={() => setCategory('All')} className="text-xs text-emerald-400 hover:underline">View All →</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.slice(0, 6).map((m) => {
              const { yes, no, yesPct } = calcOdds(m.yesShares, m.noShares);
              return (
                <div key={m.id} className="rounded-2xl border border-emerald-900/40 bg-[#0A1512] p-4 transition hover:border-emerald-500/50">
                  <div className="flex items-start gap-3">
                    <MarketIcon type={m.icon} />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-emerald-400">{m.category}</span>
                        {m.volume > 100000 && <span className="text-[9px] text-orange-400">🔥</span>}
                      </div>
                      <h3 className="mt-1 text-sm font-semibold leading-snug text-white">{m.title}</h3>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-semibold">{yesPct}% Yes</span>
                    <span className="text-slate-500">₦{(m.volume / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <button onClick={() => openBet(m, 'YES')} className="rounded-lg bg-emerald-500/15 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25">Yes {yes}</button>
                    <button onClick={() => openBet(m, 'NO')} className="rounded-lg bg-red-500/15 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25">No {no}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-900/40 bg-[#0A1512] p-4">
          <h3 className="mb-3 flex items-center gap-1 text-sm font-semibold">Top Movers <TrendingUp size={14} className="text-emerald-400" /></h3>
          <div className="space-y-3">
            {TOP_MOVERS.map((m) => (
              <div key={m.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><MarketIcon type={m.icon} /><span>{m.name}</span></div>
                <div className="text-right">
                  <div className="font-medium">{m.pct}%</div>
                  <div className={m.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}>{m.change}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {['All', 'Politics', 'Crypto', 'Sports'].map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={`rounded-full px-3 py-1 text-xs font-medium ${category === c ? 'bg-emerald-500 text-black' : 'bg-emerald-950/50 text-slate-300 hover:bg-emerald-900/50'}`}>{c}</button>
        ))}
        <button onClick={() => setShowCreate(true)} className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-black"><Plus size={12} /> Create</button>
      </div>

      {pendingBet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-emerald-800 bg-[#071210] p-5">
            <h3 className="text-lg font-semibold">Place {pendingBet.side} bet</h3>
            <p className="mt-1 text-xs text-slate-400 line-clamp-2">{pendingBet.market.title}</p>
            <div className="mt-4">
              <label className="text-xs text-slate-400">Amount (SOL)</label>
              <input type="number" step="0.01" min="0.01" value={betAmount} onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)} className="mt-1 w-full rounded-xl border border-emerald-800 bg-black/40 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" autoFocus />
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setPendingBet(null)} disabled={placing} className="flex-1 rounded-xl border border-emerald-800 py-2.5 text-sm">Cancel</button>
              <button onClick={confirmBet} disabled={placing || betAmount <= 0} className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black disabled:opacity-50">{placing ? 'Placing…' : `Confirm ${betAmount} SOL`}</button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-emerald-800 bg-[#071210] p-5">
            <h3 className="text-lg font-semibold">Create Event</h3>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Will Peter Obi shake Tinubu in public?" className="mt-3 w-full rounded-xl border border-emerald-800 bg-black/40 px-3 py-2.5 text-sm" />
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="mt-2 w-full rounded-xl border border-emerald-800 bg-black/40 px-3 py-2.5 text-sm">
              <option>Politics</option><option>Crypto</option><option>Sports</option><option>Custom</option>
            </select>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-emerald-800 py-2.5 text-sm">Cancel</button>
              <button onClick={handleCreate} className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-black">Mint & Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
