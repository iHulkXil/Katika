import { useEffect, useMemo, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Dice5 } from 'lucide-react';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';

type DiceResult = {
  roll: number; target: number; prediction: 'over' | 'under'; wager: number;
  won: boolean; multiplier: number; winChance: number; payout: number; demoCredits: number;
};

const HOUSE_EDGE = 0.01;
function previewStats(target: number, prediction: 'over' | 'under') {
  const winOutcomes = prediction === 'over' ? 100 - target : target - 1;
  const winChance = winOutcomes / 100;
  const multiplier = winChance > 0 ? (1 - HOUSE_EDGE) / winChance : 0;
  return { winChance: Number((winChance * 100).toFixed(2)), multiplier: Number(multiplier.toFixed(4)) };
}
async function readApiJson(response: Response) {
  const text = await response.text();
  if (!text) throw new Error('Empty API response. Restart API on 5000.');
  return JSON.parse(text) as DiceResult & { error?: string };
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
  const [stopProfit, setStopProfit] = useState(0);
  const [stopLoss, setStopLoss] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiceResult | null>(null);
  const [history, setHistory] = useState<DiceResult[]>([]);
  const stopRef = useRef(false);
  const stats = useMemo(() => previewStats(target, prediction), [target, prediction]);
  const credits = serverUser?.demoCredits;
  useEffect(() => () => { stopRef.current = true; }, []);

  const playOnce = async () => {
    const token = await getAccessToken();
    if (!token) throw new Error('Sign in first');
    const response = await fetch('/api/games/dice', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ wager, target, prediction }),
    });
    const body = await readApiJson(response);
    if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
    setResult(body);
    setHistory((prev) => [body, ...prev].slice(0, 20));
    await refresh();
    return body;
  };

  const play = async () => {
    setError(null); setBusy(true);
    try { await playOnce(); } catch (err) { setError(err instanceof Error ? err.message : 'Play failed'); }
    finally { setBusy(false); }
  };

  const startAuto = async () => {
    const planned = Math.min(50, Math.max(1, Math.floor(autoCount)));
    const startBal = serverUser?.demoCredits ?? 0;
    setError(null); setAutoPlaying(true); setBusy(true); stopRef.current = false;
    try {
      for (let i = 0; i < planned; i += 1) {
        if (stopRef.current) break;
        const last = await playOnce();
        const profit = last.demoCredits - startBal;
        if (last.demoCredits < wager) break;
        if (stopProfit > 0 && profit >= stopProfit) break;
        if (stopLoss > 0 && profit <= -stopLoss) break;
        await new Promise((r) => setTimeout(r, 280));
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Auto failed'); }
    finally { setAutoPlaying(false); setBusy(false); }
  };

  return (
    <div className="px-3 pt-4">
      <p className="font-mono-custom text-[11px] tracking-[.2em] text-primary">DICE / 1–100</p>
      <h1 className="mt-2 text-3xl font-semibold">Roll the line.</h1>
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <p className="font-mono-custom text-sm">Demo credits: {loading && credits == null ? '—' : (credits ?? '—')}</p>
        <p className="mt-6 text-center text-6xl font-semibold">{result?.roll ?? '—'}</p>
        {result ? <p className={`text-center text-sm ${result.won ? 'text-primary' : 'text-muted-foreground'}`}>{result.won ? 'Win' : 'Lose'} {result.payout > 0 ? '+' : ''}{result.payout}</p> : null}
        {!authenticated ? <div className="mt-6"><WalletAuthButton /></div> : (
          <>
            <div className="mt-4 flex gap-2">
              <button type="button" className="rounded-lg border border-border px-3 py-2 text-xs" onClick={() => setWager(Math.max(10, Math.floor(wager / 2)))}>½</button>
              <input type="number" min={10} max={1000} value={wager} disabled={autoPlaying} onChange={(e) => setWager(Number(e.target.value))} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
              <button type="button" className="rounded-lg border border-border px-3 py-2 text-xs" onClick={() => setWager(Math.min(1000, wager * 2))}>2×</button>
            </div>
            <input type="range" min={2} max={98} value={target} disabled={autoPlaying} onChange={(e) => setTarget(Number(e.target.value))} className="mt-4 w-full accent-emerald-400" />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>Under {target}</span><span>{stats.winChance}% · {stats.multiplier.toFixed(2)}x</span><span>Over {target}</span></div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPrediction('under')} className={`rounded-lg py-2 text-sm ${prediction === 'under' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Under</button>
              <button type="button" onClick={() => setPrediction('over')} className={`rounded-lg py-2 text-sm ${prediction === 'over' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Over</button>
            </div>
            <button type="button" disabled={busy} onClick={() => void play()} className="mt-4 w-full rounded-lg bg-secondary py-3 text-sm font-semibold text-secondary-foreground">Roll</button>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <label>Rolls<input type="number" value={autoCount} onChange={(e) => setAutoCount(Number(e.target.value))} className="mt-1 w-full rounded border border-border bg-background px-2 py-1" /></label>
              <label>Stop profit<input type="number" value={stopProfit} onChange={(e) => setStopProfit(Number(e.target.value))} className="mt-1 w-full rounded border border-border bg-background px-2 py-1" /></label>
              <label>Stop loss<input type="number" value={stopLoss} onChange={(e) => setStopLoss(Number(e.target.value))} className="mt-1 w-full rounded border border-border bg-background px-2 py-1" /></label>
            </div>
            {autoPlaying ? <button type="button" onClick={() => { stopRef.current = true; }} className="mt-2 w-full rounded-lg border py-2 text-sm">Stop</button> : <button type="button" disabled={busy} onClick={() => void startAuto()} className="mt-2 w-full rounded-lg border border-primary/40 py-2 text-sm">Auto</button>}
          </>
        )}
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <ul className="mt-4 space-y-1 font-mono-custom text-xs">{history.slice(0, 8).map((item, i) => <li key={i} className="flex justify-between"><span>{item.roll}</span><span className={item.won ? 'text-primary' : ''}>{item.payout}</span></li>)}</ul>
      </div>
    </div>
  );
}
