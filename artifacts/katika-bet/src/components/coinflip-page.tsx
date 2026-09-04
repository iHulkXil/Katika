import { useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';

type FlipResult = { result: 'heads' | 'tails'; side: 'heads' | 'tails'; wager: number; won: boolean; payout: number; demoCredits: number };

export function CoinFlipPage() {
  const { authenticated, getAccessToken } = usePrivy();
  const { serverUser, loading, refresh } = useServerSession();
  const [wager, setWager] = useState(50);
  const [side, setSide] = useState<'heads' | 'tails'>('heads');
  const [busy, setBusy] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [autoCount, setAutoCount] = useState(8);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FlipResult | null>(null);
  const [history, setHistory] = useState<FlipResult[]>([]);
  const stopRef = useRef(false);

  const playOnce = async () => {
    const token = await getAccessToken();
    if (!token) throw new Error('Sign in first');
    const response = await fetch('/api/games/coinflip', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ wager, side }),
    });
    const text = await response.text();
    if (!text) throw new Error('Empty API response');
    const body = JSON.parse(text);
    if (!response.ok) throw new Error(body.error ?? 'Flip failed');
    setResult(body);
    setHistory((prev) => [body, ...prev].slice(0, 16));
    await refresh();
    return body as FlipResult;
  };

  const play = async () => {
    setError(null); setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 820));
      await playOnce();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setBusy(false); }
  };

  const startAuto = async () => {
    setAutoPlaying(true); setBusy(true); stopRef.current = false;
    try {
      for (let i = 0; i < Math.min(30, autoCount); i += 1) {
        if (stopRef.current) break;
        const last = await playOnce();
        if (last.demoCredits < wager) break;
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Auto failed'); }
    finally { setAutoPlaying(false); setBusy(false); }
  };

  return (
    <div className="px-3 pt-4">
      <p className="font-mono-custom text-[11px] tracking-[.2em] text-primary">COIN FLIP</p>
      <h1 className="mt-2 text-3xl font-semibold">Heads or tails.</h1>
      <div className={`fx-stage mt-5 ${result?.won ? 'fx-win' : ''}`}>
        <span className="fx-glow" />
        <div className={`fx-coin ${busy ? 'spin' : ''}`}>{result ? (result.result === 'heads' ? 'H' : 'T') : '?'}</div>
      </div>
      {result ? <p className={`mt-3 text-center text-sm ${result.won ? 'text-primary' : 'text-muted-foreground'}`}>{result.result} · {result.payout}</p> : null}
      <p className="mt-2 text-center font-mono-custom text-xs text-muted-foreground">Demo credits: {loading && !serverUser ? '—' : (serverUser?.demoCredits ?? '—')}</p>
      {!authenticated ? <div className="mt-6"><WalletAuthButton /></div> : (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border px-3 text-xs" onClick={() => setWager(Math.max(10, Math.floor(wager / 2)))}>½</button>
            <input type="number" value={wager} onChange={(e) => setWager(Number(e.target.value))} className="w-full rounded-lg border border-border bg-card px-3 py-2" />
            <button type="button" className="rounded-lg border px-3 text-xs" onClick={() => setWager(Math.min(1000, wager * 2))}>2×</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setSide('heads')} className={`rounded-lg py-3 ${side === 'heads' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Heads</button>
            <button type="button" onClick={() => setSide('tails')} className={`rounded-lg py-3 ${side === 'tails' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>Tails</button>
          </div>
          <button type="button" disabled={busy} onClick={() => void play()} className="w-full rounded-lg bg-secondary py-3 text-sm font-semibold text-secondary-foreground">Flip</button>
          {autoPlaying ? <button type="button" className="w-full rounded-lg border py-2 text-sm" onClick={() => { stopRef.current = true; }}>Stop</button> : <button type="button" disabled={busy} className="w-full rounded-lg border border-primary/40 py-2 text-sm" onClick={() => void startAuto()}>Auto ×{autoCount}</button>}
        </div>
      )}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-1">{history.map((item, i) => <span key={i} className={`rounded px-2 py-1 font-mono-custom text-[10px] ${item.won ? 'bg-accent text-primary' : 'border border-border'}`}>{item.result[0].toUpperCase()}</span>)}</div>
    </div>
  );
}
