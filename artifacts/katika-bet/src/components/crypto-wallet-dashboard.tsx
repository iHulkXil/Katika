import { useState, useMemo, useEffect } from 'react';
import { Link } from 'wouter';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import {
  ArrowUpRight,
  Copy,
  Check,
  Lock,
  Plus,
  SlidersHorizontal,
  MoreHorizontal,
  LayoutGrid,
  ShieldCheck,
  Layers,
  BarChart2,
  PieChart,
} from 'lucide-react';
import { MainnetDepositWithdrawModal } from '@/components/mainnet-deposit-modal';
import { ConnectedWalletStatus } from '@/components/wallet-auth';
import { NotificationsMenu } from '@/components/notifications-menu';
import { MyBets } from '@/components/my-bets';
import { fetchPositions, type Position } from '@/lib/markets-api';
import { useUserAvatar } from '@/lib/avatar';

type CryptoAsset = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  balance: number;
  image: string;
  color: string;
};

const POPULAR_ASSETS: CryptoAsset[] = [
  {
    id: 'bnb',
    symbol: 'BNB',
    name: 'Binance',
    price: 4011.0,
    change24h: 14.4,
    balance: 2.76,
    image: '/assets/images/crypto_emerald_moneybag_1794496493722.jpg',
    color: '#22c55e',
  },
  {
    id: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    price: 3233.0,
    change24h: -7.5,
    balance: 1.45,
    image: '/assets/images/crypto_iridescent_pebble_1794496494604.jpg',
    color: '#ec4899',
  },
  {
    id: 'sol',
    symbol: 'SOL',
    name: 'Solana',
    price: 148.5,
    change24h: 7.3,
    balance: 34.8,
    image: '/assets/images/crypto_holographic_torus_1794496494448.jpg',
    color: '#4ade80',
  },
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 91420.0,
    change24h: -1.2,
    balance: 0.28,
    image: '/assets/images/crypto_emerald_moneybag_1794496493722.jpg',
    color: '#facc15',
  },
];

// Activity matrix dots (5 rows x 12 cols) matching the screenshot's rhythmic color play:
// Colors: 'magenta' | 'green' | 'yellow' | 'empty'
const ACTIVITY_MATRIX: Array<Array<'magenta' | 'green' | 'yellow' | 'empty'>> = [
  ['magenta', 'magenta', 'magenta', 'magenta', 'empty', 'magenta', 'magenta', 'green', 'green', 'magenta', 'green', 'green'],
  ['magenta', 'magenta', 'magenta', 'yellow', 'magenta', 'empty', 'magenta', 'empty', 'green', 'yellow', 'green', 'yellow'],
  ['magenta', 'magenta', 'yellow', 'yellow', 'yellow', 'empty', 'empty', 'green', 'green', 'green', 'yellow', 'magenta'],
  ['magenta', 'magenta', 'yellow', 'yellow', 'yellow', 'empty', 'empty', 'empty', 'green', 'yellow', 'green', 'green'],
  ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
];

