import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ConnectedWalletStatus, WalletAuthButton } from '@/components/wallet-auth';
import { BetHistory } from '@/components/bet-history';
import { MarketsHome } from '@/components/markets-home';
import { ProfilePage } from '@/components/profile-page';
import { AuthGate } from '@/components/auth-gate';
import { ComingSoon } from '@/components/coming-soon';
import { DemoNotice, LayoutShell, MenuRow } from '@/components/layout-shell';
import { useServerSession } from '@/components/server-session';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { useLogout, usePrivy } from '@privy-io/react-auth';

const queryClient = new QueryClient();

function RedirectTo({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);
  return null;
}

function Home() {
  return <MarketsHome />;
}

function Wallet() {
  return (
    <div className="px-3 pt-3">
      <h1 className="text-2xl font-semibold">Wallet</h1>
      <p className="mt-1 text-sm text-muted-foreground">Connect EVM, Solana, or Bitcoin wallets for real play.</p>
      <div className="mt-4"><ConnectedWalletStatus /></div>
      <h2 className="mt-6 text-sm font-semibold uppercase tracking-[.16em] text-secondary">Bet history</h2>
      <BetHistory />
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return <div className="px-3 pt-6"><h1 className="text-2xl font-semibold">{title}</h1></div>;
}

function RewardsPage() {
  return <Placeholder title="Rewards" />;
}

function NotFoundPage() {
  return (
    <div className="px-3 pt-16 text-center">
      <p className="text-sm text-[#8FA39A]">Page not found</p>
      <Link href="/" className="mt-2 inline-block text-sm text-[#35D399] underline">
        Return Home
      </Link>
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

        {/* Legacy / hidden sections redirect to Coming Soon */}
        <Route path="/play">{() => <ComingSoon title="Play" />}</Route>
        <Route path="/clash">{() => <ComingSoon title="Clash" />}</Route>
        <Route path="/club">{() => <ComingSoon title="Club" />}</Route>
        <Route path="/pvp">{() => <ComingSoon title="PvP" />}</Route>
        <Route path="/pvp/:rest*">{() => <ComingSoon title="PvP" />}</Route>
        <Route path="/games">{() => <ComingSoon title="Casino" />}</Route>
        <Route path="/games/:rest*">{() => <ComingSoon title="Casino" />}</Route>

        {/* Profile, Cashier & Wallet */}
        <Route path="/cashier" component={Wallet} />
        <Route path="/leaderboard">{() => <ComingSoon title="Leaderboard" />}</Route>
        <Route path="/profile" component={ProfilePage} />
        <Route path="/kit" component={ProfilePage} />
        <Route path="/menu" component={ProfilePage} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/rewards" component={RewardsPage} />
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
