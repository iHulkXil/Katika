import { useState } from 'react';
import { Link } from 'wouter';
import { useServerSession } from '@/components/server-session';
import { useLegend } from '@/components/legend-card';
import { LegendAvatar } from '@/components/legend-avatar';
import { SepoliaMintModal } from '@/components/sepolia-mint-modal';
import { tableMaxWager } from '@/lib/wager-cap';
import { Sparkles, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

export function RolloverStrip({
  compact = true,
}: {
  gameType?: 'dice' | 'coinflip' | 'mines' | 'roulette';
  compact?: boolean;
}) {
  const { serverUser, loading } = useServerSession();
  const { legend, refreshLegend } = useLegend();
  const [mintModalOpen, setMintModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  const floorStack = Number(serverUser?.ktk ?? serverUser?.demoCredits ?? 0);
  const cardPoints = Number(legend?.allocatedKchip ?? legend?.allocatedKtk ?? 330);
  const maxWager = tableMaxWager(serverUser?.maxWager);
  const perk = serverUser?.perkLabel ?? 'None';

  const left = serverUser?.rolloverLeft ?? 0;
  const need = serverUser?.rolloverNeed ?? 2670;
  const wagered = serverUser?.wagered ?? Math.max(0, need - left);
  const done = Boolean(serverUser?.unlocked || left <= 0);
  const progress = need > 0 ? Math.min(100, Math.max(0, Math.round((wagered / need) * 100))) : 100;

  const overall = legend
    ? Math.round(((legend.pace ?? 50) + (legend.shooting ?? 50) + (legend.passing ?? 50) + (legend.dribbling ?? 50) + (legend.defending ?? 50) + (legend.physical ?? 50)) / 6)
    : 55;
  const isMinted = Boolean(legend?.mint);

  return (
    <>
      <div className="mt-2.5 overflow-hidden rounded-xl border border-[#1C3A2E]/80 bg-gradient-to-b from-[#0B1713] to-[#07110e] px-3 py-2 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <Link href="/legend" className="flex min-w-0 items-center gap-2 hover:opacity-90">
            <LegendAvatar name={legend?.name ?? 'Player'} position={legend?.position ?? 'ST'} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-semibold text-[#E8F2EC]">{legend?.name ?? 'Recruit Legend'}</span>
                <span className="rounded bg-[#35D399]/20 px-1 font-mono-custom text-[8px] font-bold text-[#35D399]">{legend?.position ?? 'CAM'}</span>
                <span className="rounded bg-[#d4af37]/20 px-1 font-mono-custom text-[8px] font-bold text-[#f3d37a]">OVR {overall}</span>
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1C3A2E] bg-[#0E1F18]/80 px-2 py-1 text-[10px] text-[#8FA39A]"
          >
            <span className="font-mono-custom text-[#f3d37a] font-semibold">{cardPoints}</span>
            <span>/</span>
            <span className="font-mono-custom font-bold text-[#35D399]">{loading && !serverUser ? '...' : floorStack.toLocaleString()}</span>
            <span>KTK</span>
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono-custom text-[#8FA39A]">
          <span>Max wager {maxWager} · {perk}</span>
          <span>{done ? 'Unlocked' : `${left.toLocaleString()} left`}</span>
        </div>

        {expanded && (
          <div className="mt-2.5 space-y-2 border-t border-[#1C3A2E]/60 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[#8FA39A]">{legend?.profileComplete ? 'Active identity' : 'Card setup required'}</p>
              <button type="button" onClick={() => setMintModalOpen(true)} className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/60 bg-[#d4af37]/20 px-2 py-0.5 font-mono-custom text-[9px] font-bold text-[#f3d37a]">
                {isMinted ? <ShieldCheck size={11} /> : <Sparkles size={10} />}
                {isMinted ? `Sepolia #${legend?.mint?.tokenId}` : 'Mint card'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-[#1C3A2E]/50 p-1.5">
                <span className="block text-[8px] uppercase text-[#8FA39A]">Card</span>
                <span className="font-mono-custom text-sm font-bold text-[#f3d37a]">{cardPoints}</span>
              </div>
              <div className="rounded-lg border border-[#1C3A2E]/50 p-1.5">
                <span className="block text-[8px] uppercase text-[#8FA39A]">Floor</span>
                <span className="font-mono-custom text-sm font-bold text-[#35D399]">{floorStack.toLocaleString()}</span>
              </div>
              <div className="rounded-lg border border-[#1C3A2E]/50 p-1.5">
                <span className="block text-[8px] uppercase text-[#8FA39A]">Max bet</span>
                <span className="font-mono-custom text-sm font-bold text-[#E8F2EC]">{maxWager}</span>
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#122019]">
              <div className={`h-full ${done ? 'bg-[#35D399]' : 'bg-gradient-to-r from-[#d4af37] to-[#35D399]'}`} style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[8px] text-[#8FA39A]">{done ? 'Rollover complete' : `${wagered.toLocaleString()} / ${need.toLocaleString()} wagered`}</p>
          </div>
        )}
      </div>
      <SepoliaMintModal isOpen={mintModalOpen} onClose={() => setMintModalOpen(false)} legend={legend} onMintSuccess={() => void refreshLegend()} />
    </>
  );
}
