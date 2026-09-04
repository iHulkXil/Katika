import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';

type Bet = 'red' | 'black' | 'odd' | 'even' | 'number';
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export function RoulettePage() {
  const { authenticated, getAccessToken } = usePrivy();
  const { serverUser, loading, refresh } = useServerSession();
  const [wager, setWager] = useState(50);
  const [bet, setBet] = useState<Bet>('red');
  const [number, setNumber] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ roll: number; color: string; won: boolean; payout: number } | null>(null);
  const [ribbon, setRibbon] = useState<number[]>([]);

  const play = async () => {
    setError(null); setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 1100));
      const token = await getAccessToken();
      if (!token) throw new Error('Sign in first');
      const response = await fetch('/api/games/roulette', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ wager, bet, number }),
      });
      const text = await response.text();
      if (!text) throw new Error('Empty API response');
      const body = JSON.parse(text);
      if (!response.ok) throw new Error(body.error ?? 'Spin failed');
      setResult(body);
      setRibbon((prev) => [body.roll, ...prev].slice(0, 14));
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="px-3 pt-4">
      <p className="font-mono-custom text-[11px] tracking-[.2em] text-primary">ROULETTE</p>
      <h1 className="mt-2 text-3xl font-semibold">European wheel.</h1>
      <div className="mt-3 flex gap-1 overflow-x-auto pb-2">
        {ribbon.map((n, i) => (
          <span key={`${n}-${i}`} className={`min-w-8 rounded px-2 py-1 text-center font-mono-custom text-xs ${
            n === 0 ? 'bg-primary text-primary-foreground' : RED.has(n) ? 'bg-destructive/80 text-white' : 'border border-border'
          }`}>{n}</span>
        ))}
      </div>
      <div className={`fx-stage mt-2 ${result?.won ? 'fx-win' : ''}`}>
        <span className="fx-pointer" />
        <div className={`fx-wheel ${busy ? 'spin' : ''}`} />
        <div className="fx-wheel-center">{result ? result.roll : '•'}</div>
      </div>
      {result ? <p className={`mt-3 text-center text-sm ${result.won ? 'text-primary' : 'text-muted-foreground'}`}>{result.color} · {result.payout}</p> : null}
      <p className="mt-2 text-center font-mono-custom text-xs text-muted-foreground">Demo credits: {loading && !serverUser ? '—' : (serverUser?.demoCredits ?? '—')}</p>
      <div className="mt-4 grid grid-cols-6 gap-1">
        {Array.from({ length: 37 }, (_, n) => (
          <button key={n} type="button" onClick={() => { setBet('number'); setNumber(n); }} className={`rounded py-2 font-mono-custom text-[11px] ${
            bet === 'number' && number === n ? 'ring-2 ring-primary' : ''
          } ${n === 0 ? 'bg-primary/30' : RED.has(n) ? 'bg-destructive/40' : 'border border-border bg-card'}`}>{n}</button>
        ))}
      </div>
      {!authenticated ? <div className="mt-4"><WalletAuthButton /></div> : (
        <div className="mt-4 space-y-2">
          <input type="number" value={wager} onChange={(e) => setWager(Number(e.target.value))} className="w-full rounded-lg border border-border bg-card px-3 py-2" />
          <div className="grid grid-cols-4 gap-2">
            {(['red', 'black', 'odd', 'even'] as Bet[]).map((item) => (
              <button key={item} type="button" onClick={() => setBet(item)} className={`rounded-lg py-2 text-xs capitalize ${bet === item ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>{item}</button>
            ))}
          </div>
          <button type="button" disabled={busy} onClick={() => void play()} className="w-full rounded-lg bg-secondary py-3 text-sm font-semibold text-secondary-foreground">Spin</button>
        </div>
      )}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
