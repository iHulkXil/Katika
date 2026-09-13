import { Link } from 'wouter';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { LegendCard, useLegend } from '@/components/legend-card';

export function PlayPage() {
  const { ready, authenticated, login } = usePrivy();
  const { serverUser } = useServerSession();
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

  const ktk = serverUser?.ktk ?? serverUser?.demoCredits ?? 0;
  const left = serverUser?.rolloverLeft ?? 2001;
  const done = Boolean(serverUser?.unlocked);

  return (
    <div className="px-3 pt-3">
      <LegendCard
        legend={legend}
        variant={legend?.profileComplete ? 'compact' : 'ghost'}
      />
      <div className="mt-4 rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#8FA39A]">Unlocked KTK</p>
        <p className="mt-1 font-mono-custom text-3xl text-[#35D399]">{ktk.toLocaleString()}</p>
        {done ? (
          <p className="mt-2 text-xs text-[#8FA39A]">Rollover complete. You can add more KTK to the card.</p>
        ) : (
          <p className="mt-2 text-xs text-[#8FA39A]">Wager {left.toLocaleString()} more KTK to unlock reallocating the rest to the legend.</p>
        )}
      </div>
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
