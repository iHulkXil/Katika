import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConnectedWalletStatus, WalletAuthButton } from '@/components/wallet-auth';
import { DicePage } from '@/components/dice-page';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import {
  ArrowRight, Check, ChevronRight, CircleDot, Coins, Crown, Dice5, Gem,
  Grid2X2, Home as HomeIcon, ShieldCheck, Sparkles, Trophy, UserRound, WalletCards,
} from 'lucide-react';

const queryClient = new QueryClient();

type Game = { name: string; description: string; icon: ReactNode; accent: string; index: string };
const games: Game[] = [
  { name: 'Dice', description: 'High or low. Demo credits only.', icon: <Dice5 />, accent: 'from-emerald-400/20 to-emerald-950/10', index: '01' },
  { name: 'Coin Flip', description: 'A moment of chance, made beautifully simple.', icon: <CircleDot />, accent: 'from-amber-300/20 to-amber-950/10', index: '02' },
  { name: 'Mines', description: 'Navigate the unknown. Every tile tells a story.', icon: <Gem />, accent: 'from-teal-300/20 to-teal-950/10', index: '03' },
  { name: 'Roulette', description: 'A timeless table, reimagined for what is next.', icon: <Grid2X2 />, accent: 'from-yellow-300/20 to-yellow-950/10', index: '04' },
];

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/games', label: 'Games', icon: Grid2X2 },
  { href: '/wallet', label: 'Wallet', icon: WalletCards },
  { href: '/rewards', label: 'Rewards', icon: Crown },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" className="flex items-center gap-2.5 w-fit" data-testid="link-brand">
    <span className={`grid h-8 w-8 place-items-center rounded-[10px] ${light ? 'bg-primary text-primary-foreground' : 'bg-primary text-primary-foreground'}`}><span className="text-sm font-bold">K</span></span>
    <span className="text-[17px] font-semibold tracking-[-.04em] text-foreground">Katika<span className="text-primary">.</span>Bet</span>
  </Link>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <div className="min-h-[100dvh] bg-background">
    <header className="border-b border-border/70 bg-background/90 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
        <Brand />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase()}`} className={`rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-foreground ${location === href || (href === '/games' && location.startsWith('/games')) ? 'bg-accent text-primary' : 'text-muted-foreground'}`}><Icon size={15} className="mr-2 inline-block" />{label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/profile" aria-label="Open profile" data-testid="link-profile" className={`grid h-9 w-9 place-items-center rounded-full border transition-colors hover:border-primary/60 ${location === '/profile' ? 'border-primary bg-accent' : 'border-border bg-card'}`}><UserRound size={16} /></Link>
          <WalletAuthButton compact className="hidden sm:flex" />
        </div>
      </div>
    </header>
    <main className="pb-24 md:pb-0">{children}</main>
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-card/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-mobile-${label.toLowerCase()}`} className={`flex min-w-[52px] flex-col items-center gap-1 rounded-lg py-1 text-[10px] ${location === href || (href === '/games' && location.startsWith('/games')) ? 'text-primary' : 'text-muted-foreground'}`}><Icon size={19} /><span>{label}</span></Link>)}
      </div>
    </nav>
  </div>;
}

