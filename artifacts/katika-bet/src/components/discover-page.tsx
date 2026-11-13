import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  CheckCircle2,
  Flame,
  Gamepad2,
  Landmark,
  LineChart,
  Lock,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import { fetchMarkets, fetchStats, calcOdds, type Market, type PlatformStats } from '@/lib/markets-api';
import { useToast } from '@/hooks/use-toast';
import { pushNotification } from '@/lib/notifications';

const COMING_SOON_FEATURES = [
  {
    id: 'copy-vaults',
    title: 'Creator Copy-Trading Vaults',
    eta: 'Q4 Release',
    description:
      'Automatically mirror stakes from verified top-ranking predictors with configurable stop-loss and per-trade caps.',
    highlights: ['Verified PnL history', 'Instant withdrawal liquidity'],
    icon: Users,
    accent: '#22C55E',
  },
  {
    id: 'live-micro',
    title: 'In-Play Sports Micro-Markets',
    eta: 'Next Release',
    description:
      'Second-by-second live football and basketball contracts settled on play outcomes, corners, and next-goal windows.',
    highlights: ['Sub-second odds feeds', 'Automated fixture settlement'],
    icon: Trophy,
    accent: '#FACC15',
  },
  {
    id: 'private-arenas',
    title: 'Private Group Arenas & Brackets',
    eta: 'In Beta',
    description:
      'Launch invite-only prediction pools and multi-round PvP brackets for friends or communities with custom escrow splits.',
    highlights: ['Passworded room links', 'Multi-chain pot payouts'],
    icon: Lock,
    accent: '#EC4899',
  },
];

