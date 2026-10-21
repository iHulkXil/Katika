import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { useBallEconomy, MAX_DAILY_BALLS, POINTS_PER_BALL } from '@/hooks/use-ball-economy';
import { useServerSession } from '@/components/server-session';
import { useToast } from '@/hooks/use-toast';
import { KatikaLogo } from '@/components/katika-logo';
import { LegendPage } from '@/components/legend-page';
import {
  Pickaxe,
  Cpu,
  Flame,
  Fan,
  Sparkles,
  Zap,
  RotateCw,
  Trophy,
  CheckCircle2,
  Calendar,
  Gift,
  Coins,
  Shield,
  Layers,
  Bot,
  ExternalLink,
  ChevronRight,
  Gauge,
  Thermometer,
  Gamepad2,
  Terminal,
} from 'lucide-react';

interface MiningStationProps {
  defaultTab?: 'mine' | 'upgrades' | 'tasks' | 'legend';
}

export function MiningStation({ defaultTab = 'mine' }: MiningStationProps) {
  const {
    state,
    isMinting,
    overclockActive,
    offlineYield,
    pulseMine,
    claimOfflineYield,
    mintBall,
    buyUpgrade,
    getUpgradeCost,
    claimDailyCheckIn,
    claimTask,
  } = useBallEconomy();

  const { serverUser } = useServerSession();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'mine' | 'upgrades' | 'tasks' | 'legend'>(defaultTab);

  // Terminal log messages
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'Katika Hash-Net v3.4 online',
    'Connected to Node pool: eu-west-01',
    'Mining block #59281 @ target diff 0x0000ffff',
  ]);

  // Periodic simulated blockchain mining nonces
  useEffect(() => {
    const interval = setInterval(() => {
      const hex = Math.random().toString(16).substring(2, 8);
      const log = `Nonce 0x${hex} accepted · +${Math.floor(state.hashRate / 10)} PTS · Diff 0.042`;
      setTerminalLogs((prev) => [...prev.slice(-4), log]);
    }, 3800);
    return () => clearInterval(interval);
  }, [state.hashRate]);

  // Handle mint action
  const handleMint = async () => {
    const res = await mintBall();
    if (res.success) {
      toast({
        title: '⚽ $BALL Minted Successfully!',
        description: `1 $BALL token added! (${res.ballsMinedToday}/${MAX_DAILY_BALLS} mined today)`,
      });
    } else {
      toast({
        title: 'Minting Failed',
        description: res.error,
        variant: 'destructive',
      });
    }
  };

  // Progress toward next mint
  const mintProgress = Math.min(100, Math.floor((state.minedPoints / POINTS_PER_BALL) * 100));
  const remainingDaily = Math.max(0, MAX_DAILY_BALLS - state.ballsMinedToday);
  const isDailyCapped = state.ballsMinedToday >= MAX_DAILY_BALLS;

  return (
    <div className="mx-auto flex min-h-[92vh] max-w-lg flex-col justify-between px-2 pt-1 pb-16 select-none font-sans">
      {/* Offline Farming Welcome Dialog */}
      {offlineYield && offlineYield > 0 && (
        <div className="mb-2 rounded-2xl border border-[#35D399]/40 bg-gradient-to-r from-[#0d281e] to-[#061811] p-3 shadow-xl flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#35D399]/20 text-[#35D399]">
              <Bot size={20} />
            </div>
            <div>
              <span className="font-mono-custom text-[10px] uppercase text-[#35D399] font-bold">
                OFFLINE RIG YIELD
              </span>
              <p className="text-xs font-bold text-white">+{offlineYield.toLocaleString()} Points Mined</p>
            </div>
          </div>
          <button
            type="button"
            onClick={claimOfflineYield}
            className="rounded-xl bg-[#35D399] px-3 py-1.5 font-mono-custom text-xs font-black text-black hover:brightness-110 active:scale-95 transition-all shadow-md"
          >
            CLAIM
          </button>
        </div>
      )}

      {/* Main Mining Header */}
      <div className="rounded-2xl border border-[#35d399]/40 bg-gradient-to-r from-[#0d2218] via-[#081711] to-[#040e0a] p-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#064e3b] p-1.5 border border-[#35d399]/50 shadow-inner">
              <KatikaLogo className="h-full w-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-mono-custom text-[9px] uppercase tracking-widest text-[#35D399]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#35D399] animate-pulse" />
                <span>$BALL MINING STATION · PROOF OF WORK</span>
              </div>
              <h1 className="text-base font-black text-white tracking-tight">Rig & Token Forge</h1>
            </div>
          </div>

          {/* Quick Play CTA */}
          <Link
            href="/pvp"
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-mono-custom font-bold text-slate-300 hover:text-white hover:border-[#35D399]/40 transition-colors"
          >
            <Gamepad2 size={13} className="text-[#35D399]" />
            <span>Play</span>
          </Link>
        </div>

        {/* Global Economy Stat Strip */}
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {/* 1. $BALL Token Balance */}
          <div className="rounded-xl bg-black/60 border border-[#35D399]/30 p-2 text-center shadow-inner">
            <span className="font-mono-custom text-[9px] uppercase text-slate-400 block font-bold">
              $BALL BALANCE
            </span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span className="text-sm">⚽</span>
              <span className="font-mono-custom text-base font-black text-[#35D399]">
                {state.balls}
              </span>
            </div>
            <span className="text-[8px] text-slate-400 font-mono-custom block">1 Ball / Game</span>
          </div>

          {/* 2. Daily Mined Quota (Max 3) */}
          <div className="rounded-xl bg-black/60 border border-yellow-500/30 p-2 text-center shadow-inner">
            <span className="font-mono-custom text-[9px] uppercase text-slate-400 block font-bold">
              DAILY MINED
            </span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span className="font-mono-custom text-base font-black text-yellow-400">
                {state.ballsMinedToday} / {MAX_DAILY_BALLS}
              </span>
            </div>
            <span className="text-[8px] text-slate-400 font-mono-custom block">
              {isDailyCapped ? 'Limit Reached' : `${remainingDaily} Left Today`}
            </span>
          </div>

          {/* 3. Hashrate & Rig Temp */}
          <div className="rounded-xl bg-black/60 border border-white/10 p-2 text-center shadow-inner">
            <span className="font-mono-custom text-[9px] uppercase text-slate-400 block font-bold">
              HASHRATE
            </span>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <Cpu size={14} className="text-[#38bdf8]" />
              <span className="font-mono-custom text-base font-black text-[#38bdf8]">
                {state.hashRate}
              </span>
              <span className="text-[9px] text-slate-400 font-mono-custom">MH/s</span>
            </div>
            <span className={`text-[8px] font-mono-custom block ${state.temperature > 70 ? 'text-red-400' : 'text-emerald-400'}`}>
              Temp: {state.temperature}°C
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="mt-2 grid grid-cols-4 gap-1.5 rounded-2xl border border-white/10 bg-[#0E1A16] p-1 font-mono-custom text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('mine')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 font-bold transition-all ${
            activeTab === 'mine'
              ? 'bg-[#35D399] text-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Pickaxe size={14} />
          <span>Mine</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('upgrades')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 font-bold transition-all ${
            activeTab === 'upgrades'
              ? 'bg-[#35D399] text-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu size={14} />
          <span>Upgrades</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 font-bold transition-all ${
            activeTab === 'tasks'
              ? 'bg-[#35D399] text-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gift size={14} />
          <span>Bounties</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('legend')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 font-bold transition-all ${
            activeTab === 'legend'
              ? 'bg-[#35D399] text-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy size={14} />
          <span>Legend</span>
        </button>
      </div>

      {/* Tab 1: Active Mining Rig & Mint Forge */}
      {activeTab === 'mine' && (
        <div className="mt-2 space-y-2.5 animate-fade-in">
          {/* Visual Mining Rig Server Rack */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-b from-[#0e241c] via-[#071510] to-[#040d0a] p-4 shadow-2xl">
            {/* Ambient Conduits & Glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#35D399]/15 blur-3xl rounded-full pointer-events-none" />

            {/* Rig Status Strip */}
            <div className="flex items-center justify-between text-[10px] font-mono-custom text-slate-400">
              <span className="flex items-center gap-1.5 text-[#35D399]">
                <span className="h-2 w-2 rounded-full bg-[#35D399] animate-ping" />
                <span>RIG #01 ACTIVE · 4 KTK ASICs</span>
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <Fan size={12} className={overclockActive ? 'animate-spin text-yellow-400' : 'animate-spin text-[#35D399]'} style={{ animationDuration: overclockActive ? '0.2s' : '1.2s' }} />
                <span>Dual Cryo-Fans</span>
              </span>
            </div>

            {/* Central Animated Holographic Mining Core */}
            <div className="relative my-4 flex flex-col items-center justify-center">
              <div
                onClick={pulseMine}
                className={`group relative flex h-36 w-36 cursor-pointer items-center justify-center rounded-3xl border-2 transition-all active:scale-90 ${
                  overclockActive
                    ? 'border-yellow-400 bg-yellow-400/20 shadow-[0_0_40px_rgba(250,204,21,0.5)]'
                    : 'border-[#35D399]/60 bg-gradient-to-b from-[#10b981]/20 to-black/60 shadow-[0_0_35px_rgba(53,211,153,0.25)] hover:border-[#35D399]'
                }`}
              >
                {/* Spinning Core Reticle */}
                <div className="absolute inset-2 rounded-2xl border border-dashed border-[#35D399]/40 animate-spin" style={{ animationDuration: '14s' }} />
                
                {/* 3D Ball Hologram */}
                <div className="relative flex flex-col items-center">
                  <span className={`text-5xl transition-transform ${overclockActive ? 'scale-125' : 'group-hover:scale-110'}`}>
                    ⚽
                  </span>
                  <span className="mt-1 font-mono-custom text-[10px] font-black uppercase text-[#35D399] tracking-wider">
                    $BALL MINER
                  </span>
                </div>

                {/* Overclock Sparkle Badge */}
                {overclockActive && (
                  <div className="absolute -top-2 rounded-full bg-yellow-400 px-2 py-0.5 font-mono-custom text-[9px] font-black text-black animate-bounce">
                    +TURBO BOOST!
                  </div>
                )}
              </div>

              {/* Tap to Overclock CTA */}
              <button
                type="button"
                onClick={pulseMine}
                className="mt-3 flex items-center gap-1.5 rounded-full border border-[#35D399]/40 bg-[#35D399]/15 px-4 py-1.5 font-mono-custom text-xs font-bold text-[#35D399] hover:bg-[#35D399]/25 active:scale-95 transition-all shadow-sm"
              >
                <Zap size={14} className="text-yellow-400" />
                <span>TAP TO OVERCLOCK (+PTS)</span>
              </button>
            </div>

            {/* Mined Points Counter */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-3 text-center">
              <span className="font-mono-custom text-[10px] uppercase text-slate-400 font-bold block">
                MINED POINTS (READY TO MINT)
              </span>
              <div className="flex items-center justify-center gap-2 mt-0.5">
                <Pickaxe size={18} className="text-[#35D399]" />
                <span className="font-mono-custom text-2xl font-black text-white tracking-tight">
                  {state.minedPoints.toLocaleString()}
                </span>
                <span className="font-mono-custom text-xs font-bold text-[#35D399]">PTS</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono-custom block mt-0.5">
                Autofarming +{Math.max(1, Math.floor(state.hashRate / 10))} PTS / sec continuously
              </span>
            </div>

            {/* Terminal Log Console */}
            <div className="mt-2.5 rounded-xl border border-white/5 bg-black/80 p-2 font-mono-custom text-[9px] text-emerald-400/80 space-y-0.5">
              <div className="flex items-center gap-1 text-slate-500 text-[8px] uppercase tracking-wider pb-0.5 border-b border-white/5">
                <Terminal size={10} />
                <span>Live Hash Telemetry</span>
              </div>
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="truncate">
                  {`> ${log}`}
                </div>
              ))}
            </div>
          </div>

          {/* Minting Forge: MINT 1 $BALL */}
          <div className="rounded-3xl border border-white/10 bg-[#0E1A16] p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono-custom text-[10px] uppercase tracking-wider text-[#35D399] font-bold">
                  TOKEN FORGE
                </span>
                <h3 className="text-sm font-black text-white">Mint $BALL Token</h3>
              </div>
              <div className="text-right">
                <span className="font-mono-custom text-[10px] text-slate-400 block">EXCHANGE RATE</span>
                <span className="font-mono-custom text-xs font-bold text-yellow-400">
                  {POINTS_PER_BALL} PTS = 1 $BALL
                </span>
              </div>
            </div>

            {/* Progress to next ball */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono-custom">
                <span className="text-slate-400">Mint Progress:</span>
                <span className="font-bold text-white">
                  {state.minedPoints} / {POINTS_PER_BALL} PTS ({mintProgress}%)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/60 border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-[#35D399] to-[#10b981] transition-all duration-300"
                  style={{ width: `${mintProgress}%` }}
                />
              </div>
            </div>

            {/* Daily Limit Tracker (Max 3) */}
            <div className="rounded-2xl border border-white/10 bg-black/50 p-3 space-y-1.5 font-mono-custom text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">DAILY MINTING QUOTA:</span>
                <span className="font-bold text-white">MAX {MAX_DAILY_BALLS} / DAY</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((slot) => (
                  <div
                    key={slot}
                    className={`flex-1 rounded-lg py-1.5 text-center text-[10px] font-bold border transition-all ${
                      slot <= state.ballsMinedToday
                        ? 'border-[#35D399] bg-[#35D399]/20 text-[#35D399]'
                        : 'border-white/10 bg-black/40 text-slate-500'
                    }`}
                  >
                    BALL {slot} {slot <= state.ballsMinedToday ? '✓' : ''}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 pt-0.5">
                {isDailyCapped
                  ? '🔒 Daily quota filled (3/3). Resets at 00:00 UTC.'
                  : `✓ You can mint ${remainingDaily} more $BALL today.`}
              </p>
            </div>

            {/* Mint Action Button */}
            <button
              type="button"
              onClick={handleMint}
              disabled={isMinting || isDailyCapped || state.minedPoints < POINTS_PER_BALL}
              className={`w-full rounded-2xl py-3.5 font-mono-custom text-xs font-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                isDailyCapped
                  ? 'border border-slate-700 bg-slate-900 text-slate-500 cursor-not-allowed'
                  : state.minedPoints >= POINTS_PER_BALL
                  ? 'bg-gradient-to-r from-[#35D399] to-[#10b981] text-black hover:brightness-110 shadow-[0_4px_20px_rgba(53,211,153,0.3)]'
                  : 'border border-white/10 bg-black/50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Sparkles size={16} />
              <span>
                {isMinting
                  ? 'MINTING $BALL...'
                  : isDailyCapped
                  ? 'DAILY QUOTA REACHED (3/3 MAX)'
                  : state.minedPoints >= POINTS_PER_BALL
                  ? `MINT 1 $BALL NOW (-${POINTS_PER_BALL} PTS)`
                  : `NEED ${POINTS_PER_BALL - state.minedPoints} MORE PTS TO MINT`}
              </span>
            </button>
          </div>

          {/* Platform Utility Notice */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-3 flex items-start gap-2.5 text-xs text-slate-300">
            <span className="text-xl">⚽</span>
            <div className="text-[11px] leading-relaxed">
              <strong className="text-white">Platform Rule:</strong> Every game on Katika.Bet (Penalty Shootout, 8-Ball Pool, Club Ludo, and Casino tables) costs <strong className="text-[#35D399]">1 $BALL</strong> to play. Mined $BALL tokens never expire!
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Hardware Upgrades */}
      {activeTab === 'upgrades' && (
        <div className="mt-2 space-y-2 animate-fade-in">
          <div className="rounded-2xl border border-white/10 bg-[#0E1A16] p-3 text-center">
            <h3 className="text-sm font-black text-white">Rig Hardware Upgrades</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Spend mined points to boost Hashrate, accelerate PTS generation, and unlock offline bots.
            </p>
          </div>

          {/* Processor Upgrade */}
          <div className="rounded-2xl border border-white/10 bg-[#0E1A16] p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30">
                <Cpu size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-xs">ASIC Hash Processor</h4>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono-custom text-[9px] text-slate-300">
                    Lv {state.rigLevel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">+24 MH/s per level (+2.4 PTS/s)</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => buyUpgrade('processor')}
              disabled={state.minedPoints < getUpgradeCost('processor')}
              className="rounded-xl border border-[#38bdf8]/40 bg-[#38bdf8]/15 px-3 py-2 font-mono-custom text-xs font-bold text-[#38bdf8] hover:bg-[#38bdf8]/25 active:scale-95 disabled:opacity-40 transition-all"
            >
              {getUpgradeCost('processor')} PTS
            </button>
          </div>

          {/* Cryo-Cooling System */}
          <div className="rounded-2xl border border-white/10 bg-[#0E1A16] p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Fan size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-xs">Liquid Cryo-Cooler</h4>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono-custom text-[9px] text-slate-300">
                    Lv {state.coolingLevel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Lowers temps & increases stability</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => buyUpgrade('cooling')}
              disabled={state.minedPoints < getUpgradeCost('cooling')}
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 font-mono-custom text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 active:scale-95 disabled:opacity-40 transition-all"
            >
              {getUpgradeCost('cooling')} PTS
            </button>
          </div>

          {/* AI Neural Worker Bot */}
          <div className="rounded-2xl border border-white/10 bg-[#0E1A16] p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <Bot size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-xs">AI Auto-Miner Bot</h4>
                  {state.autoBotUnlocked && (
                    <span className="rounded-full bg-purple-500/20 px-2 py-0.5 font-mono-custom text-[9px] text-purple-300 font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">Mines points automatically for up to 4 hrs away</p>
              </div>
            </div>

            {state.autoBotUnlocked ? (
              <span className="font-mono-custom text-xs font-bold text-purple-400 px-3 py-2">
                INSTALLED
              </span>
            ) : (
              <button
                type="button"
                onClick={() => buyUpgrade('bot')}
                disabled={state.minedPoints < getUpgradeCost('bot')}
                className="rounded-xl border border-purple-500/40 bg-purple-500/15 px-3 py-2 font-mono-custom text-xs font-bold text-purple-400 hover:bg-purple-500/25 active:scale-95 disabled:opacity-40 transition-all"
              >
                {getUpgradeCost('bot')} PTS
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Bounties & Tasks */}
      {activeTab === 'tasks' && (
        <div className="mt-2 space-y-2 animate-fade-in">
          {/* Daily Streak Card */}
          <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-yellow-950/30 to-black/60 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-yellow-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">Daily Mining Check-in</h4>
                  <p className="text-[10px] text-slate-400">Current streak: {state.streakDays} days</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const res = claimDailyCheckIn();
                  if (res.success) {
                    toast({
                      title: 'Streak Bonus Claimed!',
                      description: `+${res.reward} Mined Points added!`,
                    });
                  } else {
                    toast({ title: res.message });
                  }
                }}
                className="rounded-xl bg-yellow-400 px-3 py-1.5 font-mono-custom text-xs font-black text-black hover:brightness-110 active:scale-95 transition-all shadow-md"
              >
                CHECK IN
              </button>
            </div>
          </div>

          {/* Mining Bounties */}
          <div className="space-y-1.5">
            {[
              { id: 'bounty_tg', title: 'Join Telegram Community', reward: 350, icon: '✈️' },
              { id: 'bounty_pvp', title: 'Play First Match on Platform', reward: 500, icon: '⚔️' },
              { id: 'bounty_penalty', title: 'Test 3D Penalty Shootout', reward: 500, icon: '⚽' },
              { id: 'bounty_legend', title: 'View Legend Character Card', reward: 300, icon: '⭐' },
            ].map((task) => {
              const claimed = state.claimedTasks.includes(task.id);
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0E1A16] p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{task.icon}</span>
                    <div>
                      <h5 className="text-xs font-bold text-white">{task.title}</h5>
                      <span className="font-mono-custom text-[10px] text-[#35D399]">
                        +{task.reward} Mined PTS
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={claimed}
                    onClick={() => {
                      claimTask(task.id, task.reward);
                      toast({
                        title: 'Bounty Claimed!',
                        description: `+${task.reward} Mined Points added!`,
                      });
                    }}
                    className={`rounded-xl px-3 py-1.5 font-mono-custom text-xs font-bold transition-all ${
                      claimed
                        ? 'border border-white/10 text-slate-500 cursor-not-allowed'
                        : 'border border-[#35D399]/40 bg-[#35D399]/15 text-[#35D399] hover:bg-[#35D399]/25 active:scale-95'
                    }`}
                  >
                    {claimed ? 'DONE ✓' : 'CLAIM'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Legend Staking Boost */}
      {activeTab === 'legend' && (
        <div className="mt-2 space-y-2 animate-fade-in">
          <div className="rounded-2xl border border-white/10 bg-[#0E1A16] p-3 text-center">
            <span className="font-mono-custom text-[10px] uppercase text-[#35D399] font-bold">
              HASHRATE MULTIPLIER
            </span>
            <h3 className="text-sm font-black text-white mt-0.5">Legend Card Mining Synergy</h3>
            <p className="text-xs text-slate-400 mt-1">
              Your Legend card attributes boost your mining rig hashpower. Higher Physical & Pace grant automated hashrate bonuses!
            </p>
          </div>
          <LegendPage />
        </div>
      )}
    </div>
  );
}
