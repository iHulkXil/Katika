import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { usePrivy, useLogout } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';
import { BetHistory } from '@/components/bet-history';
import { SidebetLogo } from '@/components/katika-logo';
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
  ShieldCheck,
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

  const displayName = tgUser?.first_name || user?.email?.address || user?.google?.email || (user?.wallet?.address ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}` : 'Pro Trader');

  return (
    <div className="mx-auto max-w-xl px-4 pt-6 pb-24 space-y-5">
      {/* Profile Card with Avatar */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-[#22c55e]/50 ring-2 ring-black/40">
              <img
                src="/assets/images/avatar_crypto_trader_1794496493828.jpg"
                alt="Trader Profile"
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#22c55e] ring-2 ring-[#0E1318]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold font-display text-white">{displayName}</h1>
                <span className="rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 px-2 py-0.5 text-[9px] font-mono font-bold text-[#4ade80]">
                  LEVEL 12
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {isTelegramWebApp() ? 'Telegram Mini App Account' : 'Solana & EVM Web Session'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Status</span>
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#4ade80]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              <span>Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Management Card */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard size={17} className="text-[#4ade80]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Wallet & Custody</h2>
          </div>
          <Link href="/wallet" className="text-xs font-semibold text-[#4ade80] hover:underline flex items-center gap-1">
            Open Crypto Wallet <ArrowUpRight size={13} />
          </Link>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          On-chain deposits and withdrawals operate via Solana Mainnet-Beta and EVM (Base, Ethereum, Arbitrum, Polygon). Market creation executes directly on fast AMM order books.
        </p>

        <div className="pt-2 grid grid-cols-2 gap-3">
          <Link
            href="/wallet"
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-[#22c55e]/30 bg-[#121B16] py-3 text-center transition hover:border-[#22c55e] active:scale-95"
          >
            <WalletCards size={16} className="text-[#4ade80]" />
            <span className="text-xs font-bold text-white">Cashier & Balances</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-[#121820] py-3 text-center transition hover:bg-[#16202a] active:scale-95"
          >
            <History size={16} className="text-slate-300" />
            <span className="text-xs font-bold text-white">Tx Ledger</span>
          </button>
        </div>

        {showHistory && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <BetHistory />
          </div>
        )}
      </div>

      {/* Settings Card */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Settings size={17} className="text-slate-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">Preferences</h2>
        </div>

        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-3">
            {soundEnabled ? <Volume2 size={16} className="text-[#4ade80]" /> : <VolumeX size={16} className="text-slate-500" />}
            <div>
              <span className="text-xs font-semibold text-white">Sound Effects</span>
              <p className="text-[11px] text-slate-400">Audio feedback on trades</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
              soundEnabled ? 'bg-[#22c55e] text-black shadow-sm' : 'bg-white/10 text-slate-400'
            }`}
          >
            {soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-3">
            <Vibrate size={16} className={hapticEnabled ? 'text-[#4ade80]' : 'text-slate-500'} />
            <div>
              <span className="text-xs font-semibold text-white">Haptic Vibration</span>
              <p className="text-[11px] text-slate-400">Mobile haptic tap sensations</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHapticEnabled(!hapticEnabled)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
              hapticEnabled ? 'bg-[#22c55e] text-black shadow-sm' : 'bg-white/10 text-slate-400'
            }`}
          >
            {hapticEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Account Authentication & Logout */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white">Privy Multi-Chain Session</h3>
            <p className="text-[11px] text-slate-400">Connected to Solana Mainnet & EVM Base</p>
          </div>
          {authenticated ? (
            <button
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all"
            >
              <LogOut size={13} />
              <span>Sign out</span>
            </button>
          ) : (
            <button
              onClick={() => void login()}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] hover:bg-[#16a34a] px-4 py-1.5 text-xs font-bold text-black shadow-md shadow-[#22c55e]/20 transition-all"
            >
              <span>Connect</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
