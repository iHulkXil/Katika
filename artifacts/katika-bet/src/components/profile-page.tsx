import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { usePrivy, useLogout } from '@privy-io/react-auth';
import { BetHistory } from '@/components/bet-history';
import { getTelegramUser, isTelegramWebApp } from '@/lib/telegram';
import { useUserAvatar, saveCustomAvatar } from '@/lib/avatar';
import { processImageFile } from '@/lib/avatar-upload';
import { useToast } from '@/hooks/use-toast';
import {
  CreditCard,
  WalletCards,
  ArrowUpRight,
  Settings,
  Volume2,
  VolumeX,
  Vibrate,
  LogOut,
  History,
  Camera,
  RotateCcw,
  Check,
  Image as ImageIcon,
} from 'lucide-react';

export function ProfilePage() {
  const { user, authenticated, login } = usePrivy();
  const { logout } = useLogout();
  const { toast } = useToast();
  const tgUser = getTelegramUser();
  const { avatarUrl, hasCustomAvatar } = useUserAvatar();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('sidebet_sound') !== 'false');
  const [hapticEnabled, setHapticEnabled] = useState(() => localStorage.getItem('sidebet_haptic') !== 'false');
  const [showHistory, setShowHistory] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => { localStorage.setItem('sidebet_sound', soundEnabled ? 'true' : 'false'); }, [soundEnabled]);
  useEffect(() => { localStorage.setItem('sidebet_haptic', hapticEnabled ? 'true' : 'false'); }, [hapticEnabled]);

  const displayName =
    tgUser?.first_name ||
    user?.google?.name ||
    user?.twitter?.name ||
    user?.farcaster?.displayName ||
    user?.email?.address ||
    user?.google?.email ||
    'Pro Trader';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const dataUrl = await processImageFile(file, 400, 400);
      saveCustomAvatar(dataUrl);
      toast({
        title: 'Profile Picture Updated',
        description: 'Your new avatar is now active across SIDEBET.',
      });
      setShowAvatarEditor(false);
    } catch (err: any) {
      toast({
        title: 'Upload Failed',
        description: err?.message || 'Could not process image file.',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveCustomUrl = () => {
    const trimmed = avatarUrlInput.trim();
    if (!trimmed) return;
    if (!/^https?:\/\/|^data:image\/|^\/assets\//i.test(trimmed)) {
      toast({
        title: 'Invalid Image URL',
        description: 'Please enter a valid https:// image link or upload a photo.',
        variant: 'destructive',
      });
      return;
    }
    saveCustomAvatar(trimmed);
    setAvatarUrlInput('');
    setShowAvatarEditor(false);
    toast({
      title: 'Profile Picture Updated',
      description: 'Custom profile picture saved.',
    });
  };

  const handleResetToConnected = () => {
    saveCustomAvatar(null);
    setShowAvatarEditor(false);
    toast({
      title: 'Synced to Connected Account',
      description: 'Your profile picture now follows your connected sign-in account.',
    });
  };

  return (
    <div className="mx-auto max-w-xl px-4 pt-6 pb-24 space-y-5">
      {/* Hidden File Input for Avatar Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Profile Card with Avatar */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setShowAvatarEditor(!showAvatarEditor)}
              title="Change profile picture"
              className="group relative h-14 w-14 overflow-hidden rounded-full border-2 border-[#22c55e]/50 ring-2 ring-black/40 shrink-0"
            >
              <img
                src={avatarUrl}
                alt="Trader Profile"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={16} className="text-white" />
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#22c55e] ring-2 ring-[#0E1318]" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold font-display text-white">{displayName}</h1>
                <span className="rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 px-2 py-0.5 text-[9px] font-mono font-bold text-[#4ade80]">
                  LEVEL 12
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {isTelegramWebApp() ? 'Telegram Mini App Account' : 'Multi-Chain Web Session'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAvatarEditor(!showAvatarEditor)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#121820] hover:border-[#22c55e]/50 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors"
          >
            <Camera size={13} className="text-[#4ade80]" />
            <span>{showAvatarEditor ? 'Close' : 'Edit Photo'}</span>
          </button>
        </div>

        {/* Profile Picture Customization Drawer */}
        {showAvatarEditor && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#080C0F] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <ImageIcon size={14} className="text-[#4ade80]" />
                <span>Profile Picture Settings</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {hasCustomAvatar ? 'Custom Avatar Active' : 'Synced with Connected Account'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] px-3.5 py-2 text-xs font-bold text-black transition-all disabled:opacity-50"
              >
                <Camera size={13} />
                <span>{uploadingAvatar ? 'Processing...' : 'Upload Photo'}</span>
              </button>

              {hasCustomAvatar && (
                <button
                  type="button"
                  onClick={handleResetToConnected}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#121820] hover:bg-[#18222b] px-3.5 py-2 text-xs font-semibold text-slate-200 transition-all"
                >
                  <RotateCcw size={13} className="text-[#4ade80]" />
                  <span>Use Connected Account</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="url"
                value={avatarUrlInput}
                onChange={(e) => setAvatarUrlInput(e.target.value)}
                placeholder="Or paste an image URL (https://...)"
                className="flex-1 rounded-xl border border-white/10 bg-[#0E1318] px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-[#4ade80] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveCustomUrl}
                disabled={!avatarUrlInput.trim()}
                className="inline-flex items-center gap-1 rounded-xl border border-[#22c55e]/40 bg-[#121B16] px-3 py-2 text-xs font-bold text-[#4ade80] hover:bg-[#16251d] disabled:opacity-40"
              >
                <Check size={13} />
                <span>Save</span>
              </button>
            </div>
          </div>
        )}
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
          On-chain deposits and withdrawals operate across segregated multi-chain vaults (Solana, Base, Ethereum, Arbitrum, Polygon). Market creation executes directly on fast AMM order books.
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
            <h3 className="text-xs font-bold text-white">Multi-Chain Session</h3>
            <p className="text-[11px] text-slate-400">Encrypted account & custody session active</p>
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

