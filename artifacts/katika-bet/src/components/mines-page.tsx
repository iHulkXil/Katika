import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Gem } from 'lucide-react';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';

const TILES = 25;
async function api(path: string, token: string, body: object) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!text) throw new Error('Empty API response. Restart API on 5000.');
  const json = JSON.parse(text);
  if (!response.ok) throw new Error(json.error ?? `HTTP ${response.status}`);
  return json;
}

export function MinesPage() {
  const { authenticated, getAccessToken } = usePrivy();
  const { serverUser, loading, refresh } = useServerSession();
  const [wager, setWager] = useState(50);
  const [mines, setMines] = useState(3);
  const [active, setActive] = useState(false);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [mineTiles, setMineTiles] = useState<number[]>([]);
  const [mult, setMult] = useState(0);
  const [cashoutValue, setCashoutValue] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const token = async () => {
    const value = await getAccessToken();
    if (!value) throw new Error('Sign in first');
    return value;
  };

  const start = async () => {
    setError(null); setNote(null); setBusy(true);
    try {
      const body = await api('/api/games/mines/start', await token(), { wager, mines });
      setActive(true); setRevealed([]); setMineTiles([]);
      setMult(body.multiplier); setCashoutValue(body.cashoutValue);
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Start failed'); }
    finally { setBusy(false); }
  };

  const reveal = async (tile: number) => {
    if (!active || busy || revealed.includes(tile)) return;
    setBusy(true); setError(null);
    try {
      const body = await api('/api/games/mines/reveal', await token(), { tile });
      setRevealed(body.revealed ?? []); setMult(body.multiplier); setCashoutValue(body.cashoutValue);
      if (body.active === false) {
        setActive(false); setMineTiles(body.mines ?? []);
        setNote(body.won ? `Cleared +${body.payout}` : 'Hit a mine');
        await refresh();
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Reveal failed'); }
    finally { setBusy(false); }
  };

  const cashout = async () => {
    setBusy(true);
    try {
      const body = await api('/api/games/mines/cashout', await token(), {});
      setActive(false); setMineTiles(body.mines ?? []);
      setNote(`Cashed ${body.cashoutValue}`);
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Cashout failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="px-3 pt-4">
      <p className="font-mono-custom text-[11px] tracking-[.2em] text-primary">MINES</p>
      <h1 className="mt-2 text-3xl font-semibold">Open gems. Cash out.</h1>
      <p className="mt-2 font-mono-custom text-sm">Demo credits: {loading && !serverUser ? '—' : (serverUser?.demoCredits ?? '—')} · {mult ? `${mult.toFixed(2)}x` : 'idle'}</p>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {Array.from({ length: TILES }, (_, i) => {
          const open = revealed.includes(i);
          const boom = mineTiles.includes(i);
          return (
            <button key={i} type="button" disabled={!active || busy} onClick={() => void reveal(i)} className={`fx-tile aspect-square rounded-xl border ${
              boom ? 'boom border-destructive bg-destructive/40' : open ? 'open border-primary bg-accent text-primary' : 'border-border bg-card'
            }`}>
              {boom ? <span className="text-lg">✨</span> : open ? <Gem size={16} className="mx-auto" /> : ''}
            </button>
          );
        })}
      </div>
      {!authenticated ? <div className="mt-4"><WalletAuthButton /></div> : !active ? (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={wager} onChange={(e) => setWager(Number(e.target.value))} className="rounded-lg border border-border bg-card px-3 py-2" />
            <input type="number" min={1} max={10} value={mines} onChange={(e) => setMines(Number(e.target.value))} className="rounded-lg border border-border bg-card px-3 py-2" />
          </div>
          <button type="button" disabled={busy} onClick={() => void start()} className="w-full rounded-lg bg-secondary py-3 text-sm font-semibold text-secondary-foreground">Bet and start</button>
        </div>
      ) : (
        <button type="button" disabled={busy || revealed.length < 1} onClick={() => void cashout()} className="mt-4 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground">Cash out {cashoutValue}</button>
      )}
      {note ? <p className="mt-3 text-sm text-primary">{note}</p> : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
