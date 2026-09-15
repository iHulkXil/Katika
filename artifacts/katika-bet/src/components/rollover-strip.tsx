import { useState } from 'react';
import { Link } from 'wouter';
import { useServerSession } from '@/components/server-session';
import { useLegend } from '@/components/legend-card';
import { LegendAvatar } from '@/components/legend-avatar';
import { SepoliaMintModal } from '@/components/sepolia-mint-modal';
import { Sparkles, ShieldCheck, Zap, Crosshair, Radar, ChevronRight } from 'lucide-react';

export function RolloverStrip({
  gameType,
}: {
  gameType?: 'dice' | 'coinflip' | 'mines' | 'roulette';
}) {
  const { serverUser, loading } = useServerSession();
  const { legend, refreshLegend } = useLegend();
  const [mintModalOpen, setMintModalOpen] = useState(false);

  // Table stack (Floor stack)
  const floorStack = serverUser?.ktk ?? serverUser?.demoCredits ?? 0;
  // Card points (Allocated KTK locked on card)
  const cardPoints = legend?.allocatedKchip ?? 330;

  const left = serverUser?.rolloverLeft ?? 0;
  const need = serverUser?.rolloverNeed ?? 2670;
  const wagered = serverUser?.wagered ?? Math.max(0, need - left);
  const done = Boolean(serverUser?.unlocked || left <= 0);
  const progress = need > 0 ? Math.min(100, Math.max(0, Math.round((wagered / need) * 100))) : 100;

  const overall = legend
    ? Math.round(
        (legend.pace +
          legend.shooting +
          legend.passing +
          legend.dribbling +
          legend.defending +
          legend.physical) /
          6,
      )
    : 55;

  const isMinted = Boolean(legend?.mint);

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-2xl border border-[#1C3A2E] bg-gradient-to-b from-[#0E1A16] to-[#08120e] p-3 shadow-lg">
        {/* Top Bar: Identity & Mint Status */}
        <div className="flex items-center justify-between gap-2 border-b border-[#1C3A2E]/60 pb-2.5">
          <Link href="/legend" className="flex min-w-0 items-center gap-2.5 hover:opacity-90">
            <LegendAvatar name={legend?.name ?? 'Player'} position={legend?.position ?? 'ST'} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-bold text-[#E8F2EC]">
                  {legend?.name ?? 'Recruit Legend'}
                </span>
                <span className="rounded bg-[#35D399]/20 px-1 py-0.2 font-mono-custom text-[9px] font-bold text-[#35D399]">
                  {legend?.position ?? 'CAM'}
                </span>
                <span className="rounded bg-[#d4af37]/20 px-1 py-0.2 font-mono-custom text-[9px] font-bold text-[#f3d37a]">
                  OVR {overall}
                </span>
              </div>
              <p className="text-[10px] text-[#8FA39A]">
                {legend?.profileComplete ? 'Active Identity' : 'Card Setup Required'}
              </p>
            </div>
          </Link>

          {/* Mint Portal CTA / Badge */}
          {isMinted ? (
            <button
              type="button"
              onClick={() => setMintModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/50 bg-[#d4af37]/15 px-2.5 py-1 font-mono-custom text-[10px] font-semibold text-[#f3d37a] hover:bg-[#d4af37]/25"
            >
              <ShieldCheck size={12} className="text-[#35D399]" />
              <span>Sepolia #{legend?.mint?.tokenId}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMintModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/60 bg-gradient-to-r from-[#d4af37]/20 to-[#8a6410]/20 px-2.5 py-1 font-mono-custom text-[10px] font-bold text-[#f3d37a] shadow-[0_0_12px_rgba(212,175,55,0.2)] hover:border-[#d4af37]"
            >
              <Sparkles size={11} />
              <span>Mint on Sepolia</span>
            </button>
          )}
        </div>

        {/* Middle Bar: Card Points vs Floor Stack */}
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-[#1C3A2E]/50 bg-[#07110e]/60 p-2">
            <span className="block text-[9px] uppercase tracking-wider text-[#8FA39A]">
              Card Points (Locked)
            </span>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="font-mono-custom text-base font-bold text-[#f3d37a]">
                {cardPoints}
              </span>
              <span className="text-[10px] text-[#8FA39A]">KTK</span>
            </div>
            <p className="mt-0.5 text-[9px] text-[#8FA39A]/80">Immune to table losses</p>
          </div>

          <div className="rounded-xl border border-[#1C3A2E]/50 bg-[#07110e]/60 p-2">
            <span className="block text-[9px] uppercase tracking-wider text-[#8FA39A]">
              Floor Stack (Playable)
            </span>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="font-mono-custom text-base font-bold text-[#35D399]">
                {loading && !serverUser ? '...' : floorStack.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#8FA39A]">KTK</span>
            </div>
            <p className="mt-0.5 text-[9px] text-[#8FA39A]/80">Active table bankroll</p>
          </div>
        </div>

        {/* 10x Rollover Progress Meter */}
        <div className="mt-2.5 rounded-xl border border-[#1C3A2E]/40 bg-[#060e0b]/70 p-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-mono-custom uppercase text-[#8FA39A]">
              10× Rollover: {wagered.toLocaleString()} / {need.toLocaleString()} KTK
            </span>
            <span className={`font-mono-custom font-semibold ${done ? 'text-[#35D399]' : 'text-[#f3d37a]'}`}>
              {done ? 'Unlocked · 100%' : `${progress}%`}
            </span>
          </div>

          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#122019]">
            <div
              className={`h-full transition-all duration-500 ${
                done
                  ? 'bg-gradient-to-r from-[#35D399] to-[#10b981]'
                  : 'bg-gradient-to-r from-[#d4af37] to-[#35D399]'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[9px] text-[#8FA39A]">
            <span>
              {done ? (
                <span className="font-semibold text-[#35D399]">
                  ✓ Rollover complete · Card realloc unlocked
                </span>
              ) : (
                `${left.toLocaleString()} KTK left to unlock reallocation`
              )}
            </span>
            {done ? (
              <Link href="/legend" className="inline-flex items-center gap-0.5 text-[#35D399] hover:underline">
                Realloc <ChevronRight size={10} />
              </Link>
            ) : null}
          </div>
        </div>

        {/* Cosmetic Stat Synergies (Subtle in-game feedback) */}
        {gameType && legend && (
          <div className="mt-2 flex items-center justify-between rounded-lg border border-[#1C3A2E]/30 bg-[#07110e]/40 px-2 py-1 text-[9px] text-[#8FA39A]">
            {gameType === 'dice' && (
              <>
                <span className="flex items-center gap-1 text-[#35D399]">
                  <Zap size={10} /> PAC {legend.pace} · Quick Roll
                </span>
                <span className="flex items-center gap-1 text-[#f3d37a]">
                  <Crosshair size={10} /> SHO {legend.shooting} · Aim Telemetry
                </span>
              </>
            )}
            {gameType === 'coinflip' && (
              <>
                <span className="flex items-center gap-1 text-[#35D399]">
                  <Zap size={10} /> PAC {legend.pace} · Instant Velocity
                </span>
                <span className="flex items-center gap-1 text-[#f3d37a]">
                  <ShieldCheck size={10} /> PHY {legend.physical} · Gold Edge
                </span>
              </>
            )}
            {gameType === 'mines' && (
              <>
                <span className="flex items-center gap-1 text-[#35D399]">
                  <Radar size={10} /> DRI {legend.dribbling} · Sonar Grid
                </span>
                <span className="flex items-center gap-1 text-[#f3d37a]">
                  <ShieldCheck size={10} /> DEF {legend.defending} · Barrier
                </span>
              </>
            )}
            {gameType === 'roulette' && (
              <>
                <span className="flex items-center gap-1 text-[#35D399]">
                  <Zap size={10} /> PAS {legend.passing} · Wheel Radar
                </span>
                <span className="flex items-center gap-1 text-[#f3d37a]">
                  <Crosshair size={10} /> SHO {legend.shooting} · Sector Heatmap
                </span>
              </>
            )}
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
