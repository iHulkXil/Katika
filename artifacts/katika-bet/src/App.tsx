import { type ReactNode, useEffect } from 'react';
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
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

const queryClient = new QueryClient();

function Home() {
  return <MarketsHome />;
}

function Wallet() {
  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-2xl font-semibold">Wallet</h1>
      <p className="mt-1 text-sm text-slate-400">Connect Solana or EVM for real play on SIDEBET.</p>
      <div className="mt-4"><ConnectedWalletStatus /></div>
      <div className="mt-6 rounded-2xl border border-emerald-900/40 bg-[#0A1512] p-4">
        <div className="text-xs text-slate-400">Available Balance</div>
        <div className="mt-1 text-2xl font-bold text-emerald-400">₦12,450</div>
        <div className="mt-3 flex gap-2">
          <button className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-black">Deposit</button>
          <button className="rounded-lg border border-emerald-700 px-4 py-2 text-xs">Withdraw</button>
        </div>
      </div>
      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-400">Recent Activity</h2>
      <BetHistory />
    </div>
  );
}

function Portfolio() {
  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-2xl font-semibold">Your Portfolio</h1>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-900/40 bg-[#0A1512] p-4">
          <div className="text-xs text-slate-400">Total Value</div>
          <div className="mt-1 text-2xl font-bold">₦42,500</div>
          <div className="text-xs text-emerald-400">+12.5%</div>
        </div>
        <div className="rounded-2xl border border-emerald-900/40 bg-[#0A1512] p-4">
          <div className="text-xs text-slate-400">Open Positions</div>
          <div className="mt-1 text-2xl font-bold">8</div>
        </div>
      </div>
      <p className="mt-6 text-sm text-slate-400">Positions appear here after you place bets from Markets.</p>
    </div>
  );
}

function Leaderboard() {
  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-2xl font-semibold">Leaderboard</h1>
      <div className="mt-4 space-y-2">
        {['Adaeze · ₦12.4M', 'Chinedu · ₦9.8M', 'You · ₦42.5K', 'Fatima · ₦28.1K'].map((row, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-emerald-900/40 bg-[#0A1512] px-4 py-3 text-sm">
            <span>#{i + 1} {row}</span>
            <span className="text-emerald-400">+{12 - i}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryPage({ title }: { title: string }) {
  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-slate-400">Browse {title.toLowerCase()} prediction markets. All local + Solana backed.</p>
      <div className="mt-6">
        <MarketsHome />
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
