import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ConnectedWalletStatus, WalletAuthButton } from '@/components/wallet-auth';
import { DicePage } from '@/components/dice-page';
import { CoinFlipPage } from '@/components/coinflip-page';
import { DemoNotice, LayoutShell, MenuRow } from '@/components/layout-shell';
import { useServerSession } from '@/components/server-session';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { useLogout, usePrivy } from '@privy-io/react-auth';
import {
  CircleDot,
  Coins,
  Crown,
  Dice5,
  Gem,
  Gift,
  Grid2X2,
  Headset,
  History,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound,
  WalletCards,
} from 'lucide-react';

const queryClient = new QueryClient();

type Game = {
  name: string;
  description: string;
  href?: string;
  icon: ReactNode;
  accent: string;
};

const games: Game[] = [
  { name: 'Dice', description: '1–100 slider. Auto play.', href: '/games/dice', icon: <Dice5 />, accent: 'from-emerald-400/25 to-emerald-950/20' },
  { name: 'Coin Flip', description: 'Heads or tails. 1.98x.', href: '/games/coinflip', icon: <CircleDot />, accent: 'from-amber-300/20 to-amber-950/20' },
  { name: 'Mines', description: 'Coming soon', icon: <Gem />, accent: 'from-teal-300/20 to-teal-950/20' },
  { name: 'Roulette', description: 'Coming soon', icon: <Grid2X2 />, accent: 'from-yellow-300/20 to-yellow-950/20' },
];

function GameTile({ game }: { game: Game }) {
  const inner = (
    <div className={`relative min-h-[148px] overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${game.accent} p-4`}>
      <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 font-mono-custom text-[10px] ${game.href ? 'bg-primary text-primary-foreground' : 'border border-secondary/40 text-secondary'}`}>
        {game.href ? 'PLAY' : 'SOON'}
      </span>
      <div className="mt-8 text-secondary [&_svg]:h-7 [&_svg]:w-7">{game.icon}</div>
      <h3 className="mt-3 text-lg font-semibold">{game.name}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{game.description}</p>
    </div>
  );
  if (game.href) return <Link href={game.href} className="block">{inner}</Link>;
  return inner;
}

function Home() {
  return (
    <div className="px-3 pt-3">
      <div className="overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-accent to-card p-4">
        <p className="font-mono-custom text-[10px] tracking-[.2em] text-primary">CASINO / DEMO</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-.04em]">Dice and Coin Flip are live.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Demo credits only. Sports and cash stay locked.</p>
        <div className="mt-4 flex gap-2">
          <Link href="/games/dice" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Dice</Link>
          <Link href="/games/coinflip" className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold">Coin Flip</Link>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-secondary">Hot</p>
        <Link href="/games" className="text-xs text-primary">Casino lobby</Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {games.map((game) => <GameTile key={game.name} game={game} />)}
      </div>
    </div>
  );
}

function Games() {
  return (
    <div className="px-3 pt-3">
      <h1 className="text-2xl font-semibold tracking-[-.04em]">Casino</h1>
      <p className="mt-1 text-sm text-muted-foreground">Dice and Coin Flip settle on the server. Mines and Roulette stay closed.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {games.map((game) => <GameTile key={game.name} game={game} />)}
      </div>
    </div>
  );
}

function Wallet() {
  return (
    <div className="px-3 pt-3">
      <h1 className="text-2xl font-semibold tracking-[-.04em]">Wallet</h1>
      <p className="mt-1 text-sm text-muted-foreground">Demo credits only. No cash movement.</p>
      <div className="mt-4"><ConnectedWalletStatus /></div>
    </div>
  );
}

function DemoAction({ label }: { label: string }) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast({ title: `${label} is demo-only`, description: 'No real-money payments in this build.' })} className="rounded-xl border border-border bg-card px-3 py-3 text-sm font-semibold">
      {label}
    </button>
  );
}

function Profile() {
  const { user, authenticated } = usePrivy();
  const { logout } = useLogout();
  const { serverUser } = useServerSession();
  const name = user?.email?.address ?? user?.google?.email ?? user?.wallet?.address?.slice(0, 8) ?? 'Guest';
  return (
    <div className="px-3 pt-3">
      <div className="rounded-2xl border border-border bg-gradient-to-b from-accent to-card p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">{name.slice(0, 1).toUpperCase()}</span>
          <div>
            <p className="text-lg font-semibold">{authenticated ? name : 'Not signed in'}</p>
            <p className="font-mono-custom text-[11px] text-muted-foreground">Demo tier</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Total balance</p>
        <p className="font-mono-custom text-2xl">{serverUser?.demoCredits ?? 0} DEMO</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground" disabled>Deposit</button>
          <DemoAction label="Withdraw" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[{ href: '/wallet', label: 'Bet History', icon: History }, { href: '/wallet', label: 'Transactions', icon: Coins }, { href: '/rewards', label: 'Gifts', icon: Gift }].map((item) => (
          <Link key={item.label} href={item.href} className="rounded-xl border border-border bg-card px-2 py-3 text-center text-[11px]">
            <item.icon size={16} className="mx-auto text-secondary" />
            <span className="mt-2 block">{item.label}</span>
          </Link>
        ))}
      </div>
      {authenticated ? <button type="button" onClick={() => void logout()} className="mt-6 w-full rounded-xl bg-accent py-3 text-sm font-semibold">Logout</button> : <div className="mt-6"><WalletAuthButton /></div>}
    </div>
  );
}

function MenuPage() {
  return (
    <div className="px-3 pt-3">
      <h1 className="text-2xl font-semibold tracking-[-.04em]">Menu</h1>
      <DemoNotice>Casino tables open one at a time. Cash stays off.</DemoNotice>
      <div className="mt-2">
        <MenuRow href="/games" icon={Grid2X2} label="Casino" />
        <MenuRow href="/games/dice" icon={Dice5} label="Dice" />
        <MenuRow href="/games/coinflip" icon={CircleDot} label="Coin Flip" />
        <MenuRow href="/wallet" icon={WalletCards} label="Wallet" />
        <MenuRow href="/profile" icon={UserRound} label="Profile" />
      </div>
    </div>
  );
}

function Placeholder({ title, copy }: { title: string; copy: string }) {
  return <div className="px-3 pt-6"><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{copy}</p></div>;
}

function NotFound() {
  return <div className="px-3 pt-16 text-center"><p className="font-mono-custom text-xs text-secondary">404</p><h1 className="mt-3 text-3xl font-semibold">Off the table</h1><Link href="/" className="mt-6 inline-flex text-sm text-primary">Return home</Link></div>;
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
        <Route path="/games" component={Games} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/rewards" component={() => <Placeholder title="Rewards" copy="Later." />} />
        <Route path="/leaderboard" component={() => <Placeholder title="Leaderboard" copy="Later." />} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
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
