import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { usePrivy, useLogout } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';
import { BetHistory } from '@/components/bet-history';
import { KatikaLogo } from '@/components/katika-logo';
import { getTelegramUser, isTelegramWebApp } from '@/lib/telegram';
import {
  CreditCard,
  WalletCards,
  ArrowDownLeft,
  ArrowUpRight,
  Settings,
  Volume2,
  VolumeX,
  Vibrate,
  ShieldCheck,
  ChevronRight,
  UserRound,
  LogOut,
  Trophy,
  History,
  Sparkles,
  Info,
  HelpCircle,
} from 'lucide-react';

export function ProfilePage() {
  const { user, authenticated, login } = usePrivy();
  const { logout } = useLogout();
  const { serverUser, loading } = useServerSession();
  const tgUser = getTelegramUser();

  // Condensed Kit / Settings state
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('katika_sound') !== 'false';
  });
  const [hapticEnabled, setHapticEnabled] = useState(() => {
    return localStorage.getItem('katika_haptic') !== 'false';
  });
  const [showHistory, setShowHistory] = useState(false);
  const [showFairPlay, setShowFairPlay] = useState(false);

  useEffect(() => {
    localStorage.setItem('katika_sound', soundEnabled ? 'true' : 'false');
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('katika_haptic', hapticEnabled ? 'true' : 'false');
  }, [hapticEnabled]);

  const credits = serverUser?.ktk ?? serverUser?.demoCredits ?? 0;
  const displayName =
    tgUser?.first_name ||
    user?.email?.address ||
    user?.google?.email ||
    (user?.wallet?.address ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}` : 'Katika Player');

  return (
    <div className="mx-auto max-w-md px-3 pt-3 pb-24 space-y-4">
      {/* User Identity Header Card */}
      <div className="rounded-3xl border border-[#1C3A2E] bg-gradient-to-br from-[#0c261c] via-[#06140e] to-[#020805] p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative grid h-12 w-12 place-items-center rounded-2xl border-2 border-[#35D399]/40 bg-gradient-to-br from-[#064e3b] to-[#022c22] p-1.5 shadow-[0_0_20px_rgba(53,211,153,0.25)]">
              <KatikaLogo className="h-full w-full" />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#35D399] text-[8px] font-black text-black">
                ✓
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black text-white">{displayName}</h1>
                <span className="rounded-full border border-[#fef08a]/60 bg-[#fef08a]/15 px-1.5 py-0.5 font-mono-custom text-[8px] font-black text-[#fef08a] uppercase">
                  VIP ELITE
                </span>
              </div>
              <p className="font-mono-custom text-[10px] text-[#8FA39A]">
                {isTelegramWebApp() ? 'Telegram Mini App' : 'Katika Web Member'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="font-mono-custom text-[9px] uppercase tracking-wider text-[#8FA39A]">Status</span>
            <div className="flex items-center gap-1 font-mono-custom text-xs font-bold text-[#35D399]">
              <span className="h-2 w-2 rounded-full bg-[#35D399] animate-pulse" />
              <span>ONLINE</span>
            </div>
          </div>
        </div>
      </div>

      {/* CASHIER ACCESS CARD (Direct Deposit, Withdraw, & Balance) */}
      <div className="rounded-3xl border border-[#d4af37]/40 bg-gradient-to-br from-[#0E1A16] to-[#07110E] p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1C3A2E] pb-3">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-[#35D399]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-white">Cashier & Balance</h2>
          </div>
          <Link
            href="/cashier"
            className="flex items-center gap-1 font-mono-custom text-xs font-bold text-[#fef08a] hover:underline"
          >
            <span>Full Cashier</span>
            <ChevronRight size={13} />
          </Link>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <span className="text-[10px] font-medium text-[#8FA39A] uppercase tracking-wider">Playable Balance</span>
            <div className="mt-0.5 font-mono-custom text-2xl font-black text-[#35D399]">
              {loading && !serverUser ? '...' : credits.toLocaleString()}{' '}
              <span className="text-sm font-semibold text-[#fef08a]">$KTK</span>
            </div>
          </div>
          <span className="font-mono-custom text-[10px] text-[#8FA39A]">Off-Chain Credit</span>
        </div>

        {/* Quick Cashier Action Buttons */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link
            href="/cashier"
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-[#35D399]/40 bg-[#35D399]/15 py-3 text-center transition-all hover:bg-[#35D399]/25 active:scale-95"
          >
            <ArrowDownLeft size={16} className="text-[#35D399]" />
            <span className="font-mono-custom text-xs font-bold text-white">Top Up</span>
          </Link>
          <Link
            href="/cashier"
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-[#1C3A2E] bg-black/40 py-3 text-center transition-all hover:border-[#1C3A2E]/80 active:scale-95"
          >
            <ArrowUpRight size={16} className="text-[#fef08a]" />
            <span className="font-mono-custom text-xs font-bold text-white">Withdraw</span>
          </Link>
          <Link
            href="/wallet"
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-[#1C3A2E] bg-black/40 py-3 text-center transition-all hover:border-[#1C3A2E]/80 active:scale-95"
          >
            <WalletCards size={16} className="text-[#38bdf8]" />
            <span className="font-mono-custom text-xs font-bold text-white">Wallet</span>
          </Link>
        </div>
      </div>

      {/* CONDENSED KITS & SETTINGS */}
      <div className="rounded-3xl border border-[#1C3A2E] bg-[#0E1A16] p-4 shadow-xl space-y-3">
        <div className="flex items-center gap-2 border-b border-[#1C3A2E] pb-3">
          <Settings size={18} className="text-[#8FA39A]" />
          <h2 className="text-xs font-black uppercase tracking-wider text-white">Kits &amp; Settings</h2>
        </div>

        {/* Sound FX Toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2.5">
            {soundEnabled ? (
              <Volume2 size={16} className="text-[#35D399]" />
            ) : (
              <VolumeX size={16} className="text-[#8FA39A]" />
            )}
            <div>
              <span className="text-xs font-bold text-white">Audio &amp; Table Sounds</span>
              <p className="text-[10px] text-[#8FA39A]">Billiards clacks, rolls, clicks</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`rounded-full px-3 py-1 font-mono-custom text-xs font-bold transition-all ${
              soundEnabled
                ? 'bg-[#35D399]/20 text-[#35D399] border border-[#35D399]/60'
                : 'bg-black/40 text-[#8FA39A] border border-[#1C3A2E]'
            }`}
          >
            {soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Haptic Feedback Toggle */}
        <div className="flex items-center justify-between py-1 border-t border-[#1C3A2E]/60 pt-2.5">
          <div className="flex items-center gap-2.5">
            <Vibrate size={16} className={hapticEnabled ? 'text-[#35D399]' : 'text-[#8FA39A]'} />
            <div>
              <span className="text-xs font-bold text-white">Haptic Vibration</span>
              <p className="text-[10px] text-[#8FA39A]">Telegram WebApp touch pulses</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHapticEnabled(!hapticEnabled)}
            className={`rounded-full px-3 py-1 font-mono-custom text-xs font-bold transition-all ${
              hapticEnabled
                ? 'bg-[#35D399]/20 text-[#35D399] border border-[#35D399]/60'
                : 'bg-black/40 text-[#8FA39A] border border-[#1C3A2E]'
            }`}
          >
            {hapticEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Provably Fair & House RTP Info */}
        <div className="border-t border-[#1C3A2E]/60 pt-2.5">
          <button
            type="button"
            onClick={() => setShowFairPlay(!showFairPlay)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={16} className="text-[#38bdf8]" />
              <div>
                <span className="text-xs font-bold text-white">Provably Fair &amp; RTP Specs</span>
                <p className="text-[10px] text-[#8FA39A]">Pool 4% rake, Ludo 4%, Dice 94% RTP</p>
              </div>
            </div>
            <ChevronRight
              size={15}
              className={`text-[#8FA39A] transition-transform ${showFairPlay ? 'rotate-90' : ''}`}
            />
          </button>

          {showFairPlay && (
            <div className="mt-2.5 rounded-2xl border border-[#1C3A2E] bg-black/40 p-3 space-y-2 text-xs text-[#c7d9d0]">
              <div className="flex justify-between border-b border-[#1C3A2E]/50 pb-1">
                <span className="font-semibold">🎱 8-Ball Pool:</span>
                <span className="font-mono-custom text-[#35D399]">4% Pot Rake</span>
              </div>
              <div className="flex justify-between border-b border-[#1C3A2E]/50 pb-1">
                <span className="font-semibold">🎲 Club Ludo:</span>
                <span className="font-mono-custom text-[#35D399]">4% Pot Rake</span>
              </div>
              <div className="flex justify-between border-b border-[#1C3A2E]/50 pb-1">
                <span className="font-semibold">🎯 Dice Table:</span>
                <span className="font-mono-custom text-[#35D399]">94% Precision RTP</span>
              </div>
              <div className="flex justify-between border-b border-[#1C3A2E]/50 pb-1">
                <span className="font-semibold">🪙 Coin Flip:</span>
                <span className="font-mono-custom text-[#35D399]">1.88× Fixed Payout</span>
              </div>
              <div className="flex justify-between border-b border-[#1C3A2E]/50 pb-1">
                <span className="font-semibold">💎 Mines Vault:</span>
                <span className="font-mono-custom text-[#35D399]">1–24 Mines Dynamic</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">🎡 European Roulette:</span>
                <span className="font-mono-custom text-[#35D399]">97.3% Standard RTP</span>
              </div>
            </div>
          )}
        </div>

        {/* Global Leaderboard Link */}
        <div className="border-t border-[#1C3A2E]/60 pt-2.5">
          <Link href="/leaderboard" className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Trophy size={16} className="text-[#fef08a]" />
              <div>
                <span className="text-xs font-bold text-white">Global Leaderboard</span>
                <p className="text-[10px] text-[#8FA39A]">Highest OVR cards &amp; top winners</p>
              </div>
            </div>
            <ChevronRight size={15} className="text-[#8FA39A]" />
          </Link>
        </div>

        {/* Bet & Play History */}
        <div className="border-t border-[#1C3A2E]/60 pt-2.5">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2.5">
              <History size={16} className="text-[#c084fc]" />
              <div>
                <span className="text-xs font-bold text-white">Bet &amp; Match History</span>
                <p className="text-[10px] text-[#8FA39A]">View your recent settled wagers</p>
              </div>
            </div>
            <ChevronRight
              size={15}
              className={`text-[#8FA39A] transition-transform ${showHistory ? 'rotate-90' : ''}`}
            />
          </button>

          {showHistory && (
            <div className="mt-2.5 pt-2 border-t border-[#1C3A2E]">
              <BetHistory />
            </div>
          )}
        </div>
      </div>

      {/* Account / Session Management */}
      <div className="rounded-3xl border border-[#1C3A2E] bg-[#0E1A16] p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserRound size={16} className="text-[#8FA39A]" />
            <span className="text-xs font-bold text-white">Account Session</span>
          </div>
          {authenticated ? (
            <button
              type="button"
              onClick={() => void logout()}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-mono-custom text-xs font-bold text-red-400 hover:bg-red-500/20 active:scale-95 transition-all"
            >
              <LogOut size={13} />
              <span>Log out</span>
            </button>
          ) : (
            <WalletAuthButton />
          )}
        </div>
      </div>
    </div>
  );
}
