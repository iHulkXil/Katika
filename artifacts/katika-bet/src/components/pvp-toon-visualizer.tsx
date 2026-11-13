import { useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  CheckCircle2,
  Eye,
  Gamepad2,
  Lock,
  Maximize2,
  Play,
  RotateCcw,
  Sparkles,
  Swords,
  X,
} from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';
import { pushNotification } from '@/lib/notifications';

export type PvpGameId = 'pool' | 'wheel';

interface PvpGameShowcase {
  id: PvpGameId;
  title: string;
  modeLabel: string;
  payoutLabel: string;
  description: string;
  chains: string;
  href: string;
  accent: string;
  toonImage: string;
  peekCaption: string;
  controlsHint: string;
}

const PVP_GAMES: PvpGameShowcase[] = [
  {
    id: 'pool',
    title: '8-Ball Pool',
    modeLabel: '1v1 Billiards',
    payoutLabel: '96% Pot Payout',
    description: 'Aim cue spin, clear solids or stripes, and sink the 8-ball cleanly.',
    chains: 'SOL · ETH · BTC · USDT',
    href: '/games/pool',
    accent: '#22C55E',
    toonImage: '/assets/images/toon_pool_arena_1794558431122.jpg',
    peekCaption: 'Cue power shot banking the 8-ball into top-right pocket',
    controlsHint: 'Drag cue to aim · Release to strike',
  },
  {
    id: 'wheel',
    title: 'Wheel of Fortune',
    modeLabel: '3-Min Pot Cycle',
    payoutLabel: 'Winner Takes Pot',
    description: 'Your dollar stake locks proportional wheel slices every 3 minutes.',
    chains: 'SOL · ETH · BTC · USDT',
    href: '/games/wheel',
    accent: '#FACC15',
    toonImage: '/assets/images/toon_pot_wheel_1794558431894.jpg',
    peekCaption: 'Live weighted slice spin settling the 3-minute community pot',
    controlsHint: 'Stake share = Slice size · Auto-spin every 3m',
  },
];

const UPCOMING_PVP_GAMES = [
  {
    id: 'holdem-duel',
    title: "Heads-Up Hold'em",
    eta: 'Next Drop',
    summary: 'Rapid 2-player stylized comic poker table with multi-chain blind escrow.',
    accent: '#22C55E',
  },
  {
    id: 'blitz-chess',
    title: 'Blitz Chess 3+0',
    eta: 'In Staging',
    summary: 'Three-minute tactical matches with expressive toon chess pieces.',
    accent: '#FACC15',
  },
  {
    id: 'crash-race',
    title: 'Rocket Cashout Duel',
    eta: 'Q4 Drop',
    summary: 'Head-to-head multiplier chicken race where nerves win the pot.',
    accent: '#EC4899',
  },
];

