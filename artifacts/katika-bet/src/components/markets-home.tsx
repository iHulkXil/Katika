import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { WalletAuthButton } from '@/components/wallet-auth';
import { Plus, TrendingUp, Users, Calendar } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { Connection, PublicKey, Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token';

type Outcome = 'yes' | 'no';

type Market = {
  id: string;
  title: string;
  description: string;
  creator: string;
  endDate: string;
  resolution: string;
  yesShares: number;
  noShares: number;
  volume: number;
  nftMinted: boolean;
  mintAddress?: string;
  txSig?: string;
  createdAt: number;
};

const INITIAL_MARKETS: Market[] = [
  {
    id: 'm1',
    title: 'Will BTC close above $100k this month?',
    description: 'Resolves Yes if any major exchange shows BTC >= 100000 USD on the last day of the month.',
    creator: '0xab12...cd34',
    endDate: '2026-11-30',
    resolution: 'Coinbase or Binance close price',
    yesShares: 420,
    noShares: 180,
    volume: 12500,
    nftMinted: true,
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'm2',
    title: 'Will the next major Solana upgrade ship before year end?',
    description: 'Resolves Yes if official Solana status confirms mainnet activation of the planned upgrade.',
    creator: '0xef56...gh78',
    endDate: '2026-12-31',
    resolution: 'Official Solana blog or status page',
    yesShares: 310,
    noShares: 290,
    volume: 8400,
    nftMinted: true,
    createdAt: Date.now() - 172800000,
  },
];

const SOLANA_RPC = 'https://api.devnet.solana.com';

export function MarketsHome() {
  const { toast } = useToast();
  const { authenticated, user } = usePrivy();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [markets, setMarkets] = useState<Market[]>(INITIAL_MARKETS);
  const [showCreate, setShowCreate] = useState(false);
  const [minting, setMinting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    endDate: '',
    resolution: '',
  });

  const createEvent = async () => {
    if (!form.title.trim() || !form.endDate) {
      toast({ title: 'Missing fields', description: 'Title and end date required.', variant: 'destructive' });
      return;
    }
    if (!authenticated) {
      toast({ title: 'Connect wallet', description: 'Sign in to mint on Solana.', variant: 'destructive' });
      return;
    }
    const solWallet = solanaWallets?.[0];
    if (!solWallet) {
      toast({ title: 'No Solana wallet', description: 'Create or connect a Solana wallet first.', variant: 'destructive' });
      return;
    }

    setMinting(true);
    try {
      const connection = new Connection(SOLANA_RPC, 'confirmed');
      const payer = new PublicKey(solWallet.address);
      const mintKeypair = Keypair.generate();
      const lamports = await getMinimumBalanceForRentExemptMint(connection);
      const tokenAccount = await getAssociatedTokenAddress(mintKeypair.publicKey, payer);

      const tx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(mintKeypair.publicKey, 0, payer, payer),
        createAssociatedTokenAccountInstruction(payer, tokenAccount, payer, mintKeypair.publicKey),
        createMintToInstruction(mintKeypair.publicKey, tokenAccount, payer, 1),
      );

      tx.feePayer = payer;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.partialSign(mintKeypair);

      const sig = await signAndSendTransaction({
        transaction: tx,
        wallet: solWallet,
        connection,
      });

      const id = 'm' + Date.now().toString(36);
      const newMarket: Market = {
        id,
        title: form.title.trim(),
        description: form.description.trim() || 'No additional description.',
        creator: solWallet.address.slice(0, 6) + '...' + solWallet.address.slice(-4),
        endDate: form.endDate,
        resolution: form.resolution.trim() || 'Creator resolution',
        yesShares: 0,
        noShares: 0,
        volume: 0,
        nftMinted: true,
        mintAddress: mintKeypair.publicKey.toBase58(),
        txSig: typeof sig === 'string' ? sig : (sig as any).signature,
        createdAt: Date.now(),
      };
      setMarkets((prev) => [newMarket, ...prev]);
      setShowCreate(false);
      setForm({ title: '', description: '', endDate: '', resolution: '' });
      toast({
        title: 'Minted on Solana',
        description: `Proof-of-bet NFT created. Mint: ${mintKeypair.publicKey.toBase58().slice(0, 8)}...`,
      });
    } catch (err: any) {
      toast({
        title: 'Mint failed',
        description: err?.message || 'Could not mint on Solana. Ensure wallet has SOL on devnet.',
        variant: 'destructive',
      });
    } finally {
      setMinting(false);
    }
  };

  const buyIn = (id: string, outcome: Outcome, amount: number) => {
    setMarkets((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const next = { ...m, volume: m.volume + amount };
        if (outcome === 'yes') next.yesShares += amount;
        else next.noShares += amount;
        return next;
      }),
    );
    toast({ title: 'Buy order placed', description: `${amount} shares of ${outcome.toUpperCase()}` });
  };

  return (
    <div className="px-3 pt-3 pb-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-[#35D399]">Prediction Markets</span>
          <h1 className="text-xl font-bold tracking-tight text-[#E8F2EC]">SIDEBET</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-full border border-[#35D399]/40 bg-[#35D399]/15 px-3 py-1.5 text-xs font-bold text-[#35D399] hover:bg-[#35D399]/25 active:scale-95"
        >
          <Plus size={14} />
          Create Event
        </button>
      </div>
      <p className="text-xs text-[#8FA39A]">
        Create an event to mint a Solana NFT as proof of bet. Others buy Yes or No shares.
      </p>

      {showCreate && (
        <div className="rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-4 space-y-3">
          <h2 className="text-sm font-bold text-white">Create Event (mints Solana NFT)</h2>
          <input
            className="w-full rounded-lg border border-[#1C3A2E] bg-[#07110E] px-3 py-2 text-sm text-white"
            placeholder="Event title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className="w-full rounded-lg border border-[#1C3A2E] bg-[#07110E] px-3 py-2 text-sm text-white"
            placeholder="Description / resolution criteria"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              className="rounded-lg border border-[#1C3A2E] bg-[#07110E] px-3 py-2 text-sm text-white"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
            <input
              className="rounded-lg border border-[#1C3A2E] bg-[#07110E] px-3 py-2 text-sm text-white"
              placeholder="Resolution source"
              value={form.resolution}
              onChange={(e) => setForm({ ...form, resolution: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={minting}
              onClick={createEvent}
              className="flex-1 rounded-lg bg-[#35D399] py-2 text-sm font-bold text-black disabled:opacity-50"
            >
              {minting ? 'Minting on Solana...' : 'Mint NFT & Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-[#1C3A2E] px-4 py-2 text-sm text-[#8FA39A]"
            >
              Cancel
            </button>
          </div>
          <p className="text-[10px] text-[#8FA39A]">Requires a Solana wallet with SOL on devnet. Mint creates a 0-decimal token as the proof NFT.</p>
        </div>
      )}

      <div className="space-y-3">
        {markets.map((m) => {
          const total = m.yesShares + m.noShares || 1;
          const yesPct = Math.round((m.yesShares / total) * 100);
          return (
            <div key={m.id} className="rounded-2xl border border-[#1C3A2E] bg-gradient-to-br from-[#0E1A16] to-[#07110E] p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold text-[#E8F2EC]">{m.title}</h3>
                {m.nftMinted && (
                  <span className="shrink-0 rounded-full bg-[#35D399]/15 px-2 py-0.5 text-[10px] font-bold text-[#35D399]">
                    SOL NFT
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-[#8FA39A]">{m.description}</p>
              {m.mintAddress && (
                <p className="mt-1 font-mono-custom text-[9px] text-[#35D399]">Mint: {m.mintAddress.slice(0, 8)}...{m.mintAddress.slice(-4)}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-[#8FA39A]">
                <span className="flex items-center gap-1"><Calendar size={12} /> {m.endDate}</span>
                <span className="flex items-center gap-1"><Users size={12} /> {m.creator}</span>
                <span className="flex items-center gap-1"><TrendingUp size={12} /> Vol {m.volume}</span>
              </div>
              <div className="mt-3">
                <div className="flex h-2 overflow-hidden rounded-full bg-black/40">
                  <div className="bg-[#35D399]" style={{ width: `${yesPct}%` }} />
                  <div className="bg-red-500/70" style={{ width: `${100 - yesPct}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[11px] font-mono-custom">
                  <span className="text-[#35D399]">Yes {yesPct}%</span>
                  <span className="text-red-400">No {100 - yesPct}%</span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => buyIn(m.id, 'yes', 10)}
                  className="rounded-lg bg-[#35D399]/20 py-2 text-xs font-bold text-[#35D399] hover:bg-[#35D399]/30"
                >
                  Buy Yes (10)
                </button>
                <button
                  type="button"
                  onClick={() => buyIn(m.id, 'no', 10)}
                  className="rounded-lg bg-red-500/20 py-2 text-xs font-bold text-red-400 hover:bg-red-500/30"
                >
                  Buy No (10)
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 text-center">
        <WalletAuthButton />
      </div>
    </div>
  );
}
