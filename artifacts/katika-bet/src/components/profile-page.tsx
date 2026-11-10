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
  ArrowUpRight,
  Settings,
  Volume2,
  VolumeX,
  Vibrate,
  ChevronRight,
  UserRound,
  LogOut,
  History,
} from 'lucide-react';

export function ProfilePage() {
  const { user, authenticated, login } = usePrivy();
  const { logout } = useLogout();
  const { serverUser, loading } = useServerSession();
  const tgUser = getTelegramUser();

  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('sidebet_sound') !== 'false');
  const [hapticEnabled, setHapticEnabled] = useState(() => localStorage.getItem('sidebet_haptic') !== 'false');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { localStorage.setItem('sidebet_sound', soundEnabled ? 'true' : 'false'); }, [soundEnabled]);
  useEffect(() => { localStorage.setItem('sidebet_haptic', hapticEnabled ? 'true' : 'false'); }, [hapticEnabled]);

  const displayName = tgUser?.first_name || user?.email?.address || user?.google?.email || (user?.wallet?.address ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}` : 'SIDEBET Player');

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-24 space-y-4">
      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative grid h-12 w-12 place-items-center rounded-xl border border-blue-500/30 bg-slate-800 p-1.5">
              <KatikaLogo className="h-full w-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-semibold text-white">{displayName}</h1>
                <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-blue-400">VIP</span>
              </div>
              <p className="text-[11px] text-slate-400">{isTelegramWebApp() ? 'Telegram Mini App' : 'SIDEBET Member'}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Status</span>
            <div className="flex items-center gap-1 text-xs font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Online</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
        <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
          <CreditCard size={18} className="text-blue-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white">Wallet</h2>
        </div>
        <div className="mt-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Connected Wallets</span>
          <p className="mt-1 text-sm text-slate-400">Connect EVM or Solana to create events and mint proof-of-bet NFTs.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href="/wallet" className="flex flex-col items-center justify-center gap-1 rounded-xl border border-blue-500/30 bg-blue-500/10 py-3 text-center transition hover:bg-blue-500/20 active:scale-95">
            <WalletCards size={16} className="text-blue-400" />
            <span className="text-xs font-semibold text-white">Wallets</span>
          </Link>
          <Link href="/wallet" className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-800/50 py-3 text-center transition hover:bg-slate-800 active:scale-95">
            <ArrowUpRight size={16} className="text-slate-300" />
            <span className="text-xs font-semibold text-white">Activity</span>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
          <Settings size={18} className="text-slate-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white">Settings</h2>
        </div>
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2.5">
            {soundEnabled ? <Volume2 size={16} className="text-blue-400" /> : <VolumeX size={16} className="text-slate-400" />}
            <div>
              <span className="text-sm font-medium text-white">Audio</span>
              <p className="text-[11px] text-slate-400">Interface sounds</p>
            </div>
          </div>
          <button type="button" onClick={() => setSoundEnabled(!soundEnabled)} className={`rounded-lg px-3 py-1 text-xs font-medium transition ${soundEnabled ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
            {soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="flex items-center justify-between border-t border-slate-700 pt-3">
          <div className="flex items-center gap-2.5">
            <Vibrate size={16} className={hapticEnabled ? 'text-blue-400' : 'text-slate-400'} />
            <div>
              <span className="text-sm font-medium text-white">Haptic Feedback</span>
              <p className="text-[11px] text-slate-400">Touch pulses</p>
            </div>
          </div>
          <button type="button" onClick={() => setHapticEnabled(!hapticEnabled)} className={`rounded-lg px-3 py-1 text-xs font-medium transition ${hapticEnabled ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
            {hapticEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="border-t border-slate-700 pt-3">
          <button type="button" onClick={() => setShowHistory(!showHistory)} className="flex w-full items-center justify-between text-left">
            <div className="flex items-center gap-2.5">
              <History size={16} className="text-slate-400" />
              <div>
                <span className="text-sm font-medium text-white">Activity History</span>
                <p className="text-[11px] text-slate-400">Recent events and mints</p>
              </div>
            </div>
            <ChevronRight size={16} className={`text-slate-400 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
          </button>
          {showHistory && (
            <div className="mt-3 border-t border-slate-700 pt-3">
              <BetHistory />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserRound size={16} className="text-slate-400" />
            <span className="text-sm font-medium text-white">Account</span>
          </div>
          {authenticated ? (
            <button type="button" onClick={() => void logout()} className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 active:scale-95">
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
