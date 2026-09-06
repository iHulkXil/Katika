import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { usePrivy } from '@privy-io/react-auth';

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
  const [legend, setLegend] = useState<Legend>({
    name: '',
    position: 'CAM',
    pace: 50,
    shooting: 50,
    passing: 50,
    dribbling: 50,
    defending: 50,
    physical: 50,
    profileComplete: false,
    allocatedKchip: 300,
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
      setStatus(`Card saved. ${(body as Legend).allocatedKchip} KCHIP locked in the legend.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed');
    }
  };

  if (!ready) return <p className="px-3 pt-6 text-sm text-muted-foreground">Loading...</p>;
  if (!authenticated) {
    return (
      <div className="px-3 pt-6">
        <h1 className="text-2xl font-semibold">Create a legend</h1>
        <button type="button" onClick={() => void login()} className="mt-4 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold">Sign in</button>
      </div>
    );
  }

  const allocated = STATS.reduce((sum, key) => sum + Number(legend[key] || 0), 0);
  const overall = Math.round(allocated / 6);

  return (
    <div className="px-3 pt-3 pb-8">
      <div className="overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-accent via-card to-background p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono-custom text-[10px] tracking-[.2em] text-primary">PLAYER CARD</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{legend.name || 'Unnamed'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{legend.position}</p>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <span className="font-mono-custom text-2xl font-bold">{overall}</span>
          </div>
        </div>
        <p className="mt-4 font-mono-custom text-xs text-secondary">{allocated} KCHIP allocated</p>
      </div>
      <label className="mt-5 block text-xs text-muted-foreground">Name
        <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={legend.name} onChange={(event) => setLegend({ ...legend, name: event.target.value })} />
      </label>
      <div className="mt-3 flex flex-wrap gap-1">
        {POSITIONS.map((position) => (
          <button key={position} type="button" onClick={() => setLegend({ ...legend, position })} className={`rounded-full px-2.5 py-1 text-[11px] ${legend.position === position ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}>
            {position}
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-3 rounded-2xl border border-border bg-card p-4">
        {STATS.map((key) => (
          <label key={key} className="block text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="flex justify-between"><span>{key}</span><span className="font-mono-custom text-foreground">{legend[key]}</span></span>
            <input type="range" min={1} max={99} value={legend[key]} className="mt-1 w-full accent-emerald-400" onChange={(event) => setLegend({ ...legend, [key]: Number(event.target.value) })} />
          </label>
        ))}
      </div>
      <button type="button" onClick={() => void save()} className="mt-4 w-full rounded-lg bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground">Save card</button>
      {status ? <p className="mt-2 text-xs text-muted-foreground">{status}</p> : null}
      <Link href="/play" className="mt-4 inline-block text-sm text-primary">To the floor</Link>
    </div>
  );
}
