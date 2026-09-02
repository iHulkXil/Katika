import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Dice5 } from 'lucide-react';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';

type DiceResult = {
  roll: number;
  prediction: 'low' | 'high';
  wager: number;
  won: boolean;
  payout: number;
  demoCredits: number;
};

export function DicePage() {
  const { authenticated, getAccessToken } = usePrivy();
  const { serverUser, loading, refresh } = useServerSession();
  const [wager, setWager] = useState(50);
  const [prediction, setPrediction] = useState<'low' | 'high'>('high');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiceResult | null>(null);

  const play = async () => {
    setError(null);
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Connect a wallet first');
      }
      const response = await fetch('/api/games/dice', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wager, prediction }),
      });
      const body = (await response.json()) as DiceResult & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }
      setResult(body);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Play failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-b border-border/70 surface-grid">
      <div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8">
        <p className="font-mono-custom text-[11px] tracking-[.22em] text-primary">
          DICE / DEMO
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-.065em] sm:text-6xl">
          High or low.
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
          Roll 1–6. Low is 1–3. High is 4–6. Even-money demo credits. Not real money.
        </p>
        <div className="mt-10 max-w-lg rounded-2xl border border-border bg-card p-6">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-primary">
            <Dice5 size={22} />
          </div>
          <p className="mt-6 font-mono-custom text-sm" data-testid="status-dice-credits">
            Demo credits:{' '}
            {loading && !serverUser ? '—' : (serverUser?.demoCredits ?? '—')}
          </p>
          {!authenticated ? (
            <div className="mt-6">
              <WalletAuthButton />
            </div>
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
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPrediction('low')}
                  className={`rounded-lg px-4 py-2 text-sm ${prediction === 'low' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
                >
                  Low 1–3
                </button>
                <button
                  type="button"
                  onClick={() => setPrediction('high')}
                  className={`rounded-lg px-4 py-2 text-sm ${prediction === 'high' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
                >
                  High 4–6
                </button>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void play()}
                data-testid="button-roll-dice"
                className="mt-6 inline-flex rounded-lg bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
              >
                {busy ? 'Rolling...' : 'Roll dice'}
              </button>
            </>
          )}
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          {result ? (
            <p className="mt-4 font-mono-custom text-sm" data-testid="status-dice-result">
              Rolled {result.roll}. {result.won ? 'Win' : 'Lose'} {result.payout > 0 ? '+' : ''}
              {result.payout}. Balance {result.demoCredits}.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