function ButtonLink({ href, children, variant = 'primary', testId }: { href: string; children: ReactNode; variant?: 'primary' | 'quiet'; testId: string }) {
  return <Link href={href} data-testid={testId} className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${variant === 'primary' ? 'bg-primary text-primary-foreground shadow-[0_10px_30px_hsl(155_55%_48%_/_0.15)]' : 'border border-border bg-card text-foreground hover:border-primary/50'}`}>{children}</Link>;
}

function GameCard({ game, featured = false }: { game: Game; featured?: boolean }) {
  const live = game.name === 'Dice';
  const inner = (
    <div data-testid={`card-game-${game.name.toLowerCase().replace(' ', '-')}`} className={`group relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br ${game.accent} ${featured ? 'min-h-[290px] md:min-h-[330px]' : 'min-h-[240px]'} p-5 transition-all hover:-translate-y-1 hover:border-primary/50`}>
      <div className="absolute -right-9 -top-12 h-32 w-32 rounded-full border border-primary/10 bg-background/10 transition-transform duration-500 group-hover:scale-125" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between"><span className="font-mono-custom text-[11px] tracking-widest text-muted-foreground">{game.index} / {live ? 'LIVE DEMO' : 'FUTURE'}</span><span className={`rounded-full border px-2 py-1 font-mono-custom text-[10px] ${live ? 'border-primary/40 text-primary' : 'border-secondary/30 text-secondary'}`}>{live ? 'PLAY' : 'COMING SOON'}</span></div>
        <div className="mt-auto">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl border border-border/70 bg-background/40 text-secondary [&_svg]:h-6 [&_svg]:w-6">{game.icon}</div>
          <h3 className="text-2xl font-semibold tracking-[-.04em]">{game.name}</h3>
          <p className="mt-2 max-w-[230px] text-sm leading-6 text-muted-foreground">{game.description}</p>
        </div>
      </div>
    </div>
  );
  if (live) {
    return <Link href="/games/dice" className="block">{inner}</Link>;
  }
  return inner;
}

function Home() {
  return <div className="overflow-hidden">
    <section className="relative min-h-[680px] border-b border-border/70 surface-grid">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_42%,hsl(155_55%_48%/.13),transparent_42%),radial-gradient(ellipse_at_20%_80%,hsl(43_74%_60%/.06),transparent_35%)]" />
      <div className="relative mx-auto flex min-h-[680px] max-w-[1240px] items-center px-5 pb-12 pt-16 lg:px-8"><div className="max-w-[720px] reveal">
        <p className="mb-6 flex items-center gap-2 font-mono-custom text-[11px] uppercase tracking-[.25em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_hsl(155_55%_48%)]" /> The next play is being built</p>
        <h1 className="max-w-[760px] text-5xl font-semibold leading-[.98] tracking-[-.065em] sm:text-7xl lg:text-[92px]">A new way to<br /><span className="text-primary">play with chance.</span></h1>
        <p className="mt-7 max-w-[525px] text-base leading-7 text-muted-foreground sm:text-lg">Katika.Bet is a premium gaming destination in the making. Explore the first look at a thoughtful, wallet-ready experience built for the curious.</p>
        <div className="mt-9 flex flex-wrap gap-3"><ButtonLink href="/games/dice" testId="button-play-demo">Play Dice <ArrowRight size={16} /></ButtonLink><ButtonLink href="/wallet" variant="quiet" testId="button-open-wallet">Wallet</ButtonLink><WalletAuthButton /></div>
        <div className="mt-12 flex items-center gap-5 text-xs text-muted-foreground"><span className="flex items-center gap-2"><ShieldCheck size={15} className="text-primary" /> Wallet-based access</span><span className="h-1 w-1 rounded-full bg-border" /><span>Demo mode during development</span></div>
      </div><div className="absolute bottom-10 right-8 hidden h-64 w-64 rounded-full border border-primary/20 lg:block"><div className="absolute inset-8 rounded-full border border-secondary/20" /><div className="absolute inset-[64px] grid place-items-center rounded-full bg-card shadow-[0_0_80px_hsl(155_55%_48%_/_0.13)]"><Dice5 size={52} strokeWidth={1} className="text-secondary" /></div><span className="absolute -right-6 top-16 font-mono-custom text-[10px] tracking-[.22em] text-muted-foreground [writing-mode:vertical-rl]">KATIKA / 001</span></div></div>
    </section>
    <section className="mx-auto max-w-[1240px] px-5 py-20 lg:px-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="font-mono-custom text-[11px] tracking-[.22em] text-secondary">01 / THE LOBBY</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.06em] sm:text-5xl">Meet the first four.</h2></div><p className="max-w-[320px] text-sm leading-6 text-muted-foreground">Dice is playable with demo credits. The other tables stay closed.</p></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{games.map((game, i) => <GameCard key={game.name} game={game} featured={i === 0} />)}</div></section>
    <section className="border-y border-border/70 bg-card/30"><div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-20 lg:grid-cols-[.9fr_1.4fr] lg:px-8"><div><p className="font-mono-custom text-[11px] tracking-[.22em] text-primary">02 / OUR APPROACH</p><h2 className="mt-4 max-w-md text-4xl font-semibold leading-tight tracking-[-.06em]">Trust is part of the interface.</h2><p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">We are building a place where every detail earns its place. No noise, no pressure — just a clear foundation for what comes next.</p></div><div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">{[['01','Wallet-based access','Your connection is your key.'],['02','Fair gameplay','Clarity comes before complexity.'],['03','Demo mode','A safe space to explore while we build.']].map(([num,title,copy]) => <div key={num} className="bg-background p-6"><span className="font-mono-custom text-xs text-secondary">{num}</span><h3 className="mt-14 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p></div>)}</div></div></section>
    <footer className="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-9 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8"><Brand /><p>Katika.Bet is in development. No real-money functionality is available.</p><span className="font-mono-custom">© 2025 KATIKA</span></footer>
  </div>;
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="border-b border-border/70 surface-grid"><div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8 lg:py-20"><p className="font-mono-custom text-[11px] tracking-[.22em] text-primary">{eyebrow}</p><h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-.065em] sm:text-6xl">{title}</h1><p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">{description}</p></div></div>;
}

function Dashboard() {
  return <><PageIntro eyebrow="01 / OVERVIEW" title="Welcome to Katika.Bet" description="Dice is live on demo credits. Other tables stay visual-only." /><div className="mx-auto max-w-[1240px] px-5 py-10 lg:px-8"><div className="grid gap-4 md:grid-cols-[1.35fr_1fr_1fr]"><StatCard label="Demo Balance" value="See Wallet" icon={<Coins />} /><StatCard label="Leaderboard" value="Coming Soon" icon={<Trophy />} /><StatCard label="Rewards" value="Coming Soon" icon={<Crown />} /></div><div className="mt-8 max-w-md"><ConnectedWalletStatus /></div><div className="mt-12 flex items-center justify-between"><div><p className="font-mono-custom text-[11px] tracking-[.22em] text-secondary">AVAILABLE NOW</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">Games</h2></div><Link href="/games" className="flex items-center gap-1 text-sm text-primary hover:underline" data-testid="link-dashboard-games">View lobby <ChevronRight size={15} /></Link></div><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{games.map(game => <GameCard key={game.name} game={game} />)}</div></div></>;
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <div data-testid={`status-${label.toLowerCase().replace(' ', '-')}`} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><span className="text-secondary [&_svg]:h-4 [&_svg]:w-4">{icon}</span></div><p className="mt-8 font-mono-custom text-lg text-foreground">{value}</p><div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted"><div className="h-full w-1/4 rounded-full bg-secondary/60" /></div></div>;
}

function Games() {
  return <><PageIntro eyebrow="02 / GAME LOBBY" title="A table for every kind of curious." description="Dice is playable. Coin Flip, Mines, and Roulette stay closed." /><div className="mx-auto max-w-[1240px] px-5 py-10 lg:px-8"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{games.map(game => <GameCard key={game.name} game={game} />)}</div></div></>;
}

function Placeholder({ kind, icon: Icon, title, copy }: { kind: string; icon: typeof WalletCards; title: string; copy: string }) {
  return <><PageIntro eyebrow={kind} title={title} description={copy} /><div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8"><div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 sm:p-12"><div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border border-primary/10" /><div className="relative max-w-lg"><div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-primary"><Icon size={22} /></div><h2 className="mt-7 text-2xl font-semibold tracking-[-.04em]">This space is being prepared.</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{copy} This functionality arrives in a future sprint. For now, there is nothing to connect, claim, or configure.</p><div className="mt-7 flex items-center gap-2 text-xs text-secondary"><Check size={15} /> Sprint 1 foundation complete</div></div></div></div></>;
}

function Profile() { return <><PageIntro eyebrow="06 / PROFILE" title="Your profile, when you're ready." description="Profile preferences and wallet identity will have a home here." /><div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8"><div className="max-w-lg rounded-2xl border border-border bg-card p-8 sm:p-12"><div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-primary"><UserRound size={22} /></div><h2 className="mt-7 text-2xl font-semibold tracking-[-.04em]">Wallet identity</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">Privy connection status is shown below. Profile preferences arrive in a future sprint.</p><div className="mt-7"><ConnectedWalletStatus /></div></div></div></>; }
function Wallet() { return <><PageIntro eyebrow="03 / WALLET" title="Your wallet, on your terms." description="Use Privy to connect a wallet identity to Katika.Bet. Demo credits are visible here. There are no deposits or withdrawals." /><div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8"><div className="max-w-lg rounded-2xl border border-border bg-card p-8 sm:p-12"><div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-primary"><WalletCards size={22} /></div><h2 className="mt-7 text-2xl font-semibold tracking-[-.04em]">Wallet connection</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">Connect or disconnect your wallet using Privy. Financial functionality is not active.</p><div className="mt-7"><ConnectedWalletStatus /></div></div></div></>; }
function Rewards() { return <Placeholder kind="04 / REWARDS" title="Good things take a little time." copy="A future rewards layer will give your exploration more meaning. Nothing is being tracked yet." icon={Crown} />; }
function Leaderboard() { return <Placeholder kind="05 / LEADERBOARD" title="The table is waiting." copy="A transparent leaderboard is planned for a future sprint. There are no rankings or player data yet." icon={Trophy} />; }

function NotFound() { return <div className="grid min-h-[100dvh] place-items-center px-5"><div className="max-w-md text-center"><p className="font-mono-custom text-xs tracking-[.25em] text-secondary">404 / OFF THE TABLE</p><h1 className="mt-5 text-5xl font-semibold tracking-[-.06em]">This page hasn't been dealt.</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">The route you requested does not exist in the current foundation.</p><ButtonLink href="/" testId="button-return-home">Return home <ArrowRight size={15} /></ButtonLink></div></div>; }

function Router() {
  return <ErrorRouted><Switch><Route path="/" component={Home} /><Route path="/dashboard" component={Dashboard} /><Route path="/games/dice" component={DicePage} /><Route path="/games" component={Games} /><Route path="/wallet" component={Wallet} /><Route path="/rewards" component={Rewards} /><Route path="/leaderboard" component={Leaderboard} /><Route path="/profile" component={Profile} /><Route component={NotFound} /></Switch></ErrorRouted>;
}
function ErrorRouted({ children }: { children: ReactNode }) { const [location] = useLocation(); return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>; }
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Shell><Router /></Shell></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;
