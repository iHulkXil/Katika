import { useState } from 'react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { WalletAuthButton } from '@/components/wallet-auth';
import { Plus, TrendingUp, Users, Calendar, CheckCircle2 } from 'lucide-react';

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

export function MarketsHome() {
  const { toast } = useToast();
  const [markets, setMarkets] = useState<Market[]>(INITIAL_MARKETS);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    endDate: '',
    resolution: '',
  });

  const createEvent = () => {
    if (!form.title.trim() || !form.endDate) {
      toast({ title: 'Missing fields', description: 'Title and end date required.', variant: 'destructive' });
      return;
    }
    const id = 'm' + Date.now().toString(36);
    const newMarket: Market = {
      id,
      title: form.title.trim(),
      description: form.description.trim() || 'No additional description.',
      creator: 'You',
      endDate: form.endDate,
      resolution: form.resolution.trim() || 'Creator resolution',
      yesShares: 0,
      noShares: 0,
      volume: 0,
      nftMinted: true,
      createdAt: Date.now(),
    };
    setMarkets((prev) => [newMarket, ...prev]);
    setShowCreate(false);
    setForm({ title: '', description: '', endDate: '', resolution: '' });
    toast({
      title: 'Event created',
      description: 'NFT minted as proof of bet. Others can now buy in.',
    });
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
        Create an event to mint an NFT with the bet details. Others buy Yes or No shares. Current color scheme preserved.
      </p>

      {showCreate && (
        <div className="rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-4 space-y-3">
          <h2 className="text-sm font-bold text-white">Create Event (mints NFT)</h2>
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
              onClick={createEvent}
              className="flex-1 rounded-lg bg-[#35D399] py-2 text-sm font-bold text-black"
            >
              Mint NFT & Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-[#1C3A2E] px-4 py-2 text-sm text-[#8FA39A]"
            >
              Cancel
            </button>
          </div>
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
                    NFT
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-[#8FA39A]">{m.description}</p>
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