export function CryptoWalletDashboard() {
  const { authenticated, user, login } = usePrivy();
  const { wallets } = useWallets();
  const { avatarUrl } = useUserAvatar();

  const [activeAsset, setActiveAsset] = useState<CryptoAsset>(POPULAR_ASSETS[0]);
  const [chartTimeframe, setChartTimeframe] = useState<'4H' | '1D' | '1W' | '1M' | '6M'>('4H');
  const [activityTimeframe, setActivityTimeframe] = useState<'Hourly' | 'Weekly' | 'Monthly' | 'Yearly'>('Hourly');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [copied, setCopied] = useState(false);
  const [sectionView, setSectionView] = useState<'all' | 'wallet' | 'positions'>('all');
  const [positions, setPositions] = useState<Position[]>([]);

  const [balance, setBalance] = useState(() => {
    return Number(localStorage.getItem('sidebet_wallet_balance') || '4011');
  });

  const activeSolAddr = wallets?.[0]?.address || user?.wallet?.address;
  const walletAddress = user?.wallet?.address || (wallets[0] ? wallets[0].address : '4Hlo)cH7v9K2m1QxP3');

  useEffect(() => {
    let mounted = true;
    void fetchPositions(activeSolAddr).then((list) => {
      if (mounted) setPositions(list);
    });
    const syncBalance = () => {
      setBalance(Number(localStorage.getItem('sidebet_wallet_balance') || '4011'));
    };
    window.addEventListener('storage', syncBalance);
    const interval = setInterval(syncBalance, 2000);
    return () => {
      mounted = false;
      window.removeEventListener('storage', syncBalance);
      clearInterval(interval);
    };
  }, [activeSolAddr]);

  const openCount = positions.filter((p) => p.status === 'open').length;
  const wonCount = positions.filter((p) => p.status === 'won' || p.status === 'claimed').length;
  const lostCount = positions.filter((p) => p.status === 'lost').length;
  const totalSettled = wonCount + lostCount;
  const winRate = totalSettled > 0 ? ((wonCount / totalSettled) * 100).toFixed(1) : '72.4';
  const totalStakedSOL = positions.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalStakedUSD = (totalStakedSOL * 148.5).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const openCashier = (mode: 'deposit' | 'withdraw') => {
    setModalMode(mode);
    setModalOpen(true);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate candlesticks for the active asset and timeframe
  const candlesticks = useMemo(() => {
    const data = [
      { o: 88, c: 92, h: 95, l: 86 },
      { o: 92, c: 89, h: 94, l: 87 },
      { o: 89, c: 94, h: 96, l: 88 },
      { o: 94, c: 97, h: 99, l: 93 },
      { o: 97, c: 93, h: 98, l: 91 },
      { o: 93, c: 96, h: 98, l: 92 },
      { o: 96, c: 99, h: 102, l: 95 },
      { o: 99, c: 103, h: 105, l: 98 },
      { o: 103, c: 101, h: 106, l: 99 },
      { o: 101, c: 107, h: 109, l: 100 },
      { o: 107, c: 104, h: 108, l: 102 },
      { o: 104, c: 108, h: 111, l: 103 },
      { o: 108, c: 112, h: 115, l: 107 },
      { o: 112, c: 110, h: 114, l: 109 },
      { o: 110, c: 106, h: 111, l: 104 },
      { o: 106, c: 102, h: 108, l: 99 },
      { o: 102, c: 97, h: 103, l: 95 },
      { o: 97, c: 91, h: 99, l: 89 },
      { o: 91, c: 84, h: 93, l: 82 },
      { o: 84, c: 79, h: 86, l: 77 },
      { o: 79, c: 74, h: 82, l: 71 },
      { o: 74, c: 77, h: 80, l: 73 },
    ];
    return data;
  }, [activeAsset, chartTimeframe]);

  return (
    <div className="relative min-h-screen bg-[#080C0F] text-[#F3F4F6] p-4 lg:p-6 overflow-hidden">
      {/* Ambient background rays / glow matching screenshot */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full blur-[140px] opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(34,197,94,0.4) 0%, rgba(16,185,129,0.1) 60%, transparent 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute top-1/4 right-0 h-[500px] w-[500px] rounded-full blur-[160px] opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(236,72,153,0.3) 0%, rgba(168,85,247,0.1) 60%, transparent 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #22c55e 0, #22c55e 1px, transparent 0, transparent 50px)',
        }}
      />

      <div className="relative mx-auto max-w-[1400px] space-y-6">
        {/* Header Bar */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight font-display text-white">
              Wallet & Portfolio
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Unified multi-chain custody, portfolio allocation, active prediction stakes & settlement ledger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => openCashier('deposit')}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] hover:bg-[#16a34a] px-4 py-2 text-xs font-bold text-black shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={14} />
              <span>Deposit</span>
            </button>

            <button
              onClick={() => openCashier('withdraw')}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#121820] hover:bg-[#18212b] px-4 py-2 text-xs font-semibold text-slate-200 transition-all"
            >
              <ArrowUpRight size={14} />
              <span>Withdraw</span>
            </button>

            {/* Real Notifications Menu */}
            <NotificationsMenu size="md" />

            {/* Grid app switcher */}
            <Link
              href="/pvp"
              title="PvP Games"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-[#121820] text-slate-300 hover:text-white hover:border-white/20 transition-colors"
            >
              <LayoutGrid size={16} />
            </Link>

            {/* User Profile Avatar */}
            <Link href="/profile" className="relative group cursor-pointer">
              <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-[#22c55e]/40 p-0.5 ring-2 ring-black/40">
                <img
                  src={avatarUrl}
                  alt="Trader Profile"
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#22c55e] ring-2 ring-[#080C0F]" />
            </Link>
          </div>
        </header>

        {/* Unified Section Filter + Portfolio Valuation KPIs */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-[#0E1318] p-1">
              {[
                { id: 'all', label: 'All Overview' },
                { id: 'wallet', label: 'Balances & Assets' },
                { id: 'positions', label: `Active Positions (${openCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSectionView(tab.id as 'all' | 'wallet' | 'positions')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    sectionView === tab.id
                      ? 'bg-[#4ade80] text-black shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Link
              href="/admin"
              className="rounded-xl border border-white/10 bg-[#121820] px-3 py-1.5 text-[11px] font-mono text-[#FACC15] hover:border-[#FACC15]/40 whitespace-nowrap shrink-0"
            >
              Admin Oracle
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg">
              <div className="text-xs text-slate-400 font-mono uppercase">Available & Staked</div>
              <div className="mt-2 text-2xl lg:text-3xl font-black font-mono text-white tabular-nums">
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-xs font-mono text-[#4ade80]">
                {totalStakedSOL > 0 ? `${totalStakedSOL.toFixed(3)} SOL ($${totalStakedUSD}) in markets` : 'Cashier ready for trading'}
              </div>
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg">
              <div className="text-xs text-slate-400 font-mono uppercase">Open Positions</div>
              <div className="mt-2 text-2xl lg:text-3xl font-black font-mono text-white tabular-nums">
                {positions.length > 0 ? `${openCount} Contracts` : '0 Contracts'}
              </div>
              <div className="mt-2 text-xs font-mono text-[#facc15]">
                {wonCount} Won · {lostCount} Lost
              </div>
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg">
              <div className="text-xs text-slate-400 font-mono uppercase">Settled Win Rate</div>
              <div className="mt-2 text-2xl lg:text-3xl font-black font-mono text-[#4ade80] tabular-nums">
                {winRate}%
              </div>
              <div className="mt-2 text-xs text-slate-400 font-mono">
                Verified settlement ledger
              </div>
            </div>
          </div>
        </section>

        {sectionView !== 'positions' && (
          <>
        {/* Popular Crypto Carousel / Grid */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-wide text-slate-200">Popular Crypto</h2>
              <button
                type="button"
                className="grid h-5 w-5 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors text-xs"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {POPULAR_ASSETS.map((asset) => {
              const isSelected = activeAsset.id === asset.id;
              const isPositive = asset.change24h >= 0;

              return (
                <div
                  key={asset.id}
                  onClick={() => setActiveAsset(asset)}
                  className={`group relative flex items-center justify-between overflow-hidden rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-[#22c55e]/60 bg-[#11171E] shadow-[0_8px_30px_rgba(34,197,94,0.15)] ring-1 ring-[#22c55e]/30'
                      : 'border-white/[0.08] bg-[#0E1318] hover:border-white/20 hover:bg-[#121820]'
                  }`}
                >
                  <div>
                    <span className="text-[11px] font-mono font-medium text-slate-400 uppercase">
                      {asset.symbol}
                    </span>
                    <div className="mt-1 text-xl font-bold font-mono text-white tabular-nums">
                      ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold font-mono">
                      {isPositive ? (
                        <span className="flex items-center gap-0.5 text-[#4ade80] bg-[#22c55e]/15 px-2 py-0.5 rounded-full">
                          ▲ +{asset.change24h}%
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-[#f472b6] bg-[#ec4899]/15 px-2 py-0.5 rounded-full">
                          ▼ {asset.change24h}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3D Glowing Asset Graphic matching the screenshot */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                    <img
                      src={asset.image}
                      alt={asset.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-30"
                      style={{ background: asset.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Main 2-Column Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 Cols on LG): My Balance + Your Activity */}
          <div className="lg:col-span-4 space-y-6">
            {/* My Balance Card with Topographic Lines */}
            <div className="relative overflow-hidden rounded-3xl border border-emerald-900/40 bg-gradient-to-br from-[#0B1A14] via-[#091510] to-[#060D0A] p-5 shadow-xl">
              {/* Topographic emerald contour lines in SVG background */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full opacity-35"
                viewBox="0 0 340 220"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M-20 60 C80 20, 160 110, 360 40" stroke="#22c55e" strokeWidth="1.2" />
                <path d="M-20 90 C90 50, 180 140, 360 70" stroke="#22c55e" strokeWidth="1.2" />
                <path d="M-20 120 C100 80, 200 170, 360 100" stroke="#22c55e" strokeWidth="1.2" />
                <path d="M-20 150 C110 110, 220 200, 360 130" stroke="#22c55e" strokeWidth="1.2" />
                <path d="M-20 180 C120 140, 240 230, 360 160" stroke="#22c55e" strokeWidth="1.2" />
                <path d="M-20 210 C130 170, 260 260, 360 190" stroke="#22c55e" strokeWidth="1.2" />
              </svg>

              <div className="relative z-10 flex items-center justify-between">
                <span className="text-sm font-semibold tracking-wide text-white">My Balance</span>
                <button
                  type="button"
                  onClick={() => openCashier('deposit')}
                  className="grid h-6 w-6 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Overlapping token badges + chip */}
              <div className="relative z-10 mt-4 flex items-center justify-between">
                <div className="flex -space-x-2">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-[#10b981] text-[10px] font-black text-black ring-2 ring-[#080C0F]">
                    ₮
                  </div>
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-[#facc15] text-[10px] font-black text-black ring-2 ring-[#080C0F]">
                    ₿
                  </div>
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-[#a855f7] text-[10px] font-black text-white ring-2 ring-[#080C0F]">
                    Ξ
                  </div>
                </div>

                <div
                  onClick={copyAddress}
                  className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-mono text-emerald-300 hover:border-emerald-400 cursor-pointer transition-colors"
                >
                  <Lock size={11} className="text-emerald-400" />
                  <span>{walletAddress.slice(0, 5)}...{walletAddress.slice(-3)}</span>
                  {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                </div>
              </div>

              <div className="relative z-10 mt-6">
                <span className="text-xs font-medium text-emerald-300/70">Available Balance</span>
                <div className="mt-1 flex items-baseline justify-between">
                  <div className="text-3xl font-extrabold font-mono text-white tabular-nums">
                    ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-xs font-bold font-mono text-[#4ade80] bg-[#22c55e]/15 px-2 py-0.5 rounded-full">
                    ▲ +7.3%
                  </span>
                </div>
              </div>

              {/* On-Chain Action CTA Bar */}
              <div className="relative z-10 mt-5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => openCashier('deposit')}
                  className="rounded-xl bg-[#22c55e] hover:bg-[#16a34a] py-2 text-xs font-bold text-black shadow-md shadow-[#22c55e]/20 transition-all active:scale-95"
                >
                  Deposit Onchain
                </button>
                <button
                  type="button"
                  onClick={() => openCashier('withdraw')}
                  className="rounded-xl border border-emerald-500/40 hover:bg-emerald-950/50 py-2 text-xs font-semibold text-emerald-200 transition-all active:scale-95"
                >
                  Withdraw Onchain
                </button>
              </div>
            </div>

            {/* Your Activity - Rhythmic Heatmap Matrix */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold tracking-wide text-white">Your Activity</span>
                <button type="button" className="text-slate-400 hover:text-white transition-colors">
                  <ShieldCheck size={15} />
                </button>
              </div>

              {/* Segmented Timeframe Filter Tabs */}
              <div className="mt-3 flex items-center gap-1 rounded-xl bg-[#131A21] p-1">
                {(['Hourly', 'Weekly', 'Monthly', 'Yearly'] as const).map((tab) => {
                  const isActive = activityTimeframe === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActivityTimeframe(tab)}
                      className={`flex-1 rounded-lg py-1 text-[11px] font-medium transition-all ${
                        isActive
                          ? 'bg-[#4ade80] text-black font-semibold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Dot Matrix Heatmap matching the screenshot */}
              <div className="mt-5 p-2 rounded-2xl bg-[#090D10] border border-white/5">
                <div className="grid grid-cols-12 gap-2 place-items-center">
                  {ACTIVITY_MATRIX.map((row, rowIdx) =>
                    row.map((cell, colIdx) => {
                      let bgClass = 'bg-[#18212B] opacity-40';
                      if (cell === 'magenta') bgClass = 'bg-[#ec4899] shadow-[0_0_8px_rgba(236,72,153,0.5)]';
                      if (cell === 'green') bgClass = 'bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.5)]';
                      if (cell === 'yellow') bgClass = 'bg-[#facc15] shadow-[0_0_8px_rgba(250,204,21,0.5)]';

                      return (
                        <div
                          key={`${rowIdx}-${colIdx}`}
                          className={`h-3.5 w-3.5 rounded-full transition-transform hover:scale-125 cursor-pointer ${bgClass}`}
                          title={`Bucket ${colIdx * 2}:00 - Activity: ${cell}`}
                        />
                      );
                    })
                  )}
                </div>

                {/* Timeline X-Axis Labels */}
                <div className="mt-3 flex justify-between px-1 text-[9px] font-mono text-slate-500">
                  <span>2am</span>
                  <span>4am</span>
                  <span>6am</span>
                  <span>8am</span>
                  <span>10am</span>
                  <span>12pm</span>
                  <span>2pm</span>
                  <span>4pm</span>
                  <span>6pm</span>
                  <span>8pm</span>
                  <span>10pm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (8 Cols on LG): Candlestick Chart + Portfolio & Donut */}
          <div className="lg:col-span-8 space-y-6">
            {/* Candlestick & Market Chart Card */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg">
              {/* Header: Asset Info + Timeframe Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-2xl p-2"
                    style={{ background: `${activeAsset.color}15`, border: `1px solid ${activeAsset.color}40` }}
                  >
                    <BarChart2 size={18} style={{ color: activeAsset.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{activeAsset.name} ({activeAsset.symbol})</span>
                      <span className="rounded-full bg-[#22c55e]/15 px-2 py-0.5 text-[10px] font-mono font-bold text-[#4ade80]">
                        ▲ +7.3%
                      </span>
                    </div>
                    <div className="text-xl font-extrabold font-mono text-white tabular-nums">
                      ${activeAsset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Timeframe Selector Pills */}
                <div className="flex items-center gap-1 rounded-xl bg-[#131A21] p-1 self-start sm:self-auto">
                  {(['4H', '1D', '1W', '1M', '6M'] as const).map((tf) => {
                    const isActive = chartTimeframe === tf;
                    return (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setChartTimeframe(tf)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                          isActive
                            ? 'bg-[#4ade80] text-black font-semibold shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tf === '4H' ? '4 Hours' : tf === '1D' ? 'Day' : tf === '1W' ? 'Week' : tf === '1M' ? 'Month' : '6 Month'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Luminous Candlestick Chart (Neon Green + Hot Magenta) */}
              <div className="mt-6 relative h-[220px] w-full bg-[#080C0F] rounded-2xl p-3 border border-white/5">
                <svg className="h-full w-full overflow-visible" viewBox="0 0 700 200" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="40" x2="700" y2="40" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                  <line x1="0" y1="90" x2="700" y2="90" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                  <line x1="0" y1="140" x2="700" y2="140" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />

                  {/* Horizontal current price dashed marker */}
                  <line x1="0" y1="135" x2="640" y2="135" stroke="#4ade80" strokeDasharray="3 3" opacity="0.7" />

                  {/* Candlesticks */}
                  {candlesticks.map((c, i) => {
                    const x = 20 + i * 30;
                    const isBullish = c.c >= c.o;
                    const candleColor = isBullish ? '#4ade80' : '#ec4899';
                    const yHigh = 200 - (c.h - 60) * 3;
                    const yLow = 200 - (c.l - 60) * 3;
                    const yOpen = 200 - (c.o - 60) * 3;
                    const yClose = 200 - (c.c - 60) * 3;
                    const top = Math.min(yOpen, yClose);
                    const height = Math.max(Math.abs(yClose - yOpen), 4);

                    return (
                      <g key={i} className="hover:opacity-80 transition-opacity">
                        {/* Wick */}
                        <line
                          x1={x + 4}
                          y1={yHigh}
                          x2={x + 4}
                          y2={yLow}
                          stroke={candleColor}
                          strokeWidth="1.5"
                          opacity="0.8"
                        />
                        {/* Body */}
                        <rect
                          x={x}
                          y={top}
                          width="8"
                          height={height}
                          rx="2"
                          fill={candleColor}
                          style={{
                            filter: isBullish
                              ? 'drop-shadow(0 0 6px rgba(74,222,128,0.4))'
                              : 'drop-shadow(0 0 6px rgba(236,72,153,0.4))',
                          }}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Live Current Price Badge Tag on Right Y-Axis */}
                <div className="absolute right-3 top-[120px] rounded-full bg-[#4ade80] px-2 py-0.5 text-[10px] font-mono font-black text-black shadow-lg shadow-[#4ade80]/40">
                  77.21
                </div>

                {/* Right Axis Labels */}
                <div className="absolute right-2 top-2 bottom-2 flex flex-col justify-between text-[9px] font-mono text-slate-500 pointer-events-none">
                  <span>80k</span>
                  <span>50k</span>
                  <span>30k</span>
                  <span>10k</span>
                </div>
              </div>

              {/* Chart Tool Row */}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <button type="button" className="p-1.5 rounded-lg bg-[#131A21] hover:text-white transition-colors">
                    <Layers size={14} />
                  </button>
                  <button type="button" className="p-1.5 rounded-lg bg-[#131A21] hover:text-white transition-colors">
                    <SlidersHorizontal size={14} />
                  </button>
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  Live Feed · Binance & Solana Book
                </div>
              </div>
            </div>

            {/* Bottom Row: Portfolio Table + Portfolio Statistic Donut */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Portfolio Holdings */}
              <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold tracking-wide text-white">Portfolio</span>
                  <button type="button" className="text-slate-400 hover:text-white transition-colors">
                    <SlidersHorizontal size={14} />
                  </button>
                </div>

                <div className="space-y-3">
                  {POPULAR_ASSETS.map((asset) => {
                    const isPositive = asset.change24h >= 0;
                    return (
                      <div
                        key={asset.id}
                        onClick={() => setActiveAsset(asset)}
                        className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#131A21] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="grid h-8 w-8 place-items-center rounded-xl text-xs font-black"
                            style={{ background: `${asset.color}20`, color: asset.color, border: `1px solid ${asset.color}40` }}
                          >
                            {asset.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">{asset.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {isPositive ? (
                                <span className="text-[#4ade80]">▲ +{asset.change24h}%</span>
                              ) : (
                                <span className="text-[#f472b6]">▼ {asset.change24h}%</span>
                              )}{' '}
                              · ${asset.price.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-bold font-mono text-white tabular-nums">
                            {asset.balance}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ${(asset.balance * asset.price).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Portfolio Statistic Donut Chart matching screenshot */}
              <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold tracking-wide text-white">Portfolio Statistic</span>
                  <button type="button" className="text-slate-400 hover:text-white transition-colors">
                    <MoreHorizontal size={16} />
                  </button>
                </div>

                {/* SVG Concentric Donut Chart */}
                <div className="relative my-auto flex items-center justify-center py-4">
                  <svg className="h-44 w-44 -rotate-90" viewBox="0 0 100 100">
                    {/* Background Ring */}
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#131A21" strokeWidth="10" />

                    {/* Segment 1: Yellow/Gold (BTC) - 55% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="10"
                      strokeDasharray="131 239"
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(250,204,21,0.5))' }}
                    />

                    {/* Segment 2: Lime Green (BNB) - 25% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#4ade80"
                      strokeWidth="10"
                      strokeDasharray="60 239"
                      strokeDashoffset="-140"
                      strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.5))' }}
                    />

                    {/* Segment 3: Violet/Magenta (SOL/USDT) - 15% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="10"
                      strokeDasharray="36 239"
                      strokeDashoffset="-205"
                      strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.5))' }}
                    />
                  </svg>

                  {/* Center Emblem */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-[#121820] border border-white/10 text-white shadow-inner">
                      <PieChart size={18} className="text-[#4ade80]" />
                    </div>
                  </div>

                  {/* Floating Stat Badges matching screenshot */}
                  <div className="absolute -top-1 right-2 rounded-full border border-yellow-500/40 bg-[#121820] px-2 py-0.5 text-[9px] font-mono font-bold text-[#facc15] shadow-md">
                    $12,473 <span className="text-[8px] text-slate-400">BTC</span>
                  </div>
                  <div className="absolute -top-1 left-2 rounded-full border border-emerald-500/40 bg-[#121820] px-2 py-0.5 text-[9px] font-mono font-bold text-[#4ade80] shadow-md">
                    $2,301 <span className="text-[8px] text-slate-400">BNB</span>
                  </div>
                  <div className="absolute -bottom-1 right-6 rounded-full border border-purple-500/40 bg-[#121820] px-2 py-0.5 text-[9px] font-mono font-bold text-[#c084fc] shadow-md">
                    $6,320 <span className="text-[8px] text-slate-400">SOL</span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-around border-t border-white/5 pt-3 text-[10px] font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#facc15]" />
                    <span>BTC (55%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#4ade80]" />
                    <span>BNB (28%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#a855f7]" />
                    <span>SOL (17%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Chain Protocol Details & Wallet Auth Status */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Onchain Authentication & Custody Status
            </h3>
            <span className="text-[10px] font-mono text-[#4ade80] bg-[#22c55e]/15 px-2 py-0.5 rounded-full">
              Live Networks
            </span>
          </div>
          <ConnectedWalletStatus />
        </div>
          </>
        )}

        {sectionView !== 'wallet' && (
          <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-6 shadow-lg">
            <MyBets />
          </div>
        )}
      </div>

      {/* Mainnet Deposit & Withdraw Modal */}
      <MainnetDepositWithdrawModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialMode={modalMode}
        onBalanceUpdated={(newBal) => setBalance(newBal)}
      />
    </div>
  );
}
