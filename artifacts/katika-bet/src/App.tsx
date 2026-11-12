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
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

const queryClient = new QueryClient();

function Home() {
  return <MarketsHome />;
}

function Wallet() {
  return <CryptoWalletDashboard />;
}

function Portfolio() {
  return (
    <div className="p-4 lg:p-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight font-display text-white">Your Portfolio</h1>
        <p className="mt-1 text-xs text-slate-400">Real-time valuation of your active prediction contracts and multi-chain holdings.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg">
          <div className="text-xs text-slate-400 font-mono uppercase">Total Portfolio Value</div>
          <div className="mt-2 text-3xl font-black font-mono text-white tabular-nums">$42,500.00</div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#22c55e]/15 px-2.5 py-0.5 text-xs font-mono font-bold text-[#4ade80]">
            ▲ +12.5% past 30d
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg">
          <div className="text-xs text-slate-400 font-mono uppercase">Open Positions</div>
          <div className="mt-2 text-3xl font-black font-mono text-white tabular-nums">8 Contracts</div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#facc15]/15 px-2.5 py-0.5 text-xs font-mono font-bold text-[#facc15]">
            5 In Profit · 3 Pending
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg">
          <div className="text-xs text-slate-400 font-mono uppercase">Settled Win Rate</div>
          <div className="mt-2 text-3xl font-black font-mono text-[#4ade80] tabular-nums">68.4%</div>
          <div className="mt-2 text-xs text-slate-400 font-mono">
            42 Won / 19 Lost
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
  const leaders = [
    { rank: 1, name: 'Adaeze (Top Bull)', returnVal: '+$124,500', pct: '+412%', color: '#facc15' },
    { rank: 2, name: 'Chinedu (SOL Whale)', returnVal: '+$98,200', pct: '+285%', color: '#4ade80' },
    { rank: 3, name: 'Kofi Alpha', returnVal: '+$64,300', pct: '+194%', color: '#a855f7' },
    { rank: 4, name: 'You (Current Session)', returnVal: '+$4,011', pct: '+14.4%', color: '#22c55e' },
    { rank: 5, name: 'Fatima Market Maker', returnVal: '+$28,100', pct: '+96%', color: '#ec4899' },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight font-display text-white">Trader Leaderboard</h1>
        <p className="mt-1 text-xs text-slate-400">Top prediction market traders ranked by verified on-chain PnL and volume.</p>
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
        <Route path="/trending">{() => <CategoryPage title="Trending" />}</Route>
        <Route path="/sports">{() => <CategoryPage title="Sports" />}</Route>
        <Route path="/crypto">{() => <CategoryPage title="Crypto" />}</Route>
        <Route path="/politics">{() => <CategoryPage title="Politics" />}</Route>
        <Route path="/finance">{() => <CategoryPage title="Finance" />}</Route>
        <Route path="/my-bets" component={MyBets} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/leaderboard" component={Leaderboard} />
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
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
