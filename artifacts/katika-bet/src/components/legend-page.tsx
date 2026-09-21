import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { LegendCard } from '@/components/legend-card';
import { SepoliaMintModal, type MintRecord } from '@/components/sepolia-mint-modal';
import { Sparkles, ShieldCheck, Trophy, ArrowRight } from 'lucide-react';

const POSITIONS = ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'CDM', 'LB', 'RB', 'CB', 'GK'];
const STATS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'] as const;
const FIRST_CAP = 333;

const PERKS = [
  { id: 'kit_prime', name: 'Prime Gold Aura', desc: 'Exclusive golden glowing cosmetic aura on floor & clash arena' },
  { id: 'table_skin', name: 'Velvet Green Table', desc: 'Custom VIP velvet felt texture for 3D roulette, dice, and mines' },
  { id: 'stake_plus', name: 'High Stakes +50%', desc: 'Expands maximum wager limit from 50 KTK up to 75 KTK across all games' },
];

type Legend = {
  name: string;
  position: string;
  perkId?: string;
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
};

export function LegendPage() {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const { serverUser } = useServerSession();
  const [legend, setLegend] = useState<Legend>({
    name: 'K. Ronaldo',
    position: 'ST',
    perkId: 'kit_prime',
    pace: 55,
    shooting: 55,
    passing: 55,
    dribbling: 55,
    defending: 55,
    physical: 55,
    profileComplete: false,
    allocatedKchip: 330,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [mintModalOpen, setMintModalOpen] = useState(false);

  const load = async () => {
    const token = await getAccessToken();
    if (!token) return;
    const response = await fetch('/api/legends/me', { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return;
    const body = await response.json();
    if (body) setLegend(body as Legend);
  };

  useEffect(() => {
    if (ready && authenticated) void load();
  }, [ready, authenticated]);

  const save = async () => {
    setStatus('Saving...');
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Sign in first');
      const response = await fetch('/api/legends/me', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(legend),
      });
      const body = await response.json();
      if (!response.ok) throw new Error((body as { error?: string }).error ?? 'Save failed');
      setLegend(body as Legend);
      setStatus('Card saved! KTK locked into attributes.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed');
    }
  };

  if (!ready) return <p className="px-3 pt-6 text-sm text-[#8FA39A]">Loading...</p>;
  if (!authenticated) {
    return (
      <div className="px-3 pt-6">
        <p className="text-sm text-[#8FA39A]">Sign in to build the card.</p>
        <button type="button" onClick={() => void login()} className="mt-4 rounded-full bg-[#35D399] px-6 py-3 text-sm font-semibold text-[#062018]">Sign in</button>
      </div>
    );
  }

  const nextAlloc = STATS.reduce((sum, key) => sum + Number(legend[key] || 0), 0);
  const overall = Math.round(nextAlloc / 6);
  const playable = serverUser?.demoCredits ?? 0;
  const oldAlloc = legend.allocatedKchip ?? 0;
  const bank = playable + (legend.profileComplete ? oldAlloc : 0);
  const estPlayable = Math.max(0, bank - nextAlloc);

  const isMinted = Boolean(legend.mint);

  return (
    <div className="px-3 pt-2 pb-12">
      {/* Positioning Callout Banner */}
      <div className="mb-4 rounded-2xl border border-[#1C3A2E] bg-gradient-to-r from-[#0E1A16] to-[#07110e] px-4 py-3">
        <p className="text-center font-mono-custom text-[11px] font-medium leading-relaxed text-[#c7d9d0]">
          &ldquo;Build a legend. Lock KTK into the card. Play to unlock more. Mint when the card is yours.&rdquo;
        </p>
      </div>

      {/* Mint Portal Banner */}
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#172e25] via-[#0E1A16] to-[#08120e] p-3.5 shadow-md">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono-custom text-[10px] font-bold uppercase tracking-wider text-[#f3d37a]">
              Sepolia Living Card
            </span>
            {isMinted && (
              <span className="inline-flex items-center gap-1 rounded bg-[#35D399]/20 px-1.5 py-0.5 font-mono-custom text-[9px] text-[#35D399]">
                <ShieldCheck size={10} /> Verified #{legend.mint?.tokenId}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[#8FA39A]">
            {isMinted
              ? 'Your on-chain living passport. Rollovers evolve this token.'
              : 'Mint creates your on-chain card snapshot on Ethereum Sepolia.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMintModalOpen(true)}
          className="ml-3 shrink-0 rounded-xl border border-[#d4af37]/60 bg-gradient-to-r from-[#d4af37] to-[#e2b422] px-3 py-2 text-xs font-bold text-black shadow hover:opacity-95"
        >
          {isMinted ? 'Passport' : 'Mint Card'}
        </button>
      </div>

      {/* Live Interactive UHD 2D Living Card Showcase */}
      <div className="mb-6">
        <LegendCard
          legend={{
            ...legend,
            profileComplete: true,
            allocatedKchip: nextAlloc,
          }}
          playable={estPlayable}
          onRefresh={load}
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="block flex-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8FA39A]">
          Legend Name
          <input
            className="mt-2 w-full rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] px-4 py-3.5 text-sm text-[#E8F2EC] outline-none focus:border-[#35D399]/50"
            value={legend.name}
            onChange={(event) => setLegend({ ...legend, name: event.target.value })}
          />
        </label>
        <div className="ml-4 text-center">
          <span className="font-mono-custom text-[10px] uppercase text-[#8FA39A]">OVR</span>
          <div className="grid h-12 w-12 place-items-center rounded-xl border border-[#d4af37]/50 bg-gradient-to-br from-[#f3d37a] to-[#8a6410] font-mono-custom text-xl font-bold text-black">
            {overall}
          </div>
        </div>
      </div>

      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8FA39A]">Position</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {POSITIONS.map((position) => (
          <button
            key={position}
            type="button"
            onClick={() => setLegend({ ...legend, position })}
            className={`rounded-full px-3 py-1.5 text-xs transition-all ${
              legend.position === position
                ? 'bg-[#35D399] font-semibold text-[#062018]'
                : 'bg-[#0E1A16] text-[#8FA39A] ring-1 ring-[#1C3A2E] hover:text-white'
            }`}
          >
            {position}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8FA39A]">Legend Perk</p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {PERKS.map((p) => {
          const isSelected = (legend.perkId || 'kit_prime') === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setLegend({ ...legend, perkId: p.id })}
              className={`rounded-xl border p-3 text-left transition-all ${
                isSelected
                  ? 'border-[#35D399] bg-[#35D399]/15 shadow-[0_0_12px_rgba(53,211,153,0.15)]'
                  : 'border-[#1C3A2E] bg-[#0E1A16] hover:border-[#1C3A2E]/80'
              }`}
            >
              <span className="font-mono-custom text-[11px] font-bold text-[#E8F2EC]">{p.name}</span>
              <p className="mt-1 text-[10px] text-[#8FA39A]">{p.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-end justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8FA39A]">
          Attributes · 1 pt = 1 KTK (Immune to table losses)
        </p>
        <p className={`font-mono-custom text-xs ${nextAlloc > FIRST_CAP ? 'text-red-400' : 'text-[#35D399]'}`}>
          {nextAlloc} / {FIRST_CAP}
        </p>
      </div>

      <div className="mt-3 space-y-4">
        {STATS.map((key) => (
          <label key={key} className="grid grid-cols-[88px_1fr_36px] items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[#8FA39A]">
            <span>{key}</span>
            <input
              type="range"
              min={1}
              max={99}
              value={legend[key]}
              className="w-full accent-[#35D399]"
              onChange={(event) => setLegend({ ...legend, [key]: Number(event.target.value) })}
            />
            <span className="text-right font-mono-custom text-sm text-[#E8F2EC]">{legend[key]}</span>
          </label>
        ))}
      </div>

      {/* Stamina preview derived from physical */}
      <div className="mt-3 rounded-xl border border-[#1C3A2E] bg-[#07110E] p-2.5 text-xs text-[#8FA39A] flex items-center justify-between">
        <span>Arena Clash Stamina (from PHY {legend.physical}):</span>
        <span className="font-mono-custom font-bold text-[#f3d37a]">
          {5 + Math.floor(Math.max(0, legend.physical - 40) / 20)} daily battles
        </span>
      </div>

      <div className="mt-6 flex items-end justify-between border-t border-[#1C3A2E] pt-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#8FA39A]">Card Points (Locked)</p>
          <p className="mt-1 font-mono-custom text-2xl text-[#f3d37a]">{nextAlloc} KTK</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#8FA39A]">Floor Stack (Playable)</p>
          <p className="mt-1 font-mono-custom text-2xl text-[#35D399]">{estPlayable.toLocaleString()} KTK</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void save()}
        className="mt-6 w-full rounded-full bg-[#35D399] py-3.5 text-sm font-semibold text-[#062018] shadow-[0_0_28px_rgba(53,211,153,.35)] hover:opacity-95"
      >
        Save card
      </button>
      {status ? <p className="mt-2 text-center text-xs text-[#8FA39A]">{status}</p> : null}

      <div className="mt-6 flex items-center justify-between border-t border-[#1C3A2E]/60 pt-4 text-xs text-[#8FA39A]">
        <Link href="/leaderboard" className="inline-flex items-center gap-1 text-[#f3d37a] hover:underline">
          <Trophy size={14} /> Check OVR Leaderboard
        </Link>
        <Link href="/play" className="inline-flex items-center gap-1 text-[#35D399] hover:underline">
          To the floor <ArrowRight size={14} />
        </Link>
      </div>

      <SepoliaMintModal
        isOpen={mintModalOpen}
        onClose={() => setMintModalOpen(false)}
        legend={legend}
        onMintSuccess={() => void load()}
      />
    </div>
  );
}
