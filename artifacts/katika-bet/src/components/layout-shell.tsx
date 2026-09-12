import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ChevronRight,
  Gift,
  Home as HomeIcon,
  Play,
  Star,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-[#35D399] text-sm font-bold text-[#062018]">K</span>
      <span className="text-[15px] font-semibold tracking-[-.04em]">
        Katika<span className="text-[#35D399]">.</span>Bet
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
  { href: '/kit', label: 'Kit' },
];

const bottom = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/legend', label: 'Legend', icon: Star },
  { href: '/play', label: 'Play', icon: Play },
  { href: '/wallet', label: 'Wallet', icon: WalletCards },
  { href: '/profile', label: 'Profile', icon: UserRound },
];

export function LayoutShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { serverUser } = useServerSession();
  const credits = serverUser?.demoCredits;

  return (
    <div className="min-h-[100dvh] bg-[#07110E] text-[#E8F2EC]">
      <header className="sticky top-0 z-40 bg-[#07110E]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[520px] items-center justify-between px-3">
          <Brand />
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#35D399]/40 bg-[#0E1A16] px-2.5 py-1 font-mono-custom text-[11px] text-[#35D399]">
              {typeof credits === 'number' ? credits.toLocaleString() : '—'} KCHIP
            </span>
            <WalletAuthButton compact className="hidden sm:flex" />
          </div>
        </div>
        <div className="mx-auto flex max-w-[520px] gap-1.5 overflow-x-auto px-3 pb-3">
          {chips.map((chip) => {
            const active = chip.href === '/' ? location === '/' : location === chip.href || location.startsWith(`${chip.href}/`);
            return (
              <Link key={chip.href + chip.label} href={chip.href} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs ${active ? 'bg-[#122019] text-[#35D399] ring-1 ring-[#1C3A2E]' : 'text-[#8FA39A]'}`}>
                {chip.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-[520px] pb-24">{children}</main>

      <footer className="mx-auto max-w-[520px] px-4 pb-28 text-center text-[11px] text-[#5C7368]">
        18+ · Sepolia testnet · KCHIP has no cash value
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1C3A2E] bg-[#07110E] pb-[max(8px,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex max-w-md items-center justify-around">
          {bottom.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? location === '/' : location === href || location.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} className={`flex min-w-[56px] flex-col items-center gap-1 rounded-lg py-1 text-[10px] ${active ? 'text-[#35D399]' : 'text-[#5C7368]'}`}>
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
