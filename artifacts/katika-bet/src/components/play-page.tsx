import { Link } from 'wouter';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { LegendCard, useLegend } from '@/components/legend-card';
import { RolloverStrip } from '@/components/rollover-strip';

export function PlayPage() {
  const { ready, authenticated, login } = usePrivy();
  const { legend } = useLegend();

  if (!ready) return <p className="px-3 pt-6 text-sm text-[#8FA39A]">Loading...</p>;

  if (!authenticated) {
    return (
      <div className="px-3 pt-6">
        <LegendCard legend={null} variant="ghost" />
        <button type="button" onClick={() => void login()} className="mt-4 rounded-lg bg-[#35D399] px-4 py-2.5 text-sm font-semibold text-[#062018]">Sign in</button>
      </div>
    );
  }

  return (
    <div className="px-3 pt-3 pb-8">
      {/* Positioning line */}
      <div className="mb-3 rounded-2xl border border-[#1C3A2E] bg-gradient-to-r from-[#0E1A16] to-[#07110e] px-4 py-2.5">
        <p className="text-center font-mono-custom text-[11px] font-medium leading-relaxed text-[#c7d9d0]">
          &ldquo;Build a legend. Lock KTK into the card. Play to unlock more. Mint when the card is yours.&rdquo;
        </p>
      </div>

      <LegendCard legend={legend} variant={legend?.profileComplete ? 'compact' : 'ghost'} />
      <RolloverStrip />

      <div className="mt-5 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#E8F2EC]">Casino Tables</h2>
        <Link href="/leaderboard" className="text-xs text-[#35D399] hover:underline">
          View Leaderboard →
        </Link>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <Link href="/games/dice" className="group rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-3.5 transition-all hover:border-[#35D399]/50">
          <span className="font-mono-custom text-[10px] text-[#35D399]">1–100</span>
          <h3 className="mt-1 text-base font-semibold group-hover:text-[#35D399]">Dice</h3>
          <p className="mt-0.5 text-xs text-[#8FA39A]">Over/Under roll</p>
        </Link>
        <Link href="/games/coinflip" className="group rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-3.5 transition-all hover:border-[#35D399]/50">
          <span className="font-mono-custom text-[10px] text-[#35D399]">1.98×</span>
          <h3 className="mt-1 text-base font-semibold group-hover:text-[#35D399]">Coin Flip</h3>
          <p className="mt-0.5 text-xs text-[#8FA39A]">Heads or tails</p>
        </Link>
        <Link href="/games/mines" className="group rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-3.5 transition-all hover:border-[#35D399]/50">
          <span className="font-mono-custom text-[10px] text-[#35D399]">Dynamic</span>
          <h3 className="mt-1 text-base font-semibold group-hover:text-[#35D399]">Mines</h3>
          <p className="mt-0.5 text-xs text-[#8FA39A]">Open gems &amp; cash out</p>
        </Link>
        <Link href="/games/roulette" className="group rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-3.5 transition-all hover:border-[#35D399]/50">
          <span className="font-mono-custom text-[10px] text-[#35D399]">36:1</span>
          <h3 className="mt-1 text-base font-semibold group-hover:text-[#35D399]">Roulette</h3>
          <p className="mt-0.5 text-xs text-[#8FA39A]">European wheel</p>
        </Link>
      </div>

      <div className="mt-5 flex items-center justify-center gap-4 text-xs text-[#8FA39A]">
        <Link href="/legend" className="hover:text-[#35D399]">Reallocate card stats</Link>
        <span>·</span>
        <Link href="/leaderboard" className="hover:text-[#35D399]">OVR Leaderboard</Link>
      </div>
    </div>
  );
}