function PoolToonPeek({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      viewBox="0 0 320 180"
      className="h-full w-full select-none"
      role="img"
      aria-label="Animated stylized toon preview of 8-Ball Pool"
    >
      <defs>
        <linearGradient id="poolTableWood" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6B3F21" />
          <stop offset="100%" stopColor="#3B2110" />
        </linearGradient>
        <linearGradient id="poolFelt" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#16A34A" />
          <stop offset="100%" stopColor="#0E6B33" />
        </linearGradient>
      </defs>

      {/* Comic arcade backdrop */}
      <rect width="320" height="180" fill="#0B1310" />
      {/* Table frame */}
      <rect x="20" y="18" width="280" height="144" rx="18" fill="url(#poolTableWood)" stroke="#070B0E" strokeWidth="4" />
      {/* Inner felt */}
      <rect x="34" y="32" width="252" height="116" rx="10" fill="url(#poolFelt)" stroke="#070B0E" strokeWidth="3" />

      {/* Dashed aim guide line */}
      <line x1="104" y1="92" x2="212" y2="88" stroke="#FACC15" strokeWidth="2" strokeDasharray="5 5" opacity="0.55" />
      <line x1="212" y1="88" x2="278" y2="38" stroke="#4ADE80" strokeWidth="2" strokeDasharray="4 4" opacity="0.55" />

      {/* 6 Corner & Side Pockets */}
      {[
        [38, 36],
        [160, 32],
        [282, 36],
        [38, 144],
        [160, 148],
        [282, 144],
      ].map(([cx, cy], idx) => (
        <circle key={idx} cx={cx} cy={cy} r="10" fill="#070B0E" stroke="#FACC15" strokeWidth="2" />
      ))}

      {/* Stylized Toon Cue Stick */}
      <g className="animate-toon-cue">
        <rect x="14" y="89" width="76" height="6" rx="3" fill="#FDE68A" stroke="#070B0E" strokeWidth="2" />
        <rect x="14" y="89" width="22" height="6" rx="2" fill="#22C55E" stroke="#070B0E" strokeWidth="2" />
        <rect x="86" y="89" width="5" height="6" rx="1" fill="#38BDF8" stroke="#070B0E" strokeWidth="1.5" />
      </g>

      {/* Cue Ball */}
      <g className="animate-toon-cueball">
        <circle cx="110" cy="92" r="10" fill="#FFFFFF" stroke="#070B0E" strokeWidth="2.5" />
        <circle cx="107" cy="89" r="2.5" fill="#E2E8F0" />
      </g>

      {/* 8-Ball */}
      <g className="animate-toon-eight">
        <circle cx="212" cy="84" r="10.5" fill="#111827" stroke="#070B0E" strokeWidth="2.5" />
        <circle cx="212" cy="84" r="4.5" fill="#FFFFFF" />
        <text x="212" y="86.8" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#070B0E">
          8
        </text>
      </g>

      {/* Stripe Ball */}
      <g className="animate-toon-stripe">
        <circle cx="222" cy="106" r="9.5" fill="#FFFFFF" stroke="#070B0E" strokeWidth="2.5" />
        <rect x="213.5" y="102" width="17" height="8" rx="3" fill="#EC4899" />
      </g>

      {/* Gold Solid Ball */}
      <circle cx="195" cy="108" r="9" fill="#FACC15" stroke="#070B0E" strokeWidth="2.5" />

      {/* Comic Burst Callout */}
      <g className="animate-toon-callout">
        <polygon
          points="244,50 253,42 260,51 271,48 267,59 276,65 264,68 263,79 254,70 243,75 247,64 237,59"
          fill="#FACC15"
          stroke="#070B0E"
          strokeWidth="2"
        />
        <text x="256" y="64" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#070B0E">
          SUNK!
        </text>
      </g>

      {!compact && (
        <g>
          <rect x="28" y="146" width="102" height="22" rx="6" fill="#070B0E" opacity="0.86" stroke="#22C55E" strokeWidth="1.5" />
          <text x="79" y="160" textAnchor="middle" fontSize="9" fontWeight="700" fill="#4ADE80" fontFamily="monospace">
            LIVE SHOT PEEK
          </text>
        </g>
      )}
    </svg>
  );
}

