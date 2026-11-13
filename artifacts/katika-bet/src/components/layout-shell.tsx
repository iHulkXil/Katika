import { type ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Compass,
  Flame,
  Landmark,
  Receipt,
  Wallet,
  Medal,
  Search,
  LayoutGrid,
  Settings,
  Swords,
} from 'lucide-react';
import { WalletAuthButton } from '@/components/wallet-auth';
import { SidebetLogo } from '@/components/katika-logo';
import { NotificationsMenu } from '@/components/notifications-menu';
import { useUserAvatar } from '@/lib/avatar';

const navItems = [
  { href: '/', label: 'Discover', icon: Compass },
  { href: '/markets', label: 'Markets', icon: Flame },
  { href: '/pvp', label: 'PvP Arena', icon: Swords },
  { href: '/my-bets', label: 'My Bets', icon: Receipt },
  { href: '/wallet', label: 'Wallet & Portfolio', icon: Wallet },
  { href: '/leaderboard', label: 'Leaderboard', icon: Medal },
  { href: '/admin', label: 'Admin Oracle', icon: Landmark },
];

const mobileBottomNav = [
  { href: '/', label: 'Discover', icon: Compass },
  { href: '/markets', label: 'Markets', icon: Flame },
  { href: '/pvp', label: 'PvP', icon: Swords },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/profile', label: 'Profile', icon: Settings },
];

function isActive(href: string, location: string) {
  if (href === '/') return location === '/' || location === '/dashboard';
  if (href === '/markets') {
    return (
      location === '/markets' ||
      location.startsWith('/markets/') ||
      ['/sports', '/crypto', '/politics', '/finance', '/lifestyle', '/nigerian-politics', '/trending'].includes(location)
    );
  }
  if (href === '/wallet') {
    return location === '/wallet' || location === '/portfolio' || location === '/cashier';
  }
  return location === href || location.startsWith(href + '/');
}

