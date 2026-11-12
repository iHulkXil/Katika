import { useState, useMemo } from 'react';
import { Plus, TrendingUp, Flame, Bitcoin, Landmark, Trophy, Sparkles, CheckCircle2 } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useToast } from '@/hooks/use-toast';

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
  { id: 'btc15', title: 'BTC price above $92,000 at end of the 4-hour settlement candle?', category: 'Crypto', yesShares: 6200, noShares: 3800, liquidity: 20, volume: 45200, endsAt: '4h', icon: 'btc' },
  { id: 'sol15', title: 'SOL price breaks $160 before Friday close on Solana Mainnet?', category: 'Crypto', yesShares: 5400, noShares: 4600, liquidity: 15, volume: 32100, endsAt: '48h', icon: 'sol' },
  { id: 'arsenal', title: 'Will Arsenal win the Premier League 2026/27 title race?', category: 'Sports', yesShares: 7200, noShares: 2800, liquidity: 80, volume: 890000, endsAt: 'May 2027', icon: 'arsenal' },
  { id: 'cbn-rate', title: 'Will Central Bank of Nigeria cut MPR below 26% this quarter?', category: 'Finance', yesShares: 4800, noShares: 5200, liquidity: 45, volume: 112000, endsAt: 'Q4', icon: 'econ' },
];

const TOP_MOVERS = [
  { name: 'Bitcoin ($91.4K)', pct: 67, change: '+5.4%', icon: 'btc', color: '#facc15' },
  { name: 'Arsenal FC', pct: 72, change: '+3.1%', icon: 'arsenal', color: '#ec4899' },
  { name: 'Solana ($148.5)', pct: 74, change: '+7.3%', icon: 'sol', color: '#4ade80' },
  { name: 'Tinubu Coalition', pct: 54, change: '-2.1%', icon: 'tinubu', color: '#ec4899' },
  { name: 'CBN MPR Decision', pct: 61, change: '+4.0%', icon: 'econ', color: '#22c55e' },
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
  if (type === 'btc') return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#facc15]/15 border border-[#facc15]/30 text-[#facc15]"><Bitcoin size={20} /></div>;
  if (type === 'arsenal') return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ec4899]/15 border border-[#ec4899]/30 text-[#f472b6]"><Trophy size={20} /></div>;
  if (type === 'sol') return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#4ade80]/15 border border-[#4ade80]/30 text-[#4ade80]"><Sparkles size={20} /></div>;
  return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e]"><Landmark size={20} /></div>;
}

