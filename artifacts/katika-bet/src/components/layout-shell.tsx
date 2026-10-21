import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ChevronRight,
  CreditCard,
  Gamepad2,
  Gift,
  Play,
  Swords,
  UserRound,
  Zap,
  Pickaxe,
} from 'lucide-react';
import { useServerSession } from '@/components/server-session';
import { useBallEconomy } from '@/hooks/use-ball-economy';
import { WalletAuthButton } from '@/components/wallet-auth';
import { KatikaLogo } from '@/components/katika-logo';

export function Brand() {
  return (
    <Link href="/mine" className="flex items-center gap-2 group">
      <div className="transition-transform group-hover:scale-105 active:scale-95">
        <KatikaLogo className="h-8 w-8" />
      </div>
      <span className="text-[16px] font-black tracking-[-.03em] text-white">
        Katika<span className="text-[#35D399]">.</span>Bet
      </span>
    </Link>
  );
}

const bottom = [
  { href: '/mine', label: 'Mine', icon: Pickaxe },
  { href: '/pvp', label: 'PvP', icon: Swords },
  { href: '/games', label: 'Casino', icon: Gamepad2 },
  { href: '/profile', label: 'Profile', icon: UserRound },
];

function tabClass(active: boolean) {
  return active
    ? 'flex min-w-[64px] flex-col items-center gap-1 rounded-xl py-1 text-[11px] font-bold text-[#35D399] transition-all'
    : 'flex min-w-[64px] flex-col items-center gap-1 rounded-xl py-1 text-[11px] font-medium text-[#648074] hover:text-[#9bb2a7] transition-all';
}

export function LayoutShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { serverUser, loading, error } = useServerSession();
  const { state: ballState } = useBallEconomy();
  const credits = serverUser?.ktk ?? serverUser?.demoCredits;
  const label = loading
    ? '...'
    : typeof credits === 'number'
      ? credits.toLocaleString() + ' KTK'
      : error
        ? 'API'
        : '0 KTK';

  return (
    <div className="min-h-[100dvh] bg-[#07110E] text-[#E8F2EC]">
      {/* Sticky Header with Official Brand Logo, Cashier Balance, and $BALL Token Counter */}
      <header className="sticky top-0 z-40 border-b border-[#1C3A2E]/60 bg-[#07110E]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[520px] items-center justify-between px-3">
          <Brand />
          <div className="flex items-center gap-2">
            {/* $BALL Token Game Pass Counter */}
            <Link
              href="/mine"
              className="flex items-center gap-1.5 rounded-full border border-yellow-500/40 bg-[#0E1A16] px-2.5 py-1 font-mono-custom text-[11px] font-bold text-yellow-400 shadow-sm hover:border-yellow-400 hover:bg-yellow-400/15 active:scale-95 transition-all"
              title="Available $BALL tokens for matches (1 $BALL per game)"
            >
              <span>⚽</span>
              <span>{ballState.balls} BALL</span>
            </Link>

            {/* Clickable Balance navigating to Cashier */}
            <Link
              href="/cashier"
              className="flex items-center gap-1.5 rounded-full border border-[#35D399]/40 bg-[#0E1A16] px-3 py-1 font-mono-custom text-[11px] font-bold text-[#35D399] shadow-sm hover:border-[#35D399] hover:bg-[#35D399]/15 active:scale-95 transition-all"
              title="Click to open Cashier & Top Up"
            >
              <span>{label}</span>
              <span className="rounded-full bg-[#35D399]/20 px-1 text-[9px] font-black text-[#35D399]">+</span>
            </Link>
            <WalletAuthButton compact className="hidden sm:flex" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[520px] pb-24">{children}</main>

      <footer className="mx-auto max-w-[520px] px-4 pb-28 text-center text-[11px] text-[#5C7368]">
        18+ KTK is gaming test credit. Play responsibly.
      </footer>

      {/* Primary Bottom Navigation (Mine, PvP, Casino, Profile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1C3A2E] bg-[#07110E]/98 backdrop-blur-lg pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex max-w-md items-center justify-around px-2">
          {bottom.map((item) => {
            const active =
              item.href === '/mine'
                ? location === '/mine' || location === '/tap' || location === '/legend' || location === '/swap' || location === '/'
                : item.href === '/pvp'
                  ? location === '/pvp' || location.startsWith('/pvp/') || location.startsWith('/games/pool')
                  : item.href === '/games'
                    ? location === '/games' || location.startsWith('/games/dice') || location.startsWith('/games/coinflip') || location.startsWith('/games/mines') || location.startsWith('/games/roulette')
                    : location === item.href || location.startsWith(item.href + '/') || location === '/cashier' || location === '/wallet' || location === '/kit' || location === '/menu';
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={tabClass(active)}>
                <Icon size={20} className={active ? 'scale-110 transition-transform' : ''} />
                <span>{item.label}</span>
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
    <div className="rounded-xl border border-[#1C3A2E] bg-[#0E1A16] px-3 py-2 text-xs text-[#8FA39A]">
      {children}
    </div>
  );
}

export function MenuRow({
  icon: Icon,
  title,
  subtitle,
  href,
  badge,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  href: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-[#1C3A2E] bg-[#0E1A16] p-3 transition-colors hover:border-[#35D399]/40 hover:bg-[#11241C]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#07110E] text-[#35D399]">
          <Icon size={18} />
        </div>
        <div>
          <div className="text-sm font-semibold text-[#E8F2EC]">{title}</div>
          {subtitle && <div className="text-xs text-[#8FA39A]">{subtitle}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="rounded-full bg-[#35D399]/15 px-2 py-0.5 text-[10px] font-semibold text-[#35D399]">
            {badge}
          </span>
        )}
        <ChevronRight size={16} className="text-[#8FA39A]" />
      </div>
    </Link>
  );
}
