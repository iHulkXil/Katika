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
      setStatus(`Saved. ${body.allocatedKchip} KCHIP on the card.`);
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

  return (
    <div className="px-3 pt-3">
      <p className="font-mono-custom text-[10px] tracking-[.2em] text-primary">CREATOR</p>
      <h1 className="mt-2 text-2xl font-semibold">My legend</h1>
      <p className="mt-2 text-sm text-muted-foreground">Each point on the card is 1 KCHIP allocated. Playable = on-chain minus this sum.</p>
      <label className="mt-4 block text-xs text-muted-foreground">Name
        <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={legend.name} onChange={(event) => setLegend({ ...legend, name: event.target.value })} />
      </label>
      <label className="mt-3 block text-xs text-muted-foreground">Position
        <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={legend.position} onChange={(event) => setLegend({ ...legend, position: event.target.value })}>
          {POSITIONS.map((position) => <option key={position}>{position}</option>)}
        </select>
      </label>
      <div className="mt-4 space-y-3">
        {STATS.map((key) => (
          <label key={key} className="block text-xs uppercase text-muted-foreground">
            {key} {legend[key]}
            <input type="range" min={1} max={99} value={legend[key]} className="mt-1 w-full" onChange={(event) => setLegend({ ...legend, [key]: Number(event.target.value) })} />
          </label>
        ))}
      </div>
      <p className="mt-4 font-mono-custom text-sm">Allocated {allocated} KCHIP</p>
      <button type="button" onClick={() => void save()} className="mt-3 w-full rounded-lg bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground">Save legend</button>
      {status ? <p className="mt-2 text-xs text-muted-foreground">{status}</p> : null}
      <Link href="/play" className="mt-4 inline-block text-sm text-primary">Back to Play</Link>
    </div>
  );
}
