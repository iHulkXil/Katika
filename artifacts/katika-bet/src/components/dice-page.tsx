import { useEffect, useMemo, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';
import { RolloverStrip } from '@/components/rollover-strip';
import { fireWinConfetti } from '@/lib/confetti';
import { playTableTone } from '@/lib/table-sound';
import { RefreshCw, SlidersHorizontal, ArrowDown, ArrowUp } from 'lucide-react';

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
  let json: (DiceResult & { error?: string }) | null = null;
  try {
    json = text ? (JSON.parse(text) as DiceResult & { error?: string }) : null;
  } catch {
    // Non-JSON response
  }
  if (!response.ok) throw new Error(json?.error ?? `HTTP ${response.status}`);
  if (!json) throw new Error('Empty API response');
  return json;
}

function DiceDisplay({
  busy,
  roll,
  target,
  prediction,
  won,
}: {
  busy: boolean;
  roll: number | null;
  target: number;
  prediction: 'over' | 'under';
  won?: boolean;
}) {
  const displayVal = roll ?? 50;
  const rollPercent = Math.min(100, Math.max(1, displayVal));

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#1C3A2E] bg-gradient-to-b from-[#0B1E17] via-[#07140F] to-[#040C09] p-4 shadow-inner select-none max-h-[170px]">
      {/* Ambient background glow */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
          won === true
            ? 'bg-[#35D399]/10 opacity-100'
            : won === false
            ? 'bg-red-500/10 opacity-100'
            : 'opacity-0'
        }`}
      />

      {/* Main Dice Outcome & Digital Roll */}
      <div className="relative z-10 flex items-center justify-between px-2 py-1">
        {/* Animated Dice Cube Pair */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Die 1 */}
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl border border-[#35D399]/60 bg-gradient-to-br from-[#1b3d30] via-[#0e241c] to-[#081510] text-sm font-bold text-[#35D399] shadow-[0_4px_12px_rgba(0,0,0,0.5)] ${
                busy ? 'fx-dice-tumbling' : 'transition-transform duration-300 hover:scale-105'
              }`}
            >
              {busy ? (
                <span className="text-xl">🎲</span>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 p-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#35D399] shadow-[0_0_4px_#35D399]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#35D399] shadow-[0_0_4px_#35D399]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#35D399] shadow-[0_0_4px_#35D399]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#35D399] shadow-[0_0_4px_#35D399]" />
                </div>
              )}
            </div>

            {/* Die 2 */}
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl border border-[#f3d37a]/50 bg-gradient-to-br from-[#2a2614] via-[#1a170a] to-[#0c0a04] text-sm font-bold text-[#f3d37a] shadow-[0_4px_12px_rgba(0,0,0,0.5)] ${
                busy ? 'fx-dice-tumbling-alt' : 'transition-transform duration-300 hover:scale-105'
              }`}
            >
              {busy ? (
                <span className="text-xl">🎲</span>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 p-1">
                  <div className="flex gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#f3d37a] shadow-[0_0_4px_#f3d37a]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-[#f3d37a] shadow-[0_0_4px_#f3d37a]" />
                  </div>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#f3d37a] shadow-[0_0_4px_#f3d37a]" />
                  <div className="flex gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#f3d37a] shadow-[0_0_4px_#f3d37a]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-[#f3d37a] shadow-[0_0_4px_#f3d37a]" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <span className="font-mono-custom text-[9px] uppercase tracking-wider text-[#8FA39A]">
              Target: {prediction.toUpperCase()} {target}
            </span>
            <div className="flex items-center gap-1.5 font-mono-custom text-xs">
              <span className={prediction === 'over' ? 'text-[#35D399]' : 'text-[#8FA39A]'}>
                {prediction === 'over' ? '▲ OVER' : '▼ UNDER'}
              </span>
            </div>
          </div>
        </div>

        {/* Large Glowing Roll Value */}
        <div className="text-right">
          <span className="font-mono-custom text-[9px] uppercase tracking-wider text-[#8FA39A]">
            {busy ? 'Rolling...' : won !== undefined ? (won ? 'WINNER' : 'BUST') : 'Landed Roll'}
          </span>
          <div
            className={`font-mono-custom text-3xl font-black tracking-tight transition-colors ${
              busy
                ? 'text-[#f3d37a] animate-pulse'
                : won === true
                ? 'text-[#35D399] drop-shadow-[0_0_12px_rgba(53,211,153,0.5)]'
                : won === false
                ? 'text-red-400'
                : 'text-[#E8F2EC]'
            }`}
          >
            {busy ? (Math.random() * 99 + 1).toFixed(1) : roll ? roll.toFixed(2) : '50.00'}
          </div>
        </div>
      </div>

      {/* Linear Roll Spectrum Track */}
      <div className="relative z-10 mt-3 pt-4 pb-1">
        {/* Track container with relative positioning for needle and pin */}
        <div className="relative h-3 w-full">
          {/* Track Bar with Win/Loss colored zones */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#08130f] border border-[#1C3A2E]">
            {/* Under Zone */}
            <div
              className="absolute left-0 top-0 bottom-0 transition-all duration-300"
              style={{
                width: `${target}%`,
                backgroundColor: prediction === 'under' ? '#35D399' : '#ef4444',
                opacity: 0.85,
              }}
            />
            {/* Over Zone */}
            <div
              className="absolute right-0 top-0 bottom-0 transition-all duration-300"
              style={{
                left: `${target}%`,
                backgroundColor: prediction === 'over' ? '#35D399' : '#ef4444',
                opacity: 0.85,
              }}
            />
          </div>

          {/* Target Dividing Needle */}
          <div
            className="absolute -top-1 bottom-0 w-0.5 bg-[#E8F2EC] z-20 pointer-events-none transition-all duration-200"
            style={{ left: `${target}%` }}
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded bg-[#E8F2EC] px-1 py-0.5 font-mono-custom text-[8px] font-bold text-[#07110E] shadow-sm">
              {target}
            </div>
          </div>

          {/* Landed Roll Pin */}
          {roll !== null && !busy && (
            <div
              className="absolute -top-6 z-30 transition-all duration-500 ease-out -translate-x-1/2 pointer-events-none"
              style={{ left: `${rollPercent}%` }}
            >
              <div
                className={`rounded-full px-1.5 py-0.5 font-mono-custom text-[9px] font-black border shadow-lg whitespace-nowrap ${
                  won
                    ? 'border-[#35D399] bg-[#072418] text-[#35D399]'
                    : 'border-red-500 bg-[#260a0a] text-red-400'
                }`}
              >
                ▲ {roll.toFixed(1)}
              </div>
            </div>
          )}
        </div>

        {/* Min/Max Labels */}
        <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono-custom text-[#5C7368]">
          <span>1</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
}

export function DicePage() {
  const { authenticated, getAccessToken } = usePrivy();
  const { serverUser, refresh } = useServerSession();
  const [wager, setWager] = useState(50);
  const [target, setTarget] = useState(50);
  const [prediction, setPrediction] = useState<'over' | 'under'>('over');
  const [busy, setBusy] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [autoCount, setAutoCount] = useState(10);
  const [stopProfit, setStopProfit] = useState(0);
  const [stopLoss, setStopLoss] = useState(0);
  const [showAutoOptions, setShowAutoOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiceResult | null>(null);
  const [display, setDisplay] = useState<number | null>(null);
  const stopRef = useRef(false);
  const stats = useMemo(() => previewStats(target, prediction), [target, prediction]);

  const balance = Number(serverUser?.ktk ?? serverUser?.demoCredits ?? 0);

  const playOnce = async () => {
    const token = await getAccessToken();
    if (!token) throw new Error('Sign in first');
    playTableTone('tick');
    const response = await fetch('/api/games/dice', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ wager, target, prediction }),
    });
    const body = await readApiJson(response);
    if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
    setResult(body);
    setDisplay(body.roll);
    playTableTone(body.won ? 'win' : 'lose');
    await refresh();
    return body;
  };

  const play = async () => {
    setError(null);
    setBusy(true);
    const tick = setInterval(() => setDisplay(Math.floor(Math.random() * 100) + 1), 50);
    try {
      await new Promise((r) => setTimeout(r, 420));
      await playOnce();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Play failed');
    } finally {
      clearInterval(tick);
      setBusy(false);
    }
  };

  const startAuto = async () => {
    const startBal = serverUser?.demoCredits ?? 0;
    setAutoPlaying(true);
    setBusy(true);
    stopRef.current = false;
    try {
      for (let i = 0; i < Math.min(50, autoCount); i += 1) {
        if (stopRef.current) break;
        const last = await playOnce();
        const profit = last.demoCredits - startBal;
        if ((last.demoCredits ?? 0) < wager) break;
        if (stopProfit > 0 && profit >= stopProfit) break;
        if (stopLoss > 0 && profit <= -stopLoss) break;
        await new Promise((r) => setTimeout(r, 280));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto failed');
    } finally {
      setAutoPlaying(false);
      setBusy(false);
    }
  };

  useEffect(() => () => { stopRef.current = true; }, []);

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
            3D Precision Roller
          </span>
          <h1 className="text-xl font-bold tracking-tight text-[#E8F2EC]">Classic Dice</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-[#1C3A2E] bg-[#0E1A16] px-2.5 py-1 text-[11px] font-mono-custom text-[#8FA39A]">
          <span>Multiplier</span>
          <span className="font-semibold text-[#f3d37a]">{stats.multiplier.toFixed(2)}×</span>
        </div>
      </div>

      {/* Compact Rollover Strip */}
      <RolloverStrip gameType="dice" compact />

      {/* Precision Dice Stage */}
      <div className="relative mt-3">
        <DiceDisplay busy={busy} roll={display} target={target} prediction={prediction} won={result?.won} />

        {/* Outcome Overlay Badge */}
        {result && (
          <div className={`mt-2 flex items-center justify-center rounded-xl py-1.5 font-mono-custom text-xs font-semibold backdrop-blur-md transition-all ${
            result.won
              ? 'border border-[#35D399]/60 bg-[#072418]/90 text-[#35D399]'
              : 'border border-[#1C3A2E] bg-[#07110E]/90 text-[#8FA39A]'
          }`}>
            Roll {result.roll} · {result.won ? `+${result.payout} KTK (${result.multiplier}×)` : '0 KTK'}
          </div>
        )}
      </div>

      {!authenticated ? (
        <div className="mt-5">
          <WalletAuthButton />
        </div>
      ) : (
        <div className="mt-3.5 space-y-3">
          {/* Target Slider & Odds Panel */}
          <div className="rounded-xl border border-[#1C3A2E] bg-[#0B1713] p-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#8FA39A]">Target Line: <strong className="text-[#E8F2EC] font-mono-custom">{target}</strong></span>
              <div className="flex items-center gap-3 font-mono-custom text-[11px]">
                <span className="text-[#8FA39A]">Win: <strong className="text-[#35D399]">{stats.winChance}%</strong></span>
                <span className="text-[#8FA39A]">Payout: <strong className="text-[#f3d37a]">{stats.multiplier.toFixed(2)}×</strong></span>
              </div>
            </div>

            {/* Slider track with gradient */}
            <input
              type="range"
              min={2}
              max={98}
              value={target}
              disabled={busy}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="w-full h-2 rounded-lg bg-[#07110E] accent-[#35D399] cursor-pointer"
            />

            <div className="mt-1 flex justify-between font-mono-custom text-[10px] text-[#8FA39A]/70">
              <span>2 (Min)</span>
              <span>50</span>
              <span>98 (Max)</span>
            </div>
          </div>

          {/* Under vs Over Prediction Selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setPrediction('under')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                prediction === 'under'
                  ? 'border border-[#35D399] bg-gradient-to-r from-[#35D399]/25 to-[#10b981]/15 text-[#35D399] shadow-[0_0_12px_rgba(53,211,153,0.15)]'
                  : 'border border-[#1C3A2E] bg-[#0B1713] text-[#8FA39A] hover:text-[#E8F2EC]'
              }`}
            >
              <ArrowDown size={14} />
              <span>ROLL UNDER {target}</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPrediction('over')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                prediction === 'over'
                  ? 'border border-[#35D399] bg-gradient-to-r from-[#35D399]/25 to-[#10b981]/15 text-[#35D399] shadow-[0_0_12px_rgba(53,211,153,0.15)]'
                  : 'border border-[#1C3A2E] bg-[#0B1713] text-[#8FA39A] hover:text-[#E8F2EC]'
              }`}
            >
              <ArrowUp size={14} />
              <span>ROLL OVER {target}</span>
            </button>
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
            disabled={busy || wager > balance || wager <= 0}
            onClick={() => void play()}
            className="w-full rounded-xl bg-gradient-to-r from-[#35D399] to-[#10b981] py-3.5 text-base font-bold text-[#07110E] shadow-[0_4px_16px_rgba(53,211,153,0.3)] transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <RefreshCw size={16} className="animate-spin" /> Rolling...
              </span>
            ) : (
              `ROLL DICE (${(wager * stats.multiplier).toFixed(1)} KTK Payout)`
            )}
          </button>

          {/* Auto-Play Bar */}
          <div className="rounded-xl border border-[#1C3A2E]/60 bg-[#07110E]/60 p-2 text-xs">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAutoOptions((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] text-[#8FA39A] hover:text-[#E8F2EC]"
              >
                <SlidersHorizontal size={12} />
                <span>Auto-roll settings</span>
              </button>
              {autoPlaying ? (
                <button
                  type="button"
                  className="rounded-lg bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400 border border-red-500/40"
                  onClick={() => { stopRef.current = true; }}
                >
                  Stop Auto
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-lg border border-[#35D399]/40 bg-[#35D399]/10 px-3 py-1 text-xs font-semibold text-[#35D399]"
                  onClick={() => void startAuto()}
                >
                  Start Auto ×{autoCount}
                </button>
              )}
            </div>

            {showAutoOptions && (
              <div className="mt-2.5 pt-2 border-t border-[#1C3A2E]/40 grid grid-cols-3 gap-2">
                <label className="block text-[10px] text-[#8FA39A]">
                  Rolls
                  <input
                    type="number"
                    value={autoCount}
                    onChange={(e) => setAutoCount(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-[#1C3A2E] bg-[#07110E] px-2 py-1 font-mono-custom text-xs text-[#E8F2EC]"
                  />
                </label>
                <label className="block text-[10px] text-[#8FA39A]">
                  Stop Profit
                  <input
                    type="number"
                    value={stopProfit}
                    onChange={(e) => setStopProfit(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-[#1C3A2E] bg-[#07110E] px-2 py-1 font-mono-custom text-xs text-[#E8F2EC]"
                  />
                </label>
                <label className="block text-[10px] text-[#8FA39A]">
                  Stop Loss
                  <input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-[#1C3A2E] bg-[#07110E] px-2 py-1 font-mono-custom text-xs text-[#E8F2EC]"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-2.5 text-center text-xs text-red-400 font-semibold">{error}</p>}
    </div>
  );
}
