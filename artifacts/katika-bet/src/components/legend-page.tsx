import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';

const POSITIONS = ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'CDM', 'LB', 'RB', 'CB', 'GK'];
const STATS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'] as const;

type Legend = {
  name: string;
  position: string;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  profileComplete: boolean;
  allocatedKchip: number;
};

export function LegendPage() {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const { serverUser } = useServerSession();
  const [legend, setLegend] = useState<Legend>({
    name: 'K. Ronaldo',
    position: 'ST',
    pace: 52,
    shooting: 55,
    passing: 48,
    dribbling: 55,
    defending: 42,
    physical: 60,
    profileComplete: false,
    allocatedKchip: 312,
  });
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    const token = await getAccessToken();
    if (!token) return;
    const response = await fetch('/api/legends/me', { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return;
    const body = await response.json();
    if (body) setLegend(body as Legend);
  };

  useEffect(() => {
    if (ready && authenticated) void load();
  }, [ready, authenticated]);

  const save = async () => {
    setStatus('Saving...');
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Sign in first');
      const response = await fetch('/api/legends/me', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(legend),
      });
      const body = await response.json();
      if (!response.ok) throw new Error((body as { error?: string }).error ?? 'Save failed');
      setLegend(body as Legend);
      setStatus('Card saved');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed');
    }
  };

  if (!ready) return <p className="px-3 pt-6 text-sm text-[#8FA39A]">Loading...</p>;
  if (!authenticated) {
    return (
      <div className="px-3 pt-6">
        <p className="text-sm text-[#8FA39A]">Sign in to build the card.</p>
        <button type="button" onClick={() => void login()} className="mt-4 rounded-full bg-[#35D399] px-6 py-3 text-sm font-semibold text-[#062018]">Sign in</button>
      </div>
    );
  }

  const allocated = STATS.reduce((sum, key) => sum + Number(legend[key] || 0), 0);
  const playable = serverUser?.demoCredits ?? 0;

  return (
    <div className="px-3 pt-2 pb-8">
      <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8FA39A]">Name
        <input
          className="mt-2 w-full rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] px-4 py-3.5 text-sm text-[#E8F2EC] outline-none focus:border-[#35D399]/50"
          value={legend.name}
          onChange={(event) => setLegend({ ...legend, name: event.target.value })}
        />
      </label>

      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8FA39A]">Position</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {POSITIONS.map((position) => (
          <button
            key={position}
            type="button"
            onClick={() => setLegend({ ...legend, position })}
            className={`rounded-full px-3 py-1.5 text-xs ${legend.position === position ? 'bg-[#35D399] font-semibold text-[#062018]' : 'bg-[#0E1A16] text-[#8FA39A] ring-1 ring-[#1C3A2E]'}`}
          >
            {position}
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-end justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8FA39A]">Attributes · 1 pt = 1 KCHIP</p>
        <p className="font-mono-custom text-xs text-[#35D399]">{allocated} alloc</p>
      </div>

      <div className="mt-3 space-y-4">
        {STATS.map((key) => (
          <label key={key} className="grid grid-cols-[88px_1fr_36px] items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[#8FA39A]">
            <span>{key}</span>
            <input
              type="range"
              min={1}
              max={99}
              value={legend[key]}
              className="w-full accent-[#35D399]"
              onChange={(event) => setLegend({ ...legend, [key]: Number(event.target.value) })}
            />
            <span className="text-right font-mono-custom text-sm text-[#E8F2EC]">{legend[key]}</span>
          </label>
        ))}
      </div>

      <div className="mt-6 flex items-end justify-between border-t border-[#1C3A2E] pt-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#8FA39A]">Allocated</p>
          <p className="mt-1 font-mono-custom text-2xl">{allocated}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#8FA39A]">Est. playable</p>
          <p className="mt-1 font-mono-custom text-2xl text-[#35D399]">{playable.toLocaleString()}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void save()}
        className="mt-6 w-full rounded-full bg-[#35D399] py-3.5 text-sm font-semibold text-[#062018] shadow-[0_0_28px_rgba(53,211,153,.35)]"
      >
        Save card
      </button>
      {status ? <p className="mt-2 text-center text-xs text-[#8FA39A]">{status}</p> : null}
      <Link href="/play" className="mt-4 block text-center text-sm text-[#8FA39A]">To the floor →</Link>
    </div>
  );
}