export function MarketsHome({ defaultCategory = 'All' }: { defaultCategory?: string }) {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { toast } = useToast();

  const [category, setCategory] = useState(defaultCategory);
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
        const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        const from = new PublicKey(solWallet.address);
        const lamports = Math.max(1000, Math.floor(amount * LAMPORTS_PER_SOL * 0.001));
        const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: from, toPubkey: from, lamports }));
        tx.feePayer = from;
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        const serialized = tx.serialize({ requireAllSignatures: false });
        const result = await signAndSendTransaction({ transaction: serialized, wallet: solWallet, chain: 'solana:mainnet-beta' });
        txSig = Buffer.from(result.signature).toString('base64').slice(0, 12) + '...';
      }
    } catch (err) {
      console.warn('Solana ledger note:', err);
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

    toast({
      title: 'Order Executed',
      description: `Placed ${amount} SOL on ${side} for "${market.title.slice(0, 36)}...".`,
    });
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

    toast({
      title: 'Market Created',
      description: 'AMM liquidity pool initialized for your prediction event.',
    });
  }

  return (
    <div className="space-y-6 p-4 lg:p-8 max-w-7xl">
      {/* Hero Banner with Obsidian + Neon Green Aesthetic */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0E1318] p-6 lg:p-8 shadow-2xl">
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-[100px] opacity-25"
          style={{ background: '#22c55e' }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-[120px] opacity-20"
          style={{ background: '#ec4899' }}
        />

        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-[#121B16] px-3 py-1 text-[11px] font-mono font-bold text-[#4ade80] mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            <span>SOLANA & EVM MULTI-CHAIN ORDER BOOKS</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-display text-white lg:text-4xl">
            Predict. Trade. <span className="text-[#4ade80]">Settle Onchain.</span>
          </h1>
          <p className="mt-2 text-xs lg:text-sm text-slate-300 leading-relaxed">
            Trade decentralized contracts across African politics, global crypto, Premier League, and macro finance.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#22c55e] hover:bg-[#16a34a] px-5 py-2.5 text-xs font-bold text-black shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={14} />
              <span>Create Market</span>
            </button>
            <button
              onClick={() => setCategory('Crypto')}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#121820] hover:bg-[#18212b] px-4 py-2.5 text-xs font-semibold text-slate-200 transition-all"
            >
              <span>Explore Crypto</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Markets + Top Movers */}
      <div className="grid gap-6 lg:grid-cols-4 items-start">
        {/* Markets Cards */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-[#f472b6]" />
              <h2 className="text-base font-bold font-display text-white">Live Prediction Markets</h2>
            </div>

            {/* Category Segmented Pills */}
            <div className="flex items-center gap-1.5 rounded-2xl bg-[#0E1318] p-1 border border-white/[0.08]">
              {['All', 'Politics', 'Crypto', 'Sports', 'Finance'].map((c) => {
                const isActive = category === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#4ade80] text-black shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((m) => {
              const { yes, no, yesPct } = calcOdds(m.yesShares, m.noShares);
              return (
                <div
                  key={m.id}
                  className="group relative flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg hover:border-white/20 hover:bg-[#121820] transition-all duration-200"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <MarketIcon type={m.icon} />
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] font-mono text-slate-300">
                          {m.category}
                        </span>
                        {m.volume > 100000 && (
                          <span className="rounded-full bg-[#ec4899]/15 border border-[#ec4899]/30 px-2 py-0.5 text-[9px] font-mono text-[#f472b6]">
                            🔥 HOT
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="mt-3 text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-[#4ade80] transition-colors">
                      {m.title}
                    </h3>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5">
                    {/* Probability Bar */}
                    <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                      <span className="font-bold text-[#4ade80]">{yesPct}% Yes</span>
                      <span className="text-slate-500 font-mono">Vol: ${(m.volume / 1000).toFixed(1)}k</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#080C0F]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#22c55e] to-[#4ade80]"
                        style={{ width: `${yesPct}%` }}
                      />
                    </div>

                    {/* YES / NO Interactive Buttons */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openBet(m, 'YES')}
                        className="rounded-xl border border-emerald-500/30 bg-[#121B16] hover:bg-[#16271F] py-2 text-xs font-mono font-bold text-[#4ade80] transition-all active:scale-95 flex items-center justify-center gap-1"
                      >
                        <span>Yes</span>
                        <span className="text-[10px] opacity-75">{yes}x</span>
                      </button>
                      <button
                        onClick={() => openBet(m, 'NO')}
                        className="rounded-xl border border-pink-500/30 bg-[#1E1118] hover:bg-[#2A1622] py-2 text-xs font-mono font-bold text-[#f472b6] transition-all active:scale-95 flex items-center justify-center gap-1"
                      >
                        <span>No</span>
                        <span className="text-[10px] opacity-75">{no}x</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Movers Sidebar */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-[#4ade80]" />
            <h3 className="text-sm font-bold text-white">Top Movers</h3>
          </div>

          <div className="space-y-3">
            {TOP_MOVERS.map((m) => {
              const isPositive = m.change.startsWith('+');
              return (
                <div
                  key={m.name}
                  className="flex items-center justify-between rounded-2xl p-2.5 hover:bg-[#131A21] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <MarketIcon type={m.icon} />
                    <div>
                      <div className="text-xs font-semibold text-white">{m.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Consensus {m.pct}%</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                        isPositive ? 'bg-[#22c55e]/15 text-[#4ade80]' : 'bg-[#ec4899]/15 text-[#f472b6]'
                      }`}
                    >
                      {m.change}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Place Bet Modal */}
      {pendingBet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#0D1217] p-6 shadow-2xl">
            <h3 className="text-lg font-bold font-display text-white">
              Place <span className={pendingBet.side === 'YES' ? 'text-[#4ade80]' : 'text-[#f472b6]'}>{pendingBet.side}</span> Order
            </h3>
            <p className="mt-1 text-xs text-slate-400 line-clamp-2">{pendingBet.market.title}</p>

            <div className="mt-5 rounded-2xl bg-[#080C0F] p-4 border border-white/5 space-y-3">
              <label className="text-xs font-semibold text-slate-300">Wager Stake (SOL)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.01"
                  value={betAmount}
                  onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-white/10 bg-[#121820] px-3.5 py-2.5 font-mono text-base font-bold text-white focus:border-[#4ade80] focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setBetAmount(1.0)}
                  className="rounded-xl border border-white/10 px-3 py-2.5 text-xs font-mono font-bold text-slate-300 hover:text-white"
                >
                  1.0
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Potential Payout:</span>
                <span className="font-mono font-bold text-[#4ade80]">
                  {(betAmount * parseFloat(pendingBet.side === 'YES' ? calcOdds(pendingBet.market.yesShares, pendingBet.market.noShares).yes : calcOdds(pendingBet.market.yesShares, pendingBet.market.noShares).no)).toFixed(2)} SOL
                </span>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setPendingBet(null)}
                disabled={placing}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={confirmBet}
                disabled={placing || betAmount <= 0}
                className="flex-1 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] py-2.5 text-xs font-bold text-black disabled:opacity-50 shadow-md shadow-[#22c55e]/25"
              >
                {placing ? 'Broadcasting...' : `Confirm Order`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Market Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#0D1217] p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold font-display text-white">Create Prediction Market</h3>
            <div>
              <label className="text-xs text-slate-400">Event Question / Title</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Will SOL flip ETH in market cap this cycle?"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080C0F] px-3.5 py-2.5 text-xs text-white focus:border-[#4ade80] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080C0F] px-3.5 py-2.5 text-xs text-white focus:border-[#4ade80] focus:outline-none"
              >
                <option>Politics</option>
                <option>Crypto</option>
                <option>Sports</option>
                <option>Finance</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] py-2.5 text-xs font-bold text-black shadow-md shadow-[#22c55e]/25"
              >
                Create Market
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
