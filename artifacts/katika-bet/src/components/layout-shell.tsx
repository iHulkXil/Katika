import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Compass,
  Flame,
  Trophy,
  Bitcoin,
  Landmark,
  LineChart,
  Receipt,
  PieChart,
  Wallet,
  Medal,
  Search,
  Bell,
  UserRound,
} from 'lucide-react';
import { WalletAuthButton } from '@/components/wallet-auth';
import { SidebetLogo } from '@/components/katika-logo';

const sidebar = [
  { href: '/', label: 'Discover', icon: Compass },
  { href: '/trending', label: 'Trending', icon: Flame },
  { href: '/sports', label: 'Sports', icon: Trophy },
  { href: '/crypto', label: 'Crypto', icon: Bitcoin },
  { href: '/politics', label: 'Politics', icon: Landmark },
  { href: '/finance', label: 'Finance', icon: LineChart },
  { href: '/my-bets', label: 'My Bets', icon: Receipt },
  { href: '/portfolio', label: 'Portfolio', icon: PieChart },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/leaderboard', label: 'Leaderboard', icon: Medal },
];

const bottom = [
  { href: '/', label: 'Home', icon: Compass },
  { href: '/markets', label: 'Markets', icon: Flame },
  { href: '/portfolio', label: 'Portfolio', icon: PieChart },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/profile', label: 'Profile', icon: UserRound },
];

function isActive(href: string, location: string) {
  if (href === '/') return location === '/' || location === '/dashboard' || location === '/markets';
  return location === href || location.startsWith(href + '/');
}

export function LayoutShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-[#050A0A] text-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-emerald-900/40 bg-[#071210] lg:block">
        <div className="flex h-16 items-center gap-2.5 border-b border-emerald-900/40 px-5">
          <SidebetLogo className="h-9 w-9" />
          <span className="text-lg font-bold tracking-tight">SIDE<span className="text-emerald-400">BET</span></span>
        </div>
        <nav className="space-y-1 p-3">
          {sidebar.map((item) => {
            const active = isActive(item.href, location);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-slate-400 hover:bg-emerald-500/10 hover:text-slate-200'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-3 right-3 rounded-xl border border-emerald-700/40 bg-emerald-950/40 p-3 text-xs">
          <div className="font-semibold text-emerald-300">Level 12 · 1,250 XP</div>
          <div className="mt-1 text-slate-400">Trade more to level up</div>
        </div>
      </aside>

      {/* Main area */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 border-b border-emerald-900/40 bg-[#050A0A]/90 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <SidebetLogo className="h-8 w-8" />
              <span className="font-bold">SIDE<span className="text-emerald-400">BET</span></span>
            </div>
            <div className="relative mx-auto hidden max-w-md flex-1 md:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search predictions…"
                className="w-full rounded-xl border border-emerald-900/50 bg-[#0A1815] py-2 pl-10 pr-4 text-sm placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-lg p-2 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400">
                <Bell size={18} />
              </button>
              <div className="hidden items-center gap-1.5 rounded-lg border border-emerald-700/40 bg-emerald-950/40 px-2.5 py-1.5 text-xs font-medium text-emerald-300 sm:flex">
                <Wallet size={14} />
                ₦12,450
              </div>
              <WalletAuthButton compact />
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100dvh-4rem)] pb-20 lg:pb-6">{children}</main>

        <footer className="hidden border-t border-emerald-900/40 px-6 py-4 text-center text-[11px] text-slate-500 lg:block">
          18+ Trade responsibly. Prediction markets on Solana.
        </footer>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-emerald-900/40 bg-[#050A0A]/95 backdrop-blur-lg pb-[max(8px,env(safe-area-inset-bottom))] pt-1 lg:hidden">
        <div className="flex items-center justify-around">
          {bottom.map((item) => {
            const active = isActive(item.href, location);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium ${
                  active ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
