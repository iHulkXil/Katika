import { useServerSession } from '@/components/server-session';

export function RolloverStrip() {
  const { serverUser, loading } = useServerSession();
  const ktk = serverUser?.ktk ?? serverUser?.demoCredits ?? 0;
  const left = serverUser?.rolloverLeft ?? 0;
  const need = serverUser?.rolloverNeed ?? 2670;
  const done = Boolean(serverUser?.unlocked);
  const progress = need > 0 ? Math.min(100, Math.round(((need - left) / need) * 100)) : 100;

  return (
    <div className="mt-3 rounded-xl border border-[#1C3A2E] bg-[#0E1A16] px-3 py-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#8FA39A]">
            {done ? 'Unlocked KTK' : 'Locked KTK'}
          </p>
          <p className="font-mono-custom text-lg text-[#35D399]">{loading && !serverUser ? '...' : ktk.toLocaleString()}</p>
        </div>
        <p className="text-right text-xs text-[#8FA39A]">
          {done ? 'Rollover complete' : `${left.toLocaleString()} left to wager`}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#122019]">
        <div className="h-full bg-[#35D399]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
