import { Link } from 'wouter';
import { Pickaxe, Sparkles, X, ShieldAlert, Cpu } from 'lucide-react';
import { POINTS_PER_BALL, MAX_DAILY_BALLS } from '@/hooks/use-ball-economy';

interface BallGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle?: string;
  ballsMinedToday?: number;
}

export function BallGateModal({
  isOpen,
  onClose,
  gameTitle = 'this game',
  ballsMinedToday = 0,
}: BallGateModalProps) {
  if (!isOpen) return null;

  const remainingDaily = Math.max(0, MAX_DAILY_BALLS - ballsMinedToday);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-sm rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-b from-[#0e241c] via-[#071510] to-[#040d0a] p-5 shadow-2xl text-center space-y-4">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-slate-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        {/* 3D Holographic Ball Icon */}
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-[#35d399]/50 bg-gradient-to-b from-[#10b981]/25 to-black/60 shadow-[0_0_30px_rgba(53,211,153,0.3)]">
          <span className="text-4xl animate-bounce">⚽</span>
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#f59e0b] text-black">
            <Pickaxe size={12} />
          </div>
        </div>

        <div>
          <span className="font-mono-custom text-[10px] uppercase tracking-widest text-[#35D399] font-bold">
            GAME PASS REQUIRED
          </span>
          <h2 className="text-xl font-black text-white mt-0.5">Need 1 $BALL to Play</h2>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            Each game on Katika.Bet costs <strong className="text-[#35D399]">1 $BALL</strong> to enter.
            Mine points in the Mining Station to mint your daily balls!
          </p>
        </div>

        {/* Daily Quota Card */}
        <div className="rounded-2xl border border-white/10 bg-black/50 p-3 text-left space-y-1.5 font-mono-custom text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>DAILY MINING LIMIT:</span>
            <span className="font-bold text-white">MAX {MAX_DAILY_BALLS} $BALL / DAY</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span>MINED TODAY:</span>
            <span className="font-bold text-[#facc15]">{ballsMinedToday} / {MAX_DAILY_BALLS}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] border-t border-white/5 pt-1.5 text-slate-300">
            <span>AVAILABLE TO MINT TODAY:</span>
            <span className="font-bold text-[#35D399]">{remainingDaily} $BALL</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <Link
            href="/mine"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#35D399] to-[#10b981] py-3.5 font-mono-custom text-xs font-black text-black shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            <Pickaxe size={16} />
            <span>OPEN MINING STATION</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-2 font-mono-custom text-xs text-slate-400 hover:text-white transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
