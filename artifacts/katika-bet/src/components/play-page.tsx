import { Link } from 'wouter';
import { usePrivy } from '@privy-io/react-auth';
import { KatikaLogo } from '@/components/katika-logo';
import { Dices, CircleDollarSign, Bomb, Trophy, Swords, Zap, Sparkles } from 'lucide-react';

export function PlayPage() {
  const { ready, authenticated, login } = usePrivy();

  if (!ready) return <p className="px-3 pt-6 text-sm text-[#95A89E]">Loading...</p>;

  if (!authenticated) {
    return (
      <div className="px-3 pt-10 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center">
          <KatikaLogo className="h-full w-full" />
        </div>
        <h2 className="font-display text-xl font-bold text-white">Sign in to Enter the Arena</h2>
        <p className="text-xs text-[#95A89E] max-w-xs mx-auto">
          Connect your multi-chain wallet or sign in with Google to stake in prediction markets and PvP games.
        </p>
        <button
          type="button"
          onClick={() => void login()}
          className="rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#FACC15] px-6 py-3 text-sm font-bold text-[#080C0A] shadow-[0_4px_16px_rgba(245,158,11,0.3)] hover:brightness-105 active:scale-95 transition-all"
        >
          Connect Wallet & Play
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 pt-3 pb-8 space-y-4">
      {/* Banner */}
      <div className="rounded-3xl border border-[#1E2E25] bg-gradient-to-r from-[#121E18] via-[#0E1712] to-[#080C0A] p-4 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0">
            <KatikaLogo className="h-full w-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono-custom text-[9px] font-bold uppercase tracking-wider text-[#F59E0B]">
                Official Table Floor
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            </div>
            <h1 className="font-display text-base font-extrabold text-white">
              SIDEBET Gaming Floor
            </h1>
          </div>
        </div>
      </div>

      {/* PvP Arena */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              PvP Arena
            </h2>
          </div>
          <span className="font-mono-custom text-[11px] font-bold text-[#F59E0B]">4% Pot Rake</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/games/pool"
            className="block group rounded-2xl border border-[#1E2E25] bg-gradient-to-br from-[#0E1712] to-[#080C0A] p-3.5 transition-all hover:border-[#F59E0B]/50 hover:shadow-[0_4px_20px_rgba(245,158,11,0.12)] active:scale-98"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-2 py-0.5 font-mono-custom text-[9px] font-bold text-[#F59E0B]">
                8-BALL
              </span>
              <span className="rounded-full bg-[#10B981]/15 px-2 py-0.5 font-mono-custom text-[9px] font-bold text-[#10B981]">
                4% RAKE
              </span>
            </div>
            <h3 className="mt-2.5 font-display text-base font-bold text-white group-hover:text-[#F59E0B] transition-colors">
              8-Ball Pool
            </h3>
            <p className="mt-0.5 text-[11px] text-[#95A89E]">Billiards Arena · Solids vs Stripes</p>
          </Link>

          <Link
            href="/pvp"
            className="block group rounded-2xl border border-[#1E2E25] bg-gradient-to-br from-[#0E1712] to-[#080C0A] p-3.5 transition-all hover:border-[#3B82F6]/50 hover:shadow-[0_4px_20px_rgba(59,130,246,0.12)] active:scale-98"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[#3B82F6]/15 border border-[#3B82F6]/30 px-2 py-0.5 font-mono-custom text-[9px] font-bold text-[#60A5FA]">
                LUDO CLUB
              </span>
              <span className="rounded-full bg-[#10B981]/15 px-2 py-0.5 font-mono-custom text-[9px] font-bold text-[#10B981]">
                4% RAKE
              </span>
            </div>
            <h3 className="mt-2.5 font-display text-base font-bold text-white group-hover:text-[#60A5FA] transition-colors">
              Club Ludo
            </h3>
            <p className="mt-0.5 text-[11px] text-[#95A89E]">2 Tokens Home · Captures & Blocks</p>
          </Link>
        </div>
      </div>

      {/* Classic House Tables */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#10B981]" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              Classic House Tables
            </h2>
          </div>
          <Link href="/leaderboard" className="font-mono-custom text-xs font-bold text-[#F59E0B] hover:underline">
            Leaderboard →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/games/dice"
            className="group rounded-2xl border border-[#1E2E25] bg-[#0E1712] p-3.5 transition-all hover:border-[#F59E0B]/50 hover:shadow-[0_4px_16px_rgba(245,158,11,0.08)]"
          >
            <div className="flex items-center justify-between">
              <Dices size={20} className="text-[#F59E0B]" />
              <span className="font-mono-custom text-[10px] font-bold text-[#F59E0B]">1–100</span>
            </div>
            <h3 className="mt-2 font-display text-base font-bold text-white group-hover:text-[#F59E0B] transition-colors">
              Dice
            </h3>
            <p className="mt-0.5 text-[11px] text-[#95A89E]">Over/Under precision roll</p>
          </Link>

          <Link
            href="/games/coinflip"
            className="group rounded-2xl border border-[#1E2E25] bg-[#0E1712] p-3.5 transition-all hover:border-[#EF4444]/50 hover:shadow-[0_4px_16px_rgba(239,68,68,0.08)]"
          >
            <div className="flex items-center justify-between">
              <CircleDollarSign size={20} className="text-[#EF4444]" />
              <span className="font-mono-custom text-[10px] font-bold text-[#EF4444]">1.88×</span>
            </div>
            <h3 className="mt-2 font-display text-base font-bold text-white group-hover:text-[#EF4444] transition-colors">
              Coin Flip
            </h3>
            <p className="mt-0.5 text-[11px] text-[#95A89E]">3D Gold African Coin</p>
          </Link>

          <Link
            href="/games/mines"
            className="group rounded-2xl border border-[#1E2E25] bg-[#0E1712] p-3.5 transition-all hover:border-[#10B981]/50 hover:shadow-[0_4px_16px_rgba(16,185,129,0.08)]"
          >
            <div className="flex items-center justify-between">
              <Bomb size={20} className="text-[#10B981]" />
              <span className="font-mono-custom text-[10px] font-bold text-[#10B981]">5×5 Grid</span>
            </div>
            <h3 className="mt-2 font-display text-base font-bold text-white group-hover:text-[#10B981] transition-colors">
              Mines Vault
            </h3>
            <p className="mt-0.5 text-[11px] text-[#95A89E]">Uncover gems & cash out</p>
          </Link>

          <Link
            href="/games/roulette"
            className="group rounded-2xl border border-[#1E2E25] bg-[#0E1712] p-3.5 transition-all hover:border-[#3B82F6]/50 hover:shadow-[0_4px_16px_rgba(59,130,246,0.08)]"
          >
            <div className="flex items-center justify-between">
              <Sparkles size={20} className="text-[#3B82F6]" />
              <span className="font-mono-custom text-[10px] font-bold text-[#3B82F6]">European</span>
            </div>
            <h3 className="mt-2 font-display text-base font-bold text-white group-hover:text-[#3B82F6] transition-colors">
              Roulette
            </h3>
            <p className="mt-0.5 text-[11px] text-[#95A89E]">Single zero 0-36 wheel</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
