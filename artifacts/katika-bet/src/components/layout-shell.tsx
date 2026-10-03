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
} from 'lucide-react';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';
import { KatikaLogo } from '@/components/katika-logo';

export function Brand() {
  return (
    <Link href="/tap" className="flex items-center gap-2 group">
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
  { href: '/tap', label: 'Tap', icon: Zap },
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
      {/* Sticky Header with Official Brand Logo & Clickable Cashier Balance */}
      <header className="sticky top-0 z-40 border-b border-[#1C3A2E]/60 bg-[#07110E]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[520px] items-center justify-between px-3">
          <Brand />
          <div className="flex items-center gap-2">
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

      {/* Primary Bottom Navigation (Tap, PvP, Casino, Profile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1C3A2E] bg-[#07110E]/98 backdrop-blur-lg pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex max-w-md items-center justify-around px-2">
          {bottom.map((item) => {
            const active =
              item.href === '/tap'
                ? location === '/tap' || location === '/legend' || location === '/swap' || location === '/'
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
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Gift;
  label: string;
}) {
  return (
    <Link href={href} className="flex items-center justify-between border-b border-[#1C3A2E] px-1 py-3.5 text-sm">
      <span className="flex items-center gap-3">
        <Icon size={16} className="text-[#8FA39A]" />
        {label}
      </span>
      <ChevronRight size={16} className="text-[#5C7368]" />
    </Link>
  );
}
