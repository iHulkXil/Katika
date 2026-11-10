import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { WalletAuthButton } from '@/components/wallet-auth';
import { Plus, TrendingUp, Users, Calendar, Zap, Clock } from 'lucide-react';
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
  shortTerm?: boolean;
};

const now = Date.now();
const in15min = new Date(now + 15 * 60 * 1000).toISOString().slice(0, 16);

const INITIAL_MARKETS: Market[] = [
  {
    id: 'btc15',
    title: 'BTC up or down in the next 15 minutes?',
    description: 'Resolves Yes if BTC price is higher than the open of this window on major exchanges.',
    creator: 'system',
    endDate: in15min,
    resolution: 'Binance / Coinbase mid-price at window close',
    category: 'Crypto',
    yesShares: 180,
    noShares: 120,
    volume: 4200,
    nftMinted: true,
    createdAt: now - 60000,
    live: true,
    shortTerm: true,
  },
  {
    id: 'sol15',
    title: 'SOL up or down in the next 15 minutes?',
    description: 'Resolves Yes if SOL price is higher than the open of this window on major exchanges.',
    creator: 'system',
    endDate: in15min,
    resolution: 'Binance / Coinbase mid-price at window close',
    category: 'Crypto',
    yesShares: 140,
    noShares: 160,
    volume: 3100,
    nftMinted: true,
    createdAt: now - 120000,
    live: true,
    shortTerm: true,
  },
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
  {
    id: 'm4',
    title: 'Will the US presidential candidate lead by >5 points in the final poll?',
    description: 'Resolves based on the average of the final five national polls released before election day.',
    creator: '0xcc33...dd44',
    endDate: '2026-11-05',
    resolution: 'FiveThirtyEight / RealClearPolitics average',
    category: 'Politics',
    yesShares: 560,
    noShares: 340,
    volume: 28400,
    nftMinted: true,
    createdAt: Date.now() - 259200000,
    live: true,
  },
  {
    id: 'm5',
    title: 'Will Manchester City win the Premier League this season?',
    description: 'Resolves Yes if Manchester City finishes top of the table at the end of the 2026-27 season.',
    creator: '0xaa99...bb00',
    endDate: '2027-05-25',
    resolution: 'Official Premier League final standings',
    category: 'Sports',
    yesShares: 380,
    noShares: 220,
    volume: 15200,
    nftMinted: true,
    createdAt: Date.now() - 432000000,
    live: true,
  },
  {
    id: 'm6',
    title: 'Will OpenAI release a model that scores >90% on GPQA Diamond before July 2027?',
    description: 'Resolves based on official OpenAI or independent benchmark reports.',
    creator: '0x1122...3344',
    endDate: '2027-07-01',
    resolution: 'OpenAI blog or verified third-party benchmark',
    category: 'Other',
    yesShares: 290,
    noShares: 410,
    volume: 9800,
    nftMinted: true,
    createdAt: Date.now() - 86400000,
    live: true,
  },
  {
    id: 'm7',
    title: 'Will the Fed cut rates by at least 50bps by March 2027?',
    description: 'Resolves Yes if the cumulative federal funds rate reduction reaches 50bps or more by the March 2027 meeting.',
    creator: '0x5566...7788',
    endDate: '2027-03-20',
    resolution: 'Federal Reserve official statements',
    category: 'Finance',
    yesShares: 340,
    noShares: 160,
    volume: 11200,
    nftMinted: true,
    createdAt: Date.now() - 172800000,
    live: true,
  },
  {
    id: 'm8',
    title: 'Will SOL hit a new all-time high before the end of 2026?',
    description: 'Resolves Yes if any major exchange records a new SOL ATH before 31 Dec 2026.',
    creator: '0x9988...7766',
    endDate: '2026-12-31',
    resolution: 'CoinGecko or Binance ATH record',
    category: 'Crypto',
    yesShares: 270,
    noShares: 330,
    volume: 7600,
    nftMinted: true,
    createdAt: Date.now() - 86400000,
    live: true,
  },
];

const CATEGORIES = ['All', 'Crypto', 'Finance', 'Sports', 'Politics', 'Other'];
const SOLANA_RPC = 'https://api.devnet.solana.com';

