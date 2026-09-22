import { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  ZoomIn,
  Eye,
  CheckCircle2,
  Award,
  Star,
  Flame,
} from 'lucide-react';
import type { LegendCardData } from './legend-card';
import {
  ARCHETYPES,
  type AthleteArchetype,
  kit,
} from './legend-avatar';

interface FUTInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  legend: LegendCardData | null;
}

export function PS5InspectModal({ isOpen, onClose, legend }: FUTInspectModalProps) {
  const [cardEdition, setCardEdition] = useState<'icon' | 'toty' | 'emerald'>('icon');
  const [selectedArchetype, setSelectedArchetype] = useState<AthleteArchetype>(ARCHETYPES[0]);
  const [activePhoto, setActivePhoto] = useState<string>(ARCHETYPES[0].photoUrl);

  // Overall rating
  const overall = useMemo(() => {
    if (!legend) return 75;
    return Math.round(
      ((legend.pace ?? 50) +
        (legend.shooting ?? 50) +
        (legend.passing ?? 50) +
        (legend.dribbling ?? 50) +
        (legend.defending ?? 50) +
        (legend.physical ?? 50)) /
        6,
    );
  }, [legend]);

  // Sync archetype with player position or initial state
  useMemo(() => {
    if (!legend) return;
    const pos = legend.position || 'ST';
    let arch = ARCHETYPES[0];
    if (pos === 'GK') arch = ARCHETYPES[4];
    else if (pos === 'CB' || pos === 'LB' || pos === 'RB') arch = ARCHETYPES[2];
    else if (pos === 'CDM' || pos === 'CM' || pos === 'CAM') arch = ARCHETYPES[1];
    else if (pos === 'RW' || pos === 'LW') arch = ARCHETYPES[3];

    setSelectedArchetype(arch);
    setActivePhoto(legend.photoUrl || arch.photoUrl);
  }, [legend]);

  if (!isOpen || !legend) return null;

  const kitInfo = kit(legend.position || 'ST');
  const futShieldClip = 'polygon(7% 0%, 93% 0%, 100% 5%, 100% 83%, 50% 100%, 0% 83%, 0% 5%)';

  // Calculate Hexagon radar vertices
  const stats = [
    { label: 'PAC', val: legend.pace ?? 50 },
    { label: 'SHO', val: legend.shooting ?? 50 },
    { label: 'PAS', val: legend.passing ?? 50 },
    { label: 'DRI', val: legend.dribbling ?? 50 },
    { label: 'DEF', val: legend.defending ?? 50 },
    { label: 'PHY', val: legend.physical ?? 50 },
  ];

  const radarRadius = 80;
  const radarCenter = 100;
  const radarPoints = stats
    .map((s, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const normalized = Math.min(99, Math.max(20, s.val)) / 99;
      const r = radarRadius * normalized;
      const x = radarCenter + r * Math.cos(angle);
      const y = radarCenter + r * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(' ');

  const gridLevels = [0.33, 0.66, 1.0];

  // Card themes
  const editionStyles = {
    icon: {
      border: 'linear-gradient(135deg, #FFE57F 0%, #D4AF37 25%, #8A6410 50%, #D4AF37 75%, #FFE57F 100%)',
      bg: 'linear-gradient(180deg, #133a2a 0%, #0a2117 35%, #05130e 75%, #020906 100%)',
      title: 'KATIKA ICON',
      accentColor: '#fef08a',
    },
    toty: {
      border: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 35%, #d946ef 70%, #38bdf8 100%)',
      bg: 'linear-gradient(180deg, #081d38 0%, #051024 35%, #020712 100%)',
      title: 'TEAM OF THE YEAR',
      accentColor: '#38bdf8',
    },
    emerald: {
      border: 'linear-gradient(135deg, #34d399 0%, #059669 40%, #047857 70%, #6ee7b7 100%)',
      bg: 'linear-gradient(180deg, #062b1e 0%, #041912 40%, #010a07 100%)',
      title: 'EMERALD ELITE',
      accentColor: '#34d399',
    },
  }[cardEdition];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="relative flex max-h-[95vh] w-full max-w-4xl flex-col overflow-y-auto rounded-3xl border border-[#d4af37]/40 bg-[#091712] shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#1C3A2E] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#fef08a]/60 bg-gradient-to-br from-[#d4af37]/30 to-[#8a6410]/30 shadow-inner">
              <Award className="text-[#fef08a]" size={18} />
            </div>
            <div>
              <h2 className="flex items-center gap-2 font-mono-custom text-base font-bold text-[#E8F2EC]">
                <span>FUT ULTIMATE CARD STUDIO</span>
                <span className="rounded-full border border-[#fef08a]/50 bg-[#fef08a]/10 px-2 py-0.5 text-[10px] font-black text-[#fef08a]">
                  EA FC ICON GRADE
                </span>
              </h2>
              <p className="text-xs text-[#8FA39A]">
                Photorealistic footballer athlete render & equilateral attribute radar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#8FA39A] transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Main Grid */}
        <div className="grid gap-6 p-6 lg:grid-cols-12">
          {/* LEFT 6 COLS: THE AUTHENTIC FUT CARD */}
          <div className="flex flex-col items-center justify-center lg:col-span-6">
            {/* Card Tier Switcher */}
            <div className="mb-4 flex items-center gap-2">
              <span className="font-mono-custom text-[10px] uppercase text-[#8FA39A]">Card Edition:</span>
              {[
                { id: 'icon', label: 'Icon Gold' },
                { id: 'toty', label: 'TOTY Blue' },
                { id: 'emerald', label: 'Emerald' },
              ].map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setCardEdition(tier.id as any)}
                  className={`rounded-lg border px-2.5 py-1 font-mono-custom text-xs font-bold transition-colors ${
                    cardEdition === tier.id
                      ? 'border-[#fef08a] bg-[#fef08a]/20 text-[#fef08a]'
                      : 'border-[#1C3A2E] bg-[#0E1A16] text-[#8FA39A] hover:text-white'
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>

            {/* THE FUT SHIELD CARD */}
            <div
              className="relative w-[300px] h-[450px] p-[3px] select-none"
              style={{
                clipPath: futShieldClip,
                background: editionStyles.border,
                boxShadow: '0 20px 50px rgba(0,0,0,0.85), 0 0 35px rgba(212,175,55,0.3)',
              }}
            >
              <div
                className="relative h-full w-full overflow-hidden p-3"
                style={{
                  clipPath: futShieldClip,
                  background: editionStyles.bg,
                }}
              >
                {/* Sunburst Radial Ray Background */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-45"
                  style={{
                    background:
                      'radial-gradient(circle at 65% 30%, rgba(254,240,138,0.35) 0%, rgba(53,211,153,0.18) 45%, transparent 75%)',
                  }}
                />

                {/* Top Strip Watermark */}
                <div className="absolute right-4 top-2 z-10 flex items-center gap-1 opacity-70">
                  <Star size={10} className="fill-[#fef08a] text-[#fef08a]" />
                  <span className="font-mono-custom text-[8px] font-black uppercase tracking-widest text-[#fef08a]">
                    {editionStyles.title}
                  </span>
                  <Star size={10} className="fill-[#fef08a] text-[#fef08a]" />
                </div>

                {/* UPPER HALF: RATINGS BLOCK + REAL FOOTBALLER CUTOUT */}
                <div className="relative z-20 mt-1 flex h-[215px] w-full">
                  {/* Left Ratings Column */}
                  <div className="flex w-16 flex-col items-center pt-2 text-center">
                    <span className="font-mono-custom text-4xl font-black leading-none tracking-tighter text-[#fef08a] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                      {overall}
                    </span>
                    <span className="mt-0.5 font-mono-custom text-sm font-black tracking-wider text-[#E8F2EC]">
                      {legend.position}
                    </span>
                    <div className="my-1.5 h-[1px] w-7 bg-gradient-to-r from-transparent via-[#fef08a]/80 to-transparent" />
                    <div className="text-xl">{selectedArchetype.nation.flag}</div>
                    <div className="my-1.5 h-[1px] w-7 bg-gradient-to-r from-transparent via-[#fef08a]/80 to-transparent" />
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#fef08a]/60 bg-[#d4af37]/20 shadow-inner">
                      <span className="font-mono-custom text-[9px] font-black text-[#fef08a]">KTK</span>
                    </div>
                  </div>

                  {/* Real Football Player Photo Cutout (NO ROBOT!) */}
                  <div className="relative flex-1">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(254,240,138,0.25)_0%,rgba(53,211,153,0.1)_45%,transparent_70%)]" />
                    <img
                      src={activePhoto}
                      alt={legend.name}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="absolute inset-0 h-full w-full object-contain object-bottom scale-110 drop-shadow-[0_12px_16px_rgba(0,0,0,0.85)]"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#081f16] to-transparent" />
                  </div>
                </div>

                {/* Name Banner Ribbon */}
                <div className="relative z-30 mt-1">
                  <div className="flex h-8 items-center justify-center rounded-lg border border-[#fef08a]/70 bg-gradient-to-r from-[#854d0e] via-[#fef08a] to-[#854d0e] px-2 shadow">
                    <span className="truncate font-mono-custom text-xs font-black uppercase tracking-wider text-[#140b02]">
                      {legend.name}
                    </span>
                  </div>
                </div>

                {/* The 6 Core FUT Stats */}
                <div className="relative z-30 mt-2.5 rounded-xl border border-[#d4af37]/30 bg-black/45 px-3 py-1.5 backdrop-blur-sm">
                  <div className="grid grid-cols-2 divide-x divide-[#fef08a]/20">
                    <div className="space-y-0.5 pr-2 font-mono-custom">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-black text-white">{legend.pace}</span>
                        <span className="font-bold text-[#fef08a]">PAC</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-black text-white">{legend.shooting}</span>
                        <span className="font-bold text-[#fef08a]">SHO</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-black text-white">{legend.passing}</span>
                        <span className="font-bold text-[#fef08a]">PAS</span>
                      </div>
                    </div>
                    <div className="space-y-0.5 pl-2 font-mono-custom">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-black text-white">{legend.dribbling}</span>
                        <span className="font-bold text-[#fef08a]">DRI</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-black text-white">{legend.defending}</span>
                        <span className="font-bold text-[#fef08a]">DEF</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-black text-white">{legend.physical}</span>
                        <span className="font-bold text-[#fef08a]">PHY</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Chemistry & Allocation Tip */}
                <div className="relative z-30 mt-2 flex flex-col items-center justify-center font-mono-custom text-center">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#35D399]">
                    <span>HUNTER</span>
                    <span className="flex gap-0.5">◆◆◆</span>
                    <span className="text-[#8FA39A]">·</span>
                    <span className="text-[#f3d37a]">330 KTK</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 6 COLS: ATTRIBUTE RADAR & ATHLETE CUTOUT SELECTOR */}
          <div className="space-y-5 lg:col-span-6">
            {/* ATHLETE CUTOUT PICKER */}
            <div className="rounded-2xl border border-[#1C3A2E] bg-[#0A1813] p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono-custom text-xs font-bold uppercase tracking-wider text-[#E8F2EC]">
                  Footballer Cutout
                </span>
                <span className="text-xs text-[#35D399] font-mono-custom">
                  {selectedArchetype.nation.flag} {selectedArchetype.title}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {ARCHETYPES.map((arch) => (
                  <button
                    key={arch.id}
                    type="button"
                    onClick={() => {
                      setSelectedArchetype(arch);
                      setActivePhoto(arch.photoUrl);
                    }}
                    className={`group relative flex flex-col items-center rounded-xl border p-1.5 transition-all ${
                      selectedArchetype.id === arch.id
                        ? 'border-[#fef08a] bg-[#fef08a]/20 shadow-[0_0_12px_rgba(254,240,138,0.3)]'
                        : 'border-[#1C3A2E] bg-[#0E1A16] hover:border-[#35D399]/50'
                    }`}
                  >
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-black/40">
                      <img
                        src={arch.photoUrl}
                        alt={arch.name}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="h-full w-full object-cover object-top"
                      />
                    </div>
                    <span className="mt-1 font-mono-custom text-[9px] font-bold text-[#E8F2EC] truncate max-w-full">
                      {arch.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* EQUILATERAL ATTRIBUTE RADAR */}
            <div className="rounded-2xl border border-[#1C3A2E] bg-[#0A1813] p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono-custom text-xs font-bold uppercase tracking-wider text-[#E8F2EC]">
                  EA Sports FC Attribute Hexagon
                </span>
                <span className="font-mono-custom text-xs font-bold text-[#fef08a]">{overall} OVR</span>
              </div>

              <div className="mt-4 flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="h-44 w-44">
                  {/* Concentric Hexagons */}
                  {gridLevels.map((lvl) => {
                    const r = radarRadius * lvl;
                    const pts = [0, 1, 2, 3, 4, 5]
                      .map((i) => {
                        const a = (Math.PI / 3) * i - Math.PI / 2;
                        return `${radarCenter + r * Math.cos(a)},${radarCenter + r * Math.sin(a)}`;
                      })
                      .join(' ');
                    return (
                      <polygon
                        key={lvl}
                        points={pts}
                        fill="none"
                        stroke="#1C3A2E"
                        strokeWidth="1"
                        strokeDasharray={lvl === 1.0 ? 'none' : '2,2'}
                      />
                    );
                  })}

                  {/* Axis lines */}
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const a = (Math.PI / 3) * i - Math.PI / 2;
                    return (
                      <line
                        key={i}
                        x1={radarCenter}
                        y1={radarCenter}
                        x2={radarCenter + radarRadius * Math.cos(a)}
                        y2={radarCenter + radarRadius * Math.sin(a)}
                        stroke="#1C3A2E"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Filled Attribute Polygon */}
                  <polygon
                    points={radarPoints}
                    fill="rgba(254, 240, 138, 0.35)"
                    stroke="#fef08a"
                    strokeWidth="2.5"
                  />

                  {/* Stat Vertex Dots & Labels */}
                  {stats.map((s, i) => {
                    const angle = (Math.PI / 3) * i - Math.PI / 2;
                    const labelR = radarRadius + 14;
                    const lx = radarCenter + labelR * Math.cos(angle);
                    const ly = radarCenter + labelR * Math.sin(angle);
                    return (
                      <text
                        key={s.label}
                        x={lx}
                        y={ly + 4}
                        fill="#fef08a"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {s.label}
                      </text>
                    );
                  })}
                </svg>
              </div>

              {/* 6 Stats Breakdown Pill Row */}
              <div className="mt-3 grid grid-cols-6 gap-1.5 font-mono-custom text-center">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-lg border border-[#1C3A2E] bg-black/40 p-1.5">
                    <span className="block text-[9px] text-[#8FA39A]">{s.label}</span>
                    <span className="block text-sm font-black text-white">{s.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* PLAYSTYLE SIGNATURES */}
            <div className="rounded-2xl border border-[#1C3A2E] bg-[#0A1813] p-4 font-mono-custom text-xs">
              <div className="flex items-center gap-1.5 text-[#35D399]">
                <Zap size={14} />
                <span className="font-bold uppercase tracking-wider">PlayStyle+ Traits</span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-2">
                  <p className="text-[10px] font-bold text-[#fef08a]">Finesse Shot+</p>
                  <p className="text-[9px] text-[#8FA39A] mt-0.5">Curve & accuracy on curling shots</p>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-2">
                  <p className="text-[10px] font-bold text-[#35D399]">Rapid Speed+</p>
                  <p className="text-[9px] text-[#8FA39A] mt-0.5">Explosive sprint burst in final third</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
