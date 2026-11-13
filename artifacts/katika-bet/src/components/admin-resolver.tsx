import { useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import {
  Scale,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Plus,
  ArrowLeft,
  Loader2,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';
import { fetchMarkets, resolveMarket, createMarket, fetchStats, type Market, type PlatformStats } from '@/lib/markets-api';
import { useToast } from '@/hooks/use-toast';
import { pushNotification } from '@/lib/notifications';

export function AdminResolverPage() {
  const { toast } = useToast();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // New Market Form
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Politics');
  const [description, setDescription] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [mList, sData] = await Promise.all([fetchMarkets(), fetchStats()]);
      setMarkets(mList);
      setStats(sData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleResolve = async (marketId: string, resolution: 'YES' | 'NO') => {
    setResolvingId(marketId);
    try {
      const res = await resolveMarket(marketId, resolution);
      toast({
        title: `Market Settled: ${resolution}`,
        description: `Successfully resolved. ${res.stats.wonPositions} positions won, ${res.stats.lostPositions} lost.`,
      });
      pushNotification({
        title: `Oracle Settled: ${resolution}`,
        message: `${res.stats.wonPositions} winning positions settled.`,
        type: 'market',
        href: '/my-bets',
      });
      await loadData();
    } catch (err: any) {
      toast({
        title: 'Resolution Failed',
        description: err.message || 'Could not resolve market',
        variant: 'destructive',
      });
    } finally {
      setResolvingId(null);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      const createdTitle = title.trim();
      await createMarket({
        title: createdTitle,
        category,
        description: description.trim() || undefined,
        creator: 'Sidebet Admin Oracle',
      });
      toast({
        title: 'Market Created',
        description: 'New prediction market published to live orderbooks.',
      });
      pushNotification({
        title: 'New Prediction Market',
        message: createdTitle,
        type: 'market',
        href: '/',
      });
      setTitle('');
      setDescription('');
      setShowCreate(false);
      await loadData();
    } catch (err: any) {
      toast({
        title: 'Creation Failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-[#121820] text-slate-300 hover:text-white"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#FACC15] font-bold">
                ORACLE CONSOLE
              </span>
              <span className="rounded-full bg-[#FACC15]/20 border border-[#FACC15]/30 px-2 py-0.5 text-[9px] font-mono font-bold text-[#FACC15]">
                ADMIN
              </span>
            </div>
            <h1 className="text-2xl font-extrabold font-display text-white">Market Settlement & Creation</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-[#121820] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white"
          >
            <RotateCcw size={14} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] px-4 py-2 text-xs font-bold text-black shadow-md shadow-[#22C55E]/20"
          >
            <Plus size={14} />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {/* Global Metrics Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-white/5 bg-[#0E1318] p-4">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Open Markets</span>
            <span className="text-2xl font-bold font-mono text-[#4ADE80]">{stats.openMarkets}</span>
          </div>
          <div className="rounded-2xl border border-white/5 bg-[#0E1318] p-4">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Resolved Markets</span>
            <span className="text-2xl font-bold font-mono text-[#FACC15]">{stats.resolvedMarkets}</span>
          </div>
          <div className="rounded-2xl border border-white/5 bg-[#0E1318] p-4">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Orders</span>
            <span className="text-2xl font-bold font-mono text-white">{stats.totalPositions}</span>
          </div>
          <div className="rounded-2xl border border-white/5 bg-[#0E1318] p-4">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Staked</span>
            <span className="text-2xl font-bold font-mono text-white">{stats.totalVolume.toLocaleString()} SOL</span>
          </div>
        </div>
      )}

      {/* Create New Market Drawer */}
      {showCreate && (
        <div className="rounded-3xl border border-white/10 bg-[#121820] p-5 shadow-2xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus size={16} className="text-[#4ADE80]" />
            <span>Deploy New Prediction Contract</span>
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400">Title / Question</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Will Bitcoin reach $120,000 before December 2026?"
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#080C0F] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#4ADE80]"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Resolution Description & Rules</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Resolves YES if spot BTC/USD trades at or above $120,000 on major exchanges."
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#080C0F] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#4ADE80]"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#080C0F] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#4ADE80]"
              >
                <option>Politics</option>
                <option>Nigerian Politics</option>
                <option>Crypto</option>
                <option>Sports</option>
                <option>Finance</option>
                <option>Lifestyle</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="rounded-xl bg-[#22C55E] px-5 py-2 text-xs font-bold text-black"
            >
              Deploy Market
            </button>
          </div>
        </div>
      )}

      {/* Markets List for Settlement */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Scale size={16} className="text-[#4ADE80]" />
          <span>Active Prediction Events</span>
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-[#4ADE80]" />
            <span>Loading markets from backend...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {markets.map((m) => {
              const isResolved = m.status === 'resolved';

              return (
                <div
                  key={m.id}
                  className={`rounded-3xl border p-4 transition-all ${
                    isResolved
                      ? 'border-white/5 bg-[#0E1318]/60 opacity-80'
                      : 'border-white/[0.08] bg-[#0E1318]'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-mono text-slate-300">
                          {m.category}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-bold ${
                            isResolved
                              ? 'bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/40'
                              : 'bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30'
                          }`}
                        >
                          {isResolved ? `RESOLVED: ${m.resolution}` : 'OPEN FOR TRADING'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{m.title}</h3>
                      <p className="text-xs text-slate-400 font-mono">
                        Volume: {m.volume.toLocaleString()} SOL · Liquidity: {m.liquidity} SOL
                      </p>
                    </div>

                    {/* Settlement Controls */}
                    <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                      {isResolved ? (
                        <div className="text-xs font-mono text-slate-400 bg-[#121820] px-3 py-1.5 rounded-xl border border-white/5">
                          Settled as <strong className="text-[#FACC15]">{m.resolution}</strong>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={resolvingId === m.id}
                            onClick={() => handleResolve(m.id, 'YES')}
                            className="rounded-xl bg-[#22C55E] hover:bg-[#16A34A] px-4 py-2 text-xs font-bold text-black shadow-sm transition-all"
                          >
                            {resolvingId === m.id ? 'Settling...' : 'Resolve YES'}
                          </button>
                          <button
                            type="button"
                            disabled={resolvingId === m.id}
                            onClick={() => handleResolve(m.id, 'NO')}
                            className="rounded-xl bg-[#EC4899] hover:bg-[#DB2777] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all"
                          >
                            {resolvingId === m.id ? 'Settling...' : 'Resolve NO'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
