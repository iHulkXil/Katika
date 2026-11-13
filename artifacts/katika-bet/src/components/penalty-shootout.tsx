import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  Gamepad2,
  Play,
  RotateCcw,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';
import { getWalletBalance, setWalletBalance } from '@/lib/balance';
import { useKyc } from '@/lib/kyc';
import { pushNotification } from '@/lib/notifications';
import { AssetManager } from '@/games/penalty/assets/AssetManager';
import { DEFAULT_ASSET_MANIFEST } from '@/games/penalty/assets/AssetManifest';
import { Game } from '@/games/penalty/game/Game';
import type {
  CharacterProfile,
  Local2PControlStyle,
  MatchStateSnapshot,
  PenaltyGameMode,
  ShootoutMatchConfig,
  SoundEffectKey,
} from '@/games/penalty/types';

type CryptoType = 'SOL' | 'ETH' | 'BTC' | 'USDT';

const CRYPTO_RATES: Record<CryptoType, number> = {
  SOL: 148.5,
  ETH: 3233.0,
  BTC: 91420.0,
  USDT: 1.0,
};

function FlagBadge({ colors }: { colors: [string, string, string] }) {
  return (
    <span
      className="inline-block h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] border border-white/25"
      style={{
        background: `linear-gradient(90deg, ${colors[0]} 0%, ${colors[0]} 33.3%, ${colors[1]} 33.3%, ${colors[1]} 66.6%, ${colors[2]} 66.6%, ${colors[2]} 100%)`,
      }}
    />
  );
}

