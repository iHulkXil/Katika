import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { WalletAuthButton } from '@/components/wallet-auth';
import { Plus, TrendingUp, Users, Calendar, Zap, Filter, Clock } from 'lucide-react';
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
  category: string;
  yesShares: number;
  noShares: number;
  volume: number;
  nftMinted: boolean;
  mintAddress?: string;
  txSig?: string;
  createdAt: number;
  live: boolean;
};

const INITIAL_MARKETS: Market[] = [
  {
    id: 'm1',
    title: 'Will BTC close above $100k this month?',
    description: 'Resolves Yes if any major exchange shows BTC >= 100000 USD on the last day of the month.',
    creator: '0xab12...cd34',
    endDate: '2026-11-30',
    resolution: 'Coinbase or Binance close price',
    category: 'Crypto',
    yesShares: 420,
    noShares: 180,
    volume: 12500,
    nftMinted: true,
    createdAt: Date.now() - 86400000,
    live: true,
  },
  {
    id: 'm2',
    title: 'Will the next major Solana upgrade ship before year end?',
    description: 'Resolves Yes if official Solana status confirms mainnet activation of the planned upgrade.',
    creator: '0xef56...gh78',
    endDate: '2026-12-31',
    resolution: 'Official Solana blog or status page',
    category: 'Crypto',
    yesShares: 310,
    noShares: 290,
    volume: 8400,
    nftMinted: true,
    createdAt: Date.now() - 172800000,
    live: true,
  },
  {
    id: 'm3',
    title: 'Will Ethereum ETF inflows exceed $5B this quarter?',
    description: 'Resolves based on cumulative net inflows reported by major data providers.',
    creator: '0x9911...aa22',
    endDate: '2026-12-31',
    resolution: 'Bloomberg / SoSoValue aggregate',
    category: 'Finance',
    yesShares: 210,
    noShares: 90,
    volume: 5600,
    nftMinted: true,
    createdAt: Date.now() - 43200000,
    live: true,
  },
];

const CATEGORIES = ['All', 'Crypto', 'Finance', 'Sports', 'Politics', 'Other'];
const SOLANA_RPC = 'https://api.devnet.solana.com';

export function MarketsHome() {
  const { toast } = useToast();
  const { authenticated } = usePrivy();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [markets, setMarkets] = useState<Market[]>(INITIAL_MARKETS);
  const [showCreate, setShowCreate] = useState(false);
  const [minting, setMinting] = useState(false);
  const [filter, setFilter] = useState('All');
  const [form, setForm] = useState({
    title: '',
    description: '',
    endDate: '',
    resolution: '',
    category: 'Crypto',
  });

  const sorted = useMemo(() => {
    return [...markets]
      .filter((m) => filter === 'All' || m.category === filter)
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  }, [markets, filter]);

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
        category: form.category,
        yesShares: 0,
        noShares: 0,
        volume: 0,
        nftMinted: true,
        mintAddress: mintKeypair.publicKey.toBase58(),
        txSig: typeof sig === 'string' ? sig : (sig as any).signature,
        createdAt: Date.now(),
        live: true,
      };
      setMarkets((prev) => [newMarket, ...prev]);
      setShowCreate(false);
      setForm({ title: '', description: '', endDate: '', resolution: '', category: 'Crypto' });
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
          <div className="flex items-center gap-2">
            <span className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-[#35D399]">Live Feed</span>
            <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] font-bold text-red-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> LIVE
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#E8F2EC]">Upcoming Events</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-full border border-[#35D399]/40 bg-[#35D399]/15 px-3 py-1.5 text-xs font-bold text-[#35D399] hover:bg-[#35D399]/25 active:scale-95"
        >
          <Plus size={14} />
          Create
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
              filter === c
                ? 'bg-[#35D399] text-black'
                : 'border border-[#1C3A2E] bg-[#0E1A16] text-[#8FA39A] hover:text-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="text-xs text-[#8FA39A]">
        Rich live feed of prediction events. Create one to mint a Solana NFT proof of bet. Others buy Yes or No.
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
            <select
              className="rounded-lg border border-[#1C3A2E] bg-[#07110E] px-3 py-2 text-sm text-white"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <input
            className="w-full rounded-lg border border-[#1C3A2E] bg-[#07110E] px-3 py-2 text-sm text-white"
            placeholder="Resolution source"
            value={form.resolution}
            onChange={(e) => setForm({ ...form, resolution: e.target.value })}
          />
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
          <p className="text-[10px] text-[#8FA39A]">Requires a Solana wallet with SOL on devnet.</p>
        </div>
      )}

      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#1C3A2E] bg-[#0E1A16]/50 p-8 text-center text-sm text-[#8FA39A]">
            No events in this category yet. Create one.
          </div>
        )}
        {sorted.map((m) => {
          const total = m.yesShares + m.noShares || 1;
          const yesPct = Math.round((m.yesShares / total) * 100);
          const daysLeft = Math.max(0, Math.ceil((new Date(m.endDate).getTime() - Date.now()) / 86400000));
          return (
            <div key={m.id} className="relative overflow-hidden rounded-2xl border border-[#1C3A2E] bg-gradient-to-br from-[#0E1A16] to-[#07110E] p-4">
              {m.live && (
                <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] font-bold text-red-400">
                  <Zap size={10} /> LIVE
                </div>
              )}
              <div className="pr-12">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-[#35D399]/15 px-2 py-0.5 text-[9px] font-bold text-[#35D399]">
                    {m.category}
                  </span>
                  {m.nftMinted && (
                    <span className="rounded-full bg-[#35D399]/15 px-2 py-0.5 text-[9px] font-bold text-[#35D399]">
                      SOL NFT
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-[#E8F2EC]">{m.title}</h3>
              </div>
              <p className="mt-1 text-[11px] text-[#8FA39A]">{m.description}</p>
              {m.mintAddress && (
                <p className="mt-1 font-mono-custom text-[9px] text-[#35D399]">Mint: {m.mintAddress.slice(0, 8)}...{m.mintAddress.slice(-4)}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-[#8FA39A]">
                <span className="flex items-center gap-1"><Calendar size={12} /> {m.endDate}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {daysLeft}d left</span>
                <span className="flex items-center gap-1"><Users size={12} /> {m.creator}</span>
                <span className="flex items-center gap-1"><TrendingUp size={12} /> Vol {m.volume.toLocaleString()}</span>
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
