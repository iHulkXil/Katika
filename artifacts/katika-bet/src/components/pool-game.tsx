import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useRoute, Link } from 'wouter';
import { useServerSession } from '@/components/server-session';
import { useLegend } from '@/components/legend-card';
import { useToast } from '@/hooks/use-toast';
import {
  Trophy,
  Swords,
  RotateCcw,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Bot,
  Users,
  Crosshair,
  Award,
  ArrowRight,
  Shield,
  HelpCircle,
  Play,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

// =============================================================================
// WEB AUDIO SOUND SYNTHESIZER (NO EXTERNAL AUDIO ASSETS NEEDED)
// =============================================================================
class PoolAudio {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  playCueHit(power: number) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);

      const vol = Math.min(0.8, Math.max(0.1, power * 0.8));
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    } catch {
      // Ignored
    }
  }

  playBallClack(speed: number) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const baseFreq = 950 + Math.random() * 250;
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, t + 0.04);

      const vol = Math.min(0.6, Math.max(0.05, speed * 0.08));
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch {
      // Ignored
    }
  }

  playPocketDrop() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.2);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    } catch {
      // Ignored
    }
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [440, 554, 659, 880];
      notes.forEach((freq, idx) => {
        const t = this.ctx!.currentTime + idx * 0.12;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t);
        osc.stop(t + 0.32);
      });
    } catch {
      // Ignored
    }
  }
}

const poolAudio = new PoolAudio();

// =============================================================================
// 8-BALL BILLIARDS CONSTANTS & TYPES
// =============================================================================
export type BallType = 'cue' | 'solid' | 'stripe' | 'eight';

export interface Ball {
  id: number; // 0 is cue, 1-7 solids, 8 is 8-ball, 9-15 stripes
  type: BallType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  pocketed: boolean;
  sinkScale: number;
}

export type PlayerGroup = 'solids' | 'stripes' | null;

interface Pocket {
  x: number;
  y: number;
  r: number;
}

// Table coordinate space: 800 x 420
const TABLE_WIDTH = 800;
const TABLE_HEIGHT = 420;
const CUSHION_LEFT = 52;
const CUSHION_RIGHT = 748;
const CUSHION_TOP = 52;
const CUSHION_BOTTOM = 368;
const BALL_RADIUS = 10.5;
const FRICTION = 0.985;
const RESTITUTION_BALL = 0.95;
const RESTITUTION_RAIL = 0.90;

const POCKETS: Pocket[] = [
  { x: 52, y: 52, r: 24 }, // Top-Left
  { x: 400, y: 46, r: 20 }, // Top-Center
  { x: 748, y: 52, r: 24 }, // Top-Right
  { x: 52, y: 368, r: 24 }, // Bottom-Left
  { x: 400, y: 374, r: 20 }, // Bottom-Center
  { x: 748, y: 368, r: 24 }, // Bottom-Right
];

const BALL_COLORS: Record<number, string> = {
  0: '#ffffff', // Cue
  1: '#facc15', // Solid Yellow
  2: '#2563eb', // Solid Blue
  3: '#dc2626', // Solid Red
  4: '#9333ea', // Solid Purple
  5: '#ea580c', // Solid Orange
  6: '#16a34a', // Solid Green
  7: '#7f1d1d', // Solid Maroon
  8: '#09090b', // 8-Ball Black
  9: '#facc15', // Stripe Yellow
  10: '#2563eb', // Stripe Blue
  11: '#dc2626', // Stripe Red
  12: '#9333ea', // Stripe Purple
  13: '#ea580c', // Stripe Orange
  14: '#16a34a', // Stripe Green
  15: '#7f1d1d', // Stripe Maroon
};

function createInitialRack(): Ball[] {
  const balls: Ball[] = [];

  // Cue ball at head line
  balls.push({
    id: 0,
    type: 'cue',
    x: 220,
    y: TABLE_HEIGHT / 2,
    vx: 0,
    vy: 0,
    r: BALL_RADIUS,
    color: BALL_COLORS[0],
    pocketed: false,
    sinkScale: 1,
  });

  // Standard 8-ball triangle rack coordinates at foot spot
  const startX = 560;
  const startY = TABLE_HEIGHT / 2;
  const d = BALL_RADIUS * 2 + 0.5;
  const sqrt3 = Math.sqrt(3);

  // Standard rack layout IDs
  // Row 1: 1 ball
  // Row 2: 2 balls
  // Row 3: 3 balls (8-ball in center)
  // Row 4: 4 balls
  // Row 5: 5 balls
  const rackPattern = [
    [1], // Row 1
    [9, 2], // Row 2
    [3, 8, 10], // Row 3 (8-ball center)
    [11, 4, 12, 5], // Row 4
    [6, 13, 7, 14, 15], // Row 5
  ];

  rackPattern.forEach((row, colIdx) => {
    const rx = startX + colIdx * (d * 0.866);
    const rowHeight = (row.length - 1) * d;
    const topY = startY - rowHeight / 2;

    row.forEach((id, rowIdx) => {
      const ry = topY + rowIdx * d;
      const type: BallType = id === 8 ? 'eight' : id <= 7 ? 'solid' : 'stripe';
      balls.push({
        id,
        type,
        x: rx + (Math.random() - 0.5) * 0.5,
        y: ry + (Math.random() - 0.5) * 0.5,
        vx: 0,
        vy: 0,
        r: BALL_RADIUS,
        color: BALL_COLORS[id],
        pocketed: false,
        sinkScale: 1,
      });
    });
  });

  return balls;
}

