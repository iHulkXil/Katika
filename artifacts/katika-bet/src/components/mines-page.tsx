import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Gem, Sparkles, RefreshCw, Bomb } from 'lucide-react';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';
import { playTableTone } from '@/lib/table-sound';
import { RolloverStrip } from '@/components/rollover-strip';
import { WagerRow } from '@/components/wager-row';
import { clampStake } from '@/lib/wager-cap';
import { fireWinConfetti } from '@/lib/confetti';

const TILES = 25;
async function api(path: string, token: string, body?: object, method = 'POST') {
  const response = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
  });
  const text = await response.text();
  let json: Record<string, any> | null = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON response (e.g. gateway timeout or proxy error)
  }
  if (!response.ok) throw new Error(json?.error ?? `HTTP ${response.status}`);
  if (!json) throw new Error('Empty API response');
  return json;
}

export function MinesPage() {
  const { authenticated, getAccessToken } = usePrivy();
  const { serverUser, refresh } = useServerSession();
  const [wager, setWager] = useState(50);
  const [mines, setMines] = useState(3);
  const [active, setActive] = useState(false);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [mineTiles, setMineTiles] = useState<number[]>([]);
  const [mult, setMult] = useState(0);
  const [cashoutValue, setCashoutValue] = useState(0);
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const balance = Number(serverUser?.ktk ?? serverUser?.demoCredits ?? 0);

  const token = async () => {
    const value = await getAccessToken();
    if (!value) throw new Error('Sign in first');
    return value;
  };

  useEffect(() => {
    if (!authenticated) { setBooting(false); return; }
    let cancelled = false;
    void (async () => {
      try {
        const body = await api('/api/games/mines/active', await token(), undefined, 'GET');
        if (cancelled || !body.active) return;
        setActive(true);
        setRevealed(body.revealed ?? []);
        setMult(body.multiplier ?? 0);
        setCashoutValue(body.cashoutValue ?? 0);
        setNote('Resumed open round');
      } catch { /* none */ } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authenticated]);

  const start = async () => {
    setError(null); setNote(null); setBusy(true);
    try {
      const stake = clampStake(wager, serverUser?.maxWager, balance);
      const body = await api('/api/games/mines/start', await token(), { wager: stake, mines });
      setWager(stake);
      setActive(true); setRevealed([]); setMineTiles([]);
      setMult(body.multiplier); setCashoutValue(body.cashoutValue);
      playTableTone('tick');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Start failed');
    } finally { setBusy(false); }
  };

  const reveal = async (tile: number) => {
    if (!active || busy || revealed.includes(tile)) return;
    setBusy(true); setError(null);
    try {
      const body = await api('/api/games/mines/reveal', await token(), { tile });
      setRevealed(body.revealed ?? []); setMult(body.multiplier); setCashoutValue(body.cashoutValue);
      playTableTone(body.active === false && !body.won ? 'lose' : 'tick');
      if (body.active === false) {
        setActive(false); setMineTiles(body.mines ?? []);
        setNote(body.won ? `Cleared +${body.payout} KTK` : 'Hit a mine');
        if (body.won) { playTableTone('win'); fireWinConfetti(); }
        await refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reveal failed');
    } finally { setBusy(false); }
  };

  const cashout = async () => {
    setBusy(true);
    try {
      const body = await api('/api/games/mines/cashout', await token(), {});
      setActive(false); setMineTiles(body.mines ?? []);
      setNote(`Cashed out ${body.cashoutValue} KTK`);
      playTableTone('win'); fireWinConfetti(); await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cashout failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="px-3 pt-3 pb-8" style={{ touchAction: 'pan-y' }}>
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-[#35D399]">5×5 Diamond Grid</span>
          <h1 className="text-xl font-bold tracking-tight text-[#E8F2EC]">Mines Vault</h1>
        </div>
      </div>
      <RolloverStrip gameType="mines" compact />
      <div className="relative mt-3 rounded-2xl border border-[#1C3A2E] bg-gradient-to-b from-[#0B1E17] to-[#040C09] p-4">
        <div className="grid w-full max-w-[280px] grid-cols-5 gap-2 mx-auto">
          {Array.from({ length: TILES }, (_, i) => {
            const open = revealed.includes(i);
            const boom = mineTiles.includes(i);
            return (
              <button key={i} type="button" disabled={!active || busy || open} onClick={() => void reveal(i)}
                className={`aspect-square rounded-xl border flex items-center justify-center ${
                  boom ? 'border-red-500 bg-red-950/90' : open ? 'border-[#35D399] bg-[#35D399]/20' : 'border-[#1C3A2E] bg-[#0A1812]'
                }`}>
                {boom ? <Bomb size={22} /> : open ? <Gem size={22} className="text-[#35D399]" /> : <Sparkles size={10} className="text-[#35D399]/30" />}
              </button>
            );
          })}
        </div>
      </div>
      {note && <p className="mt-2 text-center text-xs text-[#35D399]">{note}</p>}
      {!authenticated ? <div className="mt-5"><WalletAuthButton /></div> : !active ? (
        <div className="mt-3.5 space-y-3">
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 3, 5, 10, 24].map((count) => (
              <button key={count} type="button" onClick={() => setMines(count)} className={`rounded-lg py-1.5 text-xs ${
                mines === count ? 'border border-[#35D399] text-[#35D399]' : 'border border-[#1C3A2E] text-[#8FA39A]'
              }`}>{count}</button>
            ))}
          </div>
          <WagerRow wager={wager} setWager={setWager} balance={balance} maxWager={serverUser?.maxWager} busy={busy} />
          <button type="button" disabled={busy || booting || wager > balance} onClick={() => void start()}
            className="w-full rounded-xl bg-[#35D399] py-3.5 font-bold text-[#07110E]">
            {busy ? <RefreshCw className="inline animate-spin" size={16} /> : 'BET AND START'}
          </button>
        </div>
      ) : (
        <button type="button" disabled={busy || revealed.length < 1} onClick={() => void cashout()}
          className="mt-3 w-full rounded-xl bg-[#f3d37a] py-3.5 font-bold text-[#07110E]">
          CASHOUT {cashoutValue} KTK
        </button>
      )}
      {error && <p className="mt-2 text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}