function WheelToonPeek({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      viewBox="0 0 320 180"
      className="h-full w-full select-none"
      role="img"
      aria-label="Animated stylized toon preview of Wheel of Fortune"
    >
      <rect width="320" height="180" fill="#0A1016" />

      {/* Toon Game-Show Stage Beams */}
      <polygon points="40,0 120,0 165,180 0,180" fill="#22C55E" opacity="0.06" />
      <polygon points="200,0 280,0 320,180 155,180" fill="#FACC15" opacity="0.06" />

      {/* Rotating Comic Wheel */}
      <g transform="translate(70, 0)">
        <g className="animate-toon-wheel">
          <circle cx="90" cy="90" r="72" fill="#0F172A" stroke="#070B0E" strokeWidth="5" />
          {/* 4 Stylized Toon Slices */}
          <path d="M90,90 L90,22 A68,68 0 0,1 158,90 Z" fill="#22C55E" stroke="#070B0E" strokeWidth="3" />
          <path d="M90,90 L158,90 A68,68 0 0,1 90,158 Z" fill="#FACC15" stroke="#070B0E" strokeWidth="3" />
          <path d="M90,90 L90,158 A68,68 0 0,1 22,90 Z" fill="#EC4899" stroke="#070B0E" strokeWidth="3" />
          <path d="M90,90 L22,90 A68,68 0 0,1 90,22 Z" fill="#38BDF8" stroke="#070B0E" strokeWidth="3" />

          {/* Slice Labels */}
          <text x="122" y="64" textAnchor="middle" fontSize="10" fontWeight="900" fill="#070B0E">
            38%
          </text>
          <text x="122" y="122" textAnchor="middle" fontSize="10" fontWeight="900" fill="#070B0E">
            27%
          </text>
          <text x="58" y="122" textAnchor="middle" fontSize="10" fontWeight="900" fill="#FFFFFF">
            20%
          </text>
          <text x="58" y="64" textAnchor="middle" fontSize="10" fontWeight="900" fill="#070B0E">
            15%
          </text>

          {/* Outer Peg Dots */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <circle
                key={deg}
                cx={90 + Math.cos(rad) * 65}
                cy={90 + Math.sin(rad) * 65}
                r="4"
                fill="#FFFFFF"
                stroke="#070B0E"
                strokeWidth="2"
              />
            );
          })}

          {/* Center Star Hub */}
          <circle cx="90" cy="90" r="18" fill="#111827" stroke="#FACC15" strokeWidth="3" />
          <circle cx="90" cy="90" r="8" fill="#FACC15" />
        </g>

        {/* Top Pointer Ticker */}
        <g className="animate-toon-pointer">
          <polygon points="90,28 80,8 100,8" fill="#FACC15" stroke="#070B0E" strokeWidth="2.5" />
        </g>
      </g>

      {/* Right Pot Readout Panel */}
      <g>
        <rect x="242" y="22" width="66" height="44" rx="10" fill="#121820" stroke="#FACC15" strokeWidth="2" />
        <text x="275" y="40" textAnchor="middle" fontSize="8" fontWeight="700" fill="#94A3B8" fontFamily="monospace">
          POT POOL
        </text>
        <text x="275" y="57" textAnchor="middle" fontSize="12" fontWeight="900" fill="#FACC15" fontFamily="monospace">
          $412
        </text>
      </g>

      {!compact && (
        <g>
          <rect x="14" y="146" width="112" height="22" rx="6" fill="#070B0E" opacity="0.88" stroke="#FACC15" strokeWidth="1.5" />
          <text x="70" y="160" textAnchor="middle" fontSize="9" fontWeight="700" fill="#FACC15" fontFamily="monospace">
            3-MIN SPIN PEEK
          </text>
        </g>
      )}
    </svg>
  );
}

function LiveToonScene({ gameId, compact = false }: { gameId: PvpGameId; compact?: boolean }) {
  if (gameId === 'pool') return <PoolToonPeek compact={compact} />;
  return <WheelToonPeek compact={compact} />;
}

