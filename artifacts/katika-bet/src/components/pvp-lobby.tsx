import { Link } from 'wouter';
import {
  ArrowRight,
  Gamepad2,
  ShieldCheck,
  Swords,
  Zap,
} from 'lucide-react';

const PVP_GAMES = [
  {
    id: 'pool',
    href: '/games/pool',
    emoji: '🎱',
    badge: '1V1 SKILL',
    subtitle: 'Real-Time Table',
    title: '8-Ball Pool',
    description:
      'Classic billiards physics. Aim cue spin, sink solids or stripes, and pocket the 8-ball. Choose PvP Stake or Free Practice inside.',
    accent: '#22C55E',
    features: ['Select Stake Inside ($5–$100+)', 'Free Practice Available', 'Auto Payout on Win'],
    ctaLabel: 'Open 8-Ball Pool',
  },
  {
    id: 'wheel',
    href: '/games/wheel',
    emoji: '🎡',
    badge: '3-MIN CYCLE',
    subtitle: 'Pot Share Pool',
    title: 'Wheel of Fortune',
    description:
      'Enter any stake inside the arena to claim a weighted slice of the wheel. Auto-spins every 3 minutes and settles winner instantly.',
    accent: '#FACC15',
    features: ['SOL · ETH · BTC · USDT', 'Custom Stake Inside', 'Instant 3-Min Auto Settle'],
    ctaLabel: 'Enter Wheel of Fortune',
  },
  {
    id: 'penalty',
    href: '/games/penalty',
    emoji: '⚽',
    badge: '3D SHOOTOUT',
    subtitle: '5 Kicks + Sudden Death',
    title: 'Penalty Shootout',
    description:
      'Cartoon 3D penalty arena with rigged footballers. Play 5-kick Sudden Death vs AI, Local 2-Player, or Arcade Levels inside.',
    accent: '#38BDF8',
    features: ['5 Kicks + Sudden Death', 'Local 2-Player Mode', 'Mobile Touch & Auto Settle'],
    ctaLabel: 'Enter Penalty Arena',
  },
] as const;

export function PvPLobby() {
  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0E1318] p-6 lg:p-8 shadow-2xl">
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full blur-[100px] opacity-25"
          style={{ background: '#22C55E' }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full blur-[120px] opacity-20"
          style={{ background: '#EC4899' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-[#121B16] px-3 py-1 text-[11px] font-mono font-bold text-[#4ADE80] mb-2">
              <Swords size={12} className="text-[#22C55E]" />
              <span>PVP ARENA · AUTOMATIC SETTLEMENT</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight font-display text-white">
              Choose a PvP Game
            </h1>
            <p className="mt-1 text-xs text-slate-300 max-w-xl">
              Pick a game below to enter. Select your stake amount, currency, and mode inside each game—winners are settled automatically when the match finishes.
            </p>
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl border border-[#22C55E]/25 bg-[#121B16] px-4 py-2.5 shrink-0">
            <Zap size={16} className="text-[#4ADE80]" />
            <div className="text-left font-mono text-xs">
              <span className="text-white font-bold block">Auto-Settled PvP</span>
              <span className="text-[#4ADE80] text-[10px]">96% Pot Paid Instantly</span>
            </div>
          </div>
        </div>
      </div>

      {/* Games Grid Only */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Gamepad2 size={16} className="text-[#4ADE80]" />
            <span>Live PvP Games</span>
          </h2>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
            <ShieldCheck size={13} className="text-[#4ADE80]" />
            Instant Automated Settlement
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PVP_GAMES.map((game) => (
            <Link
              key={game.id}
              href={game.href}
              className="group rounded-3xl border border-white/[0.08] bg-[#0E1318] hover:border-[#22C55E]/60 hover:bg-[#121820] p-6 transition-all duration-200 flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold"
                    style={{
                      background: `${game.accent}20`,
                      color: game.accent,
                      border: `1px solid ${game.accent}40`,
                    }}
                  >
                    {game.badge}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{game.subtitle}</span>
                </div>

                <div className="flex items-start gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#080C0F] border border-white/10 text-3xl shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    {game.emoji}
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold font-display text-white group-hover:text-[#4ADE80] transition-colors">
                      {game.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                      {game.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {game.features.map((feat) => (
                    <span
                      key={feat}
                      className="rounded-xl border border-white/5 bg-[#080C0F] px-2.5 py-1 text-[10px] font-mono text-slate-300"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
                  Configure stake inside game
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#22C55E] group-hover:bg-[#16A34A] px-4 py-2 text-xs font-black text-black shadow-md shadow-[#22C55E]/20 transition-all">
                  <span>{game.ctaLabel}</span>
                  <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
