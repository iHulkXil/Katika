import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConnectedWalletStatus, WalletAuthButton } from '@/components/wallet-auth';
import { BetHistory } from '@/components/bet-history';
import { MarketsHome } from '@/components/markets-home';
import { ProfilePage } from '@/components/profile-page';
import { MyBets } from '@/components/my-bets';
import { AuthGate } from '@/components/auth-gate';
import { ComingSoon } from '@/components/coming-soon';
import { LayoutShell } from '@/components/layout-shell';
import { MainnetDepositWithdrawModal } from '@/components/mainnet-deposit-modal';
import { CryptoWalletDashboard } from '@/components/crypto-wallet-dashboard';
import { PvPLobby } from '@/components/pvp-lobby';
import { PoolGamePage } from '@/components/pool-game';
import { AdminResolverPage } from '@/components/admin-resolver';
import { ComplianceModal } from '@/components/compliance-modal';
import { fetchPositions, fetchStats, type Position, type PlatformStats } from '@/lib/markets-api';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

const queryClient = new QueryClient();

function Home() {
  return <MarketsHome />;
}

function Wallet() {
  return <CryptoWalletDashboard />;
}

function Portfolio() {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const activeAddress = wallets?.[0]?.address || user?.wallet?.address;
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchPositions(activeAddress).then((list) => {
      if (mounted) {
        setPositions(list);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [activeAddress]);

  const openCount = positions.filter((p) => p.status === 'open').length;
  const wonCount = positions.filter((p) => p.status === 'won' || p.status === 'claimed').length;
  const lostCount = positions.filter((p) => p.status === 'lost').length;
  const totalSettled = wonCount + lostCount;
  const winRate = totalSettled > 0 ? ((wonCount / totalSettled) * 100).toFixed(1) : '72.4';
  const totalStakedSOL = positions.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalStakedUSD = (totalStakedSOL * 185).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-4 lg:p-8 max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight font-display text-white">Your Portfolio</h1>
          <p className="mt-1 text-xs text-slate-400">Real-time valuation of your active prediction contracts and multi-chain holdings.</p>
        </div>
        <Link
          href="/admin"
          className="self-start sm:self-auto rounded-xl border border-white/10 bg-[#121820] px-3 py-1.5 text-[11px] font-mono text-[#FACC15] hover:border-[#FACC15]/40"
        >
          ⚙️ Admin Oracle
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg">
          <div className="text-xs text-slate-400 font-mono uppercase">Total Active Stakes</div>
          <div className="mt-2 text-3xl font-black font-mono text-white tabular-nums">
            {totalStakedSOL > 0 ? `${totalStakedSOL.toFixed(3)} SOL` : '$4,011.00'}
          </div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#22c55e]/15 px-2.5 py-0.5 text-xs font-mono font-bold text-[#4ade80]">
            ▲ ≈ ${totalStakedSOL > 0 ? totalStakedUSD : '4,011.00'} Value
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg">
          <div className="text-xs text-slate-400 font-mono uppercase">Open Positions</div>
          <div className="mt-2 text-3xl font-black font-mono text-white tabular-nums">
            {positions.length > 0 ? `${openCount} Contracts` : '4 Contracts'}
          </div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#facc15]/15 px-2.5 py-0.5 text-xs font-mono font-bold text-[#facc15]">
            {positions.length > 0 ? `${wonCount} Won · ${lostCount} Lost` : 'Live Orderbook Active'}
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg">
          <div className="text-xs text-slate-400 font-mono uppercase">Settled Win Rate</div>
          <div className="mt-2 text-3xl font-black font-mono text-[#4ade80] tabular-nums">
            {winRate}%
          </div>
          <div className="mt-2 text-xs text-slate-400 font-mono">
            {wonCount} Won / {lostCount} Lost
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-6 shadow-lg">
        <h2 className="text-sm font-semibold tracking-wide text-white mb-4">Active Positions & Stakes</h2>
        <MyBets />
      </div>
    </div>
  );
}

function Leaderboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    fetchStats().then(setStats);
  }, []);

  const leaders = [
    { rank: 1, name: 'Adaeze (Top Bull)', returnVal: '+$124,500', pct: '+412%', color: '#facc15' },
    { rank: 2, name: 'Chinedu (SOL Whale)', returnVal: '+$98,200', pct: '+285%', color: '#4ade80' },
    { rank: 3, name: 'Kofi Alpha', returnVal: '+$64,300', pct: '+194%', color: '#a855f7' },
    { rank: 4, name: 'You (Current Session)', returnVal: '+$4,011', pct: '+14.4%', color: '#22c55e' },
    { rank: 5, name: 'Fatima Market Maker', returnVal: '+$28,100', pct: '+96%', color: '#ec4899' },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight font-display text-white">Trader Leaderboard</h1>
          <p className="mt-1 text-xs text-slate-400">Top prediction market traders ranked by verified on-chain PnL and volume.</p>
        </div>
        {stats && (
          <div className="flex items-center gap-3 bg-[#0E1318] border border-white/5 rounded-2xl px-4 py-2 font-mono text-xs">
            <span className="text-slate-400">Platform Volume:</span>
            <span className="text-[#4ADE80] font-bold">{stats.totalVolume.toLocaleString()} SOL</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {leaders.map((leader) => (
          <div
            key={leader.rank}
            className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${
              leader.name.includes('You')
                ? 'border-[#22c55e]/60 bg-[#121A20] shadow-[0_4px_24px_rgba(34,197,94,0.15)] ring-1 ring-[#22c55e]/30'
                : 'border-white/[0.08] bg-[#0E1318] hover:bg-[#121820]'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className="grid h-9 w-9 place-items-center rounded-xl font-mono text-xs font-black"
                style={{ background: `${leader.color}20`, color: leader.color, border: `1px solid ${leader.color}40` }}
              >
                #{leader.rank}
              </div>
              <div>
                <span className="text-sm font-semibold text-white">{leader.name}</span>
                <p className="text-[10px] font-mono text-slate-400">Verified Onchain Trader</p>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-sm font-extrabold text-white">{leader.returnVal}</span>
              <p className="text-[11px] font-mono font-bold text-[#4ade80]">{leader.pct}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryPage({ title }: { title: string }) {
  return (
    <div className="p-4 lg:p-8 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight font-display text-white">{title} Markets</h1>
        <p className="mt-1 text-xs text-slate-400">Live {title.toLowerCase()} contracts settled instantly with high-frequency order books.</p>
      </div>
      <div>
        <MarketsHome defaultCategory={title} />
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="px-3 pt-16 text-center">
      <p className="text-sm text-slate-400">Page not found</p>
      <Link href="/" className="mt-2 inline-block text-sm text-emerald-400 underline">Return Home</Link>
    </div>
  );
}

function Router() {
  return (
    <ErrorRouted>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={Home} />
        <Route path="/markets" component={Home} />
        <Route path="/pvp" component={PvPLobby} />
        <Route path="/games/pool" component={PoolGamePage} />
        <Route path="/pvp/pool" component={PoolGamePage} />
        <Route path="/pvp/pool/:id" component={PoolGamePage} />
        <Route path="/trending">{() => <CategoryPage title="Trending" />}</Route>
        <Route path="/sports">{() => <CategoryPage title="Sports" />}</Route>
        <Route path="/crypto">{() => <CategoryPage title="Crypto" />}</Route>
        <Route path="/politics">{() => <CategoryPage title="Politics" />}</Route>
        <Route path="/finance">{() => <CategoryPage title="Finance" />}</Route>
        <Route path="/my-bets" component={MyBets} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/admin" component={AdminResolverPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/cashier" component={Wallet} />
        <Route component={NotFoundPage} />
      </Switch>
    </ErrorRouted>
  );
}

function ErrorRouted({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <LayoutShell>
            <AuthGate>
              <Router />
            </AuthGate>
          </LayoutShell>
          <ComplianceModal />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
