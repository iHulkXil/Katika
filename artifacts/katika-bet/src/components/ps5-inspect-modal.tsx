import { useEffect, useRef, useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  ZoomIn,
  Sliders,
  Eye,
  CheckCircle2,
  Layers,
  Flame,
} from 'lucide-react';
import type { LegendCardData } from './legend-card';
import {
  drawUHDPlayerPortrait,
  ARCHETYPES,
  type AthleteArchetype,
  kit,
} from './legend-avatar';

interface UHDInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  legend: LegendCardData | null;
}

export function PS5InspectModal({ isOpen, onClose, legend }: UHDInspectModalProps) {
  const [pixelMultiplier, setPixelMultiplier] = useState<number>(4); // 2x, 4x (4K), 6x (8K)
  const [lightingMode, setLightingMode] = useState<'stadium' | 'golden' | 'cyber'>('stadium');
  const [selectedArchetype, setSelectedArchetype] = useState<AthleteArchetype>(ARCHETYPES[0]);
  const [isMagnifierActive, setIsMagnifierActive] = useState<boolean>(true);
  const [mousePos, setMousePos] = useState<{ x: number; y: number; normX: number; normY: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Sync archetype with player position or initial state
  useEffect(() => {
    if (!legend) return;
    const pos = legend.position || 'ST';
    if (pos === 'GK') setSelectedArchetype(ARCHETYPES[4]);
    else if (pos === 'CB' || pos === 'LB' || pos === 'RB') setSelectedArchetype(ARCHETYPES[2]);
    else if (pos === 'CDM' || pos === 'CM' || pos === 'CAM') setSelectedArchetype(ARCHETYPES[1]);
    else setSelectedArchetype(ARCHETYPES[0]);
  }, [legend?.position]);

  // Overall rating
  const overall = useMemo(() => {
    if (!legend) return 75;
    return Math.round(
      (legend.pace +
        legend.shooting +
        legend.passing +
        legend.dribbling +
        legend.defending +
        legend.physical) /
        6,
    );
  }, [legend]);

  // Render Primary UHD Portrait
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Base dimensions for the inspector viewport
    const baseW = 400;
    const baseH = 480;

    // Multiplied pixels for Ultra-High Definition
    canvas.width = baseW * pixelMultiplier;
    canvas.height = baseH * pixelMultiplier;

    drawUHDPlayerPortrait(ctx, canvas.width, canvas.height, {
      name: legend?.name || 'Legend',
      position: legend?.position || 'ST',
      archetypeId: selectedArchetype.id,
      pixelScale: pixelMultiplier,
      lightingMode,
    });
  }, [isOpen, legend?.name, legend?.position, selectedArchetype.id, pixelMultiplier, lightingMode]);

  // Render Zoom Loupe Magnifier
  useEffect(() => {
    if (!isOpen || !isMagnifierActive || !mousePos) return;
    const loupe = loupeCanvasRef.current;
    if (!loupe) return;
    const ctx = loupe.getContext('2d');
    if (!ctx) return;

    loupe.width = 240;
    loupe.height = 240;

    // Draw magnified sub-section at 3x zoom
    const zoomLevel = 3.2;
    // Calculate pan offset based on normalized mouse coords
    const panX = -(mousePos.normX - 0.5) * loupe.width * zoomLevel;
    const panY = -(mousePos.normY - 0.5) * loupe.height * zoomLevel;

    drawUHDPlayerPortrait(ctx, loupe.width, loupe.height, {
      name: legend?.name || 'Legend',
      position: legend?.position || 'ST',
      archetypeId: selectedArchetype.id,
      pixelScale: pixelMultiplier,
      lightingMode,
      zoom: zoomLevel,
      panX,
      panY,
    });
  }, [isOpen, isMagnifierActive, mousePos, legend?.name, legend?.position, selectedArchetype.id, pixelMultiplier, lightingMode]);

  if (!isOpen || !legend) return null;

  const kitInfo = kit(legend.position || 'ST');

  // Interactive mouse tracking on portrait
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setMousePos({
      x,
      y,
      normX: x / rect.width,
      normY: y / rect.height,
    });
  };

  const currentResolutionLabel =
    pixelMultiplier === 2 ? '1080p Standard (800×960px)' : pixelMultiplier === 4 ? '4K Ultra-HD (1600×1920px)' : '8K Master Studio (2400×2880px)';

  const subPixelCount = ((400 * pixelMultiplier) * (480 * pixelMultiplier) / 1000000).toFixed(1);

  // Inspector inspection hotspot text
  const hotspotLabel = mousePos
    ? mousePos.normY < 0.28
      ? 'Micro-Fade Hairline & Forehead Specular Sheen'
      : mousePos.normY < 0.45
        ? 'Dual Stadium Catchlights & Cornea Detail'
        : mousePos.normY < 0.6
          ? 'Subsurface Skin Scattering & Sculpted Jaw'
          : mousePos.normX < 0.45
            ? 'Embossed Katika Gold Shield Crest & 5-Point Star'
            : 'Breathable Hex-Mesh Kit Micro-Weave Pattern'
    : 'Hover to inspect sub-pixel details';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#d4af37]/60 bg-gradient-to-b from-[#0e2119] via-[#081510] to-[#040a08] shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(53,211,153,0.15)]">
        {/* HEADER BAR */}
        <div className="flex items-center justify-between border-b border-[#1C3A2E] bg-[#0A1813]/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#d4af37]/50 bg-gradient-to-br from-[#f3d37a] to-[#8a6410] font-mono-custom text-xl font-bold text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]">
              {overall}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight text-[#E8F2EC]">{legend.name}</h3>
                <span className="rounded-full border border-[#35D399]/40 bg-[#35D399]/15 px-2.5 py-0.5 font-mono-custom text-xs font-bold text-[#35D399]">
                  {legend.position}
                </span>
                <span className="rounded-full border border-[#f3d37a]/40 bg-[#f3d37a]/15 px-2.5 py-0.5 font-mono-custom text-xs font-bold text-[#f3d37a]">
                  UHD 4K
                </span>
              </div>
              <p className="text-xs text-[#8FA39A]">
                Ultra-High Definition 2D Retina Studio Visualizer • {kitInfo.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono-custom text-xs text-primary">
              <Eye size={13} />
              <span>{subPixelCount}M Sub-Pixels</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl border border-[#1C3A2E] bg-[#0E1A16] text-[#8FA39A] transition-colors hover:border-[#35D399] hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-12">
          {/* LEFT: UHD PORTRAIT & INTERACTIVE MAGNIFIER (7 COLS) */}
          <div className="flex flex-col gap-4 lg:col-span-7">
            {/* Viewport Card */}
            <div
              ref={viewportRef}
              onPointerMove={handlePointerMove}
              onPointerEnter={() => setIsMagnifierActive(true)}
              onPointerLeave={() => setMousePos(null)}
              className="group relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-2xl border border-[#d4af37]/40 bg-[#050e0a] shadow-[0_12px_36px_rgba(0,0,0,0.7)] cursor-crosshair"
            >
              {/* Primary UHD Canvas */}
              <canvas
                ref={canvasRef}
                className="h-full w-full object-contain"
                style={{
                  imageRendering: '-webkit-optimize-contrast',
                }}
              />

              {/* FLOATING ZOOM LOUPE MAGNIFIER */}
              {isMagnifierActive && mousePos && (
                <div
                  className="pointer-events-none absolute h-36 w-36 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-[#f3d37a] bg-black/90 shadow-[0_0_30px_rgba(243,211,122,0.6),0_10px_25px_rgba(0,0,0,0.9)] transition-transform duration-75"
                  style={{
                    left: `${mousePos.x}px`,
                    top: `${mousePos.y}px`,
                  }}
                >
                  <canvas ref={loupeCanvasRef} className="h-full w-full object-cover" />
                  {/* Crosshair guide */}
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="h-4 w-4 rounded-full border border-white/60" />
                  </div>
                  <div className="absolute bottom-1 left-0 right-0 text-center font-mono-custom text-[8px] font-bold text-[#f3d37a] drop-shadow">
                    3.2× UHD
                  </div>
                </div>
              )}

              {/* Bottom Inspection Hotspot readout */}
              <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl border border-white/10 bg-black/75 px-3 py-1.5 backdrop-blur-md">
                <div className="flex items-center gap-2 text-xs text-[#E8F2EC]">
                  <ZoomIn size={14} className="text-[#35D399]" />
                  <span className="truncate font-mono-custom text-[11px] text-[#f3d37a]">{hotspotLabel}</span>
                </div>
                <span className="shrink-0 font-mono-custom text-[10px] text-[#8FA39A]">
                  {pixelMultiplier}× Pixels
                </span>
              </div>
            </div>

            {/* PIXEL DENSITY / RESOLUTION MULTIPLIER CONTROLLER */}
            <div className="rounded-2xl border border-[#1C3A2E] bg-[#0A1813] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders size={16} className="text-[#35D399]" />
                  <span className="font-mono-custom text-xs font-bold uppercase tracking-wider text-[#E8F2EC]">
                    Pixel Density & Crispness
                  </span>
                </div>
                <span className="font-mono-custom text-xs text-[#f3d37a]">{currentResolutionLabel}</span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { mult: 2, label: 'Standard HD', sub: '2× Retina' },
                  { mult: 4, label: '4K Ultra-HD', sub: '4× Crisp (Recommended)' },
                  { mult: 6, label: '8K Master', sub: '6× Maximum Sub-Pixel' },
                ].map((tier) => (
                  <button
                    key={tier.mult}
                    type="button"
                    onClick={() => setPixelMultiplier(tier.mult)}
                    className={`flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all ${
                      pixelMultiplier === tier.mult
                        ? 'border-[#35D399] bg-[#35D399]/20 text-[#35D399] shadow-[0_0_12px_rgba(53,211,153,0.3)]'
                        : 'border-[#1C3A2E] bg-[#0E1A16] text-[#8FA39A] hover:border-[#35D399]/50 hover:text-white'
                    }`}
                  >
                    <span className="font-mono-custom text-xs font-bold">{tier.label}</span>
                    <span className="mt-0.5 text-[10px] opacity-75">{tier.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* LIGHTING ENVIRONMENT PRESETS */}
            <div className="flex items-center gap-2">
              <span className="font-mono-custom text-[10px] uppercase tracking-wider text-[#8FA39A]">
                Studio Lighting:
              </span>
              {[
                { id: 'stadium', label: 'Stadium Emerald' },
                { id: 'golden', label: 'Golden Hour' },
                { id: 'cyber', label: 'Cyber Rim' },
              ].map((light) => (
                <button
                  key={light.id}
                  type="button"
                  onClick={() => setLightingMode(light.id as any)}
                  className={`rounded-lg border px-3 py-1 font-mono-custom text-xs transition-colors ${
                    lightingMode === light.id
                      ? 'border-[#f3d37a] bg-[#f3d37a]/20 text-[#f3d37a]'
                      : 'border-[#1C3A2E] bg-[#0E1A16] text-[#8FA39A] hover:text-white'
                  }`}
                >
                  {light.label}
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: ARCHETYPES & ATTRIBUTE RADAR (5 COLS) */}
          <div className="flex flex-col gap-4 lg:col-span-5">
            {/* ARCHETYPE SELECTOR */}
            <div className="rounded-2xl border border-[#1C3A2E] bg-[#0A1813] p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono-custom text-xs font-bold uppercase tracking-wider text-[#E8F2EC]">
                  Athlete Archetypes (UHD 2D)
                </span>
                <span className="text-[10px] text-[#8FA39A]">Pick Face & Style</span>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {ARCHETYPES.map((arch) => {
                  const isSelected = selectedArchetype.id === arch.id;
                  return (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => setSelectedArchetype(arch)}
                      className={`flex items-center justify-between rounded-xl border p-2.5 text-left transition-all ${
                        isSelected
                          ? 'border-[#d4af37] bg-gradient-to-r from-[#d4af37]/20 to-transparent text-[#f3d37a] shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                          : 'border-[#1C3A2E] bg-[#0E1A16] text-[#8FA39A] hover:border-[#35D399]/40 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#E8F2EC]">{arch.name}</span>
                          <span className="text-[10px] text-[#8FA39A] font-mono-custom">({arch.hairStyle})</span>
                        </div>
                        <p className="text-[11px] text-[#8FA39A]">{arch.title}</p>
                      </div>
                      {isSelected ? (
                        <CheckCircle2 size={16} className="text-[#f3d37a]" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-white/20" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* EA SPORTS FC ICON ATTRIBUTE RADAR */}
            <div className="rounded-2xl border border-[#1C3A2E] bg-[#0A1813] p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono-custom text-xs font-bold uppercase tracking-wider text-[#E8F2EC]">
                  Icon Attribute Radar
                </span>
                <span className="font-mono-custom text-xs font-bold text-[#35D399]">{overall} OVR</span>
              </div>

              {/* Equilateral Hexagon Radar SVG */}
              <div className="relative mt-2 flex items-center justify-center">
                <svg width="220" height="200" viewBox="0 0 220 200" className="overflow-visible">
                  {/* Background concentric reference hexagons */}
                  {[0.33, 0.66, 1].map((scale, idx) => {
                    const r = 70 * scale;
                    const points = [0, 60, 120, 180, 240, 300]
                      .map((deg) => {
                        const rad = ((deg - 90) * Math.PI) / 180;
                        return `${110 + r * Math.cos(rad)},${100 + r * Math.sin(rad)}`;
                      })
                      .join(' ');
                    return (
                      <polygon
                        key={idx}
                        points={points}
                        fill={idx === 2 ? 'rgba(53,211,153,0.03)' : 'none'}
                        stroke={idx === 2 ? '#1C3A2E' : '#142a21'}
                        strokeWidth="1"
                        strokeDasharray={idx < 2 ? '2,2' : undefined}
                      />
                    );
                  })}

                  {/* Player Stats Hexagon Shape */}
                  {(() => {
                    const stats = [
                      legend.pace,
                      legend.shooting,
                      legend.passing,
                      legend.dribbling,
                      legend.defending,
                      legend.physical,
                    ];
                    const rMax = 70;
                    const points = stats
                      .map((val, i) => {
                        const normalized = Math.max(0.25, Math.min(1, val / 99));
                        const deg = i * 60 - 90;
                        const rad = (deg * Math.PI) / 180;
                        const r = rMax * normalized;
                        return `${110 + r * Math.cos(rad)},${100 + r * Math.sin(rad)}`;
                      })
                      .join(' ');

                    return (
                      <>
                        <polygon
                          points={points}
                          fill="rgba(53, 211, 153, 0.35)"
                          stroke="#35D399"
                          strokeWidth="2"
                        />
                        {/* Golden Points */}
                        {stats.map((val, i) => {
                          const normalized = Math.max(0.25, Math.min(1, val / 99));
                          const deg = i * 60 - 90;
                          const rad = (deg * Math.PI) / 180;
                          const r = rMax * normalized;
                          return (
                            <circle
                              key={i}
                              cx={110 + r * Math.cos(rad)}
                              cy={100 + r * Math.sin(rad)}
                              r="3.5"
                              fill="#f3d37a"
                              stroke="#06120e"
                              strokeWidth="1.5"
                            />
                          );
                        })}
                      </>
                    );
                  })()}

                  {/* Stat Labels around perimeter */}
                  {[
                    { label: `PAC ${legend.pace}`, x: 110, y: 15, align: 'middle' },
                    { label: `SHO ${legend.shooting}`, x: 195, y: 55, align: 'start' },
                    { label: `PAS ${legend.passing}`, x: 195, y: 155, align: 'start' },
                    { label: `DRI ${legend.dribbling}`, x: 110, y: 195, align: 'middle' },
                    { label: `DEF ${legend.defending}`, x: 25, y: 155, align: 'end' },
                    { label: `PHY ${legend.physical}`, x: 25, y: 55, align: 'end' },
                  ].map((item, i) => (
                    <text
                      key={i}
                      x={item.x}
                      y={item.y}
                      fill="#8FA39A"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor={item.align as any}
                    >
                      {item.label}
                    </text>
                  ))}
                </svg>
              </div>
            </div>

            {/* SEPOLIA PASSPORT STATUS */}
            <div className="flex items-center justify-between rounded-xl border border-[#d4af37]/40 bg-[#0A1813] px-4 py-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#35D399]" />
                <div>
                  <p className="text-xs font-bold text-[#E8F2EC]">
                    {legend.mint ? `Token #${legend.mint.tokenId}` : 'Unminted Card Snapshot'}
                  </p>
                  <p className="text-[10px] text-[#8FA39A]">Ethereum Sepolia ERC-721 Passport</p>
                </div>
              </div>
              <span className="rounded bg-[#35D399]/20 px-2 py-0.5 font-mono-custom text-[10px] font-bold text-[#35D399]">
                VERIFIED
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { PS5InspectModal as UHDInspectModal };
