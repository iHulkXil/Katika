import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  CircleDot,
  Crown,
  Dice5,
  Gift,
  Grid2X2,
  Home as HomeIcon,
  Menu,
  Trophy,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2" data-testid="link-brand">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        K
      </span>
      <span className="text-[15px] font-semibold tracking-[-.04em]">
        Katika<span className="text-primary">.</span>Bet
      </span>
    </Link>
  );
}

const chips = [
  { href: '/', label: 'Home' },
  { href: '/games', label: 'Casino' },
  { href: '/games/dice', label: 'Live' },
  { href: '/rewards', label: 'Promos' },
  { href: '/leaderboard', label: 'More' },
];

const bottom = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/menu', label: 'Menu', icon: Menu },
  { href: '/games', label: 'Casino', icon: Grid2X2 },
  { href: '/wallet', label: 'Wallet', icon: WalletCards },
  { href: '/profile', label: 'Profile', icon: UserRound },
];

export function LayoutShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { serverUser } = useServerSession();
  const credits = serverUser?.demoCredits;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[520px] items-center justify-between px-3 lg:max-w-[1240px] lg:px-6">
          <Brand />
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-primary/30 bg-accent px-2.5 py-1 font-mono-custom text-[11px] text-accent-foreground">
              {typeof credits === 'number' ? credits.toLocaleString() : '—'} DEMO
            </span>
            <WalletAuthButton compact className="hidden sm:flex" />
          </div>
        </div>
        <div className="mx-auto flex max-w-[520px] gap-2 overflow-x-auto px-3 pb-2 lg:max-w-[1240px] lg:px-6">
          {[
            { href: '/games/dice', label: 'Dice', icon: Dice5 },
            { href: '/games', label: 'Casino', icon: CircleDot },
            { href: '/rewards', label: 'Rewards', icon: Crown },
            { href: '/leaderboard', label: 'Board', icon: Trophy },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex min-w-[72px] flex-col items-center gap-1 rounded-xl border border-border bg-card px-2 py-2 text-[10px] text-muted-foreground"
            >
              <Icon size={16} className="text-secondary" />
              {label}
            </Link>
          ))}
        </div>
        <div className="mx-auto flex max-w-[520px] gap-1 overflow-x-auto px-3 pb-2 lg:max-w-[1240px] lg:px-6">
          {chips.map((chip) => {
            const active =
              chip.href === '/'
                ? location === '/'
                : location === chip.href || location.startsWith(`${chip.href}/`);
            return (
              <Link
                key={chip.href + chip.label}
                href={chip.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${active ? 'bg-accent text-primary' : 'text-muted-foreground'}`}
              >
                {chip.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-[520px] pb-24 lg:max-w-[1240px]">{children}</main>

      <footer className="mx-auto max-w-[520px] px-4 pb-28 text-center text-[11px] text-muted-foreground lg:max-w-[1240px]">
        <p className="font-semibold text-secondary">18+</p>
        <p className="mt-2">Katika.Bet is a demo. No real-money deposits, bets, or withdrawals.</p>
        <div className="mt-3 flex justify-center gap-2 text-[10px] uppercase tracking-wider">
          <span className="rounded border border-border px-2 py-1">Demo</span>
          <span className="rounded border border-border px-2 py-1">Privy</span>
          <span className="rounded border border-border px-2 py-1">Wallet</span>
        </div>
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-card/95 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-around">
          {bottom.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/'
                ? location === '/'
                : location === href || (href === '/games' && location.startsWith('/games'));
            return (
              <Link
                key={href}
                href={href}
                data-testid={`link-mobile-${label.toLowerCase()}`}
                className={`flex min-w-[56px] flex-col items-center gap-1 rounded-lg py-1 text-[10px] ${active ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-secondary/30 bg-accent/40 px-3 py-2 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

export function MenuRow({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Gift;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border-b border-border/70 px-1 py-3.5 text-sm"
    >
      <span className="flex items-center gap-3 text-foreground">
        <Icon size={16} className="text-muted-foreground" />
        {label}
      </span>
      <span className="text-muted-foreground">&gt;</span>
    </Link>
  );
}
