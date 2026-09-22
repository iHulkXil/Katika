import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link } from 'wouter';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { LegendAvatar, ARCHETYPES, kit } from '@/components/legend-avatar';
import { SepoliaMintModal, type MintRecord } from '@/components/sepolia-mint-modal';
import { PS5InspectModal } from '@/components/ps5-inspect-modal';
import { TotyCard } from '@/components/toty-card';
import { ProfilePhotoUpload } from '@/components/profile-photo-upload';
import { ShieldCheck, Sparkles, RotateCw, ZoomIn, Award, Star, Camera } from 'lucide-react';

export { type MintRecord };

export type LegendCardData = {
  name: string;
  position: string;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  profileComplete: boolean;
  allocatedKchip: number;
  allocatedKtk?: number;
  overall?: number;
  mint?: MintRecord | null;
  photoUrl?: string;
  nationFlag?: string;
};

const STATS: { key: keyof LegendCardData; label: string }[] = [
  { key: 'pace', label: 'PAC' },
  { key: 'shooting', label: 'SHO' },
  { key: 'passing', label: 'PAS' },
  { key: 'dribbling', label: 'DRI' },
  { key: 'defending', label: 'DEF' },
  { key: 'physical', label: 'PHY' },
];

export function useLegend() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [legend, setLegend] = useState<LegendCardData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLegend = useCallback(async () => {
    if (!ready || !authenticated) {
      setLegend(null);
      return;
    }
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const response = await fetch('/api/legends/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const body = await response.json();
      setLegend(body as LegendCardData | null);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, [ready, authenticated, getAccessToken]);

  useEffect(() => {
    void fetchLegend();
  }, [fetchLegend]);

  return { legend, loading, authenticated, ready, refreshLegend: fetchLegend };
}

export function LegendCard({
  legend,
  playable,
  variant = 'full',
  onRefresh,
  onPhotoChange,
}: {
  legend: LegendCardData | null;
  playable?: number;
  variant?: 'full' | 'compact' | 'ghost';
  onRefresh?: () => void;
  onPhotoChange?: (url: string, flag?: string) => void;
}) {
  const { getAccessToken } = usePrivy();
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [mintModalOpen, setMintModalOpen] = useState(false);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const handlePhotoSelect = async (photoUrl: string, flag?: string) => {
    setPhotoModalOpen(false);
    if (onPhotoChange) {
      onPhotoChange(photoUrl, flag);
      return;
    }
    try {
      const token = await getAccessToken();
      if (!token || !legend) return;
      await fetch('/api/legends/me', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...legend,
          photoUrl,
          ...(flag ? { nationFlag: flag } : {}),
        }),
      });
      onRefresh?.();
    } catch {
      // Ignored
    }
  };

  const overall = useMemo(() => {
    if (!legend) return 75;
    return Math.round(
      ((legend.pace ?? 50) +
        (legend.shooting ?? 50) +
        (legend.passing ?? 50) +
        (legend.dribbling ?? 50) +
        (legend.defending ?? 50) +
        (legend.physical ?? 50)) /
        6,
    );
  }, [legend]);

  const isMinted = Boolean(legend?.mint);
  const cardAlloc = Number(legend?.allocatedKchip ?? legend?.allocatedKtk ?? 330);

  // Match archetype based on position/name
  const matchedArchetype = useMemo(() => {
    if (!legend) return ARCHETYPES[0];
    const pos = legend.position || 'ST';
    if (pos === 'GK') return ARCHETYPES[5] || ARCHETYPES[0];
    if (pos === 'CB' || pos === 'LB' || pos === 'RB') return ARCHETYPES[3] || ARCHETYPES[0];
    if (pos === 'CDM' || pos === 'CM' || pos === 'CAM') return ARCHETYPES[2] || ARCHETYPES[0];
    if (pos === 'RW' || pos === 'LW') return ARCHETYPES[4] || ARCHETYPES[0];
    return ARCHETYPES[0];
  }, [legend]);

  const activeFlag = legend?.nationFlag || matchedArchetype.nation.flag;
  const activePhoto = legend?.photoUrl || matchedArchetype.photoUrl;

  if (!legend || !legend.profileComplete || variant === 'ghost') {
    return (
      <div className="rounded-[28px] border border-[#1C3A2E] bg-[#0E1A16] px-5 pb-7 pt-6 text-center">
        <div className="mx-auto opacity-50">
          <LegendAvatar name="Ghost" position="ST" />
        </div>
        <p className="mt-3 font-mono-custom text-[11px] tracking-[0.28em] text-[#8FA39A]">NO LEGEND</p>
        <p className="mx-auto mt-2 max-w-[240px] text-sm leading-5 text-[#8FA39A]">
          &ldquo;Build a legend. Lock KTK into the card. Play to unlock more. Mint when the card is yours.&rdquo;
        </p>
        <Link
          href="/legend"
          className="mt-6 inline-flex rounded-full bg-[#35D399] px-6 py-3 text-sm font-semibold text-[#062018] shadow-[0_0_24px_rgba(53,211,153,.35)]"
        >
          Create your legend
        </Link>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <div className="flex items-center gap-3 rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#0d261c] to-[#040e0a] p-3 shadow-md">
          <Link href="/legend" className="flex min-w-0 flex-1 items-center gap-3">
            <LegendAvatar name={legend.name} position={legend.position} size="sm" photoUrl={activePhoto} />
            <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-[#fef08a]/60 bg-gradient-to-br from-[#fef08a] via-[#eab308] to-[#854d0e] font-mono-custom font-black leading-none text-black shadow">
              <span className="text-base font-black">{overall}</span>
              <span className="text-[9px] uppercase tracking-tighter">{legend.position}</span>
            </div>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-[#E8F2EC]">{legend.name}</span>
              <span className="font-mono-custom text-[11px] text-[#f3d37a]">
                {activeFlag} {legend.position} · {cardAlloc} alloc
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setInspectModalOpen(true)}
            className="flex items-center gap-1 rounded-full border border-[#35D399]/40 bg-[#35D399]/10 px-2.5 py-1 font-mono-custom text-[10px] font-bold text-[#35D399] hover:bg-[#35D399]/20"
            title="Inspect FUT card showcase"
          >
            <ZoomIn size={12} /> FUT
          </button>

          {isMinted ? (
            <button
              type="button"
              onClick={() => setMintModalOpen(true)}
              className="flex items-center gap-1 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-2 py-1 font-mono-custom text-[10px] text-[#f3d37a]"
            >
              <ShieldCheck size={12} className="text-[#35D399]" /> #{legend.mint?.tokenId}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMintModalOpen(true)}
              className="flex items-center gap-1 rounded-full border border-[#d4af37]/60 bg-[#d4af37]/15 px-2 py-1 font-mono-custom text-[10px] font-bold text-[#f3d37a]"
            >
              <Sparkles size={11} /> Mint
            </button>
          )}
        </div>

        <SepoliaMintModal
          isOpen={mintModalOpen}
          onClose={() => setMintModalOpen(false)}
          legend={legend}
          overall={overall}
          onMintSuccess={() => {
            setMintModalOpen(false);
            onRefresh?.();
          }}
        />

        <PS5InspectModal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          legend={legend}
        />
      </>
    );
  }

  return (
    <>
      <div className="relative mx-auto flex max-w-[340px] flex-col items-center">
        {/* Quick Action Navigation Bar */}
        <div className="mb-3 flex w-full items-center justify-between px-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]" />
            <p className="font-mono-custom text-[11px] font-black tracking-[.25em] text-[#f4c172]">
              HOTD KNIGHT SHIELD
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPhotoModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-[#fef08a]/60 bg-[#fef08a]/15 px-2.5 py-0.5 font-mono-custom text-[10px] font-bold text-[#fef08a] transition-colors hover:bg-[#fef08a]/25 shadow-[0_0_10px_rgba(254,240,138,0.2)]"
              title="Upload your photo or change athlete"
            >
              <Camera size={11} />
              <span>Photo</span>
            </button>
            <button
              type="button"
              onClick={() => setInspectModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-[#35D399]/60 bg-[#35D399]/15 px-2.5 py-0.5 font-mono-custom text-[10px] font-bold text-[#35D399] transition-colors hover:bg-[#35D399]/25 shadow-[0_0_12px_rgba(53,211,153,0.25)]"
              title="Inspect player showcase & attributes"
            >
              <ZoomIn size={12} />
              <span>Inspect</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFlipped((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/50 bg-[#d4af37]/15 px-2.5 py-0.5 font-mono-custom text-[10px] font-bold text-[#f3d37a] transition-colors hover:bg-[#d4af37]/25"
              title="Flip to Sepolia passport back"
            >
              <RotateCw size={11} />
              <span>{isFlipped ? 'Front' : 'Passport'}</span>
            </button>
            {isMinted ? (
              <button
                type="button"
                onClick={() => setMintModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-[#35D399]/60 bg-[#35D399]/15 px-2.5 py-0.5 font-mono-custom text-[10px] font-bold text-[#35D399]"
              >
                <ShieldCheck size={12} />
                <span>#{legend.mint?.tokenId}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMintModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-[#d4af37] bg-gradient-to-r from-[#d4af37]/30 to-[#8a6410]/30 px-2.5 py-0.5 font-mono-custom text-[10px] font-bold text-[#fef08a] shadow-[0_0_12px_rgba(212,175,55,0.3)] hover:scale-105"
              >
                <Sparkles size={11} />
                <span>Mint</span>
              </button>
            )}
          </div>
        </div>

        {/* AUTHENTIC TOTY CARD WITH 3D CRYSTALS & METALLIC GOLD FRAME */}
        <TotyCard
          legend={legend}
          overall={overall}
          playable={playable}
          isFlipped={isFlipped}
          onFlip={() => setIsFlipped((prev) => !prev)}
          onInspect={() => setInspectModalOpen(true)}
          onMint={() => setMintModalOpen(true)}
          onUploadClick={() => setPhotoModalOpen(true)}
        />
      </div>

      <ProfilePhotoUpload
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        onSelectPhoto={handlePhotoSelect}
        currentPhotoUrl={legend.photoUrl}
      />

      <SepoliaMintModal
        isOpen={mintModalOpen}
        onClose={() => setMintModalOpen(false)}
        legend={legend}
        overall={overall}
        onMintSuccess={() => {
          setMintModalOpen(false);
          onRefresh?.();
        }}
      />

      <PS5InspectModal
        isOpen={inspectModalOpen}
        onClose={() => setInspectModalOpen(false)}
        legend={legend}
      />
    </>
  );
}

export function HomeLegendHero() {
  const { legend, loading } = useLegend();
  const { serverUser } = useServerSession();

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#1C3A2E] bg-[#0E1A16] p-6 text-center animate-pulse">
        <div className="h-6 w-32 mx-auto bg-white/10 rounded-full" />
        <div className="h-48 w-36 mx-auto mt-4 bg-white/5 rounded-2xl" />
      </div>
    );
  }

  if (!legend || !legend.profileComplete) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/40 bg-gradient-to-br from-[#0c261c] via-[#06140e] to-[#020805] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.6)]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <LegendAvatar name="Novice" position="ST" size="md" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#fef08a] shadow-[0_0_6px_#fef08a]" />
                <span className="font-mono-custom text-[10px] font-black uppercase tracking-widest text-[#fef08a]">
                  EA FC ULTIMATE CARD
                </span>
              </div>
              <h2 className="mt-1 text-lg font-bold text-white">Create Your Legend Card</h2>
              <p className="text-xs text-[#8FA39A] mt-0.5 max-w-xs">
                Build your athlete, lock KTK into your card, and mint to Sepolia ERC-721.
              </p>
            </div>
          </div>
          <Link
            href="/legend"
            className="shrink-0 rounded-full bg-gradient-to-r from-[#fef08a] via-[#eab308] to-[#854d0e] px-5 py-2.5 font-mono-custom text-xs font-black uppercase text-black shadow-[0_0_20px_rgba(254,240,138,0.3)] hover:scale-105 transition-transform"
          >
            Build Legend →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#d4af37]/50 bg-gradient-to-br from-[#0f2d21] via-[#071710] to-[#020906] p-4 sm:p-5 shadow-[0_15px_40px_rgba(0,0,0,0.7)]">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="w-full md:w-auto flex justify-center">
          <LegendCard
            legend={legend}
            playable={serverUser?.demoCredits}
            variant="full"
          />
        </div>
        <div className="flex-1 space-y-3 font-mono-custom text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#fef08a]/40 bg-[#fef08a]/10 px-3 py-1 text-[10px] font-black text-[#fef08a]">
            <Sparkles size={12} />
            <span>AUTHENTIC FUT LEGEND ACTIVE</span>
          </div>
          <h2 className="text-xl font-black text-white">{legend.name}</h2>
          <p className="text-xs text-[#8FA39A]">
            Position: <span className="text-[#fef08a] font-bold">{legend.position}</span> · Stats locked into your Sepolia ERC-721 passport.
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
            <Link
              href="/legend"
              className="rounded-full border border-[#fef08a]/70 bg-[#fef08a]/15 px-4 py-2 text-xs font-bold text-[#fef08a] hover:bg-[#fef08a]/25 transition-colors"
            >
              Tune Attributes
            </Link>
            <Link
              href="/pvp"
              className="rounded-full bg-[#35D399] px-4 py-2 text-xs font-black text-[#062018] shadow-[0_0_16px_rgba(53,211,153,0.35)] hover:bg-[#35D399]/90 transition-colors"
            >
              Play With Legend →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