export function LayoutShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { avatarUrl } = useUserAvatar();
  const [balance, setBalance] = useState<number>(() =>
    Number(localStorage.getItem('sidebet_wallet_balance') || '4011')
  );

  useEffect(() => {
    const syncBalance = () => {
      setBalance(Number(localStorage.getItem('sidebet_wallet_balance') || '4011'));
    };
    window.addEventListener('storage', syncBalance);
    const interval = setInterval(syncBalance, 2000);
    return () => {
      window.removeEventListener('storage', syncBalance);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#070B0E] text-[#F3F4F6] selection:bg-[#22c55e]/30 selection:text-white">
      {/* Global Custom Doodle Wallpaper Background */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#070B0E]">
        <div className="app-doodle-pattern absolute inset-0" />
        <div className="app-doodle-vignette absolute inset-0" />
      </div>

      {/* Sleek Floating / Dock Sidebar matching the reference design */}
      <aside className="fixed inset-y-4 left-4 z-40 hidden w-64 flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#0D1217]/88 p-4 shadow-2xl backdrop-blur-xl lg:flex">
        {/* Top Brand Logo with neon glow */}
        <div>
          <Link href="/" className="flex items-center gap-3 px-2 py-2 group">
            <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-[#121820] border border-[#22c55e]/30 p-1.5 shadow-[0_0_15px_rgba(34,197,94,0.2)] group-hover:border-[#22c55e] transition-all">
              <SidebetLogo className="h-full w-full" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#22c55e] ring-2 ring-[#0D1217]" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-display text-base font-extrabold tracking-tight text-white">
                  SIDE<span className="text-[#22c55e]">BET</span>
                </span>
              </div>
              <p className="text-[10px] font-mono font-medium text-slate-400">
                PRO TERMINAL
              </p>
            </div>
          </Link>

          {/* Navigation Links with circular active badge from reference screenshot */}
          <nav className="mt-6 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href, location);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-[#141C24] text-white shadow-sm border border-white/[0.08]'
                      : 'text-slate-400 hover:bg-[#121820] hover:text-slate-200'
                  }`}
                >
                  {/* Circular icon pill: When active, bright neon lime background */}
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-xl transition-all ${
                      active
                        ? 'bg-[#22c55e] text-black shadow-[0_0_16px_rgba(34,197,94,0.4)]'
                        : 'bg-[#121820] text-slate-400 group-hover:text-white group-hover:bg-[#18222b]'
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <span>{item.label}</span>

                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#22c55e] shadow-[0_0_6px_#22c55e]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Level / Tier Widget */}
        <div className="rounded-2xl border border-white/5 bg-[#121820] p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">Trader Tier 3</span>
            <span className="font-mono text-[10px] text-[#4ade80]">Level 12</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#080C0F]">
            <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#22c55e] via-[#4ade80] to-[#facc15]" />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>2,450 XP</span>
            <Link href="/wallet" className="text-[#4ade80] hover:underline">
              Top up
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="relative z-10 lg:pl-72">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#070B0E]/75 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-8">
            {/* Mobile Brand */}
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#121820] border border-[#22c55e]/40 p-1">
                <SidebetLogo className="h-full w-full" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white">
                SIDE<span className="text-[#22c55e]">BET</span>
              </span>
            </Link>

            {/* Search Input matching reference palette */}
            <div className="relative mx-auto hidden max-w-md flex-1 md:block">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search prediction markets, assets, sports..."
                className="w-full rounded-2xl border border-white/[0.08] bg-[#0E1318] py-2 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-[#22c55e]/60 focus:bg-[#121820] focus:outline-none focus:ring-1 focus:ring-[#22c55e]/30 transition-all"
              />
            </div>

            {/* Right Action Icons & Profile matching reference screenshot */}
            <div className="flex items-center gap-2.5">
              {/* Wallet Quick Balance Button */}
              <Link
                href="/wallet"
                className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-[#0F1713] px-3.5 py-1.5 text-xs font-mono font-bold text-white hover:border-[#22c55e] transition-all shadow-[0_0_12px_rgba(34,197,94,0.15)]"
              >
                <div className="h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" />
                <span>${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </Link>

              {/* Real Notifications Menu */}
              <NotificationsMenu size="sm" />

              {/* Grid app switcher */}
              <Link
                href="/pvp"
                title="PvP Games"
                className="hidden sm:grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-[#121820] text-slate-300 hover:text-white hover:border-white/20 transition-colors"
              >
                <LayoutGrid size={15} />
              </Link>

              {/* User Avatar matching connected account or custom profile avatar */}
              <Link href="/profile" className="relative cursor-pointer">
                <div className="h-9 w-9 overflow-hidden rounded-full border border-[#22c55e]/50 ring-2 ring-black/50">
                  <img
                    src={avatarUrl}
                    alt="Trader Profile"
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-[#22c55e] ring-2 ring-[#080C0F]" />
              </Link>

              <div className="hidden xl:block">
                <WalletAuthButton compact hideAddress />
              </div>
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="min-h-[calc(100vh-4rem)] pb-24 lg:pb-8">{children}</main>

        {/* Footer */}
        <footer className="hidden border-t border-white/[0.06] px-8 py-5 text-center text-xs text-slate-500 lg:flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
            <span>Multi-Chain Segregated Vaults Live</span>
          </div>
          <div>18+ Decentralized Wagering & Automated Prediction Settlement</div>
        </footer>
      </div>

      {/* Mobile Bottom Dock Bar */}
      <nav className="fixed bottom-3 left-4 right-4 z-40 rounded-2xl border border-white/[0.08] bg-[#0D1217]/90 p-2 shadow-2xl backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-around">
          {mobileBottomNav.map((item) => {
            const active = isActive(item.href, location);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-1 text-[10px] font-semibold transition-all ${
                  active ? 'text-[#4ade80]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`grid h-8 w-8 place-items-center rounded-xl transition-all ${
                    active ? 'bg-[#22c55e] text-black shadow-[0_0_12px_rgba(34,197,94,0.4)]' : 'bg-transparent'
                  }`}
                >
                  <Icon size={17} />
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
