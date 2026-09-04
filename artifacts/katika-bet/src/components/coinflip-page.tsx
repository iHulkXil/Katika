import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { CircleDot } from 'lucide-react';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';

type FlipResult = {
  result: 'heads' | 'tails';
  side: 'heads' | 'tails';
  wager: number;
  won: boolean;
  payout: number;
  demoCredits: number;
};

async function readApiJson(response: Response) {
  const text = await response.text();
  if (!text) throw new Error('Empty API response. Restart the API on port 5000.');
  try {
    return JSON.parse(text) as FlipResult & { error?: string };
  } catch {
    throw new Error('API did not return JSON.');
  }
}

export function CoinFlipPage() {
  const { authenticated, getAccessToken } = usePrivy();
  const { serverUser, loading, refresh } = useServerSession();
  const [wager, setWager] = useState(50);
  const [side, setSide] = useState<'heads' | 'tails'>('heads');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FlipResult | null>(null);

  const play = async () => {
    setError(null);
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Sign in first');
      const response = await fetch('/api/games/coinflip', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wager, side }),
      });
      const body = await readApiJson(response);
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      setResult(body);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Flip failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-3 pt-4">
      <p className="font-mono-custom text-[11px] tracking-[.2em] text-primary">COIN FLIP / DEMO</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Heads or tails.</h1>
      <p className="mt-2 text-sm text-muted-foreground">Server flip. 1.98x on a win. Demo credits only.</p>
      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-primary">
            <CircleDot size={20} />
          </span>
          <p className="font-mono-custom text-sm">
            Demo credits: {loading && !serverUser ? '—' : (serverUser?.demoCredits ?? '—')}
          </p>
        </div>
        <p className="mt-8 text-center text-5xl font-semibold tracking-[-.06em]">
          {result ? result.result.toUpperCase() : '—'}
        </p>
        {result ? (
          <p className={`mt-2 text-center text-sm ${result.won ? 'text-primary' : 'text-muted-foreground'}`}>
            {result.won ? 'Win' : 'Lose'} {result.payout > 0 ? '+' : ''}{result.payout}
          </p>
        ) : null}
        {!authenticated ? (
          <div className="mt-6"><WalletAuthButton /></div>
        ) : (
          <>
            <label className="mt-6 block text-sm text-muted-foreground">
              Wager
              <input
                type="number"
                min={10}
                max={1000}
                step={10}
                value={wager}
                onChange={(event) => setWager(Number(event.target.value))}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSide('heads')} className={`rounded-lg py-3 text-sm ${side === 'heads' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Heads</button>
              <button type="button" onClick={() => setSide('tails')} className={`rounded-lg py-3 text-sm ${side === 'tails' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Tails</button>
            </div>
            <button type="button" disabled={busy} onClick={() => void play()} className="mt-5 w-full rounded-lg bg-secondary py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-60">
              {busy ? 'Flipping...' : 'Flip coin'}
            </button>
          </>
        )}
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
