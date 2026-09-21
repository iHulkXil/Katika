import { type ReactNode, useEffect } from 'react';
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
import { PlayPage } from '@/components/play-page';
import { LegendPage } from '@/components/legend-page';
import { LeaderboardPage } from '@/components/leaderboard-page';
import { CashierPage } from '@/components/cashier-page';
import { PvPLobby } from '@/components/pvp-lobby';
import { PvP21Page } from '@/components/pvp-twentyone';
import { ClubFourPage } from '@/components/club-four';
import { ClubLudoPage } from '@/components/club-ludo';
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
  { name: 'Katika 21', description: 'Closest to 21 • Stat-Gated Double & Split', badge: 'PvP Cards', payout: '4% Pot Rake', href: '/pvp', icon: <Layers /> },
  { name: 'Connect Four', description: '7×6 Gravity Grid • 4-in-a-row', badge: 'PvP Grid', payout: '4% Pot Rake', href: '/pvp', icon: <Gamepad2 /> },
  { name: 'Ludo Quick', description: '2 Tokens Home • Captures & Safe Tiles', badge: 'PvP Race', payout: '4% Pot Rake', href: '/pvp', icon: <Users /> },
  { name: 'Dice', description: '3D Precision Roller', badge: '1-100', payout: '94% RTP', href: '/games/dice', icon: <Dices /> },
  { name: 'Coin Flip', description: '3D Katika Gold Coin', badge: '50/50', payout: '1.88× Fixed', href: '/games/coinflip', icon: <CircleDollarSign /> },
  { name: 'Mines Vault', description: '5×5 Diamond Grid', badge: 'Custom', payout: 'Cash Out', href: '/games/mines', icon: <Bomb /> },
  { name: 'Roulette', description: '3D European Wheel', badge: '0-36', payout: 'Up to 34.78×', href: '/games/roulette', icon: <Ticket /> },
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
  return (
    <div className="px-3 pt-3">
      <HomeLegendHero />
      <div className="mt-6 flex items-end justify-between px-0.5">
        <div>
          <span className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-[#35D399]">Live Tables</span>
          <h2 className="text-lg font-bold text-[#E8F2EC]">Casino Floor</h2>
        </div>
        <Link href="/games" className="text-xs font-semibold text-[#8FA39A] hover:text-[#35D399]">View all →</Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">{games.map((game) => <GameTile key={game.name} game={game} />)}</div>
    </div>
  );
}

function Games() {
  return (
    <div className="px-3 pt-3 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-[#35D399]">Off-Chain Ledger</span>
          <h1 className="text-xl font-bold tracking-tight text-[#E8F2EC]">Casino Floor</h1>
        </div>
        <span className="rounded-full border border-[#1C3A2E] bg-[#0E1A16] px-2.5 py-1 font-mono-custom text-[11px] text-[#8FA39A]">
          4 Live Games
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

function DemoAction({ label }: { label: string }) {
  const { toast } = useToast();
  return <button type="button" onClick={() => toast({ title: `Use Wallet to ${label.toLowerCase()} $KTK` })} className="rounded-xl border border-border bg-card px-3 py-3 text-sm font-semibold">{label}</button>;
}

function Profile() {
  const { user, authenticated } = usePrivy();
  const { logout } = useLogout();
  const { serverUser, loading } = useServerSession();
  const { legend } = useLegend();
  const name = user?.email?.address ?? user?.google?.email ?? user?.wallet?.address?.slice(0, 8) ?? 'Guest';
  return (
    <div className="px-3 pt-3">
      <LegendCard legend={legend} playable={serverUser?.demoCredits} variant={legend?.profileComplete ? 'full' : 'ghost'} />
      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">{authenticated ? name : 'Not signed in'}</p>
        <p className="mt-2 font-mono-custom text-2xl">{loading && !serverUser ? '...' : (serverUser?.demoCredits ?? 0)} $KTK</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href="/wallet" className="rounded-xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground">Wallet</Link>
          <DemoAction label="Withdraw" />
        </div>
      </div>
      {authenticated ? <button type="button" onClick={() => void logout()} className="mt-6 w-full rounded-xl bg-accent py-3 text-sm font-semibold">Logout</button> : <div className="mt-6"><WalletAuthButton /></div>}
    </div>
  );
}

function MenuPage() {
  return (
    <div className="px-3 pt-3">
      <h1 className="text-2xl font-semibold">Kit</h1>
      <DemoNotice>$KTK is off-chain test credit.</DemoNotice>
      <MenuRow href="/legend" icon={Shield} label="My legend" />
      <MenuRow href="/pvp" icon={Swords} label="PvP Arena (21, Four, Ludo)" />
      <MenuRow href="/cashier" icon={CreditCard} label="Cashier & Top Up" />
      <MenuRow href="/leaderboard" icon={Trophy} label="Leaderboard (OVR)" />
      <MenuRow href="/play" icon={Play} label="Play floor" />
      <MenuRow href="/games" icon={Grid2X2} label="Casino" />
      <MenuRow href="/games/dice" icon={Dices} label="Dice" />
      <MenuRow href="/games/coinflip" icon={CircleDollarSign} label="Coin Flip" />
      <MenuRow href="/games/mines" icon={Gem} label="Mines" />
      <MenuRow href="/games/roulette" icon={Ticket} label="Roulette" />
      <MenuRow href="/wallet" icon={WalletCards} label="Wallet" />
      <MenuRow href="/profile" icon={UserRound} label="Profile" />
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
        <Route path="/play" component={PlayPage} />
        <Route path="/legend" component={LegendPage} />

        {/* Redirects for legacy routes /clash and /club */}
        <Route path="/clash">{() => <RedirectTo to="/pvp" />}</Route>
        <Route path="/club">{() => <RedirectTo to="/pvp" />}</Route>
        <Route path="/club/four/:id">{(params) => <RedirectTo to={`/pvp/four/${params.id}`} />}</Route>
        <Route path="/club/ludo/:id">{(params) => <RedirectTo to={`/pvp/ludo/${params.id}`} />}</Route>

        {/* PvP Floor & Games */}
        <Route path="/pvp" component={PvPLobby} />
        <Route path="/pvp/21/:id" component={PvP21Page} />
        <Route path="/pvp/four/:id" component={ClubFourPage} />
        <Route path="/pvp/ludo/:id" component={ClubLudoPage} />

        <Route path="/cashier" component={CashierPage} />
        <Route path="/leaderboard" component={LeaderboardPage} />
        <Route path="/menu" component={MenuPage} />
        <Route path="/kit" component={MenuPage} />
        <Route path="/games/dice" component={DicePage} />
        <Route path="/games/coinflip" component={CoinFlipPage} />
        <Route path="/games/mines" component={MinesPage} />
        <Route path="/games/roulette" component={RoulettePage} />
        <Route path="/games" component={Games} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/rewards" component={RewardsPage} />
        <Route path="/profile" component={Profile} />
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
