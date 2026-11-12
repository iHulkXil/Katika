import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useServerSession } from './server-session';
import {
  CircleDollarSign,
  Gamepad2,
  Layers,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
  ArrowRight,
  Shield,
  HelpCircle,
  Clock,
  Coins,
  ArrowUpRight,
  Flame,
} from 'lucide-react';

const CRYPTO_RATES: Record<string, number> = {
  SOL: 148.5,
  ETH: 3233.0,
  BTC: 91420.0,
  USDT: 1.0,
};

type CryptoChain = 'SOL' | 'ETH' | 'BTC' | 'USDT';

export function PvPLobby() {
  const [, setLocation] = useLocation();
  const { serverUser } = useServerSession();

  const [selectedGame, setSelectedGame] = useState<'pool' | 'wheel' | 'ludo'>('pool');
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoChain>('SOL');
  const [stakeUsd, setStakeUsd] = useState<number>(25);
  const [mode, setMode] = useState<'queue' | 'challenge'>('queue');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cryptoEquivalent = (stakeUsd / CRYPTO_RATES[selectedCrypto]).toFixed(
    selectedCrypto === 'BTC' ? 5 : selectedCrypto === 'ETH' ? 4 : 2
  );
  const prizePotUsd = (stakeUsd * 2 * 0.96).toFixed(2);
  const prizePotCrypto = (Number(prizePotUsd) / CRYPTO_RATES[selectedCrypto]).toFixed(
    selectedCrypto === 'BTC' ? 5 : selectedCrypto === 'ETH' ? 4 : 2
  );

  const handleLaunch = () => {
    if (selectedGame === 'pool') {
      setLocation(`/games/pool?stake=${stakeUsd}&crypto=${selectedCrypto}`);
      return;
    }
    if (selectedGame === 'wheel') {
      setLocation(`/games/wheel?stake=${stakeUsd}&crypto=${selectedCrypto}`);
      return;
    }
    if (selectedGame === 'ludo') {
      setLocation(`/games/ludo?stake=${stakeUsd}&crypto=${selectedCrypto}`);
      return;
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0E1318] p-6 lg:p-8 shadow-2xl">
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full blur-[100px] opacity-25"
          style={{ background: '#22C55E' }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full blur-[120px] opacity-20"
          style={{ background: '#EC4899' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-[#121B16] px-3 py-1 text-[11px] font-mono font-bold text-[#4ADE80] mb-2">
              <Swords size={12} className="text-[#22C55E]" />
              <span>PEER-TO-PEER MULTI-CHAIN FLOOR</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight font-display text-white">
              PvP Wagering Arena
            </h1>
            <p className="mt-1 text-xs text-slate-300 max-w-xl">
              Play 1v1 against other traders in real-time skill games. Stake SOL, EVM (Base/ETH), BTC, or USDT with instant automated $ settlement.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-[#121820] px-4 py-2.5 shrink-0">
            <Shield size={16} className="text-[#4ADE80]" />
            <div className="text-left font-mono text-xs">
              <span className="text-white font-bold block">4% Pot Rake</span>
              <span className="text-slate-400 text-[10px]">96% Winner Payout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Select Game Card Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Gamepad2 size={16} className="text-[#4ADE80]" />
            <span>Select PvP Game</span>
          </h2>
          <span className="text-[11px] font-mono text-slate-400">3 Active PvP Arenas</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 8-Ball Pool */}
          <div
            onClick={() => setSelectedGame('pool')}
            className={`cursor-pointer rounded-3xl border p-5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
              selectedGame === 'pool'
                ? 'border-[#22C55E] bg-[#121B16] shadow-[0_0_24px_rgba(34,197,94,0.18)] ring-1 ring-[#22C55E]/40'
                : 'border-white/[0.08] bg-[#0E1318] hover:border-white/20 hover:bg-[#121820]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="rounded-full bg-[#22C55E]/20 px-2 py-0.5 text-[10px] font-mono font-bold text-[#4ADE80]">
                  1V1 SKILL
                </span>
                <span className="text-[10px] font-mono text-slate-400">Real-Time Table</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#080C0F] border border-white/10 text-2xl shrink-0 shadow-inner">
                  🎱
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">8-Ball Pool</h3>
                  <p className="mt-1 text-xs text-slate-400 leading-snug">
                    Classic billiards physics. Aim cue, meter power, pot solids or stripes, and sink the 8-ball!
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-[#4ADE80]">
              <span>Instant 1v1</span>
              <span>·</span>
              <span>Sound Effects</span>
            </div>
          </div>

          {/* Wheel of the Pot (3-Minute Pot Wheel) */}
          <div
            onClick={() => setSelectedGame('wheel')}
            className={`cursor-pointer rounded-3xl border p-5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
              selectedGame === 'wheel'
                ? 'border-[#FACC15] bg-[#17160F] shadow-[0_0_24px_rgba(250,204,21,0.18)] ring-1 ring-[#FACC15]/40'
                : 'border-white/[0.08] bg-[#0E1318] hover:border-white/20 hover:bg-[#121820]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="rounded-full bg-[#FACC15]/20 px-2 py-0.5 text-[10px] font-mono font-bold text-[#FACC15]">
                  3-MIN CYCLE
                </span>
                <span className="text-[10px] font-mono text-slate-400">Pot Share Pool</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#080C0F] border border-white/10 text-2xl shrink-0 shadow-inner">
                  🎡
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Wheel of the Pot</h3>
                  <p className="mt-1 text-xs text-slate-400 leading-snug">
                    Stake represents your share. Every 3 minutes, wheel spins & winner takes the entire accumulated pot!
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-[#FACC15]">
              <span>Stake = % Chance</span>
              <span>·</span>
              <span>Winner Takes All</span>
            </div>
          </div>

          {/* Ludo Quick (2-Token Sprint) */}
          <div
            onClick={() => setSelectedGame('ludo')}
            className={`cursor-pointer rounded-3xl border p-5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
              selectedGame === 'ludo'
                ? 'border-[#A855F7] bg-[#171120] shadow-[0_0_24px_rgba(168,85,247,0.18)] ring-1 ring-[#A855F7]/40'
                : 'border-white/[0.08] bg-[#0E1318] hover:border-white/20 hover:bg-[#121820]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="rounded-full bg-[#A855F7]/20 px-2 py-0.5 text-[10px] font-mono font-bold text-[#C084FC]">
                  LUDO SPRINT
                </span>
                <span className="text-[10px] font-mono text-slate-400">2-Token Dash</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#080C0F] border border-white/10 text-2xl shrink-0 shadow-inner">
                  🎲
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Ludo Quick</h3>
                  <p className="mt-1 text-xs text-slate-400 leading-snug">
                    Roll 6 to exit yard, capture opponents, advance 52-tile track with safe tiles, and race home!
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-[#C084FC]">
              <span>Safe Tiles & Blocks</span>
              <span>·</span>
              <span>Extra Rolls on 6</span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Crypto Wagering Configuration */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-6 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Coins size={18} className="text-[#FACC15]" />
              <span>Multi-Chain Wager Currency & Equivalents</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select which crypto you want to wager. Values auto-calibrate to exact $ USD equivalents.
            </p>
          </div>

          {/* Crypto Chain Pills */}
          <div className="flex items-center gap-1.5 bg-[#121820] p-1 rounded-2xl border border-white/5">
            {(['SOL', 'ETH', 'BTC', 'USDT'] as const).map((token) => {
              const isSelected = selectedCrypto === token;
              return (
                <button
                  key={token}
                  type="button"
                  onClick={() => setSelectedCrypto(token)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-mono font-bold transition-all ${
                    isSelected
                      ? 'bg-[#22C55E] text-black shadow-md shadow-[#22C55E]/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {token}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stake Presets */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-300">Wager Stake</span>
            <span className="font-mono text-[#4ADE80] font-bold">
              {cryptoEquivalent} {selectedCrypto} <span className="text-slate-400">(${stakeUsd}.00 USD)</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[5, 10, 25, 50, 100].map((val) => {
              const isSelected = stakeUsd === val;
              const eq = (val / CRYPTO_RATES[selectedCrypto]).toFixed(
                selectedCrypto === 'BTC' ? 5 : selectedCrypto === 'ETH' ? 4 : 2
              );

              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStakeUsd(val)}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-[#22C55E] bg-[#121B16] shadow-[0_0_15px_rgba(34,197,94,0.15)] ring-1 ring-[#22C55E]/40'
                      : 'border-white/[0.08] bg-[#121820] hover:border-white/20'
                  }`}
                >
                  <span className="text-lg font-black font-mono text-white">${val}</span>
                  <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {eq} {selectedCrypto}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pot breakdown & Launch CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-3 border-t border-white/5">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-white/5 bg-[#121820] px-4 py-2.5">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Match Pot</span>
              <span className="text-lg font-black font-mono text-[#FACC15]">
                ${prizePotUsd} <span className="text-xs text-slate-400">({prizePotCrypto} {selectedCrypto})</span>
              </span>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              <div>Network: <strong className="text-white">{selectedCrypto === 'SOL' ? 'Solana Mainnet' : selectedCrypto === 'ETH' ? 'Base / Ethereum' : selectedCrypto === 'BTC' ? 'Bitcoin' : 'Multi-Chain'}</strong></div>
              <div className="text-[10px] text-slate-500">Fast escrow & immediate settlement</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLaunch}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] px-7 py-3.5 text-xs font-black text-black shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>PLAY {selectedGame === 'pool' ? '8-BALL POOL' : selectedGame === 'wheel' ? 'WHEEL OF THE POT' : 'LUDO QUICK'} ({cryptoEquivalent} {selectedCrypto})</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
