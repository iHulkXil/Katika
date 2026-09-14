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
    <div className="px-3 pt-3">
      <LegendCard legend={legend} variant={legend?.profileComplete ? 'compact' : 'ghost'} />
      <RolloverStrip />
      <div className="mt-6 grid grid-cols-2 gap-2">
        <Link href="/games/dice" className="rounded-xl border border-[#1C3A2E] bg-[#0E1A16] p-3 text-sm font-semibold">Dice</Link>
        <Link href="/games/coinflip" className="rounded-xl border border-[#1C3A2E] bg-[#0E1A16] p-3 text-sm font-semibold">Flip</Link>
        <Link href="/games/mines" className="rounded-xl border border-[#1C3A2E] bg-[#0E1A16] p-3 text-sm font-semibold">Mines</Link>
        <Link href="/games/roulette" className="rounded-xl border border-[#1C3A2E] bg-[#0E1A16] p-3 text-sm font-semibold">Roulette</Link>
      </div>
      <Link href="/legend" className="mt-4 block text-center text-sm text-[#8FA39A]">Edit card</Link>
    </div>
  );
}
