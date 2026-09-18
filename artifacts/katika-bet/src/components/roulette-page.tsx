import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';
import { RolloverStrip } from '@/components/rollover-strip';
import { fireWinConfetti } from '@/lib/confetti';
import { playTableTone } from '@/lib/table-sound';
import { RefreshCw } from 'lucide-react';

type Bet = 'red' | 'black' | 'odd' | 'even' | 'number';
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function RouletteDisplay({
  busy,
  roll,
  color,
  won,
}: {
  busy: boolean;
  roll: number | null;
  color?: string;
  won?: boolean;
}) {
  const isRed = roll !== null && RED.has(roll);
  const isZero = roll === 0;

  return (
    <div className="relative flex h-52 max-h-52 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#1C3A2E] bg-gradient-to-b from-[#0B1E17] via-[#07140F] to-[#040C09] p-2 shadow-inner select-none">
      {/* Ambient background glow */}
      <div
        className={`absolute h-40 w-40 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
          won === true
            ? 'bg-[#35D399]/25 scale-110'
            : isRed
            ? 'bg-red-500/20'
            : 'bg-[#1C3A2E]/40'
        }`}
      />

      {/* Roulette Wheel Wrap */}
      <div className="relative flex items-center justify-center">
        {/* Top Gold Pointer */}
        <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2">
          <div className="h-0 w-0 border-x-[8px] border-x-transparent border-t-[14px] border-t-[#d4af37] drop-shadow-md" />
        </div>

        {/* 3D Angled Rotating Wheel Disc */}
        <div
          className={`relative h-44 w-44 rounded-full border-4 border-[#d4af37] shadow-[0_10px_30px_rgba(0,0,0,0.8),inset_0_0_15px_rgba(0,0,0,0.6)] ${
            busy ? 'fx-wheel-spinning' : 'transition-transform duration-700'
          }`}
          style={{
            background:
              'conic-gradient(#10b981 0deg 9.7deg, #b91c1c 9.7deg 19.4deg, #18181b 19.4deg 29.1deg, #b91c1c 29.1deg 38.8deg, #18181b 38.8deg 48.5deg, #b91c1c 48.5deg 58.2deg, #18181b 58.2deg 67.9deg, #b91c1c 67.9deg 77.6deg, #18181b 77.6deg 87.3deg, #b91c1c 87.3deg 97deg, #18181b 97deg 106.7deg, #b91c1c 106.7deg 116.4deg, #18181b 116.4deg 126.1deg, #b91c1c 126.1deg 135.8deg, #18181b 135.8deg 145.5deg, #b91c1c 145.5deg 155.2deg, #18181b 155.2deg 164.9deg, #b91c1c 164.9deg 174.6deg, #18181b 174.6deg 184.3deg, #b91c1c 184.3deg 194deg, #18181b 194deg 203.7deg, #b91c1c 203.7deg 213.4deg, #18181b 213.4deg 223.1deg, #b91c1c 223.1deg 232.8deg, #18181b 232.8deg 242.5deg, #b91c1c 242.5deg 252.2deg, #18181b 252.2deg 261.9deg, #b91c1c 261.9deg 271.6deg, #18181b 271.6deg 281.3deg, #b91c1c 281.3deg 291deg, #18181b 291deg 300.7deg, #b91c1c 300.7deg 310.4deg, #18181b 310.4deg 320.1deg, #b91c1c 320.1deg 329.8deg, #18181b 329.8deg 339.5deg, #b91c1c 339.5deg 349.2deg, #18181b 349.2deg 360deg)',
          }}
        >
          {/* Outer track tick markers */}
          <div className="absolute inset-1.5 rounded-full border border-[#f3d37a]/30 pointer-events-none" />

          {/* Reverse Orbiting Ivory Roulette Ball during Spin */}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="fx-ball-orbiting">
                <div className="h-3 w-3 rounded-full bg-neutral-100 shadow-[0_0_8px_#ffffff,inset_0_-1px_2px_rgba(0,0,0,0.5)] border border-neutral-300" />
              </div>
            </div>
          )}
        </div>

        {/* Center Hub Display */}
        <div className="absolute inset-0 m-auto flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 border-[#d4af37] bg-gradient-to-b from-[#132c21] to-[#08130e] shadow-[0_4px_12px_rgba(0,0,0,0.6)] z-10">
          {busy ? (
            <span className="font-mono-custom text-xs font-bold text-[#f3d37a] animate-pulse">
              SPINNING
            </span>
          ) : roll !== null ? (
            <div className="flex flex-col items-center">
              <span
                className={`font-mono-custom text-2xl font-black leading-none ${
                  isZero
                    ? 'text-[#35D399]'
                    : isRed
                    ? 'text-red-400'
                    : 'text-neutral-100'
                }`}
              >
                {roll}
              </span>
              <span className="mt-0.5 font-mono-custom text-[8px] font-bold uppercase tracking-wider text-[#8FA39A]">
                {isZero ? 'ZERO' : isRed ? 'RED' : 'BLACK'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-xl">🎰</span>
              <span className="font-mono-custom text-[8px] font-bold text-[#35D399]">KATIKA</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RoulettePage() {
  const { authenticated, getAccessToken } = usePrivy();
  const { serverUser, refresh } = useServerSession();
  const [wager, setWager] = useState(50);
  const [bet, setBet] = useState<Bet>('red');
  const [number, setNumber] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ roll: number; color: string; won: boolean; payout: number } | null>(null);
  const [ribbon, setRibbon] = useState<number[]>([14, 31, 9, 22, 0, 7]);

  const balance = Number(serverUser?.ktk ?? serverUser?.demoCredits ?? 0);

  const play = async () => {
    setError(null);
    setBusy(true);
    playTableTone('tick');
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
      let body: any = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        // Non-JSON response
      }
      if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
      if (!body) throw new Error('Empty API response');
      setResult(body);
      setRibbon((prev) => [body.roll, ...prev].slice(0, 12));
      playTableTone(body.won ? 'win' : 'lose');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (result?.won) {
      fireWinConfetti();
    }
  }, [result]);

  return (
    <div className="px-3 pt-3 pb-8" style={{ touchAction: 'pan-y' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-[#35D399]">
            European Single-Zero
          </span>
          <h1 className="text-xl font-bold tracking-tight text-[#E8F2EC]">European Roulette</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-[#1C3A2E] bg-[#0E1A16] px-2.5 py-1 text-[11px] font-mono-custom text-[#8FA39A]">
          <span>Payout</span>
          <span className="font-semibold text-[#f3d37a]">{bet === 'number' ? '36.0×' : '2.0×'}</span>
        </div>
      </div>

      {/* Compact Rollover Strip */}
      <RolloverStrip gameType="roulette" compact />

      {/* Roulette Stage */}
      <div className="relative mt-3">
        <RouletteDisplay busy={busy} roll={result ? result.roll : null} color={result?.color} won={result?.won} />

        {/* Live Outcome Overlay Badge */}
        {result && (
          <div className={`mt-2 flex items-center justify-center rounded-xl py-1.5 font-mono-custom text-xs font-semibold backdrop-blur-md transition-all ${
            result.won
              ? 'border border-[#35D399]/60 bg-[#072418]/90 text-[#35D399]'
              : 'border border-[#1C3A2E] bg-[#07110E]/90 text-[#8FA39A]'
          }`}>
            {result.color.toUpperCase()} {result.roll} · {result.won ? `+${result.payout} KTK` : '0 KTK'}
          </div>
        )}
      </div>

      {/* Recent Rolls Ribbon */}
      <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto py-1">
        <span className="text-[10px] font-mono-custom uppercase text-[#8FA39A] shrink-0">Rolls:</span>
        {ribbon.map((n, i) => (
          <span
            key={`${n}-${i}`}
            className={`min-w-6 rounded px-1.5 py-0.5 text-center font-mono-custom text-[10px] font-bold ${
              n === 0
                ? 'border border-[#35D399]/60 bg-[#35D399]/20 text-[#35D399]'
                : RED.has(n)
                ? 'border border-red-500/50 bg-red-950/50 text-red-300'
                : 'border border-[#1C3A2E] bg-[#08120e] text-[#8FA39A]'
            }`}
          >
            {n}
          </span>
        ))}
      </div>

      {!authenticated ? (
        <div className="mt-5">
          <WalletAuthButton />
        </div>
      ) : (
        <div className="mt-3.5 space-y-3">
          {/* Bet Category Selector */}
          <div className="grid grid-cols-5 gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => setBet('red')}
              className={`rounded-lg py-2 font-mono-custom text-xs font-bold transition-all ${
                bet === 'red'
                  ? 'border border-red-400 bg-red-600/30 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                  : 'border border-[#1C3A2E] bg-[#0B1713] text-red-400/80 hover:bg-red-950/20'
              }`}
            >
              RED 2×
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setBet('black')}
              className={`rounded-lg py-2 font-mono-custom text-xs font-bold transition-all ${
                bet === 'black'
                  ? 'border border-neutral-400 bg-neutral-700/50 text-neutral-100 shadow-[0_0_10px_rgba(150,150,150,0.2)]'
                  : 'border border-[#1C3A2E] bg-[#0B1713] text-neutral-300 hover:bg-neutral-800/40'
              }`}
            >
              BLACK 2×
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setBet('odd')}
              className={`rounded-lg py-2 font-mono-custom text-xs font-bold transition-all ${
                bet === 'odd'
                  ? 'border border-[#35D399] bg-[#35D399]/25 text-[#35D399]'
                  : 'border border-[#1C3A2E] bg-[#0B1713] text-[#8FA39A]'
              }`}
            >
              ODD 2×
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setBet('even')}
              className={`rounded-lg py-2 font-mono-custom text-xs font-bold transition-all ${
                bet === 'even'
                  ? 'border border-[#35D399] bg-[#35D399]/25 text-[#35D399]'
                  : 'border border-[#1C3A2E] bg-[#0B1713] text-[#8FA39A]'
              }`}
            >
              EVEN 2×
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setBet('number')}
              className={`rounded-lg py-2 font-mono-custom text-xs font-bold transition-all ${
                bet === 'number'
                  ? 'border border-[#f3d37a] bg-[#d4af37]/25 text-[#f3d37a]'
                  : 'border border-[#1C3A2E] bg-[#0B1713] text-[#f3d37a]/80'
              }`}
            >
              #{number} 36×
            </button>
          </div>

          {/* Compact Straight Number Picker if 'number' selected */}
          {bet === 'number' && (
            <div className="rounded-xl border border-[#1C3A2E] bg-[#0B1713] p-2">
              <div className="flex items-center justify-between text-[11px] text-[#8FA39A] mb-1.5">
                <span>Pick Pocket Number (36× Payout)</span>
                <span className="font-mono-custom text-[#f3d37a] font-bold">Selected: {number}</span>
              </div>
              <div className="grid grid-cols-7 gap-1 max-h-36 overflow-y-auto pr-1">
                {Array.from({ length: 37 }, (_, n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={busy}
                    onClick={() => setNumber(n)}
                    className={`rounded py-1 font-mono-custom text-xs font-bold transition-all ${
                      number === n
                        ? 'ring-2 ring-[#f3d37a] bg-[#f3d37a] text-[#07110E]'
                        : n === 0
                        ? 'border border-[#35D399]/40 bg-[#35D399]/15 text-[#35D399]'
                        : RED.has(n)
                        ? 'border border-red-900/60 bg-red-950/40 text-red-300'
                        : 'border border-[#1C3A2E] bg-[#07110E] text-[#8FA39A]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

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
            disabled={busy || wager > balance || wager <= 0}
            onClick={() => void play()}
            className="w-full rounded-xl bg-gradient-to-r from-[#35D399] to-[#10b981] py-3.5 text-base font-bold text-[#07110E] shadow-[0_4px_16px_rgba(53,211,153,0.3)] transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <RefreshCw size={16} className="animate-spin" /> Spinning Wheel...
              </span>
            ) : (
              `SPIN WHEEL (${(wager * (bet === 'number' ? 36 : 2)).toFixed(0)} KTK Payout)`
            )}
          </button>
        </div>
      )}

      {error && <p className="mt-2.5 text-center text-xs text-red-400 font-semibold">{error}</p>}
    </div>
  );
}