// =============================================================================
// MAIN COMPONENT: POOL GAME PAGE
// =============================================================================
export function PoolGamePage() {
  const [, paramsPvp] = useRoute('/pvp/pool/:id');
  const [, setLocation] = useLocation();
  const matchId = paramsPvp?.id;

  const { serverUser, refresh: refreshUser } = useServerSession();
  const { legend } = useLegend();
  const { toast } = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Game configuration & mode
  const [gameMode, setGameMode] = useState<'pvp' | 'ai' | 'pass_play' | 'practice'>('ai');
  const [stake, setStake] = useState<number>(10);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Turn & match state
  const [turn, setTurn] = useState<1 | 2>(1); // Player 1 (User) or Player 2 (Opponent/AI)
  const [p1Group, setP1Group] = useState<PlayerGroup>(null);
  const [p2Group, setP2Group] = useState<PlayerGroup>(null);
  const [balls, setBalls] = useState<Ball[]>(createInitialRack);
  const [isShooting, setIsShooting] = useState(false);
  const [ballsMoving, setBallsMoving] = useState(false);
  const [foulMessage, setFoulMessage] = useState<string | null>(null);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [shotCount, setShotCount] = useState(0);

  // Cue stick aiming & power
  const [aimAngle, setAimAngle] = useState(0); // In radians
  const [shotPower, setShotPower] = useState(65); // 10 to 100
  const [isAiming, setIsAiming] = useState(false);
  const [isBallInHand, setIsBallInHand] = useState(false);

  // State refs for animation loop
  const ballsRef = useRef<Ball[]>(balls);
  ballsRef.current = balls;
  const isShootingRef = useRef(isShooting);
  isShootingRef.current = isShooting;
  const aimAngleRef = useRef(aimAngle);
  aimAngleRef.current = aimAngle;
  const shotPowerRef = useRef(shotPower);
  shotPowerRef.current = shotPower;
  const turnRef = useRef(turn);
  turnRef.current = turn;
  const p1GroupRef = useRef(p1Group);
  p1GroupRef.current = p1Group;
  const p2GroupRef = useRef(p2Group);
  p2GroupRef.current = p2Group;
  const winnerRef = useRef(winner);
  winnerRef.current = winner;

  // Track first ball hit on current shot
  const firstHitRef = useRef<Ball | null>(null);
  const pocketedThisTurnRef = useRef<Ball[]>([]);

  // Sound sync
  useEffect(() => {
    poolAudio.enabled = soundEnabled;
  }, [soundEnabled]);

  // Handle Table Reset
  const handleResetRack = useCallback(() => {
    const newRack = createInitialRack();
    setBalls(newRack);
    ballsRef.current = newRack;
    setTurn(1);
    setP1Group(null);
    setP2Group(null);
    setWinner(null);
    setFoulMessage(null);
    setIsBallInHand(false);
    setIsShooting(false);
    setBallsMoving(false);
    toast({ title: 'New Rack Set', description: 'Table broken down and racked clean.' });
  }, [toast]);

  // AI Shot Logic
  const executeAiTurn = useCallback(() => {
    if (winnerRef.current || ballsMoving) return;
    toast({ title: 'AI Katika Shark is aiming...', description: 'Calculating bank angle & trajectory.' });

    setTimeout(() => {
      const cue = ballsRef.current.find((b) => b.id === 0);
      if (!cue || cue.pocketed) return;

      const group = p2GroupRef.current;
      // Filter target balls
      let eligible = ballsRef.current.filter((b) => !b.pocketed && b.id !== 0);
      if (group === 'solids') {
        const solidsLeft = eligible.filter((b) => b.type === 'solid');
        eligible = solidsLeft.length > 0 ? solidsLeft : eligible.filter((b) => b.type === 'eight');
      } else if (group === 'stripes') {
        const stripesLeft = eligible.filter((b) => b.type === 'stripe');
        eligible = stripesLeft.length > 0 ? stripesLeft : eligible.filter((b) => b.type === 'eight');
      } else {
        // Open table: any solid or stripe
        eligible = eligible.filter((b) => b.type === 'solid' || b.type === 'stripe');
      }

      if (eligible.length === 0) eligible = ballsRef.current.filter((b) => !b.pocketed && b.id === 8);
      if (eligible.length === 0) return;

      // Pick target ball closest to any pocket
      let bestTarget = eligible[0];
      let bestAngle = 0;
      let minPocketDist = 9999;

      eligible.forEach((tb) => {
        POCKETS.forEach((p) => {
          const dist = Math.hypot(p.x - tb.x, p.y - tb.y);
          if (dist < minPocketDist) {
            minPocketDist = dist;
            bestTarget = tb;
            // Angle from cue to target
            bestAngle = Math.atan2(tb.y - cue.y, tb.x - cue.x);
          }
        });
      });

      // Add small human-like jitter
      const jitter = (Math.random() - 0.5) * 0.08;
      const finalAngle = bestAngle + jitter;
      setAimAngle(finalAngle);
      aimAngleRef.current = finalAngle;

      const randomPower = 50 + Math.floor(Math.random() * 35);
      setShotPower(randomPower);

      setTimeout(() => {
        fireShot(finalAngle, randomPower);
      }, 700);
    }, 1200);
  }, [ballsMoving, toast]);

  // Trigger shot
  const fireShot = (angle: number, powerVal: number) => {
    const cue = ballsRef.current.find((b) => b.id === 0);
    if (!cue || cue.pocketed) {
      toast({ title: 'Cue ball in pocket!', description: 'Place cue ball on table.', variant: 'destructive' });
      return;
    }

    const impulse = (powerVal / 100) * 22;
    cue.vx = Math.cos(angle) * impulse;
    cue.vy = Math.sin(angle) * impulse;

    poolAudio.playCueHit(powerVal / 100);

    firstHitRef.current = null;
    pocketedThisTurnRef.current = [];
    setIsShooting(true);
    setBallsMoving(true);
    setFoulMessage(null);
    setShotCount((s) => s + 1);
  };

  // User Fires Shot
  const handleShoot = () => {
    if (ballsMoving || winner || isShooting) return;
    fireShot(aimAngle, shotPower);
  };

  // Turn Resolution after all balls stop moving
  const handleTurnComplete = useCallback(() => {
    setIsShooting(false);
    setBallsMoving(false);

    const pocketed = pocketedThisTurnRef.current;
    const firstHit = firstHitRef.current;
    const currentTurn = turnRef.current;
    const currentGroup = currentTurn === 1 ? p1GroupRef.current : p2GroupRef.current;

    const cueBall = ballsRef.current.find((b) => b.id === 0);
    const cuePocketed = !cueBall || cueBall.pocketed;
    const eightPocketed = pocketed.some((b) => b.id === 8);

    // 1. Check 8-Ball sink condition
    if (eightPocketed) {
      poolAudio.playFanfare();
      const remainingAssigned = ballsRef.current.filter((b) => {
        if (b.pocketed || b.id === 0 || b.id === 8) return false;
        if (currentGroup === 'solids') return b.type === 'solid';
        if (currentGroup === 'stripes') return b.type === 'stripe';
        return false;
      });

      if (remainingAssigned.length === 0 && !cuePocketed) {
        // Legal 8-ball win!
        setWinner(currentTurn);
        toast({
          title: `Player ${currentTurn} Wins! 🏆`,
          description: 'Pocketed the 8-ball clean to take the championship.',
        });
      } else {
        // Early 8-ball or scratched on 8 -> Loss!
        const otherPlayer = currentTurn === 1 ? 2 : 1;
        setWinner(otherPlayer);
        toast({
          title: `Foul! 8-Ball Sunk Early`,
          description: `Player ${otherPlayer} is awarded the victory!`,
          variant: 'destructive',
        });
      }
      return;
    }

    // 2. Scratch handling (cue ball pocketed)
    if (cuePocketed) {
      setFoulMessage(`Player ${currentTurn} Scratched! Cue ball in pocket.`);
      poolAudio.playPocketDrop();
      // Respawn cue ball behind head line
      if (cueBall) {
        cueBall.pocketed = false;
        cueBall.sinkScale = 1;
        cueBall.x = 220;
        cueBall.y = TABLE_HEIGHT / 2;
        cueBall.vx = 0;
        cueBall.vy = 0;
      }
      // Pass turn to opponent with ball in hand
      const nextTurn = currentTurn === 1 ? 2 : 1;
      setTurn(nextTurn);
      setIsBallInHand(true);
      toast({
        title: 'Foul: Scratch',
        description: `Player ${nextTurn} gets ball in hand!`,
        variant: 'destructive',
      });
      return;
    }

    // 3. Open table group assignment
    if (!p1GroupRef.current && !p2GroupRef.current) {
      const firstNonEight = pocketed.find((b) => b.type === 'solid' || b.type === 'stripe');
      if (firstNonEight) {
        const assigned = firstNonEight.type === 'solid' ? 'solids' : 'stripes';
        const opposite = assigned === 'solids' ? 'stripes' : 'solids';
        if (currentTurn === 1) {
          setP1Group(assigned);
          setP2Group(opposite);
        } else {
          setP2Group(assigned);
          setP1Group(opposite);
        }
        toast({
          title: `Group Assigned: ${assigned.toUpperCase()}`,
          description: `Player ${currentTurn} claimed ${assigned}.`,
        });
      }
    }

    // 4. Continued turn vs Next turn
    // If player legally potted at least one of their assigned balls, they continue!
    const pottedOwnGroup = pocketed.some((b) => {
      const activeGrp = currentTurn === 1 ? p1GroupRef.current : p2GroupRef.current;
      if (!activeGrp) return b.type === 'solid' || b.type === 'stripe';
      return (activeGrp === 'solids' && b.type === 'solid') || (activeGrp === 'stripes' && b.type === 'stripe');
    });

    if (pottedOwnGroup && pocketed.length > 0) {
      toast({ title: `Player ${currentTurn} Continues!`, description: 'Legal ball potted, shoot again.' });
      // If AI's turn continues
      if (currentTurn === 2 && gameMode === 'ai') {
        setTimeout(executeAiTurn, 1000);
      }
    } else {
      // Pass turn to opponent
      const nextTurn = currentTurn === 1 ? 2 : 1;
      setTurn(nextTurn);
      if (nextTurn === 2 && gameMode === 'ai') {
        setTimeout(executeAiTurn, 1000);
      }
    }
  }, [gameMode, executeAiTurn, toast]);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // -------------------------------------------------------------
      // 1. PHYSICS UPDATE (SUB-STEPPING FOR SMOOTH TUNNEL-FREE ACCURACY)
      // -------------------------------------------------------------
      let anyMoving = false;
      const subSteps = 6;
      const dt = 1 / subSteps;

      for (let step = 0; step < subSteps; step++) {
        // Move balls
        for (const b of ballsRef.current) {
          if (b.pocketed) continue;

          b.x += b.vx * dt;
          b.y += b.vy * dt;

          b.vx *= Math.pow(FRICTION, dt);
          b.vy *= Math.pow(FRICTION, dt);

          const speedSq = b.vx * b.vx + b.vy * b.vy;
          if (speedSq > 0.005) {
            anyMoving = true;
          } else {
            b.vx = 0;
            b.vy = 0;
          }

          // Check Pocket Collisions
          for (const p of POCKETS) {
            const dist = Math.hypot(b.x - p.x, b.y - p.y);
            if (dist < p.r) {
              b.pocketed = true;
              b.vx = 0;
              b.vy = 0;
              poolAudio.playPocketDrop();
              pocketedThisTurnRef.current.push(b);
              break;
            }
          }

          if (b.pocketed) continue;

          // Rail Cushion Collisions
          // Left Rail
          if (b.x - b.r < CUSHION_LEFT) {
            if (b.y > CUSHION_TOP + 15 && b.y < CUSHION_BOTTOM - 15) {
              b.x = CUSHION_LEFT + b.r;
              b.vx = -b.vx * RESTITUTION_RAIL;
              poolAudio.playBallClack(Math.abs(b.vx));
            }
          }
          // Right Rail
          if (b.x + b.r > CUSHION_RIGHT) {
            if (b.y > CUSHION_TOP + 15 && b.y < CUSHION_BOTTOM - 15) {
              b.x = CUSHION_RIGHT - b.r;
              b.vx = -b.vx * RESTITUTION_RAIL;
              poolAudio.playBallClack(Math.abs(b.vx));
            }
          }
          // Top Rail
          if (b.y - b.r < CUSHION_TOP) {
            // Check top middle pocket opening gap
            const isNearCenter = Math.abs(b.x - 400) < 25;
            if (!isNearCenter && b.x > CUSHION_LEFT + 15 && b.x < CUSHION_RIGHT - 15) {
              b.y = CUSHION_TOP + b.r;
              b.vy = -b.vy * RESTITUTION_RAIL;
              poolAudio.playBallClack(Math.abs(b.vy));
            }
          }
          // Bottom Rail
          if (b.y + b.r > CUSHION_BOTTOM) {
            const isNearCenter = Math.abs(b.x - 400) < 25;
            if (!isNearCenter && b.x > CUSHION_LEFT + 15 && b.x < CUSHION_RIGHT - 15) {
              b.y = CUSHION_BOTTOM - b.r;
              b.vy = -b.vy * RESTITUTION_RAIL;
              poolAudio.playBallClack(Math.abs(b.vy));
            }
          }
        }

        // Ball-to-Ball Elastic Collisions
        for (let i = 0; i < ballsRef.current.length; i++) {
          const b1 = ballsRef.current[i];
          if (b1.pocketed) continue;

          for (let j = i + 1; j < ballsRef.current.length; j++) {
            const b2 = ballsRef.current[j];
            if (b2.pocketed) continue;

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = b1.r + b2.r;

            if (dist < minDist && dist > 0.001) {
              // Track first collision on cue shot
              if (b1.id === 0 && !firstHitRef.current) firstHitRef.current = b2;
              if (b2.id === 0 && !firstHitRef.current) firstHitRef.current = b1;

              // Normal vector
              const nx = dx / dist;
              const ny = dy / dist;

              // Separate overlapping balls
              const overlap = minDist - dist;
              b1.x -= nx * overlap * 0.5;
              b1.y -= ny * overlap * 0.5;
              b2.x += nx * overlap * 0.5;
              b2.y += ny * overlap * 0.5;

              // Normal velocity difference
              const kx = b1.vx - b2.vx;
              const ky = b1.vy - b2.vy;
              const p = 2 * (nx * kx + ny * ky) / 2;

              b1.vx -= p * nx * RESTITUTION_BALL;
              b1.vy -= p * ny * RESTITUTION_BALL;
              b2.vx += p * nx * RESTITUTION_BALL;
              b2.vy += p * ny * RESTITUTION_BALL;

              const relativeImpact = Math.hypot(kx, ky);
              if (relativeImpact > 0.2) {
                poolAudio.playBallClack(relativeImpact);
              }
            }
          }
        }
      }

      // Check transition from moving to stopped
      if (isShootingRef.current && !anyMoving) {
        handleTurnComplete();
      }

      // -------------------------------------------------------------
      // 2. CANVAS DRAWING
      // -------------------------------------------------------------
      ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

      // A. Outer Wooden Rail & Mahogany Table Border
      ctx.save();
      const woodGrad = ctx.createLinearGradient(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
      woodGrad.addColorStop(0, '#3e1e0d');
      woodGrad.addColorStop(0.3, '#2a1308');
      woodGrad.addColorStop(0.7, '#4a2410');
      woodGrad.addColorStop(1, '#1e0c05');
      ctx.fillStyle = woodGrad;
      ctx.beginPath();
      ctx.roundRect(10, 10, TABLE_WIDTH - 20, TABLE_HEIGHT - 20, 24);
      ctx.fill();

      // Outer Gold Trim
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Diamond Inlays on Rails
      ctx.fillStyle = '#fef08a';
      const diamondSites = [
        // Top diamonds
        { x: 180, y: 30 },
        { x: 290, y: 30 },
        { x: 510, y: 30 },
        { x: 620, y: 30 },
        // Bottom diamonds
        { x: 180, y: 390 },
        { x: 290, y: 390 },
        { x: 510, y: 390 },
        { x: 620, y: 390 },
        // Left diamonds
        { x: 30, y: 155 },
        { x: 30, y: 265 },
        // Right diamonds
        { x: 770, y: 155 },
        { x: 770, y: 265 },
      ];
      diamondSites.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // B. Emerald Green Baize Felt Playing Surface
      const feltGrad = ctx.createRadialGradient(400, 210, 50, 400, 210, 380);
      feltGrad.addColorStop(0, '#0d6b4b');
      feltGrad.addColorStop(0.6, '#085037');
      feltGrad.addColorStop(1, '#043423');
      ctx.fillStyle = feltGrad;
      ctx.beginPath();
      ctx.roundRect(CUSHION_LEFT, CUSHION_TOP, CUSHION_RIGHT - CUSHION_LEFT, CUSHION_BOTTOM - CUSHION_TOP, 12);
      ctx.fill();

      // Cushion Inner Drop Shadow
      ctx.strokeStyle = '#021e14';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Head String Line & Foot Spot
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(220, CUSHION_TOP);
      ctx.lineTo(220, CUSHION_BOTTOM);
      ctx.stroke();

      // Foot Spot Dot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(560, 210, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // C. Six Pockets with Brass Rim Castings
      POCKETS.forEach((p) => {
        // Brass pocket rim
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 3, 0, Math.PI * 2);
        ctx.fill();

        // Deep leather pocket drop hole
        const holeGrad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
        holeGrad.addColorStop(0, '#000000');
        holeGrad.addColorStop(0.8, '#09090b');
        holeGrad.addColorStop(1, '#18181b');
        ctx.fillStyle = holeGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // D. Balls Render (3D Spherical Shading & Stripes)
      ballsRef.current.forEach((b) => {
        if (b.pocketed) return;

        ctx.save();
        // Drop shadow under ball
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;

        // Base sphere circle
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = b.type === 'stripe' ? '#ffffff' : b.color;
        ctx.fill();
        ctx.restore();

        // If striped ball, paint colored waist band
        if (b.type === 'stripe') {
          ctx.save();
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.clip();

          ctx.fillStyle = b.color;
          ctx.fillRect(b.x - b.r, b.y - b.r * 0.45, b.r * 2, b.r * 0.9);
          ctx.restore();
        }

        // Center White Number Circle (except cue ball)
        if (b.id !== 0) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * 0.42, 0, Math.PI * 2);
          ctx.fill();

          // Ball number
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 7px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(b.id), b.x, b.y + 0.5);
        } else {
          // Red aiming dot on cue ball
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(b.x, b.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Specular 3D Glass / Resin Shine Highlight
        const shineGrad = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.35, 1, b.x, b.y, b.r);
        shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        shineGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.2)');
        shineGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = shineGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // E. Aiming Line & Cue Stick (When not in motion)
      const cue = ballsRef.current.find((b) => b.id === 0);
      if (cue && !cue.pocketed && !isShootingRef.current && !winnerRef.current) {
        const curAngle = aimAngleRef.current;
        const curPower = shotPowerRef.current;

        // 1. Raycast Guide Line to first collision
        let hitDist = 450;
        let ghostX = cue.x + Math.cos(curAngle) * hitDist;
        let ghostY = cue.y + Math.sin(curAngle) * hitDist;
        let hitTargetBall: Ball | null = null;

        // Check intersection with any active ball
        for (const tb of ballsRef.current) {
          if (tb.id === 0 || tb.pocketed) continue;
          // Vector from cue to target
          const dx = tb.x - cue.x;
          const dy = tb.y - cue.y;
          const dProj = dx * Math.cos(curAngle) + dy * Math.sin(curAngle);
          if (dProj > 0 && dProj < hitDist) {
            const perpDist = Math.abs(-Math.sin(curAngle) * dx + Math.cos(curAngle) * dy);
            if (perpDist < BALL_RADIUS * 2) {
              const backOffset = Math.sqrt(Math.max(0, Math.pow(BALL_RADIUS * 2, 2) - Math.pow(perpDist, 2)));
              const actualDist = dProj - backOffset;
              if (actualDist > 0 && actualDist < hitDist) {
                hitDist = actualDist;
                ghostX = cue.x + Math.cos(curAngle) * hitDist;
                ghostY = cue.y + Math.sin(curAngle) * hitDist;
                hitTargetBall = tb;
              }
            }
          }
        }

        // Draw Aim Trajectory Laser Line
        ctx.save();
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cue.x, cue.y);
        ctx.lineTo(ghostX, ghostY);
        ctx.stroke();
        ctx.restore();

        // Draw Ghost Ball at Projected Impact
        ctx.save();
        ctx.strokeStyle = '#35d399';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(ghostX, ghostY, BALL_RADIUS, 0, Math.PI * 2);
        ctx.stroke();

        // Deflected target ball guide line
        if (hitTargetBall) {
          const defAngle = Math.atan2(hitTargetBall.y - ghostY, hitTargetBall.x - ghostX);
          ctx.strokeStyle = 'rgba(254, 240, 138, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(hitTargetBall.x, hitTargetBall.y);
          ctx.lineTo(hitTargetBall.x + Math.cos(defAngle) * 55, hitTargetBall.y + Math.sin(defAngle) * 55);
          ctx.stroke();
        }
        ctx.restore();

        // 2. Realistic Tapered Wood Cue Stick
        const pullback = 18 + (curPower / 100) * 35;
        const stickLength = 220;
        const stickStartX = cue.x - Math.cos(curAngle) * pullback;
        const stickStartY = cue.y - Math.sin(curAngle) * pullback;
        const stickEndX = stickStartX - Math.cos(curAngle) * stickLength;
        const stickEndY = stickStartY - Math.sin(curAngle) * stickLength;

        ctx.save();
        // Stick shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 4;

        // Stick wood gradient
        const cueGrad = ctx.createLinearGradient(stickStartX, stickStartY, stickEndX, stickEndY);
        cueGrad.addColorStop(0, '#fef08a'); // Chalk tip & ferrule
        cueGrad.addColorStop(0.04, '#eab308'); // Brass ferrule
        cueGrad.addColorStop(0.08, '#d4af37');
        cueGrad.addColorStop(0.5, '#b45309'); // Maple shaft
        cueGrad.addColorStop(0.9, '#451a03'); // Walnut butt
        cueGrad.addColorStop(1, '#1c1917'); // Rubber bumper

        ctx.strokeStyle = cueGrad;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(stickStartX, stickStartY);
        ctx.lineTo(stickEndX, stickEndY);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [handleTurnComplete]);

  // Handle Mouse/Touch Interaction on Table for Aiming
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (ballsMoving || winner) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = TABLE_WIDTH / rect.width;
    const scaleY = TABLE_HEIGHT / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const cue = ballsRef.current.find((b) => b.id === 0);
    if (!cue) return;

    // If ball in hand, allow repositioning cue ball behind kitchen line
    if (isBallInHand) {
      cue.x = Math.max(CUSHION_LEFT + BALL_RADIUS, Math.min(260, clickX));
      cue.y = Math.max(CUSHION_TOP + BALL_RADIUS, Math.min(CUSHION_BOTTOM - BALL_RADIUS, clickY));
      setIsBallInHand(false);
      toast({ title: 'Cue ball positioned!', description: 'Aim and shoot.' });
      return;
    }

    setIsAiming(true);
    const angle = Math.atan2(clickY - cue.y, clickX - cue.x);
    setAimAngle(angle);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isAiming || ballsMoving || winner) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = TABLE_WIDTH / rect.width;
    const scaleY = TABLE_HEIGHT / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const cue = ballsRef.current.find((b) => b.id === 0);
    if (!cue) return;

    const angle = Math.atan2(clickY - cue.y, clickX - cue.x);
    setAimAngle(angle);
  };

  const handlePointerUp = () => {
    setIsAiming(false);
  };

  // Fine angle adjustment buttons
  const nudgeAngle = (deltaDeg: number) => {
    setAimAngle((a) => a + (deltaDeg * Math.PI) / 180);
  };

  // Compute pocketed status
  const pocketedSolids = balls.filter((b) => b.pocketed && b.type === 'solid');
  const pocketedStripes = balls.filter((b) => b.pocketed && b.type === 'stripe');
  const isEightPocketed = balls.some((b) => b.pocketed && b.type === 'eight');

  return (
    <div className="mx-auto max-w-4xl px-3 pt-3 pb-16">
      {/* Top Match HUD Bar */}
      <div className="mb-3 flex items-center justify-between rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#0c261c] via-[#06140e] to-[#020805] px-4 py-3 shadow-lg">
        {/* Player 1 HUD */}
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl border font-mono-custom text-sm font-black transition-all ${
              turn === 1
                ? 'border-[#35D399] bg-[#35D399]/20 text-[#35D399] shadow-[0_0_12px_rgba(53,211,153,0.3)] ring-2 ring-[#35D399]'
                : 'border-[#1C3A2E] bg-[#0E1A16] text-[#8FA39A]'
            }`}
          >
            P1
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-[#E8F2EC]">{legend?.name || 'You'}</span>
              {turn === 1 && (
                <span className="rounded bg-[#35D399]/20 px-1.5 py-0.2 font-mono-custom text-[9px] font-black text-[#35D399] animate-pulse">
                  TURN
                </span>
              )}
            </div>
            <p className="font-mono-custom text-xs text-[#fef08a]">
              {p1Group ? p1Group.toUpperCase() : 'Open Table'}
            </p>
          </div>
        </div>

        {/* Center Versus & Mode Info */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 font-mono-custom text-xs font-black tracking-widest text-[#fef08a]">
            <Award className="h-4 w-4" />
            <span>KATIKA 8-BALL POOL</span>
          </div>
          <span className="font-mono-custom text-[10px] text-[#8FA39A]">
            {gameMode === 'ai' ? 'VS KATIKA SHARK BOT' : gameMode === 'pvp' ? `WAGER ${stake} KTK` : 'LOCAL 1V1'}
          </span>
        </div>

        {/* Player 2 HUD */}
        <div className="flex items-center gap-2.5 text-right">
          <div>
            <div className="flex items-center justify-end gap-1.5">
              {turn === 2 && (
                <span className="rounded bg-[#fef08a]/20 px-1.5 py-0.2 font-mono-custom text-[9px] font-black text-[#fef08a] animate-pulse">
                  TURN
                </span>
              )}
              <span className="text-sm font-bold text-[#E8F2EC]">
                {gameMode === 'ai' ? 'Katika Shark' : 'Player 2'}
              </span>
            </div>
            <p className="font-mono-custom text-xs text-[#fef08a]">
              {p2Group ? p2Group.toUpperCase() : 'Open Table'}
            </p>
          </div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl border font-mono-custom text-sm font-black transition-all ${
              turn === 2
                ? 'border-[#fef08a] bg-[#fef08a]/20 text-[#fef08a] shadow-[0_0_12px_rgba(254,240,138,0.3)] ring-2 ring-[#fef08a]'
                : 'border-[#1C3A2E] bg-[#0E1A16] text-[#8FA39A]'
            }`}
          >
            {gameMode === 'ai' ? <Bot className="h-5 w-5" /> : 'P2'}
          </div>
        </div>
      </div>

      {/* Billiards Canvas Frame */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#d4af37]/60 bg-[#06140e] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
        <canvas
          ref={canvasRef}
          width={TABLE_WIDTH}
          height={TABLE_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="h-auto w-full touch-none select-none cursor-crosshair rounded-xl"
        />

        {/* Ambient Winner Overlay */}
        {winner && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 p-6 backdrop-blur-md">
            <Trophy className="h-16 w-16 text-[#fef08a] animate-bounce" />
            <h2 className="mt-3 text-2xl font-black text-white">
              {winner === 1 ? 'PLAYER 1 VICTORY!' : 'PLAYER 2 / AI WINS!'}
            </h2>
            <p className="mt-1 text-sm text-[#c7d9d0]">
              {winner === 1
                ? 'Masterful 8-ball shot! Pot prize has been secured.'
                : 'Hard luck on the table! Ready for a rematch?'}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleResetRack}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#fef08a] via-[#eab308] to-[#ca8a04] px-6 py-3 font-mono-custom text-sm font-black text-black shadow-lg hover:scale-105 transition-transform"
              >
                <RotateCcw className="h-4 w-4" />
                Play Again
              </button>
            </div>
          </div>
        )}

        {/* Foul notification badge */}
        {foulMessage && (
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-red-500/50 bg-red-950/80 px-4 py-1.5 font-mono-custom text-xs font-bold text-red-200 backdrop-blur shadow-md">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              {foulMessage}
            </span>
          </div>
        )}
      </div>

      {/* Control Dashboard: Power Meter, Aiming & Shoot Button */}
      <div className="mt-3 rounded-2xl border border-[#1C3A2E] bg-gradient-to-b from-[#0E1A16] to-[#07110E] p-4 shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Aim Fine-Tuning Controls */}
          <div className="flex items-center gap-2">
            <span className="font-mono-custom text-xs font-bold text-[#8FA39A]">Aim:</span>
            <button
              type="button"
              onClick={() => nudgeAngle(-1)}
              disabled={ballsMoving || Boolean(winner)}
              className="rounded-lg border border-[#1C3A2E] bg-[#12241E] px-3 py-1.5 font-mono-custom text-xs font-black text-[#E8F2EC] hover:border-[#35D399] active:scale-95 disabled:opacity-40"
            >
              ◀ -1°
            </button>
            <button
              type="button"
              onClick={() => nudgeAngle(1)}
              disabled={ballsMoving || Boolean(winner)}
              className="rounded-lg border border-[#1C3A2E] bg-[#12241E] px-3 py-1.5 font-mono-custom text-xs font-black text-[#E8F2EC] hover:border-[#35D399] active:scale-95 disabled:opacity-40"
            >
              +1° ▶
            </button>
            <span className="ml-1 font-mono-custom text-xs text-[#35D399]">
              {Math.round(((aimAngle * 180) / Math.PI) % 360)}°
            </span>
          </div>

          {/* Shot Power Slider */}
          <div className="flex flex-1 items-center gap-3 sm:max-w-xs">
            <Zap className="h-4 w-4 text-[#fef08a]" />
            <span className="font-mono-custom text-xs font-bold text-[#8FA39A]">Power:</span>
            <input
              type="range"
              min="15"
              max="100"
              value={shotPower}
              onChange={(e) => setShotPower(Number(e.target.value))}
              disabled={ballsMoving || Boolean(winner)}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-[#1C3A2E] accent-[#fef08a]"
            />
            <span className="w-8 text-right font-mono-custom text-xs font-black text-[#fef08a]">
              {shotPower}%
            </span>
          </div>

          {/* Strike Cue Ball Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled((s) => !s)}
              className="rounded-xl border border-[#1C3A2E] bg-[#12241E] p-2.5 text-[#8FA39A] hover:text-[#fef08a]"
              title="Toggle Billiards Sound Effects"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={handleShoot}
              disabled={ballsMoving || Boolean(winner)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#35D399] to-[#059669] px-6 py-2.5 font-mono-custom text-sm font-black text-[#062018] shadow-[0_0_15px_rgba(53,211,153,0.3)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Crosshair className="h-4 w-4" />
              {ballsMoving ? 'ROLLING...' : 'STRIKE'}
            </button>
          </div>
        </div>

        {/* Pocketed Balls Rack Breakdown */}
        <div className="mt-4 flex flex-wrap items-center justify-between border-t border-[#1C3A2E] pt-3">
          {/* Solids Pocketed */}
          <div className="flex items-center gap-2">
            <span className="font-mono-custom text-[11px] font-bold text-[#8FA39A]">Solids (1-7):</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                const potted = pocketedSolids.some((b) => b.id === num);
                return (
                  <div
                    key={num}
                    style={{ backgroundColor: BALL_COLORS[num] }}
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black text-black shadow-sm transition-opacity ${
                      potted ? 'opacity-100 ring-1 ring-[#fef08a]' : 'opacity-25'
                    }`}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stripes Pocketed */}
          <div className="flex items-center gap-2">
            <span className="font-mono-custom text-[11px] font-bold text-[#8FA39A]">Stripes (9-15):</span>
            <div className="flex items-center gap-1">
              {[9, 10, 11, 12, 13, 14, 15].map((num) => {
                const potted = pocketedStripes.some((b) => b.id === num);
                return (
                  <div
                    key={num}
                    style={{ borderColor: BALL_COLORS[num] }}
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white text-[9px] font-black text-black shadow-sm transition-opacity ${
                      potted ? 'opacity-100 ring-1 ring-[#fef08a]' : 'opacity-25'
                    }`}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reset Rack */}
          <button
            type="button"
            onClick={handleResetRack}
            className="flex items-center gap-1 text-xs text-[#8FA39A] hover:text-[#35D399]"
          >
            <RotateCcw className="h-3 w-3" />
            Reset Table
          </button>
        </div>
      </div>

      {/* Game Mode Selector & Help Guide */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => {
            setGameMode('ai');
            handleResetRack();
          }}
          className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
            gameMode === 'ai'
              ? 'border-[#35D399] bg-[#35D399]/10 shadow-[0_0_15px_rgba(53,211,153,0.15)]'
              : 'border-[#1C3A2E] bg-[#0E1A16] hover:border-[#35D399]/40'
          }`}
        >
          <div className="rounded-xl bg-[#35D399]/20 p-2.5 text-[#35D399]">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">AI Katika Shark</h4>
            <p className="text-[11px] text-[#8FA39A]">Single player vs smart pool bot</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setGameMode('pass_play');
            handleResetRack();
          }}
          className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
            gameMode === 'pass_play'
              ? 'border-[#fef08a] bg-[#fef08a]/10 shadow-[0_0_15px_rgba(254,240,138,0.15)]'
              : 'border-[#1C3A2E] bg-[#0E1A16] hover:border-[#fef08a]/40'
          }`}
        >
          <div className="rounded-xl bg-[#fef08a]/20 p-2.5 text-[#fef08a]">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Pass &amp; Play 1v1</h4>
            <p className="text-[11px] text-[#8FA39A]">Play against a friend on same screen</p>
          </div>
        </button>

        <Link
          href="/pvp"
          className="flex items-center gap-3 rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-3.5 text-left transition-all hover:border-[#35D399]/40"
        >
          <div className="rounded-xl bg-[#d4af37]/20 p-2.5 text-[#fef08a]">
            <Swords className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">PvP Wager Match</h4>
            <p className="text-[11px] text-[#8FA39A]">Stake KTK in the online arena</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