function formatOdds(shares: number, total: number): string {
  if (total <= 0 || shares <= 0) return '—';
  const prob = shares / total;
  const odds = 1 / prob;
  return odds >= 100 ? odds.toFixed(0) : odds.toFixed(2);
}

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
      .sort((a, b) => {
        if (a.shortTerm && !b.shortTerm) return -1;
        if (!a.shortTerm && b.shortTerm) return 1;
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      });
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
    toast({ title: 'Order placed', description: `${amount} shares of ${outcome.toUpperCase()}` });
  };

  return (
    <div className="px-4 pt-4 pb-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">Live Markets</span>
            <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> LIVE
            </span>
          </div>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-white">Upcoming Events</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 active:scale-95"
        >
          <Plus size={14} />
          Create
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
              filter === c
                ? 'bg-blue-500 text-white shadow-sm'
                : 'border border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:text-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-slate-400">
        Trade on live prediction markets. Odds shown as decimal. Create an event to mint a Solana NFT proof-of-bet.
      </p>

      {showCreate && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white">Create Event</h2>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            placeholder="Event title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            placeholder="Description / resolution criteria"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
            <select
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            placeholder="Resolution source"
            value={form.resolution}
            onChange={(e) => setForm({ ...form, resolution: e.target.value })}
          />
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={minting}
              onClick={createEvent}
              className="flex-1 rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-blue-600"
            >
              {minting ? 'Minting...' : 'Mint NFT & Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
          <p className="text-[11px] text-slate-500">Requires a Solana wallet with SOL on devnet.</p>
        </div>
      )}

      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center text-sm text-slate-400">
            No events in this category yet.
          </div>
        )}
        {sorted.map((m) => {
          const total = m.yesShares + m.noShares || 1;
          const yesOdds = formatOdds(m.yesShares, total);
          const noOdds = formatOdds(m.noShares, total);
          const end = new Date(m.endDate).getTime();
          const minsLeft = Math.max(0, Math.round((end - Date.now()) / 60000));
          const daysLeft = Math.max(0, Math.ceil((end - Date.now()) / 86400000));
          const timeLabel = m.shortTerm ? `${minsLeft}m` : `${daysLeft}d`;
          return (
            <div key={m.id} className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-4 transition hover:border-slate-600">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                      {m.category}
                    </span>
                    {m.shortTerm && (
                      <span className="rounded bg-orange-500/15 px-2 py-0.5 text-[10px] font-medium text-orange-400">
                        15m
                      </span>
                    )}
                    {m.live && (
                      <span className="flex items-center gap-0.5 rounded bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
                        <Zap size={10} /> Live
                      </span>
                    )}
                    {m.nftMinted && (
                      <span className="rounded bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                        SOL NFT
                      </span>
                    )}
                  </div>
                  <h3 className="text-[15px] font-semibold leading-snug text-white">{m.title}</h3>
                </div>
              </div>

              <p className="mt-1.5 text-xs leading-relaxed text-slate-400 line-clamp-2">{m.description}</p>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><Clock size={12} /> {timeLabel} left</span>
                <span className="flex items-center gap-1"><Users size={12} /> {m.creator}</span>
                <span className="flex items-center gap-1"><TrendingUp size={12} /> ${m.volume.toLocaleString()}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => buyIn(m.id, 'yes', 10)}
                  className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2.5 text-left transition hover:bg-emerald-500/20 active:scale-[0.98]"
                >
                  <span className="text-sm font-semibold text-emerald-400">Yes</span>
                  <span className="font-mono-custom text-sm font-bold text-emerald-300">{yesOdds}</span>
                </button>
                <button
                  type="button"
                  onClick={() => buyIn(m.id, 'no', 10)}
                  className="flex items-center justify-between rounded-lg bg-red-500/10 px-3 py-2.5 text-left transition hover:bg-red-500/20 active:scale-[0.98]"
                >
                  <span className="text-sm font-semibold text-red-400">No</span>
                  <span className="font-mono-custom text-sm font-bold text-red-300">{noOdds}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
