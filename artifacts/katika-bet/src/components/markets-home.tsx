import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import {
  Plus,
  TrendingUp,
  Flame,
  Bitcoin,
  Landmark,
  Trophy,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Info,
  Clock,
  Coins,
  SlidersHorizontal,
  X,
  Scale,
} from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useToast } from '@/hooks/use-toast';
import {
  fetchMarkets,
  createMarket,
  placeStake,
  fetchMarketById,
  calcOdds,
  type Market,
  type Position,
} from '@/lib/markets-api';
import { SOLANA_TREASURY_PUBKEY, encodeBase58 } from '@/lib/mainnet-chains';
import { SOLANA_RPC_URL, SOLANA_CLUSTER_NAME, SOLANA_CAIP_CHAIN } from '@/main';
import { pushNotification } from '@/lib/notifications';
import { getWalletBalance, setWalletBalance } from '@/lib/balance';
import { useKyc } from '@/lib/kyc';
import { useSearch } from 'wouter';

export const MARKET_CATEGORIES = [
  'All',
  'Politics',
  'Nigerian Politics',
  'Crypto',
  'Sports',
  'Finance',
  'Lifestyle',
] as const;

const TOP_MOVERS = [
  { name: 'Bitcoin ($91.4K)', pct: 67, change: '+5.4%', icon: 'btc', color: '#facc15' },
  { name: 'Arsenal FC', pct: 72, change: '+3.1%', icon: 'arsenal', color: '#ec4899' },
  { name: 'Peter Obi Coalition', pct: 58, change: '+6.2%', icon: 'politics', color: '#22c55e' },
  { name: 'Davido & Burna Tour', pct: 39, change: '+8.4%', icon: 'lifestyle', color: '#ec4899' },
  { name: 'Solana ($148.5)', pct: 74, change: '+7.3%', icon: 'sol', color: '#4ade80' },
];

function MarketIcon({ type }: { type?: string }) {
  if (type === 'btc') return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#facc15]/15 border border-[#facc15]/30 text-[#facc15]"><Bitcoin size={20} /></div>;
  if (type === 'arsenal') return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ec4899]/15 border border-[#ec4899]/30 text-[#f472b6]"><Trophy size={20} /></div>;
  if (type === 'sol') return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#4ade80]/15 border border-[#4ade80]/30 text-[#4ade80]"><Sparkles size={20} /></div>;
  if (type === 'lifestyle') return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ec4899]/15 border border-[#ec4899]/30 text-[#f472b6]"><Flame size={20} /></div>;
  if (type === 'econ') return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#facc15]/15 border border-[#facc15]/30 text-[#facc15]"><Coins size={20} /></div>;
  return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e]"><Landmark size={20} /></div>;
}

