import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ConnectedWalletStatus, WalletAuthButton } from '@/components/wallet-auth';
import { DicePage } from '@/components/dice-page';
import { CoinFlipPage } from '@/components/coinflip-page';
import { MinesPage } from '@/components/mines-page';
import { RoulettePage } from '@/components/roulette-page';
import { DemoNotice, LayoutShell, MenuRow } from '@/components/layout-shell';
import { useServerSession } from '@/components/server-session';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { useLogout, usePrivy } from '@privy-io/react-auth';
import {
  CircleDot, Coins, Crown, Dice5, Gem, Gift, Grid2X2, Headset, History,
  Settings, ShieldCheck, Trophy, UserRound, WalletCards,
} from 'lucide-react';

const queryClient = new QueryClient();

type Game = { name: string; description: string; href?: string; icon: ReactNode; accent: string };
const games: Game[] = [
  { name: 'Dice', description: '1–100 slider.', href: '/games/dice', icon: <Dice5 />, accent: 'from-emerald-400/25 to-emerald-950/20' },
  { name: 'Coin Flip', description: 'Heads or tails.', href: '/games/coinflip', icon: <CircleDot />, accent: 'from-amber-300/20 to-amber-950/20' },
  { name: 'Mines', description: '5x5 gem grid.', href: '/games/mines', icon: <Gem />, accent: 'from-teal-300/20 to-teal-950/20' },
  { name: 'Roulette', description: 'European 0–36.', href: '/games/roulette', icon: <Grid2X2 />, accent: 'from-yellow-300/20 to-yellow-950/20' },
];

function GameTile({ game }: { game: Game }) {
  const inner = (
    <div className={`relative min-h-[148px] overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${game.accent} p-4`}>
      <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 font-mono-custom text-[10px] text-primary-foreground">PLAY</span>
      <div className="mt-8 text-secondary [&_svg]:h-7 [&_svg]:w-7">{game.icon}</div>
      <h3 className="mt-3 text-lg font-semibold">{game.name}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{game.description}</p>
    </div>
  );
  return <Link href={game.href ?? '/games'} className="block">{inner}</Link>;
}

function Home() {
  return (
    <div className="px-3 pt-3">
      <div className="overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-accent to-card p-4">
        <p className="font-mono-custom text-[10px] tracking-[.2em] text-primary">CASINO / DEMO</p>
        <h1 className="mt-2 text-2xl font-semibold">Four tables are live.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Demo credits only. No cash.</p>
        <Link href="/games" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Casino lobby</Link>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">{games.map((game) => <GameTile key={game.name} game={game} />)}</div>
    </div>
  );
}

function Games() {
  return (
    <div className="px-3 pt-3">
      <h1 className="text-2xl font-semibold">Casino</h1>
      <p className="mt-1 text-sm text-muted-foreground">All four tables settle on the server with demo credits.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{games.map((game) => <GameTile key={game.name} game={game} />)}</div>
    </div>
  );
}

function Wallet() {
  return <div className="px-3 pt-3"><h1 className="text-2xl font-semibold">Wallet</h1><p className="mt-1 text-sm text-muted-foreground">Demo credits only.</p><div className="mt-4"><ConnectedWalletStatus /></div></div>;
}

function DemoAction({ label }: { label: string }) {
  const { toast } = useToast();
  return <button type="button" onClick={() => toast({ title: `${label} is demo-only` })} className="rounded-xl border border-border bg-card px-3 py-3 text-sm font-semibold">{label}</button>;
}

function Profile() {
  const { user, authenticated } = usePrivy();
  const { logout } = useLogout();
  const { serverUser } = useServerSession();
  const name = user?.email?.address ?? user?.google?.email ?? user?.wallet?.address?.slice(0, 8) ?? 'Guest';
  return (
    <div className="px-3 pt-3">
      <div className="rounded-2xl border border-border bg-gradient-to-b from-accent to-card p-4">
        <p className="text-lg font-semibold">{authenticated ? name : 'Not signed in'}</p>
        <p className="mt-3 font-mono-custom text-2xl">{serverUser?.demoCredits ?? 0} DEMO</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" disabled className="rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">Deposit</button>
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
      <h1 className="text-2xl font-semibold">Menu</h1>
      <DemoNotice>Four demo tables. Cash stays off.</DemoNotice>
      <MenuRow href="/games" icon={Grid2X2} label="Casino" />
      <MenuRow href="/games/dice" icon={Dice5} label="Dice" />
      <MenuRow href="/games/coinflip" icon={CircleDot} label="Coin Flip" />
      <MenuRow href="/games/mines" icon={Gem} label="Mines" />
      <MenuRow href="/games/roulette" icon={Grid2X2} label="Roulette" />
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
        <Route path="/menu" component={MenuPage} />
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
