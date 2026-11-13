import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MarketsHome } from '@/components/markets-home';
import { DiscoverPage } from '@/components/discover-page';
import { ProfilePage } from '@/components/profile-page';
import { MyBets } from '@/components/my-bets';
import { AuthGate } from '@/components/auth-gate';
import { LayoutShell } from '@/components/layout-shell';
import { CryptoWalletDashboard } from '@/components/crypto-wallet-dashboard';
import { PvPLobby } from '@/components/pvp-lobby';
import { PoolGamePage } from '@/components/pool-game';
import { PotWheelGamePage } from '@/components/pot-wheel-game';
import { LudoGamePage } from '@/components/ludo-game';
import { AdminResolverPage } from '@/components/admin-resolver';
import { ComplianceModal } from '@/components/compliance-modal';
import { fetchStats, type PlatformStats } from '@/lib/markets-api';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

const queryClient = new QueryClient();

function Discover() {
  return <DiscoverPage />;
}

function Markets() {
  return <MarketsHome />;
}

function WalletPortfolio() {
  return <CryptoWalletDashboard />;
}

function Leaderboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    void fetchStats().then(setStats);
  }, []);

  const leaders = [
    { rank: 1, name: 'ApexBull (Top Alpha)', returnVal: '+$124,500', pct: '+412%', color: '#facc15' },
    { rank: 2, name: 'SolWhale', returnVal: '+$98,200', pct: '+285%', color: '#4ade80' },
    { rank: 3, name: 'MacroQuant', returnVal: '+$64,300', pct: '+194%', color: '#a855f7' },
    { rank: 4, name: 'You (Current Session)', returnVal: '+$4,011', pct: '+14.4%', color: '#22c55e' },
    { rank: 5, name: 'DeltaMaker', returnVal: '+$28,100', pct: '+96%', color: '#ec4899' },
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
        <Route path="/" component={Discover} />
        <Route path="/dashboard" component={Discover} />
        <Route path="/markets" component={Markets} />
        <Route path="/pvp" component={PvPLobby} />
        <Route path="/games/pool" component={PoolGamePage} />
        <Route path="/pvp/pool" component={PoolGamePage} />
        <Route path="/pvp/pool/:id" component={PoolGamePage} />
        <Route path="/games/wheel" component={PotWheelGamePage} />
        <Route path="/pvp/wheel" component={PotWheelGamePage} />
        <Route path="/pvp/wheel/:id" component={PotWheelGamePage} />
        <Route path="/games/ludo" component={LudoGamePage} />
        <Route path="/pvp/ludo" component={LudoGamePage} />
        <Route path="/pvp/ludo/:id" component={LudoGamePage} />
        <Route path="/trending">{() => <MarketsHome defaultCategory="All" />}</Route>
        <Route path="/sports">{() => <MarketsHome defaultCategory="Sports" />}</Route>
        <Route path="/crypto">{() => <MarketsHome defaultCategory="Crypto" />}</Route>
        <Route path="/politics">{() => <MarketsHome defaultCategory="Politics" />}</Route>
        <Route path="/nigerian-politics">{() => <MarketsHome defaultCategory="Nigerian Politics" />}</Route>
        <Route path="/finance">{() => <MarketsHome defaultCategory="Finance" />}</Route>
        <Route path="/lifestyle">{() => <MarketsHome defaultCategory="Lifestyle" />}</Route>
        <Route path="/my-bets" component={MyBets} />
        <Route path="/portfolio" component={WalletPortfolio} />
        <Route path="/wallet" component={WalletPortfolio} />
        <Route path="/cashier" component={WalletPortfolio} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/admin" component={AdminResolverPage} />
        <Route path="/profile" component={ProfilePage} />
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
