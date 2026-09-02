import { useEffect, useMemo, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Dice5 } from 'lucide-react';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';

type DiceResult = {
  roll: number;
  target: number;
  prediction: 'over' | 'under';
  wager: number;
  won: boolean;
  multiplier: number;
  winChance: number;
  payout: number;
  demoCredits: number;
};

const HOUSE_EDGE = 0.01;

function previewStats(target: number, prediction: 'over' | 'under') {
  const winOutcomes = prediction === 'over' ? 100 - target : target - 1;
  const winChance = winOutcomes / 100;
  const multiplier = winChance > 0 ? (1 - HOUSE_EDGE) / winChance : 0;
  return {
    winChance: Number((winChance * 100).toFixed(2)),
    multiplier: Number(multiplier.toFixed(4)),
  };
}

async function readApiJson(response: Response) {
  const text = await response.text();
  if (!text) {
    throw new Error(
      `API returned an empty response (${response.status}). Restart the API on port 5000.`,
    );
  }
  try {
    return JSON.parse(text) as DiceResult & { error?: string };
  } catch {
    throw new Error(
      `API did not return JSON (${response.status}). Is Vite proxying /api to :5000?`,
    );
  }
}

export function DicePage() {
  const { authenticated, getAccessToken } = usePrivy();
  const { serverUser, loading, refresh } = useServerSession();
  const [wager, setWager] = useState(50);
  const [target, setTarget] = useState(50);
  const [prediction, setPrediction] = useState<'over' | 'under'>('over');
  const [busy, setBusy] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [autoCount, setAutoCount] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiceResult | null>(null);
  const [history, setHistory] = useState<DiceResult[]>([]);
  const stopRef = useRef(false);

  const stats = useMemo(() => previewStats(target, prediction), [target, prediction]);
  const credits = serverUser?.demoCredits;

  useEffect(() => {
    return () => {
      stopRef.current = true;
    };
  }, []);

  const playOnce = async (): Promise<DiceResult> => {
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
      body: JSON.stringify({ wager, target, prediction }),
    });
    const body = await readApiJson(response);
    if (!response.ok) {
      throw new Error(body.error ?? `HTTP ${response.status}`);
    }
    setResult(body);
    setHistory((prev) => [body, ...prev].slice(0, 12));
    await refresh();
    return body;
  };

  const play = async () => {
    setError(null);
    setBusy(true);
    try {
      await playOnce();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Play failed');
    } finally {
      setBusy(false);
    }
  };

  const startAuto = async () => {
    const planned = Math.min(50, Math.max(1, Math.floor(autoCount)));
    setError(null);
    setAutoPlaying(true);
    setBusy(true);
    stopRef.current = false;
    try {
      for (let i = 0; i < planned; i += 1) {
        if (stopRef.current) break;
        const last = await playOnce();
        if (last.demoCredits < wager) break;
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto play failed');
      stopRef.current = true;
    } finally {
      setAutoPlaying(false);
      setBusy(false);
    }
  };

  const stopAuto = () => {
    stopRef.current = true;
  };

  return (
    <div className="border-b border-border/70 surface-grid">
      <div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8">
        <p className="font-mono-custom text-[11px] tracking-[.22em] text-primary">
          DICE / 1–100
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-.065em] sm:text-6xl">
          Roll the line.
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
          Server rolls 1–100. Slide the target, pick over or under. 1% house edge on demo credits. Not real money.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-primary">
                <Dice5 size={22} />
              </div>
              <p className="font-mono-custom text-sm" data-testid="status-dice-credits">
                Demo credits: {loading && credits == null ? '—' : (credits ?? '—')}
              </p>
            </div>

            <div className="mt-8 grid place-items-center rounded-2xl border border-border bg-background/40 py-8">
              <p className="font-mono-custom text-[11px] tracking-[.22em] text-muted-foreground">
                LAST ROLL
              </p>
              <p className="mt-2 text-6xl font-semibold tracking-[-.06em]" data-testid="status-dice-roll">
                {result?.roll ?? '—'}
              </p>
              {result ? (
                <p className={`mt-3 text-sm ${result.won ? 'text-primary' : 'text-muted-foreground'}`}>
                  {result.won ? 'Win' : 'Lose'} {result.payout > 0 ? '+' : ''}
                  {result.payout} · {result.prediction} {result.target}
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Set a line and roll.</p>
              )}
            </div>

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
                    disabled={autoPlaying}
                    onChange={(event) => setWager(Number(event.target.value))}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  />
                </label>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Target</span>
                    <span className="font-mono-custom">{target}</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={98}
                    value={target}
                    disabled={autoPlaying}
                    onChange={(event) => setTarget(Number(event.target.value))}
                    className="mt-3 w-full accent-emerald-400"
                    data-testid="slider-dice-target"
                  />
                  <div className="mt-2 flex justify-between font-mono-custom text-[11px] text-muted-foreground">
                    <span>1</span>
                    <span>100</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={autoPlaying}
                    onClick={() => setPrediction('under')}
                    className={`rounded-lg px-4 py-2 text-sm ${prediction === 'under' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
                  >
                    Roll under {target}
                  </button>
                  <button
                    type="button"
                    disabled={autoPlaying}
                    onClick={() => setPrediction('over')}
                    className={`rounded-lg px-4 py-2 text-sm ${prediction === 'over' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
                  >
                    Roll over {target}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-border px-3 py-2">
                    <p className="text-muted-foreground">Win chance</p>
                    <p className="font-mono-custom">{stats.winChance}%</p>
                  </div>
                  <div className="rounded-lg border border-border px-3 py-2">
                    <p className="text-muted-foreground">Multiplier</p>
                    <p className="font-mono-custom">{stats.multiplier.toFixed(2)}x</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void play()}
                  data-testid="button-roll-dice"
                  className="mt-6 inline-flex w-full justify-center rounded-lg bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
                >
                  {busy && !autoPlaying ? 'Rolling...' : 'Roll dice'}
                </button>

                <div className="mt-6 border-t border-border pt-5">
                  <p className="text-xs uppercase tracking-[.18em] text-muted-foreground">Auto play</p>
                  <label className="mt-3 block text-sm text-muted-foreground">
                    Rolls
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={autoCount}
                      disabled={autoPlaying}
                      onChange={(event) => setAutoCount(Number(event.target.value))}
                      className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                    />
                  </label>
                  {autoPlaying ? (
                    <button
                      type="button"
                      onClick={stopAuto}
                      className="mt-3 w-full rounded-lg border border-border px-5 py-3 text-sm font-semibold"
                    >
                      Stop auto
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void startAuto()}
                      data-testid="button-auto-dice"
                      className="mt-3 w-full rounded-lg border border-primary/40 px-5 py-3 text-sm font-semibold"
                    >
                      Start auto
                    </button>
                  )}
                </div>
              </>
            )}
            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs uppercase tracking-[.18em] text-muted-foreground">Recent rolls</p>
            {history.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No rolls yet.</p>
            ) : (
              <ul className="mt-4 space-y-2 font-mono-custom text-sm">
                {history.map((item, index) => (
                  <li
                    key={`${item.roll}-${item.demoCredits}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <span>
                      {item.roll} {item.prediction} {item.target}
                    </span>
                    <span className={item.won ? 'text-primary' : 'text-muted-foreground'}>
                      {item.payout > 0 ? '+' : ''}
                      {item.payout}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
