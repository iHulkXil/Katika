import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ChevronRight,
  Gift,
  Grid2X2,
  Home as HomeIcon,
  Play,
  Shield,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">K</span>
      <span className="text-[15px] font-semibold tracking-[-.04em]">
        Katika<span className="text-primary">.</span>Bet
      </span>
    </Link>
  );
}

const chips = [
  { href: '/', label: 'Home' },
  { href: '/legend', label: 'Legend' },
  { href: '/play', label: 'Play' },
  { href: '/games', label: 'Casino' },
  { href: '/wallet', label: 'Wallet' },
];

const bottom = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/legend', label: 'Legend', icon: Shield },
  { href: '/play', label: 'Play', icon: Play },
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
              {typeof credits === 'number' ? credits.toLocaleString() : '—'} KCHIP
            </span>
            <WalletAuthButton compact className="hidden sm:flex" />
          </div>
        </div>
        <div className="mx-auto flex max-w-[520px] gap-1 overflow-x-auto px-3 pb-2 lg:max-w-[1240px] lg:px-6">
          {chips.map((chip) => {
            const active = chip.href === '/' ? location === '/' : location === chip.href || location.startsWith(`${chip.href}/`);
            return (
              <Link key={chip.href + chip.label} href={chip.href} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${active ? 'bg-accent text-primary' : 'text-muted-foreground'}`}>
                {chip.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-[520px] pb-24 lg:max-w-[1240px]">{children}</main>

      <footer className="mx-auto max-w-[520px] px-4 pb-28 text-center text-[11px] text-muted-foreground lg:max-w-[1240px]">
        <p className="font-semibold text-secondary">18+</p>
        <p className="mt-2">Katika.Bet Sepolia testnet. KCHIP has no cash value. No mainnet deposits.</p>
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-card/95 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-around">
          {bottom.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? location === '/' : location === href || location.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} className={`flex min-w-[56px] flex-col items-center gap-1 rounded-lg py-1 text-[10px] ${active ? 'text-primary' : 'text-muted-foreground'}`}>
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
    <Link href={href} className="flex items-center justify-between border-b border-border/70 px-1 py-3.5 text-sm">
      <span className="flex items-center gap-3 text-foreground">
        <Icon size={16} className="text-muted-foreground" />
        {label}
      </span>
      <ChevronRight size={16} className="text-muted-foreground" />
    </Link>
  );
}
