import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Grid2X2 } from 'lucide-react';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';

type Bet = 'red' | 'black' | 'odd' | 'even' | 'number';

export function RoulettePage() {
  const { authenticated, getAccessToken } = usePrivy();
  const { serverUser, loading, refresh } = useServerSession();
  const [wager, setWager] = useState(50);
  const [bet, setBet] = useState<Bet>('red');
  const [number, setNumber] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ roll: number; color: string; won: boolean; payout: number } | null>(null);

  const play = async () => {
    setError(null);
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Sign in first');
      const response = await fetch('/api/games/roulette', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ wager, bet, number }),
      });
      const text = await response.text();
      if (!text) throw new Error('Empty API response. Restart API on 5000.');
      const body = JSON.parse(text);
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      setResult(body);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spin failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-3 pt-4">
      <p className="font-mono-custom text-[11px] tracking-[.2em] text-primary">ROULETTE / DEMO</p>
      <h1 className="mt-2 text-3xl font-semibold">European wheel.</h1>
      <p className="mt-2 text-sm text-muted-foreground">0–36. Even chances pay 1.98x. Straight number pays 35x. Demo credits only.</p>
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-primary"><Grid2X2 size={20} /></span>
          <p className="font-mono-custom text-sm">Demo credits: {loading && !serverUser ? '—' : (serverUser?.demoCredits ?? '—')}</p>
        </div>
        <p className="mt-8 text-center text-6xl font-semibold">{result ? result.roll : '—'}</p>
        {result ? <p className={`mt-2 text-center text-sm ${result.won ? 'text-primary' : 'text-muted-foreground'}`}>{result.color} · {result.won ? 'Win' : 'Lose'} {result.payout > 0 ? '+' : ''}{result.payout}</p> : null}
        {!authenticated ? <div className="mt-6"><WalletAuthButton /></div> : (
          <>
            <label className="mt-6 block text-sm text-muted-foreground">Wager
              <input type="number" min={10} max={1000} value={wager} onChange={(e) => setWager(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2" />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(['red', 'black', 'odd', 'even'] as Bet[]).map((item) => (
                <button key={item} type="button" onClick={() => setBet(item)} className={`rounded-lg py-2 text-sm capitalize ${bet === item ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>{item}</button>
              ))}
            </div>
            <button type="button" onClick={() => setBet('number')} className={`mt-2 w-full rounded-lg py-2 text-sm ${bet === 'number' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Straight number</button>
            {bet === 'number' ? (
              <input type="number" min={0} max={36} value={number} onChange={(e) => setNumber(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2" />
            ) : null}
            <button type="button" disabled={busy} onClick={() => void play()} className="mt-5 w-full rounded-lg bg-secondary py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-60">{busy ? 'Spinning...' : 'Spin'}</button>
          </>
        )}
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
