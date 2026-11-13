import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowLeft,
  Coins,
  ShieldCheck,
  Sparkles,
  Zap,
  CheckCircle2,
  Trophy,
  Users,
  Clock,
  Flame,
  ArrowUpRight,
  TrendingUp,
  CircleDollarSign,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserAvatar } from '@/lib/avatar';

// Multi-crypto rates to USD
const CRYPTO_RATES: Record<string, number> = {
  SOL: 148.5,
  ETH: 3233.0,
  BTC: 91420.0,
  USDT: 1.0,
};

type CryptoType = 'SOL' | 'ETH' | 'BTC' | 'USDT';

export type PotPlayer = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  stakeUsd: number;
  cryptoType: CryptoType;
  cryptoAmount: number;
  isUser?: boolean;
};

type RoundHistory = {
  roundId: number;
  winnerName: string;
  winnerAvatar: string;
  winnerColor: string;
  potUsd: number;
  winnerShare: number;
  timeAgo: string;
};

const BOT_PLAYERS: Omit<PotPlayer, 'stakeUsd' | 'cryptoAmount'>[] = [
  { id: 'bot-1', name: 'Chinedu (SOL Whale)', avatar: '/assets/images/avatar_crypto_trader_1794496493828.jpg', color: '#22C55E', cryptoType: 'SOL' },
  { id: 'bot-2', name: 'Adaeze (Top Bull)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', color: '#FACC15', cryptoType: 'ETH' },
  { id: 'bot-3', name: 'Kofi Alpha', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', color: '#EC4899', cryptoType: 'SOL' },
  { id: 'bot-4', name: 'Fatima Market Maker', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop', color: '#06B6D4', cryptoType: 'USDT' },
  { id: 'bot-5', name: 'SatoshiPrime', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', color: '#8B5CF6', cryptoType: 'BTC' },
  { id: 'bot-6', name: 'Zainab Degen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', color: '#F97316', cryptoType: 'SOL' },
];

const CYCLE_DURATION_MS = 180 * 1000; // 3 minutes cycle
const SPIN_DURATION_MS = 9000; // 9 seconds spin
const CELEBRATE_DURATION_MS = 6000; // 6 seconds win celebration

export function PotWheelGamePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { avatarUrl } = useUserAvatar();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>('SOL');
  const [stakeInput, setStakeInput] = useState<number>(25);
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    return Number(localStorage.getItem('sidebet_wallet_balance') || '4011');
  });

  // Cycle state
  const [now, setNow] = useState<number>(Date.now());
  const [players, setPlayers] = useState<PotPlayer[]>([]);
  const [phase, setPhase] = useState<'BETTING' | 'SPINNING' | 'CELEBRATING'>('BETTING');
  const [winner, setWinner] = useState<PotPlayer | null>(null);
  const [winningAngle, setWinningAngle] = useState<number>(0);
  const [currentWheelRotation, setCurrentWheelRotation] = useState<number>(0);
  const [history, setHistory] = useState<RoundHistory[]>([
    { roundId: 1042, winnerName: 'Adaeze (Top Bull)', winnerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', winnerColor: '#FACC15', potUsd: 740, winnerShare: 38.5, timeAgo: '3m ago' },
    { roundId: 1041, winnerName: 'Chinedu (SOL Whale)', winnerAvatar: '/assets/images/avatar_crypto_trader_1794496493828.jpg', winnerColor: '#22C55E', potUsd: 1250, winnerShare: 52.0, timeAgo: '6m ago' },
    { roundId: 1040, winnerName: 'Kofi Alpha', winnerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', winnerColor: '#EC4899', potUsd: 490, winnerShare: 18.2, timeAgo: '9m ago' },
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const spinStartAngleRef = useRef<number>(0);
  const targetRotationRef = useRef<number>(0);
  const spinStartTimeRef = useRef<number>(0);
  const lastTickSliceIndexRef = useRef<number>(-1);
  const animationFrameRef = useRef<number | null>(null);

  // Synchronized round calculation
  const currentRoundId = Math.floor(now / CYCLE_DURATION_MS);
  const cycleElapsed = now % CYCLE_DURATION_MS;
  const bettingDuration = CYCLE_DURATION_MS - SPIN_DURATION_MS - CELEBRATE_DURATION_MS;
  const timeRemainingMs = Math.max(0, bettingDuration - cycleElapsed);

  // Initialize sound
  const playWheelTick = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') void ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }, [soundEnabled]);

  const playWinFanfare = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') void ctx.resume();

      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);

        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.4);
      });
    } catch {}
  }, [soundEnabled]);

  // Seed default round participants
  useEffect(() => {
    const roundSeed = currentRoundId % 1000;
    const initialPlayers: PotPlayer[] = [
      {
        ...BOT_PLAYERS[0],
        stakeUsd: 120 + (roundSeed % 40),
        cryptoAmount: Number(((120 + (roundSeed % 40)) / CRYPTO_RATES.SOL).toFixed(3)),
      },
      {
        ...BOT_PLAYERS[1],
        stakeUsd: 85 + (roundSeed % 25),
        cryptoAmount: Number(((85 + (roundSeed % 25)) / CRYPTO_RATES.ETH).toFixed(4)),
      },
      {
        ...BOT_PLAYERS[2],
        stakeUsd: 45 + (roundSeed % 30),
        cryptoAmount: Number(((45 + (roundSeed % 30)) / CRYPTO_RATES.SOL).toFixed(3)),
      },
    ];

    setPlayers(initialPlayers);
    setWinner(null);
    setPhase('BETTING');
    setCurrentWheelRotation(0);
  }, [currentRoundId]);

  // Master clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Total Pot calculation
  const totalPotUsd = useMemo(() => {
    return players.reduce((sum, p) => sum + p.stakeUsd, 0);
  }, [players]);

  const rakeUsd = totalPotUsd * 0.04;
  const netPrizeUsd = totalPotUsd * 0.96;

  // Compute shares for each player
  const playerShares = useMemo(() => {
    if (totalPotUsd === 0) return [];
    let currentDeg = 0;

    return players.map((p) => {
      const shareFraction = p.stakeUsd / totalPotUsd;
      const sharePct = shareFraction * 100;
      const angleSpan = shareFraction * 360;
      const startAngle = currentDeg;
      const endAngle = currentDeg + angleSpan;
      currentDeg = endAngle;

      return {
        ...p,
        shareFraction,
        sharePct,
        startAngle,
        endAngle,
      };
    });
  }, [players, totalPotUsd]);

  // Manage Cycle Phases (Betting -> Spin -> Winner Celebration)
  useEffect(() => {
    if (cycleElapsed >= bettingDuration && cycleElapsed < bettingDuration + SPIN_DURATION_MS) {
      if (phase !== 'SPINNING') {
        // Start Spin!
        setPhase('SPINNING');

        // Pick deterministic or random winning player based on pot weights
        if (playerShares.length > 0) {
          const rand = Math.random();
          let accum = 0;
          let chosenPlayer = playerShares[0];

          for (const p of playerShares) {
            accum += p.shareFraction;
            if (rand <= accum) {
              chosenPlayer = p;
              break;
            }
          }

          setWinner(chosenPlayer);

          // Calculate angle so needle at top (270° or -90°) lands inside chosen slice
          // Needle points at 270 deg.
          const midSliceAngle = (chosenPlayer.startAngle + chosenPlayer.endAngle) / 2;
          const targetAngle = (270 - midSliceAngle + 360) % 360;
          const totalSpins = 360 * 6; // 6 full revolutions
          const finalRotation = totalSpins + targetAngle;

          spinStartAngleRef.current = currentWheelRotation % 360;
          targetRotationRef.current = finalRotation;
          spinStartTimeRef.current = Date.now();
        }
      }
    } else if (cycleElapsed >= bettingDuration + SPIN_DURATION_MS) {
      if (phase !== 'CELEBRATING') {
        setPhase('CELEBRATING');
        playWinFanfare();

        if (winner) {
          // If current user is winner, credit balance!
          if (winner.isUser) {
            const wonAmount = netPrizeUsd;
            const newBal = walletBalance + wonAmount;
            setWalletBalance(newBal);
            localStorage.setItem('sidebet_wallet_balance', newBal.toFixed(2));

            toast({
              title: '🎉 YOU WON THE POT!',
              description: `Congratulations! +$${wonAmount.toFixed(2)} credited to your wallet balance.`,
            });
          }

          // Add to recent history
          setHistory((prev) => [
            {
              roundId: currentRoundId,
              winnerName: winner.name,
              winnerAvatar: winner.avatar,
              winnerColor: winner.color,
              potUsd: Math.round(totalPotUsd),
              winnerShare: Number((winner.stakeUsd / totalPotUsd * 100).toFixed(1)),
              timeAgo: 'Just now',
            },
            ...prev.slice(0, 4),
          ]);
        }
      }
    } else {
      if (phase !== 'BETTING') {
        setPhase('BETTING');
        setWinner(null);
      }
    }
  }, [cycleElapsed, bettingDuration, phase, playerShares, winner, netPrizeUsd, walletBalance, totalPotUsd, currentRoundId, playWinFanfare, toast]);

  // Spin animation frame loop
  useEffect(() => {
    if (phase !== 'SPINNING') return;

    const animateSpin = () => {
      const elapsed = Date.now() - spinStartTimeRef.current;
      const progress = Math.min(1, elapsed / SPIN_DURATION_MS);

      // Smooth quintic ease out for realistic heavy casino wheel deceleration
      const easeOut = 1 - Math.pow(1 - progress, 4);
      const newRotation = spinStartAngleRef.current + (targetRotationRef.current - spinStartAngleRef.current) * easeOut;

      setCurrentWheelRotation(newRotation);

      // Play tick sound when passing slice boundaries
      const normalizedAngle = (360 - (newRotation % 360) + 270) % 360;
      const activeSliceIdx = playerShares.findIndex(
        (s) => normalizedAngle >= s.startAngle && normalizedAngle < s.endAngle
      );

      if (activeSliceIdx !== -1 && activeSliceIdx !== lastTickSliceIndexRef.current) {
        lastTickSliceIndexRef.current = activeSliceIdx;
        playWheelTick();
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateSpin);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateSpin);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [phase, playerShares, playWheelTick]);

  // Render Canvas Wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 16;

    ctx.clearRect(0, 0, size, size);

    // Save context for rotation
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((currentWheelRotation * Math.PI) / 180);

    // Draw Slices
    if (playerShares.length > 0) {
      playerShares.forEach((slice) => {
        const startRad = (slice.startAngle * Math.PI) / 180;
        const endRad = (slice.endAngle * Math.PI) / 180;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startRad, endRad);
        ctx.closePath();

        // Slice background fill
        ctx.fillStyle = slice.color;
        ctx.fill();

        // Subtle slice separator line
        ctx.strokeStyle = '#080C0F';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw percentage text and player initials if slice is wide enough
        const arcDegrees = slice.endAngle - slice.startAngle;
        if (arcDegrees > 14) {
          ctx.save();
          const midRad = (startRad + endRad) / 2;
          ctx.rotate(midRad);

          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 12px "Space Grotesk", sans-serif';
          ctx.fillText(`${slice.sharePct.toFixed(1)}%`, radius - 24, 0);

          if (arcDegrees > 28) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`$${slice.stakeUsd}`, radius - 68, 0);
          }

          ctx.restore();
        }
      });
    } else {
      // Empty placeholder
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#141C24';
      ctx.fill();
    }

    // Outer rim ring
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#1F2937';
    ctx.stroke();

    ctx.restore();

    // Center Hub (Fixed, not rotating)
    ctx.beginPath();
    ctx.arc(center, center, 56, 0, Math.PI * 2);
    ctx.fillStyle = '#080C0F';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#22C55E';
    ctx.stroke();

    // Center Hub Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('TOTAL POT', center, center - 16);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 15px "Space Grotesk", sans-serif';
    ctx.fillText(`$${totalPotUsd.toLocaleString()}`, center, center + 2);

    ctx.fillStyle = '#4ADE80';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`${players.length} Players`, center, center + 18);
  }, [playerShares, currentWheelRotation, totalPotUsd, players.length]);

  // Handle User Staking into Pot
  const handleStake = () => {
    if (stakeInput <= 0) {
      toast({ title: 'Invalid Stake', description: 'Enter an amount greater than 0', variant: 'destructive' });
      return;
    }

    if (walletBalance < stakeInput) {
      toast({
        title: 'Insufficient Balance',
        description: `You have $${walletBalance.toFixed(2)}. Deposit more crypto to join the pot!`,
        variant: 'destructive',
      });
      return;
    }

    if (phase !== 'BETTING' || timeRemainingMs < 5000) {
      toast({
        title: 'Bets Locked',
        description: 'Current round is spinning! Wait for next 3-minute cycle.',
        variant: 'destructive',
      });
      return;
    }

    // Deduct balance
    const newBal = walletBalance - stakeInput;
    setWalletBalance(newBal);
    localStorage.setItem('sidebet_wallet_balance', newBal.toFixed(2));

    const cryptoEq = Number((stakeInput / CRYPTO_RATES[selectedCrypto]).toFixed(selectedCrypto === 'BTC' ? 5 : selectedCrypto === 'ETH' ? 4 : 2));

    // Update or add user to players list
    setPlayers((prev) => {
      const existingUserIdx = prev.findIndex((p) => p.isUser);
      if (existingUserIdx !== -1) {
        const copy = [...prev];
        copy[existingUserIdx] = {
          ...copy[existingUserIdx],
          stakeUsd: copy[existingUserIdx].stakeUsd + stakeInput,
          cryptoAmount: copy[existingUserIdx].cryptoAmount + cryptoEq,
        };
        return copy;
      } else {
        const newPlayer: PotPlayer = {
          id: 'user-me',
          name: 'You (Trader)',
          avatar: avatarUrl,
          color: '#22C55E',
          stakeUsd: stakeInput,
          cryptoType: selectedCrypto,
          cryptoAmount: cryptoEq,
          isUser: true,
        };
        return [newPlayer, ...prev];
      }
    });

    toast({
      title: 'Stake Added to Pot!',
      description: `+$${stakeInput}.00 (${cryptoEq} ${selectedCrypto}) successfully entered. Your pot share increased!`,
    });
  };

  // Format MM:SS
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const userPlayer = players.find((p) => p.isUser);
  const userSharePct = userPlayer && totalPotUsd > 0 ? ((userPlayer.stakeUsd / totalPotUsd) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/pvp"
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-[#121820] text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#22C55E] font-bold">
                PVP ARENA
              </span>
              <span className="rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 px-2 py-0.5 text-[9px] font-mono font-bold text-[#4ADE80]">
                3-MIN POT WHEEL
              </span>
            </div>
            <h1 className="text-2xl font-extrabold font-display text-white">Wheel of the Pot</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-[#121820] text-slate-300 hover:text-white"
          >
            {soundEnabled ? <Volume2 size={16} className="text-[#4ADE80]" /> : <VolumeX size={16} />}
          </button>

          {/* Quick Balance */}
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-[#0F1713] px-4 py-2 font-mono text-xs">
            <span className="text-slate-400">Balance:</span>
            <span className="text-[#4ADE80] font-black">${walletBalance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Main Wheel Arena Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center: Interactive Wheel Stage */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-[#0E1318] p-6 lg:p-8 shadow-2xl relative overflow-hidden">
          {/* Neon ambient glows */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full blur-[100px] opacity-20 bg-[#22C55E]" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full blur-[100px] opacity-20 bg-[#EC4899]" />

          {/* Top Status Bar: Timer & Round */}
          <div className="w-full flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="font-mono text-xs text-slate-400">Round #{currentRoundId}</span>
            </div>

            {/* Countdown Badge */}
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-[#FACC15]" />
              <span
                className={`font-mono text-sm font-black px-3 py-1 rounded-xl border ${
                  phase === 'SPINNING'
                    ? 'bg-[#EC4899]/20 text-[#EC4899] border-[#EC4899]/40 animate-pulse'
                    : timeRemainingMs < 15000
                    ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40 animate-bounce'
                    : 'bg-[#121820] text-white border-white/10'
                }`}
              >
                {phase === 'SPINNING'
                  ? 'SPINNING NOW!'
                  : phase === 'CELEBRATING'
                  ? 'ROUND SETTLED'
                  : formatTime(timeRemainingMs)}
              </span>
            </div>
          </div>

          {/* Wheel Canvas Container with Top Needle Pointer */}
          <div className="relative my-4 flex items-center justify-center">
            {/* Pointer / Needle at 12 o'clock */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
              <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[22px] border-t-[#EC4899] drop-shadow-[0_2px_10px_rgba(236,72,153,0.8)]" />
              <div className="h-2 w-2 rounded-full bg-white -mt-1 ring-2 ring-[#EC4899]" />
            </div>

            {/* Canvas Wheel */}
            <canvas
              ref={canvasRef}
              width={380}
              height={380}
              className="max-w-full drop-shadow-[0_0_35px_rgba(34,197,94,0.15)]"
            />
          </div>

          {/* Winner Celebration Banner */}
          {phase === 'CELEBRATING' && winner && (
            <div className="mt-4 w-full rounded-2xl border border-[#FACC15]/40 bg-[#17160F] p-4 text-center animate-in zoom-in-95 space-y-2">
              <div className="flex items-center justify-center gap-2 text-[#FACC15] font-black text-xs uppercase tracking-wider">
                <Trophy size={16} />
                <span>Round Winner Decided!</span>
              </div>
              <div className="text-xl font-extrabold text-white flex items-center justify-center gap-2">
                <span>{winner.name}</span>
                <span className="text-[#4ADE80] font-mono">Won ${netPrizeUsd.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Had a {winner.isUser ? userSharePct : ((winner.stakeUsd / totalPotUsd) * 100).toFixed(1)}% slice of the pool · Starting next 3-min round in a few seconds...
              </p>
            </div>
          )}

          {/* User Pot Share Info Bar */}
          <div className="mt-4 w-full grid grid-cols-3 gap-3 border-t border-white/5 pt-4 text-center">
            <div className="rounded-2xl border border-white/5 bg-[#121820] p-3">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Your Stake</span>
              <span className="text-base font-black font-mono text-white">
                ${userPlayer?.stakeUsd.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="rounded-2xl border border-white/5 bg-[#121820] p-3">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Your Pot Share</span>
              <span className="text-base font-black font-mono text-[#22C55E]">
                {userSharePct}%
              </span>
            </div>
            <div className="rounded-2xl border border-white/5 bg-[#121820] p-3">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Winner Payout</span>
              <span className="text-base font-black font-mono text-[#FACC15]">
                ${netPrizeUsd.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Stake Controls & Live Players List */}
        <div className="lg:col-span-5 space-y-6">
          {/* Staking Action Panel */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CircleDollarSign size={18} className="text-[#22C55E]" />
                  <span>Join Current Pot</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Stake to claim a percentage of the wheel. Higher stake = bigger slice!
                </p>
              </div>

              {/* Currency Picker */}
              <div className="flex items-center gap-1 bg-[#121820] p-1 rounded-xl border border-white/5">
                {(['SOL', 'ETH', 'BTC', 'USDT'] as const).map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setSelectedCrypto(curr)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold transition-all ${
                      selectedCrypto === curr
                        ? 'bg-[#22C55E] text-black shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            {/* Stake Presets */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-300 font-semibold">Select Stake Amount</span>
                <span className="font-mono text-[#4ADE80] font-bold">
                  {(stakeInput / CRYPTO_RATES[selectedCrypto]).toFixed(selectedCrypto === 'BTC' ? 5 : selectedCrypto === 'ETH' ? 4 : 2)} {selectedCrypto}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3">
                {[10, 25, 50, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setStakeInput(val)}
                    className={`py-2 rounded-xl border text-xs font-mono font-bold transition-all ${
                      stakeInput === val
                        ? 'border-[#22C55E] bg-[#121B16] text-[#4ADE80] ring-1 ring-[#22C55E]/40'
                        : 'border-white/[0.08] bg-[#121820] text-slate-300 hover:border-white/20'
                    }`}
                  >
                    ${val}
                  </button>
                ))}
              </div>

              {/* Custom input */}
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">$</span>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={stakeInput || ''}
                  onChange={(e) => setStakeInput(Number(e.target.value))}
                  placeholder="Custom stake..."
                  className="w-full rounded-2xl border border-white/10 bg-[#080C0F] py-2.5 pl-8 pr-4 text-xs font-mono text-white placeholder:text-slate-500 focus:border-[#22C55E] focus:outline-none"
                />
              </div>
            </div>

            {/* Stake CTA Button */}
            <button
              type="button"
              disabled={phase !== 'BETTING' || timeRemainingMs < 5000}
              onClick={handleStake}
              className={`w-full rounded-2xl py-3.5 text-xs font-black shadow-lg transition-all flex items-center justify-center gap-2 ${
                phase !== 'BETTING' || timeRemainingMs < 5000
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-[#22C55E] hover:bg-[#16A34A] text-black shadow-[#22C55E]/20 hover:scale-[1.01] active:scale-[0.98]'
              }`}
            >
              <Zap size={15} />
              <span>
                {phase !== 'BETTING'
                  ? 'BETS LOCKED (SPINNING)'
                  : userPlayer
                  ? `ADD $${stakeInput} TO EXPAND SLICE`
                  : `ENTER POT ($${stakeInput}.00)`}
              </span>
            </button>
          </div>

          {/* Active Round Players List */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users size={16} className="text-[#4ADE80]" />
                <span>Round #{currentRoundId} Contenders ({players.length})</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">4% House Rake</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {playerShares.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    p.isUser
                      ? 'border-[#22C55E]/50 bg-[#121B16] ring-1 ring-[#22C55E]/30'
                      : 'border-white/5 bg-[#121820]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-xl flex items-center justify-center font-bold text-black text-xs font-mono shrink-0 shadow-sm"
                      style={{ background: p.color }}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {p.isUser && (
                          <span className="rounded bg-[#22C55E]/20 px-1 py-0.2 text-[9px] font-mono font-bold text-[#4ADE80]">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ${p.stakeUsd} ({p.cryptoAmount} {p.cryptoType})
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-xs font-black text-white">{p.sharePct.toFixed(1)}%</span>
                    <span className="block text-[9px] text-slate-400">wheel share</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Previous Winners History */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0E1318] p-6 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <Trophy size={16} className="text-[#FACC15]" />
              <span>Recent Pot Winners</span>
            </h3>

            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.roundId} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.03]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: h.winnerColor }} />
                    <span className="font-semibold text-slate-200">{h.winnerName}</span>
                    <span className="text-[10px] font-mono text-slate-500">#{h.roundId}</span>
                  </div>

                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-400 text-[10px]">{h.winnerShare}% share</span>
                    <span className="font-bold text-[#4ADE80]">${h.potUsd}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
