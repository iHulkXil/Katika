import { useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Gem } from 'lucide-react';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';

const TILES = 25;

export function MinesPage() {
  const { authenticated, getAccessToken } = usePrivy();
  const { serverUser, loading, refresh } = useServerSession();
  const [wager, setWager] = useState(50);
  const [mines, setMines] = useState(3);
  const [picks, setPicks] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ mines: number[]; hit: number | null; won: boolean; payout: number; demoCredits: number } | null>(null);

  const toggle = (i: number) => {
    if (result || busy) return;
    setPicks((prev) => prev.includes(i) ? prev.filter((p) => p !== i) : [...prev, i]);
  };

  const play = async () => {
    setError(null);
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Sign in first');
      const response = await fetch('/api/games/mines', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ wager, mines, picks }),
      });
      const text = await response.text();
      if (!text) throw new Error('Empty API response. Restart API on 5000.');
      const body = JSON.parse(text);
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      setResult(body);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Play failed');
    } finally {
      setBusy(false);
    }
  };

  const revealed = useMemo(() => new Set(result?.mines ?? []), [result]);

  return (
    <div className="px-3 pt-4">
      <p className="font-mono-custom text-[11px] tracking-[.2em] text-primary">MINES / DEMO</p>
      <h1 className="mt-2 text-3xl font-semibold">Pick gems. Avoid mines.</h1>
      <p className="mt-2 text-sm text-muted-foreground">5×5 grid. Select tiles, then cash the reveal. Demo credits only.</p>
      <div className="mt-5 rounded-2xl border border-border bg-card p-4">
        <p className="font-mono-custom text-sm">Demo credits: {loading && !serverUser ? '—' : (serverUser?.demoCredits ?? '—')}</p>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {Array.from({ length: TILES }, (_, i) => {
            const selected = picks.includes(i);
            const isMine = revealed.has(i);
            return (
              <button key={i} type="button" onClick={() => toggle(i)} className={`aspect-square rounded-lg border text-xs ${
                isMine ? 'border-destructive bg-destructive/20' : selected ? 'border-primary bg-accent text-primary' : 'border-border bg-background'
              }`}>
                {result ? (isMine ? 'M' : selected ? 'G' : '') : selected ? <Gem size={14} className="mx-auto" /> : ''}
              </button>
            );
          })}
        </div>
        {!authenticated ? <div className="mt-4"><WalletAuthButton /></div> : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <label className="text-sm text-muted-foreground">Wager
                <input type="number" min={10} max={1000} value={wager} onChange={(e) => setWager(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2" />
              </label>
              <label className="text-sm text-muted-foreground">Mines
                <input type="number" min={1} max={10} value={mines} onChange={(e) => { setMines(Number(e.target.value)); setResult(null); }} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2" />
              </label>
            </div>
            <button type="button" disabled={busy || picks.length === 0} onClick={() => void play()} className="mt-4 w-full rounded-lg bg-secondary py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-60">
              {busy ? 'Revealing...' : `Reveal ${picks.length} tile${picks.length === 1 ? '' : 's'}`}
            </button>
            <button type="button" className="mt-2 w-full text-xs text-muted-foreground" onClick={() => { setPicks([]); setResult(null); }}>Clear</button>
          </>
        )}
        {result ? <p className={`mt-3 text-sm ${result.won ? 'text-primary' : 'text-muted-foreground'}`}>{result.won ? 'Clear' : 'Hit a mine'} {result.payout > 0 ? '+' : ''}{result.payout}</p> : null}
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
