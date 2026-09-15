import { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { LegendCardData } from '@/components/legend-card';
import { LegendAvatar } from '@/components/legend-avatar';
import { CheckCircle2, ExternalLink, ShieldCheck, Sparkles, X } from 'lucide-react';

export type MintRecord = {
  tokenId: number;
  contractAddress: string;
  txHash: string;
  blockNumber: number;
  mintedAt: string;
  chain: string;
  chainId: number;
  tokenUri: string;
  snapshot: {
    name: string;
    position: string;
    overall: number;
    stats: {
      pace: number;
      shooting: number;
      passing: number;
      dribbling: number;
      defending: number;
      physical: number;
    };
    allocatedKtk: number;
    avatarSeed: string;
  };
};

export function SepoliaMintModal({
  isOpen,
  onClose,
  legend,
  onMintSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  legend: (LegendCardData & { mint?: MintRecord | null; overall?: number }) | null;
  onMintSuccess?: (mint: MintRecord) => void;
}) {
  const { getAccessToken, user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'idle' | 'packaging' | 'signing' | 'confirming' | 'done'>('idle');
  const [mintResult, setMintResult] = useState<MintRecord | null>(legend?.mint ?? null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
    : 75;

  const hasWallet = Boolean(user?.wallet?.address || wallets?.[0]?.address);
  const isProfileComplete = Boolean(legend?.profileComplete);
  const isEligible = authenticated && isProfileComplete && (legend?.allocatedKchip ?? 0) > 0;

  const activeMint = mintResult ?? legend?.mint;

  const handleMint = async () => {
    if (!isEligible) return;
    setError(null);
    setBusy(true);
    setStep('packaging');

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Please authenticate first');

      await new Promise((r) => setTimeout(r, 600));
      setStep('signing');

      await new Promise((r) => setTimeout(r, 800));
      setStep('confirming');

      const res = await fetch('/api/legends/mint', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mint legend on Sepolia');

      setMintResult(data.mint);
      setStep('done');
      if (onMintSuccess) {
        onMintSuccess(data.mint);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mint failed');
      setStep('idle');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-[#d4af37]/40 bg-[#0b1612] p-6 shadow-[0_0_50px_rgba(212,175,55,0.18)]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-[#1C3A2E] bg-[#0E1A16] p-1.5 text-[#8FA39A] hover:text-white"
        >
          <X size={18} />
        </button>

        {/* Positioning Statement */}
        <div className="mb-4 pr-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1 font-mono-custom text-[10px] uppercase tracking-wider text-[#f3d37a]">
            <Sparkles size={12} /> Sepolia Living Card
          </span>
          <p className="mt-2 text-xs font-medium leading-relaxed text-[#c7d9d0]">
            &ldquo;Build a legend. Lock KTK into the card. Play to unlock more. Mint when the card is yours.&rdquo;
          </p>
        </div>

        {/* Card Snapshot Preview */}
        <div className="relative my-4 overflow-hidden rounded-2xl border-2 border-[#d4af37]/70 bg-gradient-to-br from-[#1b332b] via-[#0e1d17] to-[#08120e] p-4 shadow-[inset_0_0_30px_rgba(212,175,55,0.15)]">
          <div className="flex items-center gap-4">
            <LegendAvatar name={legend?.name ?? 'Legend'} position={legend?.position ?? 'ST'} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#d4af37] px-1.5 py-0.5 font-mono-custom text-[10px] font-bold text-black">
                  {legend?.position ?? 'CAM'}
                </span>
                <span className="font-mono-custom text-xs text-[#8FA39A]">ERC-721</span>
              </div>
              <h3 className="mt-1 truncate text-xl font-bold text-[#f5f5f5]">
                {legend?.name ?? 'Custom Player'}
              </h3>
              <p className="text-[11px] text-[#35D399]">
                {legend?.allocatedKchip ?? 330} KTK Locked in Attributes
              </p>
            </div>
            <div className="grid h-14 w-14 place-items-center rounded-xl border border-[#d4af37]/60 bg-gradient-to-br from-[#f3d37a] to-[#8a6410] text-black shadow-md">
              <span className="font-mono-custom text-[9px] font-extrabold uppercase leading-none">OVR</span>
              <span className="font-mono-custom text-2xl font-black leading-none">{overall}</span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-3 grid grid-cols-6 gap-1 rounded-lg border border-[#1c3a2e] bg-[#07110e]/70 p-1.5 text-center">
            <div>
              <p className="font-mono-custom text-[9px] text-[#8FA39A]">PAC</p>
              <p className="font-mono-custom text-xs font-bold text-[#E8F2EC]">{legend?.pace ?? 50}</p>
            </div>
            <div>
              <p className="font-mono-custom text-[9px] text-[#8FA39A]">SHO</p>
              <p className="font-mono-custom text-xs font-bold text-[#E8F2EC]">{legend?.shooting ?? 50}</p>
            </div>
            <div>
              <p className="font-mono-custom text-[9px] text-[#8FA39A]">PAS</p>
              <p className="font-mono-custom text-xs font-bold text-[#E8F2EC]">{legend?.passing ?? 50}</p>
            </div>
            <div>
              <p className="font-mono-custom text-[9px] text-[#8FA39A]">DRI</p>
              <p className="font-mono-custom text-xs font-bold text-[#E8F2EC]">{legend?.dribbling ?? 50}</p>
            </div>
            <div>
              <p className="font-mono-custom text-[9px] text-[#8FA39A]">DEF</p>
              <p className="font-mono-custom text-xs font-bold text-[#E8F2EC]">{legend?.defending ?? 50}</p>
            </div>
            <div>
              <p className="font-mono-custom text-[9px] text-[#8FA39A]">PHY</p>
              <p className="font-mono-custom text-xs font-bold text-[#E8F2EC]">{legend?.physical ?? 50}</p>
            </div>
          </div>
        </div>

        {/* Verification Checklist */}
        {!activeMint && (
          <div className="space-y-1.5 rounded-xl border border-[#1C3A2E] bg-[#0E1A16] p-3 text-xs text-[#8FA39A]">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className={isProfileComplete ? 'text-[#35D399]' : 'text-[#8FA39A]/40'} />
              <span className={isProfileComplete ? 'text-[#E8F2EC]' : ''}>Card Profile Configured &amp; Saved</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className={(legend?.allocatedKchip ?? 0) > 0 ? 'text-[#35D399]' : 'text-[#8FA39A]/40'} />
              <span className={(legend?.allocatedKchip ?? 0) > 0 ? 'text-[#E8F2EC]' : ''}>
                {legend?.allocatedKchip ?? 0} KTK Allocated (Points on card)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className={hasWallet ? 'text-[#35D399]' : 'text-[#8FA39A]/40'} />
              <span className={hasWallet ? 'text-[#E8F2EC]' : ''}>Privy Embedded / Web3 Wallet Connected</span>
            </div>
          </div>
        )}

        {/* Minted Success Details */}
        {activeMint && (
          <div className="my-3 rounded-xl border border-[#35D399]/40 bg-[#0e251c] p-3.5 text-xs">
            <div className="flex items-center gap-2 text-[#35D399]">
              <ShieldCheck size={18} />
              <span className="font-semibold uppercase tracking-wider">Sepolia Verified Legend #{activeMint.tokenId}</span>
            </div>
            <p className="mt-2 text-[11px] text-[#c7d9d0]">
              This ERC-721 token is your living player identity. As you achieve 10× table rollovers, you can evolve these exact on-chain stats.
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-[#1C3A2E] pt-2 font-mono-custom text-[11px]">
              <span className="text-[#8FA39A]">Tx: {activeMint.txHash.slice(0, 10)}...{activeMint.txHash.slice(-6)}</span>
              <a
                href={`https://sepolia.etherscan.io/tx/${activeMint.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#35D399] hover:underline"
              >
                Explorer <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}

        {error && <p className="mt-2 text-center text-xs text-red-400">{error}</p>}

        {/* Action Button */}
        <div className="mt-4">
          {!activeMint ? (
            <button
              type="button"
              disabled={!isEligible || busy}
              onClick={() => void handleMint()}
              className="w-full rounded-full bg-gradient-to-r from-[#d4af37] via-[#f3d37a] to-[#d4af37] py-3.5 text-sm font-bold text-black shadow-[0_0_25px_rgba(212,175,55,0.4)] disabled:opacity-50"
            >
              {busy ? (
                <span>
                  {step === 'packaging' && 'Packaging metadata...'}
                  {step === 'signing' && 'Signing on Sepolia...'}
                  {step === 'confirming' && 'Awaiting block confirmation...'}
                </span>
              ) : (
                'Mint Living Card on Sepolia (Free Testnet)'
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-full bg-[#35D399] py-3.5 text-sm font-semibold text-[#062018]"
            >
              Continue Playing
            </button>
          )}
        </div>

        <p className="mt-3 text-center text-[10px] text-[#8FA39A]">
          Ethereum Sepolia Testnet · Chain ID: 11155111 · Zero Real Money Cost
        </p>
      </div>
    </div>
  );
}
