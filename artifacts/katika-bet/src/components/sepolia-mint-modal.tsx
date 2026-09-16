import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { LegendCardData } from '@/components/legend-card';
import { LegendAvatar } from '@/components/legend-avatar';
import { CheckCircle2, ExternalLink, ShieldCheck, Sparkles, X } from 'lucide-react';

const PERKS = [
  { id: 'kit_prime', label: 'Prime kit', hint: 'Card / avatar finish. No odds.' },
  { id: 'table_skin', label: 'Table skin', hint: 'Stage look. No odds.' },
  { id: 'stake_plus', label: 'Stake +', hint: 'Max wager 75 KTK instead of 50.' },
] as const;

export type MintRecord = {
  tokenId: number;
  contractAddress: string;
  txHash: string;
  perkId?: string;
  ruleset?: number;
  blockNumber: number;
  mintedAt: string;
  chain: string;
  chainId: number;
  tokenUri: string;
  snapshot: {
    name: string;
    position: string;
    overall: number;
    stats: { pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number };
    allocatedKtk: number;
    avatarSeed: string;
  };
};

export function SepoliaMintModal({
  isOpen, onClose, legend, onMintSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  legend: (LegendCardData & { mint?: MintRecord | null; overall?: number; perkId?: string | null }) | null;
  onMintSuccess?: (mint: MintRecord) => void;
}) {
  const { getAccessToken, user, authenticated } = usePrivy();
  const [busy, setBusy] = useState(false);
  const [perkId, setPerkId] = useState<string>(legend?.perkId || legend?.mint?.perkId || 'kit_prime');
  const [step, setStep] = useState('idle');
  const [mintResult, setMintResult] = useState<MintRecord | null>(legend?.mint ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (legend?.mint) setMintResult(legend.mint); }, [legend?.mint]);
  if (!isOpen) return null;

  const overall = legend
    ? Math.round(((legend.pace ?? 50) + (legend.shooting ?? 50) + (legend.passing ?? 50) + (legend.dribbling ?? 50) + (legend.defending ?? 50) + (legend.physical ?? 50)) / 6)
    : 75;
  const isEligible = authenticated && Boolean(legend?.profileComplete) && (legend?.allocatedKchip ?? 0) > 0;
  const activeMint = mintResult ?? legend?.mint ?? null;

  const handleMint = async () => {
    if (!isEligible) return;
    setError(null); setBusy(true); setStep('charging $1');
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Please authenticate first');
      const res = await fetch('/api/legends/mint', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ perkId, payUsd: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mint failed');
      setMintResult(data.mint);
      setStep('done');
      if (onMintSuccess) onMintSuccess(data.mint);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mint failed');
      setStep('idle');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-[#d4af37]/40 bg-[#0b1612] p-6">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full border border-[#1C3A2E] p-1.5 text-[#8FA39A]"><X size={18} /></button>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1 font-mono-custom text-[10px] uppercase text-[#f3d37a]">
          <Sparkles size={12} /> $1 reprint · 10 KTK now
        </span>
        <p className="mt-2 text-xs text-[#c7d9d0]">Mainnet price is $1 per reprint. Testnet collects 10 KTK as the stand-in. Six stats stay. One perk. House can retune perks.</p>
        <div className="relative my-4 overflow-hidden rounded-2xl border-2 border-[#d4af37]/70 bg-[#0e1d17] p-4">
          <div className="flex items-center gap-4">
            <LegendAvatar name={legend?.name ?? 'Legend'} position={legend?.position ?? 'ST'} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl font-bold">{legend?.name ?? 'Custom Player'}</h3>
              <p className="text-[11px] text-[#35D399]">{legend?.allocatedKchip ?? 0} KTK on the card</p>
            </div>
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-[#f3d37a] to-[#8a6410] text-black">
              <span className="font-mono-custom text-[9px]">OVR</span>
              <span className="font-mono-custom text-2xl font-black leading-none">{overall}</span>
            </div>
          </div>
        </div>
        <p className="mb-2 font-mono-custom text-[10px] uppercase text-[#8FA39A]">Choose one perk</p>
        <div className="grid gap-2">
          {PERKS.map((perk) => (
            <button key={perk.id} type="button" onClick={() => setPerkId(perk.id)}
              className={`rounded-xl border px-3 py-2 text-left text-xs ${perkId === perk.id ? 'border-[#d4af37] bg-[#d4af37]/10' : 'border-[#1C3A2E] text-[#8FA39A]'}`}>
              <span className="font-semibold text-[#E8F2EC]">{perk.label}</span>
              <span className="mt-0.5 block">{perk.hint}</span>
            </button>
          ))}
        </div>
        {activeMint ? (
          <div className="my-3 rounded-xl border border-[#35D399]/40 bg-[#0e251c] p-3 text-xs text-[#35D399]">
            <div className="flex items-center gap-2"><ShieldCheck size={18} /> Legend #{activeMint.tokenId}</div>
            {activeMint.txHash ? (
              <a href={`https://sepolia.etherscan.io/tx/${activeMint.txHash}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1">
                View stamp <ExternalLink size={12} />
              </a>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 space-y-1 text-xs text-[#8FA39A]">
            <div className="flex items-center gap-2"><CheckCircle2 size={14} className={legend?.profileComplete ? 'text-[#35D399]' : ''} /> Card saved</div>
            <div className="flex items-center gap-2"><CheckCircle2 size={14} className={user?.wallet?.address ? 'text-[#35D399]' : ''} /> Wallet</div>
            <div className="flex items-center gap-2"><CheckCircle2 size={14} /> Fee $1 = 10 KTK on this net</div>
          </div>
        )}
        {error ? <p className="mt-2 text-center text-xs text-red-400">{error}</p> : null}
        <button type="button" disabled={!isEligible || busy} onClick={() => void handleMint()}
          className="mt-4 w-full rounded-full bg-gradient-to-r from-[#d4af37] to-[#e2b422] py-3.5 text-sm font-bold text-black disabled:opacity-50">
          {busy ? step : activeMint ? 'Pay $1 · remint perk' : 'Pay $1 · mint card'}
        </button>
        <p className="mt-3 text-center text-[10px] text-[#8FA39A]">Debits 10 playable KTK. Remint after 10× rollover. Stripe/ETH $1 is the mainnet swap.</p>
      </div>
    </div>
  );
}
