import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ConnectedWalletStatus, WalletAuthButton } from '@/components/wallet-auth';
import { BetHistory } from '@/components/bet-history';
import { DicePage } from '@/components/dice-page';
import { CoinFlipPage } from '@/components/coinflip-page';
import { MinesPage } from '@/components/mines-page';
import { RoulettePage } from '@/components/roulette-page';
import { PoolGamePage } from '@/components/pool-game';
import { TelegramTapper } from '@/components/telegram-tapper';
import { PlayPage } from '@/components/play-page';
import { LegendPage } from '@/components/legend-page';
import { LeaderboardPage } from '@/components/leaderboard-page';
import { CashierPage } from '@/components/cashier-page';
import { PvPLobby } from '@/components/pvp-lobby';
import { ClubLudoPage } from '@/components/club-ludo';
import { PenaltyShootoutPage } from '@/components/penalty-shootout';
import { ProfilePage } from '@/components/profile-page';
import { HomeLegendHero, LegendCard, useLegend } from '@/components/legend-card';
import { AuthGate } from '@/components/auth-gate';
import { DemoNotice, LayoutShell, MenuRow } from '@/components/layout-shell';
import { useServerSession } from '@/components/server-session';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { useLogout, usePrivy } from '@privy-io/react-auth';
import {
  Bomb, CircleDollarSign, CreditCard, Dices, Gamepad2, Gem, Grid2X2, Layers, Play, Shield, Swords, Ticket, Trophy, UserRound, Users, WalletCards,
} from 'lucide-react';

const queryClient = new QueryClient();

function RedirectTo({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);
  return null;
}

type Game = {
  name: string;
  description: string;
  badge: string;
  payout: string;
  href: string;
  icon: ReactNode;
};
const games: Game[] = [
  { name: 'Dice Table', description: 'Over/Under Precision Roller', badge: '1-100', payout: '94% RTP', href: '/games/dice', icon: <Dices /> },
  { name: 'Coin Flip', description: '3D Katika Gold Coin', badge: '50/50', payout: '1.88× Fixed', href: '/games/coinflip', icon: <CircleDollarSign /> },
  { name: 'Mines Vault', description: '5×5 Diamond Grid • Cash Out Anytime', badge: '1-24 Mines', payout: 'Up to 24×', href: '/games/mines', icon: <Bomb /> },
  { name: 'Roulette', description: 'European Single Zero • Street & Straight Bets', badge: '0-36 Wheel', payout: '97.3% RTP', href: '/games/roulette', icon: <CircleDollarSign /> },
];

function GameTile({ game }: { game: Game }) {
  return (
    <Link href={game.href} className="block group">
      <div className="relative overflow-hidden rounded-2xl border border-[#1C3A2E] bg-gradient-to-br from-[#0E1A16] to-[#07110E] p-3.5 transition-all duration-200 hover:border-[#35D399]/50 hover:shadow-[0_4px_20px_rgba(53,211,153,0.12)] active:scale-[0.98]">
        <div className="flex items-center justify-between">
          <div className="text-[#f3d37a] [&_svg]:h-6 [&_svg]:w-6 transition-transform group-hover:scale-110">{game.icon}</div>
          <span className="rounded-full border border-[#35D399]/40 bg-[#35D399]/15 px-2 py-0.5 font-mono-custom text-[9px] font-bold text-[#35D399]">
            {game.badge}
          </span>
        </div>
        <h3 className="mt-3 text-base font-bold text-[#E8F2EC]">{game.name}</h3>
        <p className="text-[11px] text-[#8FA39A]">{game.description}</p>
        <div className="mt-2.5 flex items-center justify-between border-t border-[#1C3A2E]/60 pt-2 font-mono-custom text-[10px]">
          <span className="text-[#8FA39A]">{game.payout}</span>
          <span className="text-[#35D399] font-semibold group-hover:translate-x-0.5 transition-transform">PLAY →</span>
        </div>
      </div>
    </Link>
  );
}

function Home() {
  return <TelegramTapper defaultTab="tap" />;
}

function Games() {
  return (
    <div className="px-3 pt-3 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-[#35D399]">Classic House</span>
          <h1 className="text-xl font-bold tracking-tight text-[#E8F2EC]">Casino Floor</h1>
        </div>
        <span className="rounded-full border border-[#1C3A2E] bg-[#0E1A16] px-2.5 py-1 font-mono-custom text-[11px] text-[#8FA39A]">
          4 Live Tables
        </span>
      </div>
      <p className="mt-1 text-xs text-[#8FA39A]">All tables settle instantly in $KTK off-chain credits with verified RNG.</p>
      <div className="mt-3.5 grid grid-cols-2 gap-2.5 md:grid-cols-4">{games.map((game) => <GameTile key={game.name} game={game} />)}</div>
    </div>
  );
}

function Wallet() {
  return (
    <div className="px-3 pt-3">
      <h1 className="text-2xl font-semibold">Wallet</h1>
      <p className="mt-1 text-sm text-muted-foreground">$KTK is the house ledger for cards and tables.</p>
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
        <Route path="/tap">{() => <TelegramTapper defaultTab="tap" />}</Route>
        <Route path="/swap">{() => <TelegramTapper defaultTab="swap" />}</Route>
        <Route path="/legend">{() => <TelegramTapper defaultTab="legend" />}</Route>
        <Route path="/play" component={PlayPage} />

        {/* Redirects for legacy routes /clash and /club */}
        <Route path="/clash">{() => <RedirectTo to="/pvp" />}</Route>
        <Route path="/club">{() => <RedirectTo to="/pvp" />}</Route>
        <Route path="/club/four/:id">{() => <RedirectTo to="/pvp" />}</Route>
        <Route path="/club/ludo/:id">{(params) => <RedirectTo to={`/pvp/ludo/${params.id}`} />}</Route>

        {/* PvP Floor & Games (Penalty Shootout, Pool & Ludo) */}
        <Route path="/pvp" component={PvPLobby} />
        <Route path="/pvp/penalty/:id" component={PenaltyShootoutPage} />
        <Route path="/pvp/penalty" component={PenaltyShootoutPage} />
        <Route path="/games/penalty" component={PenaltyShootoutPage} />
        <Route path="/pvp/pool/:id" component={PoolGamePage} />
        <Route path="/pvp/pool" component={PoolGamePage} />
        <Route path="/pvp/ludo/:id" component={ClubLudoPage} />
        <Route path="/pvp/21/:id">{() => <RedirectTo to="/pvp" />}</Route>
        <Route path="/pvp/four/:id">{() => <RedirectTo to="/pvp" />}</Route>
        <Route path="/games/pool" component={PoolGamePage} />

        {/* Classic Casino Tables */}
        <Route path="/games/dice" component={DicePage} />
        <Route path="/games/coinflip" component={CoinFlipPage} />
        <Route path="/games/mines" component={MinesPage} />
        <Route path="/games/roulette" component={RoulettePage} />
        <Route path="/games" component={Games} />

        {/* Profile, Kits, Cashier & Wallet */}
        <Route path="/cashier" component={CashierPage} />
        <Route path="/leaderboard" component={LeaderboardPage} />
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
