import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ChevronRight,
  UserRound,
  TrendingUp,
  Receipt,
} from 'lucide-react';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';
import { SidebetLogo } from '@/components/katika-logo';

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <div className="transition-transform group-hover:scale-105 active:scale-95">
        <SidebetLogo className="h-8 w-8" />
      </div>
      <span className="text-[17px] font-bold tracking-tight text-white">
        SIDE<span className="text-blue-400">BET</span>
      </span>
    </Link>
  );
}

const bottom = [
  { href: '/', label: 'Markets', icon: TrendingUp },
  { href: '/my-bets', label: 'My Bets', icon: Receipt },
  { href: '/profile', label: 'Profile', icon: UserRound },
];

function tabClass(active: boolean) {
  return active
    ? 'flex min-w-[72px] flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold text-blue-400 transition-all'
    : 'flex min-w-[72px] flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-all';
}

export function LayoutShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { serverUser, loading, error } = useServerSession();

  return (
    <div className="min-h-[100dvh] bg-[#0B1120] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0B1120]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Brand />
          <div className="flex items-center gap-2">
            <WalletAuthButton compact className="hidden sm:flex" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl pb-24">{children}</main>

      <footer className="mx-auto max-w-5xl px-4 pb-28 text-center text-[11px] text-slate-500">
        18+ Trade responsibly. Prediction markets on Solana devnet.
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-[#0B1120]/95 backdrop-blur-lg pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex max-w-md items-center justify-around px-4">
          {bottom.map((item) => {
            const active =
              item.href === '/'
                ? location === '/' || location === '/dashboard' || location === '/markets'
                : location === item.href || location.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={tabClass(active)}>
                <Icon size={22} className={active ? 'scale-110 transition-transform' : ''} />
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
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
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
      className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/60 p-3 transition-colors hover:border-blue-500/40 hover:bg-slate-800/80"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-blue-400">
          <Icon size={18} />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-100">{title}</div>
          {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
            {badge}
          </span>
        )}
        <ChevronRight size={16} className="text-slate-400" />
      </div>
    </Link>
  );
}
