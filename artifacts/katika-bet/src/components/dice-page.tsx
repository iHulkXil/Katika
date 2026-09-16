import { useEffect, useMemo, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';
import { RolloverStrip } from '@/components/rollover-strip';
import { Dice3D } from '@/components/3d/dice-3d';
import { fireWinConfetti } from '@/lib/confetti';
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
  if (!text) throw new Error('Empty API response');
  return JSON.parse(text) as DiceResult & { error?: string };
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
    const response = await fetch('/api/games/dice', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ wager, target, prediction }),
    });
    const body = await readApiJson(response);
    if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
    setResult(body);
    setDisplay(body.roll);
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

      {/* 3D Dice Stage */}
      <div className="relative mt-3">
        <div className={`fx-stage ${result?.won ? 'ring-1 ring-[#35D399]/40' : ''}`}>
          <Dice3D busy={busy} roll={display} target={target} prediction={prediction} won={result?.won} />

          {/* Outcome Overlay Badge */}
          {result && (
            <div className={`absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 font-mono-custom text-xs font-semibold backdrop-blur-md shadow-lg transition-all ${
              result.won
                ? 'border border-[#35D399]/60 bg-[#072418]/90 text-[#35D399]'
                : 'border border-[#1C3A2E] bg-[#07110E]/90 text-[#8FA39A]'
            }`}>
              Roll {result.roll} · {result.won ? `+${result.payout} KTK` : '0 KTK'}
            </div>
          )}
        </div>
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
