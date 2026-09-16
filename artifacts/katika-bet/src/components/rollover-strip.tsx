import { useState } from 'react';
import { Link } from 'wouter';
import { useServerSession } from '@/components/server-session';
import { useLegend } from '@/components/legend-card';
import { LegendAvatar } from '@/components/legend-avatar';
import { SepoliaMintModal } from '@/components/sepolia-mint-modal';
import { Sparkles, ShieldCheck, Zap, Crosshair, Radar, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

export function RolloverStrip({
  gameType,
  compact = true,
}: {
  gameType?: 'dice' | 'coinflip' | 'mines' | 'roulette';
  compact?: boolean;
}) {
  const { serverUser, loading } = useServerSession();
  const { legend, refreshLegend } = useLegend();
  const [mintModalOpen, setMintModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  // Table stack (Floor stack)
  const floorStack = Number(serverUser?.ktk ?? serverUser?.demoCredits ?? 0);
  // Card points (Allocated KTK locked on card)
  const cardPoints = Number(legend?.allocatedKchip ?? legend?.allocatedKtk ?? 330);

  const left = serverUser?.rolloverLeft ?? 0;
  const need = serverUser?.rolloverNeed ?? 2670;
  const wagered = serverUser?.wagered ?? Math.max(0, need - left);
  const done = Boolean(serverUser?.unlocked || left <= 0);
  const progress = need > 0 ? Math.min(100, Math.max(0, Math.round((wagered / need) * 100))) : 100;

  const overall = legend
    ? Math.round(
        ((legend.pace ?? 50) +
          (legend.shooting ?? 50) +
          (legend.passing ?? 50) +
          (legend.dribbling ?? 50) +
          (legend.defending ?? 50) +
          (legend.physical ?? 50)) /
          6,
      )
    : 55;

  const isMinted = Boolean(legend?.mint);

  return (
    <>
      <div className="mt-2.5 overflow-hidden rounded-xl border border-[#1C3A2E]/80 bg-gradient-to-b from-[#0B1713] to-[#07110e] px-3 py-2 shadow-sm transition-all">
        {/* Compact Bar View */}
        <div className="flex items-center justify-between gap-2">
          <Link href="/legend" className="flex min-w-0 items-center gap-2 hover:opacity-90">
            <LegendAvatar name={legend?.name ?? 'Player'} position={legend?.position ?? 'ST'} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-semibold text-[#E8F2EC]">
                  {legend?.name ?? 'Recruit Legend'}
                </span>
                <span className="rounded bg-[#35D399]/20 px-1 py-0.2 font-mono-custom text-[8px] font-bold text-[#35D399]">
                  {legend?.position ?? 'CAM'}
                </span>
                <span className="rounded bg-[#d4af37]/20 px-1 py-0.2 font-mono-custom text-[8px] font-bold text-[#f3d37a]">
                  OVR {overall}
                </span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Quick Rollover Progress Capsule */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="font-mono-custom text-[9px] text-[#8FA39A]">
                10× Rollover: <span className={done ? 'text-[#35D399]' : 'text-[#f3d37a]'}>{progress}%</span>
              </span>
              <div className="mt-0.5 h-1 w-16 overflow-hidden rounded-full bg-[#122019]">
                <div
                  className={`h-full ${done ? 'bg-[#35D399]' : 'bg-gradient-to-r from-[#d4af37] to-[#35D399]'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Locked vs Active Stack Pill */}
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1C3A2E] bg-[#0E1F18]/80 px-2 py-1 text-[10px] text-[#8FA39A] hover:text-[#E8F2EC]"
            >
              <span className="font-mono-custom text-[#f3d37a] font-semibold">{cardPoints}</span>
              <span className="text-[9px]">/</span>
              <span className="font-mono-custom text-[#35D399] font-bold">{loading && !serverUser ? '...' : floorStack.toLocaleString()}</span>
              <span className="text-[9px]">KTK</span>
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          </div>
        </div>

        {/* Micro Rollover progress bar on mobile when collapsed */}
        {!expanded && (
          <div className="mt-1.5 flex items-center justify-between sm:hidden">
            <span className="font-mono-custom text-[9px] text-[#8FA39A]">
              Rollover {progress}% ({done ? 'Unlocked' : `${left.toLocaleString()} left`})
            </span>
            <div className="h-1 w-20 overflow-hidden rounded-full bg-[#122019]">
              <div
                className={`h-full ${done ? 'bg-[#35D399]' : 'bg-gradient-to-r from-[#d4af37] to-[#35D399]'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Expanded Details Drawer */}
        {expanded && (
          <div className="mt-2.5 pt-2 border-t border-[#1C3A2E]/60 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[#8FA39A]">
                {legend?.profileComplete ? 'Active Identity' : 'Card Setup Required'}
              </p>
              {isMinted ? (
                <button
                  type="button"
                  onClick={() => setMintModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/50 bg-[#d4af37]/15 px-2 py-0.5 font-mono-custom text-[9px] font-semibold text-[#f3d37a]"
                >
                  <ShieldCheck size={11} className="text-[#35D399]" />
                  <span>Sepolia #{legend?.mint?.tokenId}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMintModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/60 bg-[#d4af37]/20 px-2 py-0.5 font-mono-custom text-[9px] font-bold text-[#f3d37a]"
                >
                  <Sparkles size={10} />
                  <span>Mint Sepolia NFT</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-[#1C3A2E]/50 bg-[#07110e]/60 p-1.5">
                <span className="block text-[8px] uppercase tracking-wider text-[#8FA39A]">Card Points (Locked)</span>
                <span className="font-mono-custom text-sm font-bold text-[#f3d37a]">{cardPoints} KTK</span>
              </div>
              <div className="rounded-lg border border-[#1C3A2E]/50 bg-[#07110e]/60 p-1.5">
                <span className="block text-[8px] uppercase tracking-wider text-[#8FA39A]">Floor Stack (Playable)</span>
                <span className="font-mono-custom text-sm font-bold text-[#35D399]">{loading && !serverUser ? '...' : floorStack.toLocaleString()} KTK</span>
              </div>
            </div>

            <div className="rounded-lg border border-[#1C3A2E]/40 bg-[#060e0b]/70 p-2">
              <div className="flex items-center justify-between text-[9px]">
                <span className="font-mono-custom uppercase text-[#8FA39A]">10× Rollover: {wagered.toLocaleString()} / {need.toLocaleString()} KTK</span>
                <span className={`font-mono-custom font-semibold ${done ? 'text-[#35D399]' : 'text-[#f3d37a]'}`}>{done ? 'Unlocked 100%' : `${progress}%`}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#122019]">
                <div className={`h-full ${done ? 'bg-[#35D399]' : 'bg-gradient-to-r from-[#d4af37] to-[#35D399]'}`} style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-1 flex items-center justify-between text-[8px] text-[#8FA39A]">
                <span>{done ? '✓ Rollover complete' : `${left.toLocaleString()} KTK to unlock`}</span>
                {done && <Link href="/legend" className="text-[#35D399] hover:underline">Realloc &gt;</Link>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sepolia Living Card Mint Modal */}
      <SepoliaMintModal
        isOpen={mintModalOpen}
        onClose={() => setMintModalOpen(false)}
        legend={legend}
        onMintSuccess={() => {
          void refreshLegend();
        }}
      />
    </>
  );
}
