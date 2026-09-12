import { type ReactNode } from 'react';
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
import { HomeLegendHero, LegendCard, useLegend } from '@/components/legend-card';
import { DemoNotice, LayoutShell, MenuRow } from '@/components/layout-shell';
import { useServerSession } from '@/components/server-session';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { useLogout, usePrivy } from '@privy-io/react-auth';
import {
  Bomb, CircleDollarSign, Dices, Gem, Grid2X2, Play, Shield, Ticket, UserRound, WalletCards,
} from 'lucide-react';

const queryClient = new QueryClient();

type Game = { name: string; description: string; href: string; icon: ReactNode };
const games: Game[] = [
  { name: 'Dice', description: '1-100', href: '/games/dice', icon: <Dices /> },
  { name: 'Flip', description: '1.98x', href: '/games/coinflip', icon: <CircleDollarSign /> },
  { name: 'Mines', description: 'Cash out', href: '/games/mines', icon: <Bomb /> },
  { name: 'Roulette', description: '0-36', href: '/games/roulette', icon: <Ticket /> },
];

function GameTile({ game }: { game: Game }) {
  return (
    <Link href={game.href} className="block">
      <div className="relative min-h-[132px] rounded-[22px] border border-[#1C3A2E] bg-[#0E1A16] p-4">
        <span className="absolute right-3 top-3 rounded-full bg-[#35D399] px-2 py-0.5 text-[9px] font-semibold tracking-wide text-[#062018]">PLAY</span>
        <div className="mt-1 text-[#F2C14E] [&_svg]:h-7 [&_svg]:w-7">{game.icon}</div>
        <h3 className="mt-4 text-lg font-semibold">{game.name}</h3>
        <p className="text-[12px] text-[#8FA39A]">{game.description}</p>
      </div>
    </Link>
  );
}

function Home() {
  return (
    <div className="px-3 pt-3">
      <HomeLegendHero />
      <div className="mt-6 flex items-end justify-between px-0.5">
        <h2 className="text-lg font-semibold">Floor</h2>
        <Link href="/games" className="text-sm text-[#8FA39A]">View all →</Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">{games.map((game) => <GameTile key={game.name} game={game} />)}</div>
    </div>
  );
}

function Games() {
  return (
    <div className="px-3 pt-3">
      <h1 className="text-2xl font-semibold">Casino</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tables settle in playable KCHIP.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{games.map((game) => <GameTile key={game.name} game={game} />)}</div>
    </div>
  );
}

function Wallet() {
  return (
    <div className="px-3 pt-3">
      <h1 className="text-2xl font-semibold">Wallet</h1>
      <p className="mt-1 text-sm text-muted-foreground">On-chain KCHIP vs playable stack after the card.</p>
      <div className="mt-4"><ConnectedWalletStatus /></div>
      <h2 className="mt-6 text-sm font-semibold uppercase tracking-[.16em] text-secondary">Bet history</h2>
      <BetHistory />
    </div>
  );
}

function DemoAction({ label }: { label: string }) {
  const { toast } = useToast();
  return <button type="button" onClick={() => toast({ title: `Use Wallet to ${label.toLowerCase()} KCHIP` })} className="rounded-xl border border-border bg-card px-3 py-3 text-sm font-semibold">{label}</button>;
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
        <p className="mt-2 font-mono-custom text-2xl">{loading && !serverUser ? '...' : (serverUser?.demoCredits ?? 0)} PLAYABLE</p>
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
      <DemoNotice>Sepolia testnet. KCHIP has no cash value.</DemoNotice>
      <MenuRow href="/legend" icon={Shield} label="My legend" />
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

function Router() {
  return (
    <ErrorRouted>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={Home} />
        <Route path="/play" component={PlayPage} />
        <Route path="/legend" component={LegendPage} />
        <Route path="/menu" component={MenuPage} />
        <Route path="/kit" component={MenuPage} />
        <Route path="/games/dice" component={DicePage} />
        <Route path="/games/coinflip" component={CoinFlipPage} />
        <Route path="/games/mines" component={MinesPage} />
        <Route path="/games/roulette" component={RoulettePage} />
        <Route path="/games" component={Games} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/rewards" component={() => <Placeholder title="Rewards" />} />
        <Route path="/leaderboard" component={() => <Placeholder title="Leaderboard" />} />
        <Route path="/profile" component={Profile} />
        <Route component={() => <div className="px-3 pt-16 text-center"><Link href="/">Home</Link></div>} />
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
          <LayoutShell><Router /></LayoutShell>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