export function PvpSideRail() {
  const { authenticated, user, login } = usePrivy();
  const { toast } = useToast();
  const [peekingGameId, setPeekingGameId] = useState<PvpGameId | null>('pool');
  const [modalGame, setModalGame] = useState<PvpGameShowcase | null>(null);
  const [replayNonce, setReplayNonce] = useState(0);
  const [waitlisted, setWaitlisted] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sidebet_pvp_waitlist');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const requireAuthClick = (e: React.MouseEvent, onSuccess?: () => void) => {
    if (!authenticated) {
      e.preventDefault();
      void login();
      return;
    }
    onSuccess?.();
  };

  const handleToggleNotify = (id: string, title: string) => {
    if (!authenticated) {
      void login();
      return;
    }
    const next = { ...waitlisted, [id]: !waitlisted[id] };
    setWaitlisted(next);
    localStorage.setItem('sidebet_pvp_waitlist', JSON.stringify(next));

    if (next[id]) {
      toast({
        title: 'PvP Drop Alert Set',
        description: `We will ping you when ${title} opens.`,
      });
      pushNotification({
        id: `pvp-waitlist-${id}`,
        title: 'Upcoming PvP Alert',
        message: `You will be notified when ${title} goes live.`,
        type: 'system',
        href: '/pvp',
        userId: user?.id,
      });
    } else {
      toast({
        title: 'Alert Cleared',
        description: `Removed alert for ${title}.`,
      });
    }
  };

  return (
    <aside className="space-y-4">
      {/* Side Rail Header */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318]/95 p-5 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-3.5">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#F472B6]">
              <Swords size={13} />
              <span>PvP Arena · Multi-Chain</span>
            </div>
            <h2 className="mt-1 text-lg font-extrabold font-display text-white">
              Rich PvP Games
            </h2>
          </div>

          <Link
            href={authenticated ? '/pvp' : '/'}
            onClick={(e) => requireAuthClick(e)}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#4ADE80] hover:underline whitespace-nowrap shrink-0"
          >
            <span>Open Lobby</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Tap <strong className="text-white">Peek Live</strong> on any card for a stylized toon gameplay preview before staking SOL, ETH, BTC, or USDT.
        </p>

        {/* Active Rich Game Cards with Stylized Toon Art + Live Short-Peek Visualizer */}
        <div className="space-y-4">
          {PVP_GAMES.map((game) => {
            const isPeeking = peekingGameId === game.id;

            return (
              <div
                key={game.id}
                className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080C0F]/90 transition-colors hover:border-white/20"
              >
                {/* 16:9 Media Stage: Stylized Toon Art OR Live Animated Toon Peek */}
                <div className="relative aspect-video w-full overflow-hidden bg-[#0D1318]">
                  {isPeeking ? (
                    <div key={`${game.id}-${replayNonce}`} className="h-full w-full">
                      <LiveToonScene gameId={game.id} />
                    </div>
                  ) : (
                    <img
                      src={game.toonImage}
                      alt={`${game.title} stylized toon illustration`}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                    />
                  )}

                  {/* Measured Bottom Scrim */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#080C0F] via-[#080C0F]/60 to-transparent" />

                  {/* Top-Right Visualizer Mode Controls */}
                  <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPeekingGameId(isPeeking ? null : game.id)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all backdrop-blur-md whitespace-nowrap shrink-0 ${
                        isPeeking
                          ? 'bg-[#22C55E] text-black shadow-md'
                          : 'bg-[#080C0F]/80 text-white border border-white/15 hover:border-[#22C55E]/60'
                      }`}
                    >
                      <Eye size={12} />
                      <span>{isPeeking ? 'Toon Art' : 'Peek Live'}</span>
                    </button>

                    <button
                      type="button"
                      title={`Expand ${game.title} visualizer`}
                      onClick={() => setModalGame(game)}
                      className="grid h-7 w-7 place-items-center rounded-lg border border-white/15 bg-[#080C0F]/80 text-slate-200 hover:text-white hover:border-white/35 backdrop-blur-md transition-colors"
                    >
                      <Maximize2 size={12} />
                    </button>
                  </div>

                  {/* Bottom Title Overlay */}
                  <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] font-mono text-slate-300 block truncate">
                        {game.modeLabel} · {game.payoutLabel}
                      </span>
                      <h3 className="text-sm font-bold text-white truncate">{game.title}</h3>
                    </div>
                  </div>
                </div>

                {/* Card Footer Info & Action Row */}
                <div className="p-3.5 space-y-3">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isPeeking ? game.peekCaption : game.description}
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
                    <span className="text-[11px] font-mono text-slate-500 truncate">
                      {game.chains}
                    </span>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setModalGame(game)}
                        className="rounded-lg border border-white/10 bg-[#121820] hover:border-white/25 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors whitespace-nowrap shrink-0"
                      >
                        Peek
                      </button>
                      <Link
                        href={authenticated ? game.href : '/'}
                        onClick={(e) => requireAuthClick(e)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] px-3 py-1.5 text-[11px] font-bold text-black transition-colors whitespace-nowrap shrink-0"
                      >
                        <Play size={11} />
                        <span>Play</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Promising More Games Section */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#080C0F]/90 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#FACC15]" />
              <h3 className="text-xs font-bold text-white">More PvP Games Coming</h3>
            </div>
            <span className="text-[11px] font-mono text-[#FACC15]">Roadmap</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            New stylized toon arenas launch monthly. Subscribe for early table access.
          </p>

          <div className="space-y-2">
            {UPCOMING_PVP_GAMES.map((upcoming) => {
              const isAlertOn = Boolean(waitlisted[upcoming.id]);
              return (
                <div
                  key={upcoming.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#0E1318] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white truncate">
                      <Lock size={11} className="text-slate-400 shrink-0" />
                      <span className="truncate">{upcoming.title}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 block">
                      {upcoming.eta}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleNotify(upcoming.id, upcoming.title)}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      isAlertOn
                        ? 'border-[#22C55E]/50 bg-[#121B16] text-[#4ADE80]'
                        : 'border-white/10 bg-[#121820] text-slate-300 hover:text-white'
                    }`}
                  >
                    {isAlertOn ? <CheckCircle2 size={11} /> : <BellRing size={11} />}
                    <span>{isAlertOn ? 'Notified' : 'Notify'}</span>
                  </button>
                </div>
              );
            })}
          </div>

          <Link
            href={authenticated ? '/pvp' : '/'}
            onClick={(e) => requireAuthClick(e)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[#121820] hover:border-[#EC4899]/50 py-2.5 text-xs font-bold text-[#F472B6] transition-colors"
          >
            <Gamepad2 size={14} />
            <span>Explore Full PvP Floor</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Expanded Stylized Toon Short-Peek Modal */}
      {modalGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/[0.12] bg-[#0D1217] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <div>
                <span className="text-[11px] font-mono text-[#4ADE80]">
                  Stylized Toon Game Peek · {modalGame.modeLabel}
                </span>
                <h3 className="text-lg font-extrabold font-display text-white">
                  {modalGame.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setModalGame(null)}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
              {/* Left: Stylized Toon Key Art */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-slate-400 block">
                  Stylized Toon Arena Art
                </span>
                <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[#080C0F]">
                  <img
                    src={modalGame.toonImage}
                    alt={`${modalGame.title} toon art`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              {/* Right: Live Animated Gameplay Short Peek */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#FACC15]">
                    Animated Action Peek
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplayNonce((n) => n + 1)}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-300 hover:text-white"
                  >
                    <RotateCcw size={11} />
                    <span>Replay</span>
                  </button>
                </div>
                <div
                  key={`modal-${modalGame.id}-${replayNonce}`}
                  className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[#080C0F]"
                >
                  <LiveToonScene gameId={modalGame.id} compact />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/[0.06] bg-[#080C0F]/80 px-6 py-4">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-white">{modalGame.peekCaption}</p>
                <p className="text-[11px] font-mono text-slate-400">
                  {modalGame.controlsHint} · {modalGame.payoutLabel}
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalGame(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Close
                </button>
                <Link
                  href={authenticated ? modalGame.href : '/'}
                  onClick={(e) => requireAuthClick(e, () => setModalGame(null))}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] px-5 py-2 text-xs font-bold text-black shadow-lg shadow-[#22C55E]/25 whitespace-nowrap shrink-0"
                >
                  <Play size={13} />
                  <span>Play {modalGame.title}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