export function PenaltyShootoutPage() {
  const { user, getAccessToken } = usePrivy();
  const { recordGamePlay } = useKyc();
  const { toast } = useToast();

  // Shared asset manager (manifest-driven so characters/stadiums/SFX swap cleanly)
  const [manifestVersion, setManifestVersion] = useState<number>(0);
  const assetManager = useMemo(() => new AssetManager(DEFAULT_ASSET_MANIFEST), []);
  const activeManifest = useMemo(() => assetManager.getManifest(), [assetManager, manifestVersion]);

  const strikers = useMemo(
    () => activeManifest.characters.filter((c) => c.role === 'striker' || c.role === 'both'),
    [activeManifest.characters],
  );
  const keepers = useMemo(
    () => activeManifest.characters.filter((c) => c.role === 'goalkeeper' || c.role === 'both'),
    [activeManifest.characters],
  );

  // Match setup state
  const [mode, setMode] = useState<PenaltyGameMode>('shootout-ai');
  const [local2pStyle, setLocal2pStyle] = useState<Local2PControlStyle>('pass-and-play');
  const [difficulty, setDifficulty] = useState<number>(55);
  const [homeTeamCode, setHomeTeamCode] = useState<string>('ng');
  const [awayTeamCode, setAwayTeamCode] = useState<string>('br');
  const [homeStrikerId, setHomeStrikerId] = useState<string>(strikers[0]?.id ?? 'striker-ace');
  const [homeKeeperId, setHomeKeeperId] = useState<string>(keepers[0]?.id ?? 'keeper-wall');
  const [awayStrikerId, setAwayStrikerId] = useState<string>(strikers[1]?.id ?? strikers[0]?.id ?? 'striker-acrobat');
  const [awayKeeperId, setAwayKeeperId] = useState<string>(keepers[1]?.id ?? keepers[0]?.id ?? 'keeper-cat');
  const [stadiumId, setStadiumId] = useState<string>(activeManifest.stadiums[0]?.id ?? 'toon-cup-day');
  const [ballId, setBallId] = useState<string>(activeManifest.balls[0]?.id ?? 'classic-toon');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Custom Assets Studio state (swap .glb / sprite-sheet / SFX URLs without touching gameplay)
  const [showAssetStudio, setShowAssetStudio] = useState<boolean>(false);
  const [customCharRole, setCustomCharRole] = useState<'striker' | 'goalkeeper' | 'both'>('both');
  const [customAssetType, setCustomAssetType] = useState<'gltf' | 'spritesheet'>('gltf');
  const [customModelUrl, setCustomModelUrl] = useState<string>('');
  const [customSpriteCols, setCustomSpriteCols] = useState<number>(4);
  const [customSpriteRows, setCustomSpriteRows] = useState<number>(4);
  const [customSpriteFps, setCustomSpriteFps] = useState<number>(10);
  const [customSfxKey, setCustomSfxKey] = useState<SoundEffectKey>('goal');
  const [customSfxUrl, setCustomSfxUrl] = useState<string>('');

  // SIDEBET PvP wager state
  const [wagerMode, setWagerMode] = useState<'practice' | 'pvp'>('practice');
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>('SOL');
  const [stakeUsd, setStakeUsd] = useState<number>(10);

  // Active match runtime state
  const [inArena, setInArena] = useState<boolean>(false);
  const [matchNonce, setMatchNonce] = useState<number>(0);
  const [snapshot, setSnapshot] = useState<MatchStateSnapshot | null>(null);
  const [assetsReady, setAssetsReady] = useState<boolean>(false);
  const [settledInfo, setSettledInfo] = useState<{
    won: boolean;
    payoutUsd: number;
    cryptoAmount: string;
    cryptoType: CryptoType;
  } | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const touchPadRef = useRef<HTMLDivElement | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const matchKeyRef = useRef<string>(`penalty-${Date.now()}`);
  const matchSettledRef = useRef<boolean>(false);

  const safeStakeUsd = Number.isFinite(stakeUsd) && stakeUsd > 0 ? stakeUsd : 0;
  const cryptoAmount = (safeStakeUsd / CRYPTO_RATES[selectedCrypto]).toFixed(
    selectedCrypto === 'BTC' ? 6 : selectedCrypto === 'ETH' ? 4 : 2,
  );
  const prizeUsd = wagerMode === 'pvp' ? safeStakeUsd * 2 * 0.96 : 0;

  // Preload footballer-animated.glb once on mount
  useEffect(() => {
    let active = true;
    void assetManager.preloadCoreAssets().then(() => {
      if (active) setAssetsReady(true);
    });
    return () => {
      active = false;
      assetManager.dispose();
    };
  }, [assetManager]);

  const homeTeam = useMemo(() => assetManager.getTeam(homeTeamCode), [assetManager, homeTeamCode]);
  const awayTeam = useMemo(() => assetManager.getTeam(awayTeamCode), [assetManager, awayTeamCode]);

  // Automated SIDEBET PvP settlement when staked Shootout vs AI ends
  const settleMatchIfStaked = useCallback(
    async (finalSnap: MatchStateSnapshot) => {
      if (matchSettledRef.current) return;
      matchSettledRef.current = true;
      if (wagerMode !== 'pvp' || mode !== 'shootout-ai') return;

      const userWon = finalSnap.winnerTeamIndex === 0;
      const payout = userWon ? prizeUsd : 0;
      const rake = Math.max(0, safeStakeUsd * 2 - prizeUsd);

      if (userWon) {
        const currentBal = getWalletBalance(user?.id);
        setWalletBalance(user?.id, currentBal + payout);
        toast({
          title: 'Penalty Shootout Won!',
          description: `You won $${payout.toFixed(2)} (${(payout / CRYPTO_RATES[selectedCrypto]).toFixed(4)} ${selectedCrypto}).`,
        });
      } else {
        toast({
          title: 'Shootout Lost',
          description: `${awayTeam.name} took the shootout ${finalSnap.scores[1]}-${finalSnap.scores[0]}.`,
          variant: 'destructive',
        });
      }

      setSettledInfo({
        won: userWon,
        payoutUsd: payout,
        cryptoAmount,
        cryptoType: selectedCrypto,
      });

      pushNotification({
        id: matchKeyRef.current,
        title: userWon ? 'Penalty Shootout Victory' : 'Penalty Shootout Result',
        message: userWon
          ? `Beat ${awayTeam.name} ${finalSnap.scores[0]}-${finalSnap.scores[1]} (+$${payout.toFixed(2)}).`
          : `Lost to ${awayTeam.name} ${finalSnap.scores[0]}-${finalSnap.scores[1]}.`,
        type: userWon ? 'win' : 'system',
        href: '/games/penalty',
        userId: user?.id,
      });

      try {
        const token = await getAccessToken();
        if (!token) return;
        const baseApi = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');
        await fetch(`${baseApi}/pvp/auto-settle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            matchKey: matchKeyRef.current,
            game: 'penalty',
            stakeUsd: safeStakeUsd,
            cryptoType: selectedCrypto,
            cryptoAmount: Number(cryptoAmount),
            won: userWon,
            payoutUsd: payout,
            rakeUsd: rake,
          }),
        });
      } catch {
        // Non-fatal settlement sync
      }
    },
    [
      awayTeam.name,
      cryptoAmount,
      getAccessToken,
      mode,
      prizeUsd,
      safeStakeUsd,
      selectedCrypto,
      toast,
      user?.id,
      wagerMode,
    ],
  );

  // Mount / tear down Three.js Game engine whenever arena starts
  useEffect(() => {
    if (!inArena || !stageRef.current) return;

    const config: ShootoutMatchConfig = {
      mode,
      local2pStyle,
      difficulty,
      homeTeamCode,
      awayTeamCode,
      homeStrikerId,
      homeKeeperId,
      awayStrikerId,
      awayKeeperId,
      stadiumId,
      ballId,
      soundEnabled,
    };

    const game = new Game({
      container: stageRef.current,
      assets: assetManager,
      config,
      onStateChange: (next) => setSnapshot(next),
      onMatchFinish: (finalSnap) => {
        setSnapshot(finalSnap);
        void settleMatchIfStaked(finalSnap);
      },
    });

    gameRef.current = game;
    setSnapshot(game.getSnapshot());

    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, [
    inArena,
    matchNonce,
    assetManager,
    mode,
    local2pStyle,
    difficulty,
    homeTeamCode,
    awayTeamCode,
    homeStrikerId,
    homeKeeperId,
    awayStrikerId,
    awayKeeperId,
    stadiumId,
    ballId,
    soundEnabled,
    settleMatchIfStaked,
  ]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    gameRef.current?.setSoundEnabled(next);
  };

  const handleApplyCustomCharacter = () => {
    const url = customModelUrl.trim();
    if (!url) {
      toast({ title: 'Enter an asset URL', description: 'Paste a .glb or sprite-sheet image URL.', variant: 'destructive' });
      return;
    }
    const id = `custom-${customAssetType}`;
    const customProfile: CharacterProfile = {
      id,
      name: customAssetType === 'gltf' ? 'Custom 3D Character' : 'Custom Sprite Rig',
      role: customCharRole,
      tagline: customAssetType === 'gltf' ? 'Custom GLB Model' : `Sprite Sheet (${customSpriteCols}x${customSpriteRows})`,
      hairColor: '#1F1B18',
      bootsColor: '#22C55E',
      gloveColor: '#FACC15',
      celebrationAnim: 'Spin',
      source:
        customAssetType === 'gltf'
          ? { type: 'gltf', url, scale: 1 }
          : {
              type: 'spritesheet',
              url,
              cols: Math.max(1, customSpriteCols),
              rows: Math.max(1, customSpriteRows),
              fps: Math.max(1, customSpriteFps),
            },
    };
    assetManager.upsertCharacter(customProfile);
    setManifestVersion((v) => v + 1);
    if (customCharRole === 'striker' || customCharRole === 'both') {
      setHomeStrikerId(id);
    }
    if (customCharRole === 'goalkeeper' || customCharRole === 'both') {
      setAwayKeeperId(id);
      setHomeKeeperId(id);
    }
    toast({ title: 'Custom Character Registered', description: `${customProfile.name} is ready for kickoff.` });
  };

  const handleApplyCustomSfx = () => {
    const url = customSfxUrl.trim();
    assetManager.updateManifest({
      audioUrls: { [customSfxKey]: url || undefined },
    });
    setManifestVersion((v) => v + 1);
    assetManager.soundEnabled = soundEnabled;
    assetManager.playSound(customSfxKey);
    toast({
      title: url ? `Custom ${customSfxKey.toUpperCase()} SFX Applied` : `Reset ${customSfxKey.toUpperCase()} SFX`,
      description: url ? 'Loaded into AssetManager audio bank.' : 'Restored procedural cartoon synth sound.',
    });
  };

  const handleStartMatch = () => {
    if (wagerMode === 'pvp' && mode !== 'shootout-ai') {
      toast({
        title: 'PvP Stakes Require Shootout vs AI',
        description: 'Switch Mode to Shootout vs AI to stake crypto, or choose Free Practice.',
        variant: 'destructive',
      });
      return;
    }

    if (wagerMode === 'pvp') {
      if (safeStakeUsd <= 0) {
        toast({ title: 'Invalid Stake', description: 'Enter a stake above $0.', variant: 'destructive' });
        return;
      }
      const currentBal = getWalletBalance(user?.id);
      if (currentBal < safeStakeUsd) {
        toast({
          title: 'Insufficient Balance',
          description: `You need $${safeStakeUsd} (${cryptoAmount} ${selectedCrypto}) or switch to Free Practice.`,
          variant: 'destructive',
        });
        return;
      }
      setWalletBalance(user?.id, currentBal - safeStakeUsd);
    }

    matchKeyRef.current = `penalty-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    matchSettledRef.current = false;
    setSettledInfo(null);
    setInArena(true);
    setMatchNonce((n) => n + 1);
    void recordGamePlay('Cartoon Penalty Shootout');
  };

  const handleRematch = () => {
    if (wagerMode === 'pvp') {
      const currentBal = getWalletBalance(user?.id);
      if (currentBal < safeStakeUsd) {
        toast({
          title: 'Insufficient Balance for Rematch',
          description: 'Returning to setup — switch to Free Practice or top up your wallet.',
          variant: 'destructive',
        });
        setInArena(false);
        return;
      }
      setWalletBalance(user?.id, currentBal - safeStakeUsd);
    }
    matchKeyRef.current = `penalty-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    matchSettledRef.current = false;
    setSettledInfo(null);
    gameRef.current?.restartMatch();
  };

  // Interactive aim pad pointer helper (for mobile touch & mouse drag aiming)
  const updateAimFromPointer = (clientX: number, clientY: number) => {
    const el = touchPadRef.current;
    if (!el || !gameRef.current) return;
    const rect = el.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width) * 2 - 1));
    const ny = Math.max(-0.2, Math.min(1, (1 - (clientY - rect.top) / rect.height) * 1.2 - 0.15));
    gameRef.current.setAimFromNormalized(nx, ny);
  };

  // Canvas swipe gesture for keeper diving / striker quick aim
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
    if (snapshot?.activeControlRole === 'shoot' && snapshot.phase === 'ready') {
      const rect = e.currentTarget.getBoundingClientRect();
      const nx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
      const ny = Math.max(-0.15, Math.min(1, (1 - (e.clientY - rect.top) / rect.height) * 1.15));
      gameRef.current?.setAimFromNormalized(nx, ny);
    }
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return;
    if (snapshot?.activeControlRole === 'shoot' && snapshot.phase === 'ready') {
      const rect = e.currentTarget.getBoundingClientRect();
      const nx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
      const ny = Math.max(-0.15, Math.min(1, (1 - (e.clientY - rect.top) / rect.height) * 1.15));
      gameRef.current?.setAimFromNormalized(nx, ny);
    }
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!swipeStartRef.current) return;
    const dx = e.clientX - swipeStartRef.current.x;
    const dy = e.clientY - swipeStartRef.current.y;
    swipeStartRef.current = null;

    if (
      (snapshot?.activeControlRole === 'save' ||
        (mode === 'local-2p' && local2pStyle === 'simultaneous')) &&
      Math.hypot(dx, dy) > 22
    ) {
      const len = Math.hypot(dx, dy);
      gameRef.current?.triggerTouchDive({
        x: Math.max(-1, Math.min(1, dx / Math.max(40, len))),
        y: Math.max(-0.4, Math.min(0.8, -dy / Math.max(40, len))),
      });
    }
  };

  // Build 5-slot + Sudden Death dot slots per team
  const totalDisplaySlots = useMemo(() => {
    if (!snapshot) return 5;
    const maxKicks = Math.max(5, snapshot.kicksTaken[0], snapshot.kicksTaken[1], snapshot.round);
    return maxKicks;
  }, [snapshot]);

  const getSlotOutcome = (teamIdx: 0 | 1, slotIndex: number) => {
    if (!snapshot) return null;
    const teamShots = snapshot.history.filter((h) => h.teamIndex === teamIdx);
    return teamShots[slotIndex] ?? null;
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/pvp"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0E1318] px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span>PvP Lobby</span>
          </Link>
          <div>
            <h1 className="text-xl lg:text-2xl font-extrabold font-display tracking-tight text-white">
              Cartoon 3D Penalty Shootout
            </h1>
            <p className="text-[11px] text-slate-400">
              5 Penalties &amp; Sudden Death · Local 2-Player · 3D Rigged Striker &amp; Keeper
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleSound}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-[#0E1318] text-slate-300 hover:text-white"
            title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          {inArena && (
            <button
              type="button"
              onClick={() => setInArena(false)}
              className="rounded-xl border border-white/10 bg-[#0E1318] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-white/25"
            >
              Change Teams &amp; Mode
            </button>
          )}
        </div>
      </div>

      {/* PRE-MATCH SETUP SCREEN */}
      {!inArena ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Mode, Teams, Characters, Stadium */}
          <div className="lg:col-span-8 space-y-5 rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 lg:p-6 shadow-2xl">
            {/* Mode Selection */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">1. Choose Match Mode</h2>
                <span className="text-[11px] font-mono text-slate-400">
                  {assetsReady ? '3D Characters Loaded' : 'Loading 3D Characters...'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'shootout-ai', label: 'Shootout vs AI', desc: '5 kicks + Sudden Death' },
                  { id: 'local-2p', label: 'Local 2-Player', desc: 'P1 vs P2 on 1 device' },
                  { id: 'arcade-shoot', label: 'Arcade Striker', desc: 'Levels 1–100 shooting' },
                  { id: 'arcade-save', label: 'Arcade Keeper', desc: 'Levels 1–100 diving' },
                ].map((m) => {
                  const active = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setMode(m.id as PenaltyGameMode);
                        if (m.id !== 'shootout-ai') setWagerMode('practice');
                      }}
                      className={`rounded-2xl border p-3 text-left transition-all ${
                        active
                          ? 'border-[#22C55E] bg-[#121B16] shadow-[0_0_18px_rgba(34,197,94,0.18)]'
                          : 'border-white/[0.08] bg-[#080C0F] hover:border-white/20'
                      }`}
                    >
                      <span className="block text-xs font-bold text-white">{m.label}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">{m.desc}</span>
                    </button>
                  );
                })}
              </div>

              {mode === 'local-2p' && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-slate-400">2P Control Style:</span>
                  <button
                    type="button"
                    onClick={() => setLocal2pStyle('pass-and-play')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      local2pStyle === 'pass-and-play'
                        ? 'bg-[#22C55E] text-black'
                        : 'bg-[#080C0F] text-slate-300 border border-white/10'
                    }`}
                  >
                    Pass &amp; Play (Camera Flips)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocal2pStyle('simultaneous')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      local2pStyle === 'simultaneous'
                        ? 'bg-[#22C55E] text-black'
                        : 'bg-[#080C0F] text-slate-300 border border-white/10'
                    }`}
                  >
                    Same-Screen Simultaneous (WASD vs Arrows)
                  </button>
                </div>
              )}
            </div>

            {/* Team Selection */}
            <div className="space-y-3 pt-2 border-t border-white/[0.06]">
              <h2 className="text-sm font-bold text-white">2. Team Selection (Home vs Away)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Home (Player 1)', code: homeTeamCode, setCode: setHomeTeamCode },
                  {
                    label: mode === 'local-2p' ? 'Away (Player 2)' : 'Away (CPU Rival)',
                    code: awayTeamCode,
                    setCode: setAwayTeamCode,
                  },
                ].map((side) => (
                  <div key={side.label} className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300 block">{side.label}</span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                      {activeManifest.teams.map((t) => {
                        const selected = side.code === t.code;
                        return (
                          <button
                            key={t.code}
                            type="button"
                            onClick={() => side.setCode(t.code)}
                            className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition-all ${
                              selected
                                ? 'border-[#22C55E] bg-[#121B16] text-white'
                                : 'border-white/[0.06] bg-[#080C0F] text-slate-400 hover:text-white'
                            }`}
                          >
                            <FlagBadge colors={t.flagColors} />
                            <span className="truncate">{t.shortName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Character Selection (uses /models/footballer-animated.glb + modular AssetManifest) */}
            <div className="space-y-3 pt-2 border-t border-white/[0.06]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-white">3. Character Selection</h2>
                <button
                  type="button"
                  onClick={() => setShowAssetStudio((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#080C0F] px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-[#22C55E]"
                >
                  <Sliders size={12} className="text-[#4ADE80]" />
                  <span>{showAssetStudio ? 'Hide Custom Asset Loader' : 'Swap Custom Models / Sprites / SFX'}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">
                    Home Striker ({homeTeam.shortName})
                  </span>
                  <div className="space-y-1.5">
                    {strikers.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setHomeStrikerId(ch.id)}
                        className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-left transition-all ${
                          homeStrikerId === ch.id
                            ? 'border-[#22C55E] bg-[#121B16] text-white'
                            : 'border-white/[0.06] bg-[#080C0F] text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold block">{ch.name}</span>
                          <span className="text-[10px] text-slate-400">{ch.tagline}</span>
                        </div>
                        <span
                          className="h-4 w-4 rounded-full border border-white/30 shrink-0"
                          style={{ background: ch.bootsColor }}
                          title="Boot accent"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">
                    Away Goalkeeper ({awayTeam.shortName})
                  </span>
                  <div className="space-y-1.5">
                    {keepers.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setAwayKeeperId(ch.id)}
                        className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-left transition-all ${
                          awayKeeperId === ch.id
                            ? 'border-[#FACC15] bg-[#19160B] text-white'
                            : 'border-white/[0.06] bg-[#080C0F] text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold block">{ch.name}</span>
                          <span className="text-[10px] text-slate-400">{ch.tagline}</span>
                        </div>
                        <span
                          className="h-4 w-4 rounded-full border border-white/30 shrink-0"
                          style={{ background: ch.gloveColor }}
                          title="Glove accent"
                        />
                      </button>
                    ))}

                    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#080C0F] px-3 py-2">
                      <span className="text-[11px] text-slate-400">Home Keeper ({homeTeam.shortName})</span>
                      <select
                        value={homeKeeperId}
                        onChange={(e) => setHomeKeeperId(e.target.value)}
                        className="rounded-lg border border-white/10 bg-[#0E1318] px-2 py-1 text-xs text-white"
                      >
                        {keepers.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#080C0F] px-3 py-2">
                      <span className="text-[11px] text-slate-400">
                        {mode === 'local-2p' ? 'Player 2 Striker' : `Away Striker (${awayTeam.shortName})`}
                      </span>
                      <select
                        value={awayStrikerId}
                        onChange={(e) => setAwayStrikerId(e.target.value)}
                        className="rounded-lg border border-white/10 bg-[#0E1318] px-2 py-1 text-xs text-white"
                      >
                        {strikers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {showAssetStudio && (
                <div className="rounded-2xl border border-[#22C55E]/25 bg-[#080C0F] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Modular Asset Loader (No Gameplay Rewrite)</span>
                    <span className="text-[10px] font-mono text-slate-400">GLTF · Sprite Sheet · SFX</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-slate-300 block">Custom Character (.glb or Sprite Sheet)</span>
                      <div className="flex gap-1.5">
                        <select
                          value={customAssetType}
                          onChange={(e) => setCustomAssetType(e.target.value as 'gltf' | 'spritesheet')}
                          className="rounded-lg border border-white/10 bg-[#0E1318] px-2 py-1.5 text-xs text-white"
                        >
                          <option value="gltf">3D GLB</option>
                          <option value="spritesheet">Sprite Sheet</option>
                        </select>
                        <select
                          value={customCharRole}
                          onChange={(e) => setCustomCharRole(e.target.value as 'striker' | 'goalkeeper' | 'both')}
                          className="rounded-lg border border-white/10 bg-[#0E1318] px-2 py-1.5 text-xs text-white"
                        >
                          <option value="both">Both Roles</option>
                          <option value="striker">Striker</option>
                          <option value="goalkeeper">Keeper</option>
                        </select>
                      </div>
                      <input
                        type="url"
                        value={customModelUrl}
                        onChange={(e) => setCustomModelUrl(e.target.value)}
                        placeholder={customAssetType === 'gltf' ? '/models/custom-player.glb' : '/assets/sprites/striker-sheet.png'}
                        className="w-full rounded-lg border border-white/10 bg-[#0E1318] px-2.5 py-1.5 text-xs font-mono text-white placeholder:text-slate-500"
                      />
                      {customAssetType === 'spritesheet' && (
                        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                          <label className="text-slate-400">
                            Cols
                            <input
                              type="number"
                              min={1}
                              max={32}
                              value={customSpriteCols}
                              onChange={(e) => setCustomSpriteCols(Number(e.target.value))}
                              className="mt-0.5 w-full rounded border border-white/10 bg-[#0E1318] px-2 py-1 text-white"
                            />
                          </label>
                          <label className="text-slate-400">
                            Rows
                            <input
                              type="number"
                              min={1}
                              max={32}
                              value={customSpriteRows}
                              onChange={(e) => setCustomSpriteRows(Number(e.target.value))}
                              className="mt-0.5 w-full rounded border border-white/10 bg-[#0E1318] px-2 py-1 text-white"
                            />
                          </label>
                          <label className="text-slate-400">
                            FPS
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={customSpriteFps}
                              onChange={(e) => setCustomSpriteFps(Number(e.target.value))}
                              className="mt-0.5 w-full rounded border border-white/10 bg-[#0E1318] px-2 py-1 text-white"
                            />
                          </label>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleApplyCustomCharacter}
                        className="rounded-lg bg-[#22C55E] px-3 py-1.5 text-xs font-black text-black hover:bg-[#16A34A]"
                      >
                        Load Custom Character
                      </button>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-slate-300 block">Custom Sound Effect (.mp3 / .wav / .ogg)</span>
                      <div className="flex gap-1.5">
                        <select
                          value={customSfxKey}
                          onChange={(e) => setCustomSfxKey(e.target.value as SoundEffectKey)}
                          className="rounded-lg border border-white/10 bg-[#0E1318] px-2 py-1.5 text-xs text-white"
                        >
                          <option value="whistle">Whistle</option>
                          <option value="kick">Kick</option>
                          <option value="goal">Goal</option>
                          <option value="save">Save</option>
                          <option value="post">Post Hit</option>
                          <option value="miss">Miss</option>
                          <option value="win">Match Win</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => assetManager.playSound(customSfxKey)}
                          className="rounded-lg border border-white/15 bg-[#0E1318] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-white/30"
                        >
                          Preview SFX
                        </button>
                      </div>
                      <input
                        type="url"
                        value={customSfxUrl}
                        onChange={(e) => setCustomSfxUrl(e.target.value)}
                        placeholder="/assets/sfx/goal-roar.mp3 (leave blank to reset)"
                        className="w-full rounded-lg border border-white/10 bg-[#0E1318] px-2.5 py-1.5 text-xs font-mono text-white placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCustomSfx}
                        className="rounded-lg border border-[#FACC15]/40 bg-[#19160B] px-3 py-1.5 text-xs font-bold text-[#FACC15] hover:border-[#FACC15]"
                      >
                        Apply &amp; Test SFX
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stadium, Ball & Difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-white/[0.06]">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Stadium Theme</label>
                <select
                  value={stadiumId}
                  onChange={(e) => setStadiumId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#080C0F] px-3 py-2 text-xs text-white"
                >
                  {activeManifest.stadiums.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Match Ball</label>
                <select
                  value={ballId}
                  onChange={(e) => setBallId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#080C0F] px-3 py-2 text-xs text-white"
                >
                  {activeManifest.balls.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Difficulty</label>
                  <span className="font-mono text-xs font-bold text-[#4ADE80] tabular-nums">
                    {difficulty}/100
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={difficulty}
                  onChange={(e) => setDifficulty(Number(e.target.value))}
                  className="w-full accent-[#22C55E]"
                />
              </div>
            </div>
          </div>

          {/* Right: SIDEBET Stake & Kickoff Card */}
          <div className="lg:col-span-4 space-y-4 rounded-3xl border border-white/[0.08] bg-[#0E1318] p-5 lg:p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Swords size={16} className="text-[#22C55E]" />
                <h2 className="text-sm font-bold text-white">Match Stakes</h2>
              </div>
              <span className="text-[11px] font-mono text-[#4ADE80]">96% Pot Auto-Settle</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWagerMode('practice')}
                className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                  wagerMode === 'practice'
                    ? 'border-[#22C55E] bg-[#121B16] text-white'
                    : 'border-white/10 bg-[#080C0F] text-slate-400'
                }`}
              >
                Free Practice ($0)
              </button>
              <button
                type="button"
                disabled={mode !== 'shootout-ai'}
                onClick={() => setWagerMode('pvp')}
                className={`rounded-xl border py-2.5 text-xs font-bold transition-all disabled:opacity-40 ${
                  wagerMode === 'pvp'
                    ? 'border-[#FACC15] bg-[#19160B] text-[#FACC15]'
                    : 'border-white/10 bg-[#080C0F] text-slate-400'
                }`}
              >
                PvP Crypto Stake
              </button>
            </div>

            {wagerMode === 'pvp' && (
              <div className="space-y-3 rounded-2xl border border-white/[0.07] bg-[#080C0F] p-3.5">
                <div className="flex gap-1.5">
                  {(['SOL', 'ETH', 'BTC', 'USDT'] as CryptoType[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedCrypto(c)}
                      className={`flex-1 rounded-lg py-1.5 font-mono text-[11px] font-bold transition-colors ${
                        selectedCrypto === c
                          ? 'bg-[#22C55E] text-black'
                          : 'bg-[#0E1318] text-slate-300 border border-white/10'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[5, 10, 25, 50].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setStakeUsd(amt)}
                      className={`rounded-lg py-1.5 font-mono text-xs font-bold ${
                        stakeUsd === amt
                          ? 'bg-white text-black'
                          : 'bg-[#0E1318] text-slate-300 border border-white/10'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-1">
                  <span>Stake: {cryptoAmount} {selectedCrypto}</span>
                  <span className="text-[#4ADE80] font-bold">Win: ${prizeUsd.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Matchup Summary */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#080C0F] p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlagBadge colors={homeTeam.flagColors} />
                <div>
                  <span className="text-xs font-bold text-white block">{homeTeam.name}</span>
                  <span className="text-[10px] text-slate-400">Home</span>
                </div>
              </div>
              <span className="font-mono text-xs font-black text-slate-500">VS</span>
              <div className="flex items-center gap-2 text-right">
                <div>
                  <span className="text-xs font-bold text-white block">{awayTeam.name}</span>
                  <span className="text-[10px] text-slate-400">Away</span>
                </div>
                <FlagBadge colors={awayTeam.flagColors} />
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartMatch}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] py-3.5 text-sm font-black text-black shadow-lg shadow-[#22C55E]/25 transition-all"
            >
              <Play size={16} />
              <span>Kick Off Penalty Shootout</span>
            </button>

            <div className="text-[11px] text-slate-400 space-y-1 pt-1">
              <p>
                <strong className="text-slate-200">Desktop:</strong> Arrows / WASD to aim or dive · Hold Space to charge shot power.
              </p>
              <p>
                <strong className="text-slate-200">Mobile:</strong> Drag on goal or aim pad · Hold Shoot button or swipe to dive.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* LIVE 3D ARENA VIEWPORT + BROADCAST HUD + MOBILE TOUCH CONTROLS */
        <div className="space-y-4">
          <div className="relative w-full h-[520px] sm:h-[580px] lg:h-[630px] overflow-hidden rounded-3xl border border-white/[0.1] bg-[#0B1220] shadow-2xl select-none">
            {/* Three.js Canvas Mount */}
            <div
              ref={stageRef}
              onPointerDown={handleStagePointerDown}
              onPointerMove={handleStagePointerMove}
              onPointerUp={handleStagePointerUp}
              className="h-full w-full touch-none"
            />

            {/* Top Broadcast Scoreboard HUD */}
            {snapshot && (
              <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-col items-center gap-2">
                <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-[#080C0F]/90 px-3.5 py-2.5 shadow-xl">
                  {snapshot.mode === 'arcade-shoot' || snapshot.mode === 'arcade-save' ? (
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <FlagBadge colors={homeTeam.flagColors} />
                        <span className="font-bold text-white">{homeTeam.name}</span>
                        <span className="text-slate-400">·</span>
                        <span className="font-mono text-[#FACC15] font-bold">
                          Level {snapshot.currentLevel}/{snapshot.maxLevel}
                        </span>
                      </div>
                      <div className="font-mono font-black text-sm text-[#4ADE80] tabular-nums">
                        {snapshot.levelGoals}/{snapshot.levelGoalsRequired} Goals Needed · Shot {snapshot.arcadeShotsTaken}/{snapshot.arcadeMaxShots}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      {/* Home Team + Kicks */}
                      <div className="flex items-center gap-2.5">
                        <FlagBadge colors={homeTeam.flagColors} />
                        <span className="text-xs font-extrabold text-white w-9">{homeTeam.shortName}</span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalDisplaySlots }).map((_, idx) => {
                            const shot = getSlotOutcome(0, idx);
                            return (
                              <span
                                key={idx}
                                className={`h-3 w-3 rounded-full border ${
                                  shot?.outcome === 'goal'
                                    ? 'bg-[#22C55E] border-[#86EFAC]'
                                    : shot
                                    ? 'bg-rose-500 border-rose-300'
                                    : 'bg-white/10 border-white/25'
                                }`}
                                title={shot ? `${shot.outcome.toUpperCase()} (${shot.shotSpeedKmh} km/h)` : `Kick ${idx + 1}`}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Center Score + Round */}
                      <div className="flex items-center justify-center gap-2.5 font-mono">
                        <span className="text-lg font-black text-white tabular-nums">{snapshot.scores[0]}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-[#FACC15]">
                          {snapshot.isSuddenDeath ? `SUDDEN DEATH · R${snapshot.round}` : `ROUND ${Math.min(5, snapshot.round)}/5`}
                        </span>
                        <span className="text-lg font-black text-white tabular-nums">{snapshot.scores[1]}</span>
                      </div>

                      {/* Away Team + Kicks */}
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalDisplaySlots }).map((_, idx) => {
                            const shot = getSlotOutcome(1, idx);
                            return (
                              <span
                                key={idx}
                                className={`h-3 w-3 rounded-full border ${
                                  shot?.outcome === 'goal'
                                    ? 'bg-[#22C55E] border-[#86EFAC]'
                                    : shot
                                    ? 'bg-rose-500 border-rose-300'
                                    : 'bg-white/10 border-white/25'
                                }`}
                                title={shot ? `${shot.outcome.toUpperCase()} (${shot.shotSpeedKmh} km/h)` : `Kick ${idx + 1}`}
                              />
                            );
                          })}
                        </div>
                        <span className="text-xs font-extrabold text-white w-9 text-right">{awayTeam.shortName}</span>
                        <FlagBadge colors={awayTeam.flagColors} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Callout Strip */}
                <div className="rounded-xl border border-white/10 bg-[#080C0F]/85 px-4 py-1.5 text-center">
                  <span className="block text-xs sm:text-sm font-extrabold text-white">
                    {snapshot.statusMessage}
                  </span>
                  <span className="block text-[10px] font-mono text-slate-300">
                    {snapshot.subMessage}
                  </span>
                </div>
              </div>
            )}

            {/* Big Countdown Number for Keeper Mode */}
            {snapshot?.countdownSeconds !== null && snapshot?.countdownSeconds !== undefined && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="rounded-3xl bg-[#080C0F]/90 border border-white/20 px-8 py-4 text-center">
                  <span className="block text-xs font-mono text-[#FACC15]">SHOT INCOMING</span>
                  <span className="block text-5xl font-black font-mono text-white">
                    {snapshot.countdownSeconds}
                  </span>
                </div>
              </div>
            )}

            {/* Local 2P Pass-and-Play Turn Handoff Overlay */}
            {snapshot?.phase === 'handoff' && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#080C0F]/88 p-4">
                <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#0E1318] p-6 text-center space-y-4 shadow-2xl">
                  <Users size={28} className="mx-auto text-[#4ADE80]" />
                  <div>
                    <span className="text-xs font-mono text-[#FACC15]">PASS THE DEVICE</span>
                    <h3 className="mt-1 text-xl font-extrabold text-white">
                      {snapshot.handoffNextPlayerLabel}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">{snapshot.subMessage}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => gameRef.current?.confirmHandoff()}
                    className="w-full rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] py-3 text-sm font-black text-black"
                  >
                    Ready to Kick
                  </button>
                </div>
              </div>
            )}

            {/* Arcade Level Complete Overlay */}
            {snapshot?.phase === 'level-complete' && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#080C0F]/85 p-4">
                <div className="w-full max-w-sm rounded-3xl border border-[#22C55E]/40 bg-[#0E1318] p-6 text-center space-y-4 shadow-2xl">
                  <Sparkles size={30} className="mx-auto text-[#FACC15]" />
                  <div>
                    <h3 className="text-xl font-extrabold text-white">
                      Level {snapshot.currentLevel} Cleared!
                    </h3>
                    <p className="mt-1 text-xs text-slate-300">{snapshot.subMessage}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => gameRef.current?.advanceNextArcadeLevel()}
                    className="w-full rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] py-3 text-sm font-black text-black"
                  >
                    Continue to Level {snapshot.currentLevel + 1}
                  </button>
                </div>
              </div>
            )}

            {/* MATCH RESULTS OVERLAY */}
            {snapshot?.phase === 'match-over' && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#080C0F]/90 p-4">
                <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#0E1318] p-6 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Trophy size={24} className="text-[#FACC15]" />
                      <div>
                        <span className="text-[11px] font-mono text-[#4ADE80]">MATCH COMPLETE</span>
                        <h3 className="text-lg font-extrabold text-white">
                          {snapshot.statusMessage}
                        </h3>
                      </div>
                    </div>
                    <div className="font-mono text-2xl font-black text-white tabular-nums">
                      {snapshot.scores[0]} - {snapshot.scores[1]}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300">{snapshot.winReason}</p>

                  {settledInfo && (
                    <div
                      className={`rounded-2xl border p-3 text-xs flex items-center justify-between ${
                        settledInfo.won
                          ? 'border-[#22C55E]/40 bg-[#121B16] text-[#4ADE80]'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                      }`}
                    >
                      <span className="font-semibold">
                        {settledInfo.won
                          ? `Auto-Settled Payout: +$${settledInfo.payoutUsd.toFixed(2)}`
                          : 'PvP Stake Settled'}
                      </span>
                      <span className="font-mono font-bold">
                        {settledInfo.cryptoAmount} {settledInfo.cryptoType}
                      </span>
                    </div>
                  )}

                  {/* Round-by-round Kick Ledger */}
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {snapshot.history.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#080C0F] px-3 py-1.5 text-[11px]"
                      >
                        <span className="font-mono text-slate-400">
                          {item.isSuddenDeath ? `SD ${item.round}` : `R${item.round}`} · {item.teamCode}
                        </span>
                        <span className="font-mono text-slate-400">{item.shotSpeedKmh} km/h</span>
                        <span
                          className={`font-bold uppercase ${
                            item.outcome === 'goal'
                              ? 'text-[#4ADE80]'
                              : item.outcome === 'saved'
                              ? 'text-[#38BDF8]'
                              : 'text-rose-400'
                          }`}
                        >
                          {item.outcome}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={handleRematch}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] py-2.5 text-xs font-black text-black"
                    >
                      <RotateCcw size={14} />
                      <span>Play Rematch</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInArena(false)}
                      className="rounded-xl border border-white/15 bg-[#121820] px-4 py-2.5 text-xs font-bold text-white hover:border-white/30"
                    >
                      Setup Menu
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Floating Power Bar + Mobile Touch Controls */}
            {snapshot &&
              snapshot.phase !== 'match-over' &&
              snapshot.phase !== 'handoff' &&
              snapshot.phase !== 'level-complete' && (
                <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex flex-col sm:flex-row items-end justify-between gap-3">
                  {/* Striker Touch Aim Pad & Shoot Hold Button */}
                  {snapshot.activeControlRole === 'shoot' && (
                    <>
                      <div
                        ref={touchPadRef}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          updateAimFromPointer(e.clientX, e.clientY);
                        }}
                        onPointerMove={(e) => {
                          if (e.buttons > 0 || e.pointerType !== 'mouse') {
                            e.stopPropagation();
                            updateAimFromPointer(e.clientX, e.clientY);
                          }
                        }}
                        className="pointer-events-auto relative h-24 w-36 rounded-2xl border border-white/20 bg-[#080C0F]/85 touch-none cursor-crosshair overflow-hidden"
                      >
                        <span className="absolute top-1 left-2 text-[9px] font-mono text-slate-300">
                          AIM PAD
                        </span>
                        {/* Goal frame indicator inside pad */}
                        <div className="absolute inset-x-3 top-4 bottom-2 border-t-2 border-x-2 border-white/35 rounded-t-sm" />
                        <div
                          className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FACC15] border-2 border-black shadow"
                          style={{
                            left: `${((snapshot.aimDirection.x + 1) / 2) * 100}%`,
                            top: `${Math.max(12, Math.min(88, (1 - (snapshot.aimDirection.y + 0.2) / 1.2) * 100))}%`,
                          }}
                        />
                      </div>

                      <div className="pointer-events-auto flex items-center gap-3 ml-auto">
                        {/* Oscillating Shot Power Meter */}
                        <div className="w-36 sm:w-44 rounded-2xl border border-white/15 bg-[#080C0F]/90 p-2.5">
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-200 mb-1">
                            <span>POWER</span>
                            <span className="font-bold text-[#FACC15] tabular-nums">
                              {Math.round(snapshot.power * 100)}%
                            </span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full transition-none rounded-full"
                              style={{
                                width: `${Math.round(snapshot.power * 100)}%`,
                                background:
                                  snapshot.power > 0.78
                                    ? '#EF4444'
                                    : snapshot.power > 0.45
                                    ? '#FACC15'
                                    : '#22C55E',
                              }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            gameRef.current?.startTouchPower();
                          }}
                          onPointerUp={(e) => {
                            e.stopPropagation();
                            gameRef.current?.releaseTouchShot();
                          }}
                          onPointerLeave={() => {
                            if (snapshot.isPowerActive) gameRef.current?.releaseTouchShot();
                          }}
                          disabled={snapshot.phase !== 'ready'}
                          className="h-14 min-w-[112px] rounded-2xl bg-[#22C55E] active:scale-95 hover:bg-[#16A34A] px-5 text-xs font-black text-black shadow-xl shadow-[#22C55E]/30 disabled:opacity-40 touch-none"
                        >
                          {snapshot.isPowerActive ? 'RELEASE!' : 'HOLD TO SHOOT'}
                        </button>
                      </div>
                    </>
                  )}

                  {/* Keeper Touch Dive Buttons (Save Mode OR Simultaneous 2P) */}
                  {(snapshot.activeControlRole === 'save' ||
                    (mode === 'local-2p' && local2pStyle === 'simultaneous')) && (
                    <div className="pointer-events-auto ml-auto flex items-center gap-1.5 rounded-2xl border border-white/15 bg-[#080C0F]/90 p-2">
                      <Shield size={14} className="text-[#FACC15] mx-1 hidden sm:block" />
                      {[
                        { label: '↖ Top L', dir: { x: -1, y: 0.65 } },
                        { label: '↙ Low L', dir: { x: -1, y: -0.25 } },
                        { label: '⬆ Center', dir: { x: 0, y: 0.45 } },
                        { label: '↘ Low R', dir: { x: 1, y: -0.25 } },
                        { label: '↗ Top R', dir: { x: 1, y: 0.65 } },
                      ].map((btn) => (
                        <button
                          key={btn.label}
                          type="button"
                          onClick={() => gameRef.current?.triggerTouchDive(btn.dir)}
                          className="min-h-[44px] rounded-xl border border-white/15 bg-[#121820] hover:border-[#FACC15] active:bg-[#FACC15] active:text-black px-2.5 py-2 text-[11px] font-bold text-white transition-colors"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