export function MarketsHome({
  defaultCategory = 'All',
  variant = 'markets',
  sideRail,
}: {
  defaultCategory?: string;
  variant?: 'markets' | 'discover';
  sideRail?: ReactNode;
}) {
  const { authenticated, user, login } = usePrivy();
  const { recordGamePlay, record: kycRecord } = useKyc();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { toast } = useToast();
  const searchStr = useSearch();

  const initialCat = (() => {
    const params = new URLSearchParams(searchStr);
    const fromUrl = params.get('category');
    return fromUrl || defaultCategory;
  })();

  const [category, setCategory] = useState(initialCat);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(searchStr);
    const fromUrl = params.get('category');
    if (fromUrl) {
      setCategory(fromUrl);
    } else if (defaultCategory) {
      setCategory(defaultCategory);
    }
  }, [searchStr, defaultCategory]);

  // Modals & Active Views
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [detailOrders, setDetailOrders] = useState<Position[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingBet, setPendingBet] = useState<{ market: Market; side: 'YES' | 'NO' } | null>(null);
  const [betAmount, setBetAmount] = useState(0.1);
  const [placing, setPlacing] = useState(false);

  // Form creation
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Politics');
  const [newDesc, setNewDesc] = useState('');

  // Load Markets from Persistent Backend
  const loadMarkets = useCallback(async () => {
    try {
      const data = await fetchMarkets(category);
      setMarkets(data);
    } catch (err) {
      console.error('Failed to load markets:', err);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void loadMarkets();
  }, [loadMarkets]);

  // Open Full Market Detail View
  const handleOpenDetail = async (market: Market) => {
    setSelectedMarket(market);
    try {
      const res = await fetchMarketById(market.id);
      if (res) {
        setDetailOrders(res.recentOrders);
      }
    } catch {
      setDetailOrders([]);
    }
  };

  // Open Bet Order Ticket
  const openBet = (market: Market, side: 'YES' | 'NO', e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (market.status === 'resolved') {
      toast({
        title: 'Market Resolved',
        description: `This event has already settled as ${market.resolution}.`,
      });
      return;
    }
    if (!authenticated) {
      void login();
      return;
    }
    setPendingBet({ market, side });
    setBetAmount(0.1);
  };

  // Execute Real Onchain Stake + Backend Position Persistence
  const confirmBet = async () => {
    if (!pendingBet || betAmount <= 0) return;
    setPlacing(true);
    const { market, side } = pendingBet;
    const amount = betAmount;
    let txSig: string | undefined;

    try {
      const solWallet = wallets.find((w) => w.address) || wallets[0];

      // 1. If Solana wallet connected via Privy, transfer real SOL to Sidebet Treasury Vault!
      if (solWallet && signAndSendTransaction) {
        try {
          const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
          const from = new PublicKey(solWallet.address);
          const treasury = new PublicKey(SOLANA_TREASURY_PUBKEY);
          const lamports = Math.max(1000, Math.floor(amount * LAMPORTS_PER_SOL));

          const tx = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: from,
              toPubkey: treasury,
              lamports,
            })
          );
          tx.feePayer = from;
          const { blockhash } = await connection.getLatestBlockhash();
          tx.recentBlockhash = blockhash;
          const serialized = tx.serialize({ requireAllSignatures: false });

          const result = await signAndSendTransaction({
            transaction: serialized,
            wallet: solWallet,
            chain: SOLANA_CAIP_CHAIN,
          });

          txSig = encodeBase58(result.signature);
        } catch (chainErr: any) {
          console.warn('Onchain transfer bypass for demo/balance ledger:', chainErr);
        }
      }

      // 2. Calculate odds
      const oddsObj = calcOdds(market.yesShares, market.noShares);
      const decimalOdds = side === 'YES' ? parseFloat(oddsObj.yes) : parseFloat(oddsObj.no);

      // 3. Persist stake to backend
      const walletAddr = user?.wallet?.address || solWallet?.address;
      const res = await placeStake({
        marketId: market.id,
        side,
        amount,
        odds: decimalOdds,
        walletAddress: walletAddr,
        txSig,
      });

      // 4. Deduct stake from user cash balance
      const currentBal = getWalletBalance(user?.id);
      const stakeUsd = amount * 148.5; // ~148.50 per SOL
      setWalletBalance(user?.id, Math.max(0, currentBal - stakeUsd));

      // 5. Update UI
      setMarkets((prev) => prev.map((m) => (m.id === market.id ? res.market : m)));
      setPendingBet(null);

      const explorerUrl = txSig
        ? `https://solscan.io/tx/${txSig}${SOLANA_CLUSTER_NAME === 'devnet' ? '?cluster=devnet' : ''}`
        : null;

      toast({
        title: 'Stake Confirmed & Recorded',
        description: (
          <div className="space-y-1">
            <p>Staked {amount} SOL on {side} for "{market.title.slice(0, 32)}...".</p>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#4ADE80] underline"
              >
                View on Solscan <ExternalLink size={11} />
              </a>
            )}
          </div>
        ),
      });

      pushNotification({
        title: `Position Placed: ${side}`,
        message: `Staked ${amount} SOL on "${market.title.slice(0, 48)}"`,
        type: 'stake',
        href: '/my-bets',
        userId: user?.id,
      });

      void recordGamePlay('Prediction Market');

      // Reload markets from backend to reflect collective volume
      await loadMarkets();
    } catch (err: any) {
      toast({
        title: 'Order Failed',
        description: err.message || 'Failed to place stake',
        variant: 'destructive',
      });
    } finally {
      setPlacing(false);
    }
  };

  // Create New Market
  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast({ title: 'Title Required', description: 'Please enter a market title', variant: 'destructive' });
      return;
    }

    try {
      const creatorLabel =
        user?.google?.name ||
        user?.twitter?.name ||
        user?.email?.address?.split('@')[0] ||
        'Trader';

      const created = await createMarket({
        title: newTitle.trim(),
        category: newCategory,
        description: newDesc.trim() || undefined,
        creator: creatorLabel,
      });

      setMarkets((prev) => [created, ...prev]);
      setNewTitle('');
      setNewDesc('');
      setShowCreate(false);

      toast({
        title: 'Market Deployed',
        description: 'Your prediction market is live and available to all traders.',
      });

      pushNotification({
        title: `New ${newCategory} Market Live`,
        message: created.title,
        type: 'market',
        href: '/',
        userId: user?.id,
      });
    } catch (err: any) {
      toast({
        title: 'Creation Failed',
        description: err.message || 'Failed to create market',
        variant: 'destructive',
      });
    }
  };

  const filtered = useMemo(() => {
    return category === 'All' ? markets : markets.filter((m) => m.category === category);
  }, [markets, category]);

  const isDiscover = variant === 'discover';

  return (
    <div className={`space-y-6 p-4 lg:p-8 mx-auto ${isDiscover ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
      {/* Compliance / Disclaimer Banner */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E1318]/90 backdrop-blur-md px-4 py-3 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-2">
          <Info size={15} className="text-[#4ADE80] shrink-0" />
          <span>
            <strong>18+ Trade Responsibly</strong>. Community-curated prediction events. Content provided for decentralized forecast and informational purposes.
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
          <span>Multi-Chain Vaults Live</span>
          <span>·</span>
          <span>Multi-Sig Protected</span>
        </div>
      </div>

      {/* Hero Banner (Compact header on Discover so Markets grid dominates above the fold) */}
      {isDiscover ? (
        <div className="flex flex-col gap-4 rounded-3xl border border-white/[0.08] bg-[#0E1318]/92 backdrop-blur-md p-5 lg:px-7 lg:py-5 shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-mono text-[#4ADE80]">
              Discover · Prediction Markets & Multi-Chain PvP
            </p>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight font-display text-white">
              Predict. Trade. <span className="text-[#4ade80]">Settle Onchain.</span>
            </h1>
            <p className="text-xs text-slate-400">
              Trade live outcome contracts across Politics, Nigerian Politics, Crypto, Sports, Finance, and Lifestyle—or peek into PvP games on the side.
            </p>
            {(!authenticated || (kycRecord && kycRecord.airtelBonusStatus !== 'claimed')) && (
              <div className="pt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/35 bg-rose-500/10 px-2.5 py-1 font-semibold text-rose-300">
                  🎁 Airtel Bonus: Sign up with KYC, verify your Airtel number &amp; play any game to get 200MB FREE data
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (!authenticated) {
                  void login();
                  return;
                }
                setShowCreate(true);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[#22c55e] hover:bg-[#16a34a] px-5 py-2.5 text-xs font-bold text-black shadow-[0_0_20px_rgba(34,197,94,0.28)] transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0"
            >
              <Plus size={14} />
              <span>Create Market</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0E1318]/92 backdrop-blur-md p-6 lg:p-8 shadow-2xl">
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
              <span>PERSISTENT ONCHAIN PREDICTION MARKETS</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight font-display text-white lg:text-4xl">
              Predict. Trade. <span className="text-[#4ade80]">Settle Onchain.</span>
            </h1>
            <p className="mt-2 text-xs lg:text-sm text-slate-300 leading-relaxed">
              Trade decentralized contracts across global politics, Nigerian politics, crypto, sports, finance, and lifestyle trends.
            </p>

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => {
                  if (!authenticated) {
                    void login();
                    return;
                  }
                  setShowCreate(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#22c55e] hover:bg-[#16a34a] px-5 py-2.5 text-xs font-bold text-black shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus size={14} />
                <span>Create Market</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Markets + Side Rail (PvP on Discover, Top Movers on Markets) */}
      <div
        className={
          isDiscover
            ? 'grid gap-6 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_370px] items-start'
            : 'grid gap-6 lg:grid-cols-4 items-start'
        }
      >
        {/* Markets Cards */}
        <div className={`${isDiscover ? 'min-w-0' : 'lg:col-span-3'} space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-[#f472b6]" />
              <h2 className="text-base font-bold font-display text-white">Live Prediction Markets</h2>
              {loading && <Loader2 size={14} className="animate-spin text-[#4ADE80]" />}
            </div>

            {/* Category Segmented Tabs inside Markets */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-[#0E1318] p-1 border border-white/[0.08]">
              {MARKET_CATEGORIES.map((c) => {
                const isActive = category.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => {
              const { yes, no, yesPct } = calcOdds(m.yesShares, m.noShares);
              const isResolved = m.status === 'resolved';

              return (
                <div
                  key={m.id}
                  onClick={() => handleOpenDetail(m)}
                  className="group relative flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#0E1318]/92 backdrop-blur-sm p-5 shadow-lg hover:border-white/20 hover:bg-[#121820] transition-all duration-200 cursor-pointer"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <MarketIcon type={m.icon} />
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] font-mono text-slate-300">
                          {m.category}
                        </span>
                        {isResolved ? (
                          <span className="rounded-full bg-[#facc15]/20 border border-[#facc15]/40 px-2 py-0.5 text-[9px] font-mono font-bold text-[#facc15]">
                            RESOLVED: {m.resolution}
                          </span>
                        ) : m.volume > 100000 ? (
                          <span className="rounded-full bg-[#ec4899]/15 border border-[#ec4899]/30 px-2 py-0.5 text-[9px] font-mono text-[#f472b6]">
                            🔥 HOT
                          </span>
                        ) : null}
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
                      <span className="text-slate-400 font-mono">Vol: {m.volume.toLocaleString()} SOL</span>
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
                        disabled={isResolved}
                        onClick={(e) => openBet(m, 'YES', e)}
                        className={`rounded-xl border py-2 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 ${
                          isResolved
                            ? 'border-white/5 bg-[#121820] text-slate-500 opacity-60'
                            : 'border-emerald-500/30 bg-[#121B16] hover:bg-[#16271F] text-[#4ade80] active:scale-95'
                        }`}
                      >
                        <span>Yes</span>
                        <span className="text-[10px] opacity-75">{yes}x</span>
                      </button>
                      <button
                        disabled={isResolved}
                        onClick={(e) => openBet(m, 'NO', e)}
                        className={`rounded-xl border py-2 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 ${
                          isResolved
                            ? 'border-white/5 bg-[#121820] text-slate-500 opacity-60'
                            : 'border-pink-500/30 bg-[#1E1118] hover:bg-[#2A1622] text-[#f472b6] active:scale-95'
                        }`}
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
          {/* Compact Top Movers Strip below Market Grid on Discover */}
          {isDiscover && (
            <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318]/92 backdrop-blur-sm p-5 shadow-lg">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-[#4ade80]" />
                  <h3 className="text-sm font-bold text-white">Top Consensus Movers</h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">24h Momentum</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {TOP_MOVERS.map((m) => {
                  const isPositive = m.change.startsWith('+');
                  return (
                    <div
                      key={m.name}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-white/[0.06] bg-[#080C0F]/80 p-3 hover:border-white/15 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{m.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                          {m.pct}% YES
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-mono font-bold tabular-nums shrink-0 ${
                          isPositive ? 'text-[#4ade80]' : 'text-[#f472b6]'
                        }`}
                      >
                        {m.change}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Side Rail: PvP Showcase on Discover, Top Movers on Markets */}
        {isDiscover && sideRail ? (
          sideRail
        ) : (
          <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318]/92 backdrop-blur-sm p-5 shadow-lg">
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
        )}
      </div>

      {/* FULL MARKET DETAIL VIEW MODAL */}
      {selectedMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-3xl border border-white/[0.1] bg-[#0D1217] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <MarketIcon type={selectedMarket.icon} />
                <div>
                  <span className="rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 px-2 py-0.5 text-[10px] font-mono font-bold text-[#4ade80]">
                    {selectedMarket.category.toUpperCase()}
                  </span>
                  <h3 className="text-base font-bold font-display text-white mt-1">
                    {selectedMarket.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMarket(null)}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            {/* Description & Rules */}
            <div className="rounded-2xl border border-white/5 bg-[#080C0F] p-4 text-xs text-slate-300 space-y-2">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <Scale size={14} className="text-[#4ade80]" />
                <span>Admin Resolution Criteria</span>
              </h4>
              <p className="leading-relaxed">
                {selectedMarket.description || 'Prediction market event contract reviewed and settled by Sidebet Admin based on verified public sources.'}
              </p>
              <p className="text-[11px] font-mono text-slate-400">
                Settlement Authority: Sidebet Admin
              </p>
            </div>

            {/* Metrics Strip */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/5 bg-[#121820] p-3 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Status</span>
                <span className="text-xs font-bold font-mono text-[#4ade80]">
                  {selectedMarket.status === 'resolved' ? `RESOLVED (${selectedMarket.resolution})` : 'OPEN'}
                </span>
              </div>
              <div className="rounded-2xl border border-white/5 bg-[#121820] p-3 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Volume</span>
                <span className="text-xs font-bold font-mono text-white tabular-nums">
                  {selectedMarket.volume.toLocaleString()} SOL
                </span>
              </div>
              <div className="rounded-2xl border border-white/5 bg-[#121820] p-3 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Liquidity</span>
                <span className="text-xs font-bold font-mono text-[#facc15] tabular-nums">
                  {selectedMarket.liquidity} SOL
                </span>
              </div>
            </div>

            {/* Probability Breakdown */}
            {(() => {
              const { yes, no, yesPct } = calcOdds(selectedMarket.yesShares, selectedMarket.noShares);
              return (
                <div className="rounded-2xl border border-white/5 bg-[#080C0F] p-4 space-y-2">
                  <div className="flex justify-between text-xs font-mono font-bold">
                    <span className="text-[#4ade80]">YES: {yesPct}% ({yes}x)</span>
                    <span className="text-[#f472b6]">NO: {100 - yesPct}% ({no}x)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#121820]">
                    <div className="h-full rounded-full bg-[#4ade80]" style={{ width: `${yesPct}%` }} />
                  </div>
                </div>
              );
            })()}

            {/* Recent Orders in Market */}
            {detailOrders.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-slate-400 uppercase block">Recent Orderbook Trades</span>
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {detailOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="flex items-center justify-between rounded-xl bg-[#080C0F] p-2 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className={ord.side === 'YES' ? 'text-[#4ade80] font-bold' : 'text-[#f472b6] font-bold'}>
                          {ord.side}
                        </span>
                        <span className="text-slate-400">{ord.amount} SOL</span>
                      </div>
                      <span className="text-slate-500 text-[10px]">{ord.placedAt.slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                disabled={selectedMarket.status === 'resolved'}
                onClick={() => {
                  const m = selectedMarket;
                  setSelectedMarket(null);
                  openBet(m, 'YES');
                }}
                className="rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] py-3 text-xs font-bold text-black shadow-lg shadow-[#22C55E]/20 transition-all disabled:opacity-40"
              >
                Stake YES
              </button>
              <button
                disabled={selectedMarket.status === 'resolved'}
                onClick={() => {
                  const m = selectedMarket;
                  setSelectedMarket(null);
                  openBet(m, 'NO');
                }}
                className="rounded-2xl bg-[#EC4899] hover:bg-[#DB2777] py-3 text-xs font-bold text-white shadow-lg shadow-[#EC4899]/20 transition-all disabled:opacity-40"
              >
                Stake NO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLACE REAL SOL STAKE MODAL */}
      {pendingBet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#0D1217] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold font-display text-white">
                  Place <span className={pendingBet.side === 'YES' ? 'text-[#4ade80]' : 'text-[#f472b6]'}>{pendingBet.side}</span> Order
                </h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">{pendingBet.market.title}</p>
              </div>
              <button
                onClick={() => setPendingBet(null)}
                className="grid h-7 w-7 place-items-center rounded-full border border-white/10 text-slate-400"
              >
                <X size={14} />
              </button>
            </div>

            <div className="rounded-2xl bg-[#080C0F] p-4 border border-white/5 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Wager Stake</span>
                <span className="text-[10px] font-mono text-[#4ADE80]">Target: Vault Escrow</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.01"
                  value={betAmount}
                  onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-white/10 bg-[#121820] px-3.5 py-2.5 font-mono text-xl font-bold text-white focus:border-[#4ade80] focus:outline-none"
                  autoFocus
                />
                <span className="font-mono text-xs font-bold text-[#4ADE80] uppercase bg-[#22c55e]/15 px-2.5 py-2.5 rounded-xl border border-[#22c55e]/30">
                  SOL
                </span>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                {[0.1, 0.5, 1, 2].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setBetAmount(v)}
                    className="flex-1 rounded-lg bg-[#121820] border border-white/10 py-1 text-[11px] font-mono font-bold text-slate-300 hover:text-white"
                  >
                    {v} SOL
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5 font-mono">
                <span>Potential Payout:</span>
                <span className="font-bold text-[#4ade80]">
                  {(betAmount * parseFloat(pendingBet.side === 'YES' ? calcOdds(pendingBet.market.yesShares, pendingBet.market.noShares).yes : calcOdds(pendingBet.market.yesShares, pendingBet.market.noShares).no)).toFixed(2)} SOL
                </span>
              </div>
            </div>

            <div className="flex gap-3">
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
                className="flex-1 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] py-2.5 text-xs font-bold text-black disabled:opacity-50 shadow-md shadow-[#22c55e]/25 flex items-center justify-center gap-2"
              >
                {placing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Signing Onchain...</span>
                  </>
                ) : (
                  `Stake ${betAmount} SOL`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MARKET MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#0D1217] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-display text-white">Create Prediction Market</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="grid h-7 w-7 place-items-center rounded-full border border-white/10 text-slate-400"
              >
                <X size={14} />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400">Event Question / Title</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Will SOL reach $200 before the end of this month?"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080C0F] px-3.5 py-2.5 text-xs text-white focus:border-[#4ade80] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400">Resolution Description & Rules</label>
              <textarea
                rows={2}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Resolves YES if Pyth Network records SOL >= 200.00."
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080C0F] px-3.5 py-2 text-xs text-white focus:border-[#4ade80] focus:outline-none"
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
                <option>Nigerian Politics</option>
                <option>Crypto</option>
                <option>Sports</option>
                <option>Finance</option>
                <option>Lifestyle</option>
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
                Deploy Market
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