export function DiscoverPage() {
  const { toast } = useToast();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [waitlisted, setWaitlisted] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sidebet_feature_waitlist');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    void fetchMarkets().then(setMarkets);
    void fetchStats().then(setStats);
  }, []);

  const featuredMarkets = markets.slice(0, 3);

  const handleToggleNotify = (id: string, title: string) => {
    const next = { ...waitlisted, [id]: !waitlisted[id] };
    setWaitlisted(next);
    localStorage.setItem('sidebet_feature_waitlist', JSON.stringify(next));

    if (next[id]) {
      toast({
        title: 'Early Access Enabled',
        description: `You will be notified when ${title} goes live.`,
      });
      pushNotification({
        id: `waitlist-${id}`,
        title: 'Waitlist Joined',
        message: `You will receive an alert when ${title} launches.`,
        type: 'system',
        href: '/',
      });
    } else {
      toast({
        title: 'Alert Removed',
        description: `Removed reminder for ${title}.`,
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 lg:p-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0E1318] p-6 lg:p-10 shadow-2xl">
        <div
          className="pointer-events-none absolute -top-28 -left-24 h-72 w-72 rounded-full blur-[110px] opacity-25"
          style={{ background: '#22c55e' }}
        />
        <div
          className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full blur-[120px] opacity-20"
          style={{ background: '#ec4899' }}
        />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-mono text-[#4ade80]">
              Discover · Prediction Markets & Multi-Chain PvP
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight font-display text-white lg:text-5xl text-balance">
              Trade real outcomes or compete head-to-head.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
              Explore live prediction contracts across Politics, Nigerian Politics, Crypto, Sports, Finance, and Lifestyle—or step straight into the PvP wagering floor.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/markets"
                className="inline-flex items-center gap-2 rounded-full bg-[#22c55e] hover:bg-[#16a34a] px-6 py-3 text-xs font-bold text-black shadow-[0_0_24px_rgba(34,197,94,0.3)] transition-transform hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                <Flame size={15} />
                <span>Explore Markets</span>
                <ArrowRight size={14} />
              </Link>

              <Link
                href="/pvp"
                className="inline-flex items-center gap-2 rounded-full border border-[#ec4899]/40 bg-[#1B1018] hover:bg-[#261421] px-6 py-3 text-xs font-bold text-[#f472b6] transition-all hover:border-[#ec4899] whitespace-nowrap shrink-0"
              >
                <Swords size={15} />
                <span>Enter PvP Arena</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-auto shrink-0">
            <div className="rounded-2xl border border-white/[0.06] bg-[#080C0F] px-4 py-3">
              <span className="text-[11px] font-mono text-slate-400 block">Open Markets</span>
              <span className="mt-1 text-xl font-bold font-mono text-white tabular-nums">
                {stats?.openMarkets ?? 13}
              </span>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#080C0F] px-4 py-3">
              <span className="text-[11px] font-mono text-slate-400 block">Market Volume</span>
              <span className="mt-1 text-xl font-bold font-mono text-[#4ade80] tabular-nums">
                {stats ? `${(stats.totalVolume / 1000).toFixed(0)}K` : '2.2M'} SOL
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-2xl border border-white/[0.06] bg-[#080C0F] px-4 py-3">
              <span className="text-[11px] font-mono text-slate-400 block">PvP Tables</span>
              <span className="mt-1 text-xl font-bold font-mono text-[#f472b6] tabular-nums">
                3 Live
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Destinations: Markets & PvP Arena */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        {/* Markets Destination Card */}
        <div className="flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#0E1318] p-6 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#4ade80]">
                  <LineChart size={20} />
                </div>
                <div>
                  <span className="text-xs font-mono text-slate-400">Prediction Exchange</span>
                  <h2 className="text-xl font-extrabold font-display text-white">Live Markets</h2>
                </div>
              </div>

              <Link
                href="/markets"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#4ade80] hover:underline whitespace-nowrap shrink-0"
              >
                <span>View all</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Browse YES/NO contracts across Global Politics, Nigerian Politics, Crypto, Sports, Finance, and Lifestyle celebrity trends.
            </p>

            {/* Quick Category Links inside Markets */}
            <div className="flex flex-wrap gap-2">
              {['Politics', 'Nigerian Politics', 'Crypto', 'Sports', 'Finance', 'Lifestyle'].map((cat) => (
                <Link
                  key={cat}
                  href={`/markets?category=${encodeURIComponent(cat)}`}
                  className="rounded-xl border border-white/[0.08] bg-[#121820] hover:border-[#22c55e]/40 hover:text-[#4ade80] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors whitespace-nowrap shrink-0"
                >
                  {cat}
                </Link>
              ))}
            </div>

            {/* Live Market Preview Rows */}
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              {featuredMarkets.map((m) => {
                const { yesPct } = calcOdds(m.yesShares, m.noShares);
                return (
                  <Link
                    key={m.id}
                    href={`/markets?category=${encodeURIComponent(m.category)}`}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-[#080C0F] px-3.5 py-2.5 hover:bg-[#121820] transition-colors"
                  >
                    <div className="min-w-0">
                      <span className="text-[11px] font-mono text-slate-500 block">
                        {m.category} · Vol {m.volume.toLocaleString()} SOL
                      </span>
                      <span className="text-xs font-semibold text-white truncate block">
                        {m.title}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#4ade80] tabular-nums shrink-0">
                      {yesPct}% YES
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="pt-5">
            <Link
              href="/markets"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] py-3 text-xs font-bold text-black shadow-lg shadow-[#22c55e]/20 transition-all"
            >
              <Landmark size={15} />
              <span>Open Markets Hub</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* PvP Arena Destination Card */}
        <div className="flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#0E1318] p-6 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#ec4899]/15 border border-[#ec4899]/30 text-[#f472b6]">
                  <Gamepad2 size={20} />
                </div>
                <div>
                  <span className="text-xs font-mono text-slate-400">Skill & Pot Games</span>
                  <h2 className="text-xl font-extrabold font-display text-white">PvP Arena</h2>
                </div>
              </div>

              <Link
                href="/pvp"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#f472b6] hover:underline whitespace-nowrap shrink-0"
              >
                <span>Open Lobby</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Stake SOL, ETH, BTC, or USDT in dollar equivalents across real-time 1v1 skill tables and 3-minute shared pot spins.
            </p>

            {/* 3 Active PvP Games */}
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <Link
                href="/games/pool"
                className="flex items-center justify-between gap-3 rounded-2xl bg-[#080C0F] px-3.5 py-3 hover:bg-[#121820] transition-colors"
              >
                <div>
                  <span className="text-xs font-bold text-white block">8-Ball Pool Match</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    1v1 Billiards · 96% Winner Payout
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-[#4ade80] shrink-0">Play</span>
              </Link>

              <Link
                href="/games/wheel"
                className="flex items-center justify-between gap-3 rounded-2xl bg-[#080C0F] px-3.5 py-3 hover:bg-[#121820] transition-colors"
              >
                <div>
                  <span className="text-xs font-bold text-white block">Wheel of the Pot</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    3-Minute Cycle · Stake Share = Win Odds
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-[#facc15] shrink-0">Spin</span>
              </Link>

              <Link
                href="/games/ludo"
                className="flex items-center justify-between gap-3 rounded-2xl bg-[#080C0F] px-3.5 py-3 hover:bg-[#121820] transition-colors"
              >
                <div>
                  <span className="text-xs font-bold text-white block">Ludo Quick</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Fast Board Duel · Multi-Chain Stakes
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-[#f472b6] shrink-0">Enter</span>
              </Link>
            </div>
          </div>

          <div className="pt-5">
            <Link
              href="/pvp"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#ec4899]/40 bg-[#1B1018] hover:bg-[#271522] py-3 text-xs font-bold text-[#f472b6] transition-all"
            >
              <Swords size={15} />
              <span>Go to PvP Arena</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Link Strip to Wallet & Portfolio */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#121820] border border-white/10 text-[#4ade80]">
            <Wallet size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Unified Wallet & Portfolio</h3>
            <p className="text-xs text-slate-400">
              Manage deposits, withdrawals, active contract stakes, and settled winnings from one ledger.
            </p>
          </div>
        </div>
        <Link
          href="/wallet"
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-[#121820] hover:border-[#22c55e]/50 px-4 py-2.5 text-xs font-bold text-white transition-colors whitespace-nowrap shrink-0"
        >
          <span>Open Wallet & Portfolio</span>
          <ArrowRight size={14} />
        </Link>
      </section>

      {/* Coming Soon Features Teaser Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <p className="text-xs font-mono text-[#facc15] flex items-center gap-1.5">
              <Sparkles size={13} />
              <span>Roadmap Preview</span>
            </p>
            <h2 className="text-xl font-extrabold font-display text-white mt-0.5">
              Coming Soon to SIDEBET
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Upcoming releases currently in final staging. Subscribe to get notified on launch.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COMING_SOON_FEATURES.map((feat) => {
            const Icon = feat.icon;
            const isSubscribed = Boolean(waitlisted[feat.id]);

            return (
              <div
                key={feat.id}
                className="flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className="grid h-10 w-10 place-items-center rounded-2xl"
                      style={{
                        background: `${feat.accent}18`,
                        border: `1px solid ${feat.accent}40`,
                        color: feat.accent,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{feat.eta}</span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{feat.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{feat.description}</p>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 pt-1">
                    <span>{feat.highlights[0]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{feat.highlights[1]}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleNotify(feat.id, feat.title)}
                  className={`flex w-full items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-xs font-semibold transition-all ${
                    isSubscribed
                      ? 'border-[#22c55e]/50 bg-[#121B16] text-[#4ade80]'
                      : 'border-white/10 bg-[#121820] text-slate-200 hover:border-white/25'
                  }`}
                >
                  {isSubscribed ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Alert Enabled</span>
                    </>
                  ) : (
                    <>
                      <BellRing size={14} />
                      <span>Notify Me on Launch</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
