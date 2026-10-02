import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'wouter';
import { useTapEngine } from '@/hooks/use-tap-engine';
import { useServerSession } from '@/components/server-session';
import { getTelegramUser, isTelegramWebApp, initTelegramWebApp, triggerHaptic } from '@/lib/telegram';
import { usePrivy } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Zap,
  RotateCw,
  Sparkles,
  Trophy,
  ArrowRightLeft,
  Flame,
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Shield,
  Upload,
  Coins,
  Bot,
  ExternalLink,
  Gift,
  Clock,
  Swords,
  Layers,
} from 'lucide-react';

interface FloatingNumber {
  id: number;
  x: number;
  y: number;
  value: number;
}

export function TelegramTapper() {
  const {
    state,
    offlineBonus,
    isSwapping,
    handleTap,
    claimOfflineReward,
    useEnergyRefill,
    getUpgradeCost,
    buyUpgrade,
    swapPointsForKtk,
    claimDailyCheckIn,
    claimTask,
  } = useTapEngine();

  const { serverUser, refresh: refreshUser } = useServerSession();
  const { getAccessToken } = usePrivy();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'tap' | 'swap' | 'boost' | 'tasks'>('tap');
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [coinTilt, setCoinTilt] = useState({ x: 0, y: 0 });
  const [isPressing, setIsPressing] = useState(false);

  // Avatar graphic state (ready for user to supply their custom front avatar graphics!)
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [newAvatarInput, setNewAvatarInput] = useState('');

  // Swap modal state
  const [swapAmount, setSwapAmount] = useState<number>(1000);

  // Telegram User detection
  const [tgUser, setTgUser] = useState(getTelegramUser());

  useEffect(() => {
    initTelegramWebApp();
    setTgUser(getTelegramUser());
  }, []);

  // 3D Coin Press & Multi-Touch Tapping
  const coinRef = useRef<HTMLDivElement>(null);

  const registerTapAt = useCallback((clientX: number, clientY: number, count = 1) => {
    if (!coinRef.current) return;
    const rect = coinRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate 3D tilt based on impact position
    const offsetX = (clientX - centerX) / (rect.width / 2);
    const offsetY = (clientY - centerY) / (rect.height / 2);
    setCoinTilt({
      x: -offsetY * 18,
      y: offsetX * 18,
    });

    // Add floating number animation
    const id = Date.now() + Math.random();
    setFloatingNumbers((prev) => [
      ...prev.slice(-15),
      {
        id,
        x: clientX - rect.left + (Math.random() - 0.5) * 20,
        y: clientY - rect.top - 20,
        value: state.multitapLevel * count,
      },
    ]);

    // Remove floating number after animation
    setTimeout(() => {
      setFloatingNumbers((prev) => prev.filter((item) => item.id !== id));
    }, 900);

    // Trigger tap in state engine
    handleTap(count);
  }, [state.multitapLevel, handleTap]);

  // Touch handlers for multi-touch (tapping with multiple fingers simultaneously)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsPressing(true);
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      registerTapAt(touch.clientX, touch.clientY, 1);
    }
  };

  const handleTouchEnd = () => {
    setIsPressing(false);
    setCoinTilt({ x: 0, y: 0 });
  };

  // Mouse fallback for desktop / preview testing
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsPressing(true);
    registerTapAt(e.clientX, e.clientY, 1);
  };

  const handleMouseUp = () => {
    setIsPressing(false);
    setCoinTilt({ x: 0, y: 0 });
  };

  // Swap action
  const handleExecuteSwap = async () => {
    if (swapAmount > state.points) {
      toast({ title: 'Not enough points to swap', variant: 'destructive' });
      return;
    }
    const res = await swapPointsForKtk(swapAmount, getAccessToken);
    if (res.success) {
      toast({
        title: 'Swap Completed! 🪙',
        description: `Received ${res.ktkCredited} $KTK in your wallet!`,
      });
      refreshUser();
    } else {
      toast({ title: 'Swap Failed', description: res.error, variant: 'destructive' });
    }
  };

  // Energy percentage
  const energyPercent = Math.min(100, Math.max(0, (state.energy / state.maxEnergy) * 100));

  // VIP Tier calculation based on total mined points
  const getTier = (total: number) => {
    if (total >= 100000) return { name: 'Diamond VIP', color: '#38bdf8', icon: '💎' };
    if (total >= 50000) return { name: 'Platinum VIP', color: '#c084fc', icon: '👑' };
    if (total >= 20000) return { name: 'Gold Champion', color: '#fef08a', icon: '🏆' };
    if (total >= 5000) return { name: 'Silver Tapper', color: '#cbd5e1', icon: '⭐' };
    return { name: 'Bronze Novice', color: '#f59e0b', icon: '🥉' };
  };

  const currentTier = getTier(state.totalEarned);

  return (
    <div className="relative mx-auto flex min-h-[90vh] max-w-md flex-col justify-between px-3 pt-2 pb-20 select-none">
      {/* ============================================================= */}
      {/* KATIKA TELEGRAM HEADER BAR                                    */}
      {/* ============================================================= */}
      <div className="rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#0c261c] via-[#06140e] to-[#020805] p-3 shadow-lg">
        <div className="flex items-center justify-between">
          {/* User profile & VIP Tier */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#fef08a]/60 bg-gradient-to-br from-[#d4af37]/30 to-[#854d0e]/30 shadow-inner">
              <span className="text-lg">{currentTier.icon}</span>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#35D399] text-[8px] font-black text-black">
                ✓
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white">
                  {tgUser?.first_name || 'Katika Player'}
                </span>
                <span
                  className="rounded-full border px-1.5 py-0.2 font-mono-custom text-[8px] font-black uppercase"
                  style={{ borderColor: currentTier.color, color: currentTier.color }}
                >
                  {currentTier.name}
                </span>
              </div>
              <p className="font-mono-custom text-[10px] text-[#8FA39A]">
                {isTelegramWebApp() ? 'Telegram WebApp' : 'Katika Tap Mining'}
              </p>
            </div>
          </div>

          {/* Quick Swap Pill & KTK Balance */}
          <button
            type="button"
            onClick={() => setActiveTab('swap')}
            className="flex items-center gap-1.5 rounded-full border border-[#fef08a]/60 bg-[#fef08a]/15 px-3 py-1 font-mono-custom text-xs font-black text-[#fef08a] shadow-[0_0_12px_rgba(254,240,138,0.25)] hover:bg-[#fef08a]/25 active:scale-95 transition-all"
          >
            <ArrowRightLeft size={12} />
            <span>SWAP</span>
          </button>
        </div>

        {/* Stats Strip: K-Points Balance & $KTK Balance */}
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#1C3A2E] pt-2.5">
          <div className="rounded-xl border border-[#1C3A2E] bg-black/40 px-3 py-1.5 text-center">
            <span className="font-mono-custom text-[9px] uppercase tracking-wider text-[#8FA39A]">
              KATIKA POINTS
            </span>
            <div className="flex items-center justify-center gap-1 font-mono-custom text-base font-black text-[#fef08a]">
              <Sparkles size={13} className="text-[#fef08a]" />
              <span>{state.points.toLocaleString()}</span>
            </div>
          </div>

          <div className="rounded-xl border border-[#1C3A2E] bg-black/40 px-3 py-1.5 text-center">
            <span className="font-mono-custom text-[9px] uppercase tracking-wider text-[#8FA39A]">
              SWAPPABLE $KTK
            </span>
            <div className="flex items-center justify-center gap-1 font-mono-custom text-base font-black text-[#35D399]">
              <Coins size={13} className="text-[#35D399]" />
              <span>{(serverUser?.demoCredits ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* OFFLINE MINING REWARD POPUP (IF USER WAS AWAY)                 */}
      {/* ============================================================= */}
      {offlineBonus && (
        <div className="mt-3 rounded-2xl border border-[#fef08a] bg-gradient-to-r from-[#1c2e24] to-[#0d1e16] p-3.5 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bot className="h-6 w-6 text-[#fef08a] animate-bounce" />
              <div>
                <h4 className="text-xs font-black text-white">Offline Bot Farmed!</h4>
                <p className="font-mono-custom text-xs font-bold text-[#fef08a]">
                  +{offlineBonus.toLocaleString()} K-Points
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={claimOfflineReward}
              className="rounded-full bg-[#fef08a] px-4 py-1.5 font-mono-custom text-xs font-black text-black shadow-md hover:scale-105 active:scale-95"
            >
              CLAIM
            </button>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB NAVIGATION: TAP | SWAP | BOOST | TASKS                    */}
      {/* ============================================================= */}
      <div className="mt-3 grid grid-cols-4 gap-1.5 rounded-xl border border-[#1C3A2E] bg-[#0E1A16] p-1">
        {[
          { id: 'tap', label: 'Tap', icon: Zap },
          { id: 'swap', label: 'Swap', icon: ArrowRightLeft },
          { id: 'boost', label: 'Boost', icon: Flame },
          { id: 'tasks', label: 'Quests', icon: Trophy },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-mono-custom text-xs font-bold transition-all ${
                isActive
                  ? 'border border-[#fef08a] bg-[#fef08a]/20 text-[#fef08a] shadow-[0_0_10px_rgba(254,240,138,0.2)]'
                  : 'text-[#8FA39A] hover:text-white'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================= */}
      {/* TAB 1: TAP TO EARN ARENA (THE KATIKA MEDALLION & AVATAR)      */}
      {/* ============================================================= */}
      {activeTab === 'tap' && (
        <div className="my-auto flex flex-col items-center justify-center py-4">
          {/* Main Points Header Display */}
          <div className="text-center">
            <span className="font-mono-custom text-[11px] uppercase tracking-[0.2em] text-[#8FA39A]">
              TAP TO EARN · SWAP FOR KTK
            </span>
            <div className="mt-1 flex items-center justify-center gap-2">
              <Sparkles className="h-6 w-6 text-[#fef08a]" />
              <h1 className="font-mono-custom text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#fef08a] to-[#eab308] drop-shadow-[0_2px_10px_rgba(254,240,138,0.4)]">
                {state.points.toLocaleString()}
              </h1>
            </div>
            <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-bold text-[#35D399]">
              <span>+{state.multitapLevel} PTS per tap</span>
              <span>·</span>
              <span>100 PTS = 1 $KTK</span>
            </div>
          </div>

          {/* THE CENTRAL 3D INTERACTIVE MEDALLION TOKEN (CUSTOM AVATAR READY) */}
          <div className="relative mt-6 flex items-center justify-center">
            {/* Ambient Radial Backlight Glow */}
            <div
              className="pointer-events-none absolute -inset-8 rounded-full opacity-60 blur-3xl transition-opacity"
              style={{
                background:
                  'radial-gradient(circle, rgba(254, 240, 138, 0.45) 0%, rgba(52, 211, 153, 0.3) 45%, transparent 75%)',
              }}
            />

            {/* The 3D Coin Body with Spring Tilt Reaction */}
            <div
              ref={coinRef}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              className="relative h-64 w-64 cursor-pointer touch-none select-none transition-transform duration-100 ease-out"
              style={{
                transform: `perspective(1000px) rotateX(${coinTilt.x}deg) rotateY(${coinTilt.y}deg) scale(${
                  isPressing ? 0.94 : 1
                })`,
              }}
            >
              {/* Outer Sculpted Champagne Gold Beveled Rim */}
              <div
                className="relative h-full w-full rounded-full p-[8px] shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_35px_rgba(212,175,55,0.4)]"
                style={{
                  background:
                    'linear-gradient(135deg, #fef9c3 0%, #fef08a 20%, #eab308 40%, #ca8a04 60%, #854d0e 80%, #fef08a 100%)',
                }}
              >
                {/* Inner Chiseled Dark Bezel */}
                <div
                  className="relative h-full w-full rounded-full p-[5px]"
                  style={{
                    background:
                      'linear-gradient(180deg, #134e4a 0%, #064e3b 35%, #022c22 75%, #01140e 100%)',
                  }}
                >
                  {/* Coin Face (Avatar Slot) */}
                  <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#065f46] via-[#043e2f] to-[#011a13] shadow-inner">
                    {/* Radial Facet Reflections */}
                    <div
                      className="pointer-events-none absolute inset-0 opacity-40"
                      style={{
                        background:
                          'radial-gradient(circle at 40% 30%, rgba(254,240,138,0.5) 0%, transparent 65%)',
                      }}
                    />

                    {/* FRONT AVATAR: CUSTOM GRAPHIC SLOT OR KATIKA MEDALLION */}
                    {customAvatarUrl ? (
                      <img
                        src={customAvatarUrl}
                        alt="Front Avatar"
                        className="h-full w-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#fef08a] bg-gradient-to-br from-[#fef08a] via-[#eab308] to-[#854d0e] shadow-[0_0_20px_rgba(254,240,138,0.5)]">
                          <Trophy className="h-9 w-9 text-black" />
                        </div>
                        <span className="mt-3 font-mono-custom text-sm font-black tracking-widest text-[#fef08a]">
                          KATIKA
                        </span>
                        <span className="font-mono-custom text-[9px] font-bold uppercase tracking-wider text-[#35D399]">
                          TAP TOKEN
                        </span>
                        <div className="mt-1 flex items-center gap-1 text-[9px] text-[#c7d9d0]">
                          <Award size={10} className="text-[#fef08a]" />
                          <span>FRONT AVATAR SLOT</span>
                        </div>
                      </div>
                    )}

                    {/* Subtle micro gold perimeter stars */}
                    <div className="pointer-events-none absolute inset-2 rounded-full border border-[#fef08a]/30" />
                  </div>
                </div>
              </div>

              {/* Floating +X Numbers on Tap */}
              {floatingNumbers.map((num) => (
                <div
                  key={num.id}
                  className="pointer-events-none absolute font-mono-custom text-xl font-black text-[#fef08a] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-float-up"
                  style={{
                    left: `${num.x}px`,
                    top: `${num.y}px`,
                  }}
                >
                  +{num.value}
                </div>
              ))}
            </div>

            {/* Quick Button to Upload / Change Front Avatar Graphic */}
            <button
              type="button"
              onClick={() => setAvatarModalOpen(true)}
              className="absolute -bottom-3 right-4 flex items-center gap-1 rounded-full border border-[#fef08a]/60 bg-[#0E1A16] px-2.5 py-1 font-mono-custom text-[10px] font-bold text-[#fef08a] shadow-lg hover:bg-[#fef08a]/20 active:scale-95"
              title="Supply custom front avatar graphics"
            >
              <Upload size={10} />
              <span>Set Avatar</span>
            </button>
          </div>

          {/* Energy & Stamina Bar */}
          <div className="mt-8 w-full max-w-xs">
            <div className="flex items-center justify-between font-mono-custom text-xs">
              <span className="flex items-center gap-1 text-[#fef08a] font-bold">
                <Zap size={14} className="fill-[#fef08a]" />
                <span>
                  {state.energy.toLocaleString()} / {state.maxEnergy.toLocaleString()}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('boost')}
                className="text-[11px] font-bold text-[#35D399] hover:underline"
              >
                Boost ⚡
              </button>
            </div>

            {/* Energy Progress Meter */}
            <div className="mt-1.5 h-3.5 w-full overflow-hidden rounded-full border border-[#1C3A2E] bg-black/60 p-0.5 shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${energyPercent}%`,
                  background:
                    'linear-gradient(90deg, #ca8a04 0%, #eab308 50%, #35D399 100%)',
                  boxShadow: '0 0 10px rgba(53, 211, 153, 0.4)',
                }}
              />
            </div>
            <p className="mt-1 text-center font-mono-custom text-[9px] text-[#8FA39A]">
              Regenerating +{2 + state.regenLevel - 1} energy / sec
            </p>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: SWAP POINTS FOR $KTK TOKENS (KATIKA SWAP STATION)      */}
      {/* ============================================================= */}
      {activeTab === 'swap' && (
        <div className="my-auto rounded-3xl border border-[#d4af37]/40 bg-gradient-to-b from-[#0E1A16] to-[#07110E] p-5 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#fef08a] bg-gradient-to-br from-[#fef08a]/20 to-[#854d0e]/20 text-[#fef08a]">
              <ArrowRightLeft size={24} />
            </div>
            <h2 className="mt-2 text-lg font-black text-white">Swap Points for $KTK</h2>
            <p className="text-xs text-[#8FA39A]">
              Convert your earned tap points directly into playable $KTK credits for 8-Ball Pool, Club Ludo, and Legend card allocations.
            </p>
          </div>

          {/* Exchange Rate Badge */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[#1C3A2E] bg-black/40 px-4 py-2.5 font-mono-custom text-xs">
            <span className="text-[#8FA39A]">Exchange Rate:</span>
            <span className="font-bold text-[#fef08a]">100 PTS = 1 $KTK</span>
          </div>

          {/* Amount Selector */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#c7d9d0]">
              <span>Points to Swap:</span>
              <span className="font-mono-custom text-[#fef08a]">
                Available: {state.points.toLocaleString()} PTS
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                min="100"
                max={state.points}
                step="100"
                value={swapAmount}
                onChange={(e) => setSwapAmount(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-xl border border-[#1C3A2E] bg-black/60 px-4 py-3 font-mono-custom text-base font-black text-[#fef08a] outline-none focus:border-[#fef08a]"
              />
              <button
                type="button"
                onClick={() => setSwapAmount(state.points - (state.points % 100))}
                className="absolute right-3 top-2.5 rounded-lg border border-[#fef08a]/40 bg-[#fef08a]/15 px-2.5 py-1 font-mono-custom text-xs font-black text-[#fef08a]"
              >
                MAX
              </button>
            </div>

            {/* Preset Amount Buttons */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[1000, 5000, 10000, 25000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setSwapAmount(amt)}
                  className={`rounded-lg border py-1.5 font-mono-custom text-xs font-bold transition-all ${
                    swapAmount === amt
                      ? 'border-[#fef08a] bg-[#fef08a]/20 text-[#fef08a]'
                      : 'border-[#1C3A2E] bg-[#0E1A16] text-[#8FA39A] hover:text-white'
                  }`}
                >
                  {(amt / 1000).toFixed(0)}k PTS
                </button>
              ))}
            </div>
          </div>

          {/* Swap Outcome Summary */}
          <div className="mt-5 rounded-2xl border border-[#35D399]/40 bg-[#35D399]/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#c7d9d0]">You will receive:</span>
              <span className="font-mono-custom text-xl font-black text-[#35D399]">
                +{Math.floor(swapAmount / 100).toLocaleString()} $KTK
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#8FA39A]">
              Credited instantly to your Bought Ledger balance.
            </p>
          </div>

          {/* Swap Execute Button */}
          <button
            type="button"
            onClick={handleExecuteSwap}
            disabled={isSwapping || swapAmount < 100 || swapAmount > state.points}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#fef08a] via-[#eab308] to-[#ca8a04] py-3.5 font-mono-custom text-sm font-black text-black shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all"
          >
            <ArrowRightLeft size={16} />
            <span>{isSwapping ? 'SWAPPING...' : `SWAP FOR ${Math.floor(swapAmount / 100)} KTK`}</span>
          </button>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 3: BOOSTERS & UPGRADES (KATIKA SHOP)                      */}
      {/* ============================================================= */}
      {activeTab === 'boost' && (
        <div className="my-auto space-y-3">
          <div className="rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#0E1A16] to-[#07110E] p-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-white">
              <Flame className="text-[#fef08a]" size={16} />
              <span>Free Daily Boosters</span>
            </h3>
            <div className="mt-2.5 flex items-center justify-between rounded-xl border border-[#1C3A2E] bg-black/40 p-3">
              <div>
                <span className="text-xs font-bold text-white">Full Energy Refill</span>
                <p className="text-[11px] text-[#8FA39A]">
                  Instantly recharges your energy tank ({state.dailyRefillsLeft}/3 left today)
                </p>
              </div>
              <button
                type="button"
                onClick={useEnergyRefill}
                disabled={state.dailyRefillsLeft <= 0 || state.energy >= state.maxEnergy}
                className="rounded-lg bg-[#35D399] px-3.5 py-1.5 font-mono-custom text-xs font-black text-[#062018] disabled:opacity-40"
              >
                REFILL
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-white">
              <Zap className="text-[#35D399]" size={16} />
              <span>Upgrades &amp; Enhancements</span>
            </h3>

            <div className="mt-3 space-y-2.5">
              {/* Multitap */}
              <div className="flex items-center justify-between rounded-xl border border-[#1C3A2E] bg-black/40 p-3">
                <div>
                  <span className="text-xs font-bold text-white">Multitap</span>
                  <p className="text-[11px] text-[#8FA39A]">
                    +{state.multitapLevel} PTS per tap (Lv {state.multitapLevel})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => buyUpgrade('multitap')}
                  disabled={state.points < getUpgradeCost('multitap')}
                  className="rounded-lg border border-[#fef08a]/60 bg-[#fef08a]/15 px-3 py-1.5 font-mono-custom text-xs font-black text-[#fef08a] disabled:opacity-40"
                >
                  {getUpgradeCost('multitap').toLocaleString()} PTS
                </button>
              </div>

              {/* Energy Tank */}
              <div className="flex items-center justify-between rounded-xl border border-[#1C3A2E] bg-black/40 p-3">
                <div>
                  <span className="text-xs font-bold text-white">Energy Tank</span>
                  <p className="text-[11px] text-[#8FA39A]">
                    {state.maxEnergy} Max Energy (Lv {state.energyLevel})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => buyUpgrade('energy')}
                  disabled={state.points < getUpgradeCost('energy')}
                  className="rounded-lg border border-[#fef08a]/60 bg-[#fef08a]/15 px-3 py-1.5 font-mono-custom text-xs font-black text-[#fef08a] disabled:opacity-40"
                >
                  {getUpgradeCost('energy').toLocaleString()} PTS
                </button>
              </div>

              {/* Fast Recharge */}
              <div className="flex items-center justify-between rounded-xl border border-[#1C3A2E] bg-black/40 p-3">
                <div>
                  <span className="text-xs font-bold text-white">Turbo Charger</span>
                  <p className="text-[11px] text-[#8FA39A]">
                    +{2 + state.regenLevel - 1} energy/sec (Lv {state.regenLevel})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => buyUpgrade('regen')}
                  disabled={state.points < getUpgradeCost('regen')}
                  className="rounded-lg border border-[#fef08a]/60 bg-[#fef08a]/15 px-3 py-1.5 font-mono-custom text-xs font-black text-[#fef08a] disabled:opacity-40"
                >
                  {getUpgradeCost('regen').toLocaleString()} PTS
                </button>
              </div>

              {/* Auto Bot Miner */}
              <div className="flex items-center justify-between rounded-xl border border-[#1C3A2E] bg-black/40 p-3">
                <div>
                  <span className="text-xs font-bold text-white">Auto Tap Bot</span>
                  <p className="text-[11px] text-[#8FA39A]">
                    {state.autoBotUnlocked
                      ? 'Active: Farms points offline'
                      : 'Farms points while you are away'}
                  </p>
                </div>
                {state.autoBotUnlocked ? (
                  <span className="font-mono-custom text-xs font-bold text-[#35D399]">
                    ACTIVE ✓
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => buyUpgrade('bot')}
                    disabled={state.points < getUpgradeCost('bot')}
                    className="rounded-lg border border-[#fef08a]/60 bg-[#fef08a]/15 px-3 py-1.5 font-mono-custom text-xs font-black text-[#fef08a] disabled:opacity-40"
                  >
                    {getUpgradeCost('bot').toLocaleString()} PTS
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 4: TASKS & QUESTS (DAILY STREAK & EXTRA POINTS)           */}
      {/* ============================================================= */}
      {activeTab === 'tasks' && (
        <div className="my-auto space-y-3">
          {/* Daily Streak Ladder */}
          <div className="rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#0c261c] to-[#040e0a] p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-black text-white">
                  <Calendar size={14} className="text-[#fef08a]" />
                  <span>Daily Login Streak</span>
                </h3>
                <p className="text-[10px] text-[#8FA39A]">Day {state.streakDays} / 7 claimed</p>
              </div>
              <button
                type="button"
                onClick={claimDailyCheckIn}
                className="rounded-full bg-[#fef08a] px-3.5 py-1 font-mono-custom text-xs font-black text-black shadow-md hover:scale-105 active:scale-95"
              >
                CHECK IN
              </button>
            </div>

            {/* Streak Day Circles */}
            <div className="mt-3 flex items-center justify-between gap-1">
              {[500, 1000, 2000, 3500, 5000, 7500, 15000].map((reward, i) => {
                const dayNum = i + 1;
                const isClaimed = dayNum <= state.streakDays;
                return (
                  <div
                    key={dayNum}
                    className={`flex flex-1 flex-col items-center justify-center rounded-xl border p-1 text-center font-mono-custom text-[9px] ${
                      isClaimed
                        ? 'border-[#35D399] bg-[#35D399]/20 text-[#35D399]'
                        : 'border-[#1C3A2E] bg-black/40 text-[#8FA39A]'
                    }`}
                  >
                    <span className="font-bold">D{dayNum}</span>
                    <span className="font-black text-[8px]">+{reward / 1000}k</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gameplay & Social Quests */}
          <div className="rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#8FA39A]">
              Bonus Quests
            </h3>

            <div className="mt-2.5 space-y-2">
              {[
                {
                  id: 'pool_play',
                  title: 'Play 8-Ball Pool Match',
                  reward: 5000,
                  href: '/games/pool',
                },
                {
                  id: 'ludo_play',
                  title: 'Play Club Ludo Match',
                  reward: 5000,
                  href: '/pvp',
                },
                {
                  id: 'dice_roll',
                  title: 'Roll precision Dice table',
                  reward: 2500,
                  href: '/games/dice',
                },
                {
                  id: 'join_tg',
                  title: 'Follow Katika on Telegram',
                  reward: 2500,
                  action: () => {
                    if (typeof window !== 'undefined') {
                      const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } })?.Telegram?.WebApp;
                      if (tg?.openTelegramLink) {
                        tg.openTelegramLink('https://t.me/KatikaBet');
                      }
                    }
                  },
                },
              ].map((task) => {
                const isDone = state.claimedTasks.includes(task.id);
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-xl border border-[#1C3A2E] bg-black/40 p-3"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{task.title}</h4>
                      <span className="font-mono-custom text-[11px] font-bold text-[#fef08a]">
                        +{task.reward.toLocaleString()} PTS
                      </span>
                    </div>

                    {isDone ? (
                      <span className="flex items-center gap-1 font-mono-custom text-xs font-bold text-[#35D399]">
                        <CheckCircle2 size={13} />
                        Done
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (task.action) task.action();
                          claimTask(task.id, task.reward);
                        }}
                        className="rounded-lg border border-[#35D399]/60 bg-[#35D399]/15 px-3 py-1 font-mono-custom text-xs font-bold text-[#35D399] hover:bg-[#35D399]/25"
                      >
                        Claim
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: CUSTOM FRONT AVATAR GRAPHIC SETUP                      */}
      {/* ============================================================= */}
      {avatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-[#d4af37]/60 bg-[#091712] p-5 shadow-2xl">
            <h3 className="text-base font-black text-white">Supply Front Avatar Graphic</h3>
            <p className="mt-1 text-xs text-[#8FA39A]">
              Drop in the image URL for your custom token front avatar graphic. You can update this anytime!
            </p>

            <div className="mt-4">
              <label className="font-mono-custom text-[11px] font-bold text-[#fef08a]">
                Avatar Image URL:
              </label>
              <input
                type="text"
                placeholder="https://example.com/avatar.png"
                value={newAvatarInput}
                onChange={(e) => setNewAvatarInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#1C3A2E] bg-black/60 px-3 py-2 text-xs text-white outline-none focus:border-[#fef08a]"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (newAvatarInput.trim()) {
                    setCustomAvatarUrl(newAvatarInput.trim());
                    toast({ title: 'Front Avatar Updated!' });
                  }
                  setAvatarModalOpen(false);
                }}
                className="flex-1 rounded-xl bg-[#fef08a] py-2 font-mono-custom text-xs font-black text-black shadow-md"
              >
                Save Graphic
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomAvatarUrl(null);
                  setAvatarModalOpen(false);
                }}
                className="rounded-xl border border-[#1C3A2E] px-3 py-2 text-xs text-[#8FA39A]"
              >
                Reset Default
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
