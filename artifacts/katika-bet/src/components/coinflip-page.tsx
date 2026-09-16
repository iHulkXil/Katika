import { useEffect, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { WalletAuthButton } from '@/components/wallet-auth';
import { RolloverStrip } from '@/components/rollover-strip';
import { Coin3D } from '@/components/3d/coin-3d';
import { fireWinConfetti } from '@/lib/confetti';
import { Sparkles, RefreshCw, SlidersHorizontal } from 'lucide-react';

type FlipResult = { result: 'heads' | 'tails'; side: 'heads' | 'tails'; wager: number; won: boolean; payout: number; demoCredits: number };

export function CoinFlipPage() {
  const { authenticated, getAccessToken } = usePrivy();
  const { serverUser, refresh } = useServerSession();
  const [wager, setWager] = useState(50);
  const [side, setSide] = useState<'heads' | 'tails'>('heads');
  const [busy, setBusy] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [autoCount, setAutoCount] = useState(8);
  const [showAutoOptions, setShowAutoOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FlipResult | null>(null);
  const [history, setHistory] = useState<FlipResult[]>([]);
  const stopRef = useRef(false);

  const balance = Number(serverUser?.ktk ?? serverUser?.demoCredits ?? 0);

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
    setError(null);
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 820));
      await playOnce();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const startAuto = async () => {
    setAutoPlaying(true);
    setBusy(true);
    stopRef.current = false;
    try {
      for (let i = 0; i < Math.min(30, autoCount); i += 1) {
        if (stopRef.current) break;
        const last = await playOnce();
        if ((last.demoCredits ?? 0) < wager) break;
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto failed');
    } finally {
      setAutoPlaying(false);
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
      {/* Compact Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-[#35D399]">
            3D Sovereign Coin
          </span>
          <h1 className="text-xl font-bold tracking-tight text-[#E8F2EC]">Coin Flip</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-[#1C3A2E] bg-[#0E1A16] px-2.5 py-1 text-[11px] font-mono-custom text-[#8FA39A]">
          <span>Win Rate</span>
          <span className="font-semibold text-[#35D399]">1.98×</span>
        </div>
      </div>

      {/* Compact Rollover Strip */}
      <RolloverStrip gameType="coinflip" compact />

      {/* 3D Coin Animation Display */}
      <div className="relative mt-3">
        <div className={`fx-stage ${result?.won ? 'ring-1 ring-[#35D399]/40' : ''}`}>
          <Coin3D busy={busy} result={result ? result.result : null} side={side} />
          
          {/* Live Outcome Overlay Badge */}
          {result && (
            <div className={`absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 font-mono-custom text-xs font-semibold backdrop-blur-md shadow-lg transition-all ${
              result.won
                ? 'border border-[#35D399]/60 bg-[#072418]/90 text-[#35D399]'
                : 'border border-[#1C3A2E] bg-[#07110E]/90 text-[#8FA39A]'
            }`}>
              {result.result.toUpperCase()} · {result.won ? `+${result.payout} KTK` : '0 KTK'}
            </div>
          )}
        </div>
      </div>

      {/* Recent Flips Ribbon */}
      {history.length > 0 && (
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-[10px] font-mono-custom uppercase text-[#8FA39A] shrink-0">Recent:</span>
          {history.map((item, i) => (
            <span
              key={i}
              className={`rounded px-1.5 py-0.5 font-mono-custom text-[10px] font-bold ${
                item.won
                  ? 'border border-[#35D399]/40 bg-[#35D399]/15 text-[#35D399]'
                  : 'border border-[#1C3A2E] bg-[#0A1612] text-[#8FA39A]'
              }`}
            >
              {item.result[0].toUpperCase()}
            </span>
          ))}
        </div>
      )}

      {/* Betting & Play Controls */}
      {!authenticated ? (
        <div className="mt-5">
          <WalletAuthButton />
        </div>
      ) : (
        <div className="mt-3.5 space-y-3">
          {/* Side Pick: Heads / Tails */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide('heads')}
              disabled={busy}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                side === 'heads'
                  ? 'border border-[#f3d37a] bg-gradient-to-r from-[#d4af37]/25 to-[#f3d37a]/15 text-[#f3d37a] shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                  : 'border border-[#1C3A2E] bg-[#0B1713] text-[#8FA39A] hover:text-[#E8F2EC]'
              }`}
            >
              <div className={`h-2.5 w-2.5 rounded-full ${side === 'heads' ? 'bg-[#f3d37a]' : 'bg-[#8FA39A]/40'}`} />
              <span>HEADS (1.98×)</span>
            </button>
            <button
              type="button"
              onClick={() => setSide('tails')}
              disabled={busy}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                side === 'tails'
                  ? 'border border-[#35D399] bg-gradient-to-r from-[#35D399]/25 to-[#10b981]/15 text-[#35D399] shadow-[0_0_12px_rgba(53,211,153,0.15)]'
                  : 'border border-[#1C3A2E] bg-[#0B1713] text-[#8FA39A] hover:text-[#E8F2EC]'
              }`}
            >
              <div className={`h-2.5 w-2.5 rounded-full ${side === 'tails' ? 'bg-[#35D399]' : 'bg-[#8FA39A]/40'}`} />
              <span>TAILS (1.98×)</span>
            </button>
          </div>

          {/* Wager Input & Quick Adjusters */}
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
                <RefreshCw size={16} className="animate-spin" /> Flipping...
              </span>
            ) : (
              `FLIP COIN (${(wager * 1.98).toFixed(1)} KTK Payout)`
            )}
          </button>

          {/* Collapsible Auto-Play Bar */}
          <div className="rounded-xl border border-[#1C3A2E]/60 bg-[#07110E]/60 p-2 text-xs">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAutoOptions((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] text-[#8FA39A] hover:text-[#E8F2EC]"
              >
                <SlidersHorizontal size={12} />
                <span>Auto-play settings</span>
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
              <div className="mt-2 pt-2 border-t border-[#1C3A2E]/40 flex items-center justify-between gap-2">
                <span className="text-[10px] text-[#8FA39A]">Auto flips count:</span>
                <div className="flex gap-1.5">
                  {[5, 10, 25, 50].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setAutoCount(count)}
                      className={`rounded px-2 py-0.5 font-mono-custom text-[11px] ${
                        autoCount === count
                          ? 'bg-[#35D399] text-[#07110E] font-bold'
                          : 'border border-[#1C3A2E] text-[#8FA39A]'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-2.5 text-center text-xs text-red-400 font-semibold">{error}</p>}
    </div>
  );
}
