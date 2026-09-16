import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Gem, Sparkles, RefreshCw, Bomb } from 'lucide-react';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';
import { playTableTone } from '@/lib/table-sound';
import { RolloverStrip } from '@/components/rollover-strip';
import { fireWinConfetti } from '@/lib/confetti';

const TILES = 25;
async function api(path: string, token: string, body?: object, method = 'POST') {
  const response = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
  });
  const text = await response.text();
  if (!text) throw new Error('Empty API response');
  const json = JSON.parse(text);
  if (!response.ok) throw new Error(json.error ?? `HTTP ${response.status}`);
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
    if (!authenticated) {
      setBooting(false);
      return;
    }
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
      } catch {
        /* no open round */
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  const start = async () => {
    setError(null);
    setNote(null);
    setBusy(true);
    try {
      const body = await api('/api/games/mines/start', await token(), { wager, mines });
      setActive(true);
      setRevealed([]);
      setMineTiles([]);
      setMult(body.multiplier);
      setCashoutValue(body.cashoutValue);
      playTableTone('tick');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Start failed');
    } finally {
      setBusy(false);
    }
  };

  const reveal = async (tile: number) => {
    if (!active || busy || revealed.includes(tile)) return;
    setBusy(true);
    setError(null);
    try {
      const body = await api('/api/games/mines/reveal', await token(), { tile });
      setRevealed(body.revealed ?? []);
      setMult(body.multiplier);
      setCashoutValue(body.cashoutValue);
      playTableTone(body.active === false && !body.won ? 'lose' : 'tick');
      if (body.active === false) {
        setActive(false);
        setMineTiles(body.mines ?? []);
        setNote(body.won ? `Cleared +${body.payout} KTK` : 'Hit a mine');
        if (body.won) {
          playTableTone('win');
          fireWinConfetti();
        }
        await refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reveal failed');
    } finally {
      setBusy(false);
    }
  };

  const cashout = async () => {
    setBusy(true);
    try {
      const body = await api('/api/games/mines/cashout', await token(), {});
      setActive(false);
      setMineTiles(body.mines ?? []);
      setNote(`Cashed out ${body.cashoutValue} KTK`);
      playTableTone('win');
      fireWinConfetti();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cashout failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-3 pt-3 pb-8" style={{ touchAction: 'pan-y' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-[#35D399]">
            5×5 Diamond Grid
          </span>
          <h1 className="text-xl font-bold tracking-tight text-[#E8F2EC]">Mines Vault</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-[#1C3A2E] bg-[#0E1A16] px-2.5 py-1 text-[11px] font-mono-custom">
          {active ? (
            <span className="text-[#35D399] font-bold animate-pulse">{mult.toFixed(2)}× ({cashoutValue} KTK)</span>
          ) : (
            <span className="text-[#8FA39A]">{mines} Mines / {25 - mines} Gems</span>
          )}
        </div>
      </div>

      {/* Compact Rollover Strip */}
      <RolloverStrip gameType="mines" compact />

      {/* Vault Grid Stage */}
      <div className="relative mt-3 rounded-2xl border border-[#1C3A2E] bg-gradient-to-b from-[#0B1E17] via-[#07140F] to-[#040C09] p-4 shadow-inner flex items-center justify-center">
        <div className="grid w-full max-w-[280px] grid-cols-5 gap-2 select-none" style={{ touchAction: 'pan-y' }}>
          {Array.from({ length: TILES }, (_, i) => {
            const open = revealed.includes(i);
            const boom = mineTiles.includes(i);
            return (
              <button
                key={i}
                type="button"
                disabled={!active || busy || open}
                onClick={() => void reveal(i)}
                className={`aspect-square rounded-xl border flex items-center justify-center transition-all duration-200 select-none ${
                  boom
                    ? 'border-red-500 bg-red-950/90 shadow-[0_0_16px_rgba(239,68,68,0.6)] scale-95'
                    : open
                    ? 'border-[#35D399] bg-gradient-to-br from-[#35D399]/35 to-[#082216] text-[#35D399] shadow-[0_0_16px_rgba(53,211,153,0.4)]'
                    : active
                    ? 'border-[#1C3A2E] bg-gradient-to-b from-[#132e22] to-[#0A1812] hover:border-[#35D399]/70 hover:scale-105 active:scale-95 shadow-sm'
                    : 'border-[#1C3A2E]/50 bg-[#091510]/80 opacity-75'
                }`}
              >
                {boom ? (
                  <Bomb size={22} className="text-red-400 animate-bounce" />
                ) : open ? (
                  <div className="relative flex items-center justify-center">
                    <Gem size={22} className="text-[#35D399] drop-shadow-[0_0_10px_rgba(53,211,153,0.9)] animate-[fx-pop_0.3s_ease-out]" />
                    <Sparkles size={10} className="absolute -top-1.5 -right-1.5 text-[#f3d37a]" />
                  </div>
                ) : (
                  <div className="h-2 w-2 rounded-full bg-[#35D399]/30" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {note && (
        <p className="mt-2 text-center text-xs font-semibold text-[#35D399] font-mono-custom">
          {note}
        </p>
      )}

      {!authenticated ? (
        <div className="mt-5">
          <WalletAuthButton />
        </div>
      ) : !active ? (
        <div className="mt-3.5 space-y-3">
          {/* Mines Count Selector */}
          <div className="rounded-xl border border-[#1C3A2E] bg-[#0B1713] p-2.5">
            <div className="flex items-center justify-between text-[11px] text-[#8FA39A] mb-1.5">
              <span>Mines on Board</span>
              <span className="font-mono-custom text-[#f3d37a] font-bold">{mines} Mines ({25 - mines} Gems)</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 3, 5, 10, 24].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setMines(count)}
                  className={`rounded-lg py-1.5 font-mono-custom text-xs font-bold transition-all ${
                    mines === count
                      ? 'border border-[#35D399] bg-[#35D399]/25 text-[#35D399]'
                      : 'border border-[#1C3A2E] bg-[#07110E] text-[#8FA39A] hover:text-[#E8F2EC]'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Wager Input & Quick Buttons */}
          <div className="rounded-xl border border-[#1C3A2E] bg-[#0B1713] p-2.5">
            <div className="flex items-center justify-between text-[11px] text-[#8FA39A] mb-1.5">
              <span>Wager (KTK)</span>
              <span>Balance: {balance.toLocaleString()} KTK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={10}
                max={Math.max(10, balance)}
                value={wager}
                disabled={busy}
                onChange={(e) => setWager(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-lg border border-[#1C3A2E] bg-[#07110E] px-3 py-2 font-mono-custom text-sm font-semibold text-[#E8F2EC] outline-none focus:border-[#35D399]/60"
              />
              <button
                type="button"
                disabled={busy}
                className="rounded-lg border border-[#1C3A2E] bg-[#0E1F18] px-2.5 py-2 font-mono-custom text-xs font-semibold text-[#8FA39A] hover:text-[#E8F2EC]"
                onClick={() => setWager(Math.max(10, Math.floor(wager / 2)))}
              >
                ½
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-lg border border-[#1C3A2E] bg-[#0E1F18] px-2.5 py-2 font-mono-custom text-xs font-semibold text-[#8FA39A] hover:text-[#E8F2EC]"
                onClick={() => setWager(Math.min(balance || 1000, wager * 2))}
              >
                2×
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-lg border border-[#35D399]/40 bg-[#35D399]/15 px-2.5 py-2 font-mono-custom text-xs font-bold text-[#35D399] hover:bg-[#35D399]/25"
                onClick={() => setWager(Math.max(10, balance))}
              >
                MAX
              </button>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            disabled={busy || booting || wager > balance || wager <= 0}
            onClick={() => void start()}
            className="w-full rounded-xl bg-gradient-to-r from-[#35D399] to-[#10b981] py-3.5 text-base font-bold text-[#07110E] shadow-[0_4px_16px_rgba(53,211,153,0.3)] transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <RefreshCw size={16} className="animate-spin" /> Arming Vault...
              </span>
            ) : (
              'BET AND START'
            )}
          </button>
        </div>
      ) : (
        <div className="mt-3.5 space-y-2">
          {/* Active Cashout Button */}
          <button
            type="button"
            disabled={busy || revealed.length < 1}
            onClick={() => void cashout()}
            className="w-full rounded-xl bg-gradient-to-r from-[#f3d37a] to-[#d4af37] py-3.5 text-base font-bold text-[#07110E] shadow-[0_4px_16px_rgba(212,175,55,0.3)] transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <RefreshCw size={16} className="animate-spin" /> Cashing out...
              </span>
            ) : (
              `CASHOUT ${cashoutValue} KTK (${mult.toFixed(2)}×)`
            )}
          </button>
          <p className="text-center text-[11px] text-[#8FA39A]">
            {revealed.length} gems revealed · Pick another gem or cash out safely
          </p>
        </div>
      )}

      {error && <p className="mt-2.5 text-center text-xs text-red-400 font-semibold">{error}</p>}
    </div>
  );
}
