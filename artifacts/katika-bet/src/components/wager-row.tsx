import { clampStake, tableMaxWager } from '@/lib/wager-cap';

export function WagerRow({
  wager,
  setWager,
  balance,
  maxWager,
  busy,
}: {
  wager: number;
  setWager: (n: number) => void;
  balance: number;
  maxWager?: number | null;
  busy?: boolean;
}) {
  const cap = Math.min(tableMaxWager(maxWager), Math.max(10, balance || 0));
  const snap = (n: number) => setWager(clampStake(n, maxWager, balance));
  return (
    <div className="rounded-xl border border-[#1C3A2E] bg-[#0B1713] p-2.5">
      <div className="mb-1.5 flex items-center justify-between text-[11px] text-[#8FA39A]">
        <span>Wager (KTK)</span>
        <span>Max {cap} · Bal {balance.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={10}
          max={cap}
          value={wager}
          disabled={busy}
          onChange={(e) => snap(Number(e.target.value))}
          className="w-full rounded-lg border border-[#1C3A2E] bg-[#07110E] px-3 py-2 font-mono-custom text-sm font-semibold text-[#E8F2EC] outline-none"
        />
        <button type="button" disabled={busy} className="rounded-lg border border-[#1C3A2E] px-2.5 py-2 font-mono-custom text-xs text-[#8FA39A]" onClick={() => snap(Math.floor(wager / 2))}>½</button>
        <button type="button" disabled={busy} className="rounded-lg border border-[#1C3A2E] px-2.5 py-2 font-mono-custom text-xs text-[#8FA39A]" onClick={() => snap(wager * 2)}>2×</button>
        <button type="button" disabled={busy} className="rounded-lg border border-[#35D399]/40 bg-[#35D399]/15 px-2.5 py-2 font-mono-custom text-xs font-bold text-[#35D399]" onClick={() => snap(cap)}>MAX</button>
      </div>
    </div>
  );
}
