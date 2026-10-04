import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocation, useRoute, Link } from 'wouter';
import { useServerSession } from '@/components/server-session';
import { useLegend } from '@/components/legend-card';
import { useToast } from '@/hooks/use-toast';
import { KatikaLogo } from '@/components/katika-logo';
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
  Award,
  ArrowRight,
  Shield,
  HelpCircle,
  Play,
  CheckCircle2,
  XCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Flame,
  UserCheck,
  Radio,
  Timer,
  Target,
} from 'lucide-react';

// =============================================================================
// PROCEDURAL AUDIO SYNTHESIZER (HIGH FIDELITY BROADCAST AUDIO)
// =============================================================================
class PenaltyAudio {
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

  playWhistle() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(2850, t);
      osc2.frequency.setValueAtTime(3240, t);

      // Trill modulation
      const trill = this.ctx.createOscillator();
      const trillGain = this.ctx.createGain();
      trill.frequency.value = 34;
      trillGain.gain.value = 75;
      trill.connect(osc1.frequency);
      trill.start(t);
      trill.stop(t + 0.38);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.38);
      osc2.stop(t + 0.38);
    } catch {
      // Audio fallback
    }
  }

  playKick(powerMultiplier = 0.8) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(185, t);
      osc.frequency.exponentialRampToValueAtTime(34, t + 0.14);

      const vol = Math.min(0.95, Math.max(0.4, powerMultiplier * 0.95));
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.14);
    } catch {
      // Audio fallback
    }
  }

  playGoal() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;

      // 1. Net rustle
      const bufferSize = this.ctx.sampleRate * 0.45;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.14));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1180;
      const netGain = this.ctx.createGain();
      netGain.gain.setValueAtTime(0.32, t);
      netGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      noise.connect(filter);
      filter.connect(netGain);
      netGain.connect(this.ctx.destination);
      noise.start(t);

      // 2. Crowd roar swelling
      const crowdBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 1.2, this.ctx.sampleRate);
      const crowdData = crowdBuffer.getChannelData(0);
      for (let i = 0; i < crowdBuffer.length; i++) {
        crowdData[i] = (Math.random() * 2 - 1) * Math.sin((i / crowdBuffer.length) * Math.PI);
      }
      const crowd = this.ctx.createBufferSource();
      crowd.buffer = crowdBuffer;
      const crowdFilter = this.ctx.createBiquadFilter();
      crowdFilter.type = 'lowpass';
      crowdFilter.frequency.value = 850;
      const crowdGain = this.ctx.createGain();
      crowdGain.gain.setValueAtTime(0.02, t);
      crowdGain.gain.linearRampToValueAtTime(0.42, t + 0.22);
      crowdGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      crowd.connect(crowdFilter);
      crowdFilter.connect(crowdGain);
      crowdGain.connect(this.ctx.destination);
      crowd.start(t);
    } catch {
      // Audio fallback
    }
  }

  playSave() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // Glove slap impact
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

      gain.gain.setValueAtTime(0.48, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch {
      // Audio fallback
    }
  }

  playCueJoin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, t); // D5
      osc.frequency.setValueAtTime(880, t + 0.05); // A5
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch {
      // Audio fallback
    }
  }

  playCountdown(count: number) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(count === 1 ? 880 : 440, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    } catch {
      // Audio fallback
    }
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const t = this.ctx!.currentTime + idx * 0.11;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t);
        osc.stop(t + 0.28);
      });
    } catch {
      // Audio fallback
    }
  }
}

const audio = new PenaltyAudio();

// =============================================================================
// GAME TYPES: STRICTLY 3 DIRECTIONS (LEFT, CENTRE, RIGHT) & 3V3 SQUAD
// =============================================================================
export type ShotDirection = 'left' | 'centre' | 'right';
export type DiveDirection = 'left' | 'centre' | 'right';
export type PitchElevation = 'low' | 'mid' | 'high' | 'panenka';
export type RunupStyle = 'sprint_blast' | 'stutter_step' | 'curved_approach' | 'panenka_chip';
export type KickStyle = 'power_laces' | 'finesse_curl' | 'chipped_dink';
export type KeeperMotion = 'top_corner_leap' | 'ground_sweep' | 'reflex_parry' | 'wrong_footed' | 'crossbar_tipper';

export interface SquadPlayer {
  id: string;
  name: string;
  number: number;
  role: 'striker' | 'keeper';
  isUser: boolean;
  avatarSeed: number;
}

export interface ShotResult {
  round: number;
  kickerSlot: number;
  team: 'A' | 'B';
  kickerName: string;
  keeperName: string;
  shotDirection: ShotDirection;
  diveDirection: DiveDirection;
  scored: boolean;
  powerKmH: number;
  pitchElevation: PitchElevation;
  runupStyle: RunupStyle;
  kickStyle: KickStyle;
  keeperMotion: KeeperMotion;
  message: string;
}

// Particle for grass kick debris, spark bursts, and net flash
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
}

export function PenaltyShootoutPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/pvp/penalty/:id');

  const { serverUser } = useServerSession();
  const { legend } = useLegend();
  const { toast } = useToast();

  const [soundOn, setSoundOn] = useState(true);
  const [stake, setStake] = useState<number>(10);
  const [keeperControlAll, setKeeperControlAll] = useState<boolean>(true);

  // Match States: 'lobby' -> 'queue_matching' -> 'countdown' -> 'aiming' -> 'runup' -> 'ball_flight' -> 'shot_result' -> 'game_over'
  const [matchState, setMatchState] = useState<
    'lobby' | 'queue_matching' | 'countdown' | 'aiming' | 'runup' | 'ball_flight' | 'shot_result' | 'game_over'
  >('lobby');

  // Matchmaking Queue State
  const [queuePlayersFound, setQueuePlayersFound] = useState<number>(1);
  const [queueStatusText, setQueueStatusText] = useState<string>('Searching 3v3 cue...');
  const [countdownNum, setCountdownNum] = useState<number>(3);

  // 3 vs 3 Turns
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [currentKickerSlot, setCurrentKickerSlot] = useState<number>(0); // 0, 1, 2
  const [attackingTeam, setAttackingTeam] = useState<'A' | 'B'>('A');

  // Scores & Indicators
  const [scoreTeamA, setScoreTeamA] = useState<number>(0);
  const [scoreTeamB, setScoreTeamB] = useState<number>(0);
  const [shotsA, setShotsA] = useState<(boolean | null)[]>([null, null, null]);
  const [shotsB, setShotsB] = useState<(boolean | null)[]>([null, null, null]);
  const [history, setHistory] = useState<ShotResult[]>([]);

  // Telemetry & Results
  const [userSelectedDir, setUserSelectedDir] = useState<ShotDirection | null>(null);
  const [hoveredDir, setHoveredDir] = useState<ShotDirection | null>(null);
  const [activeShotData, setActiveShotData] = useState<ShotResult | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string>('');

  // 3v3 Squads
  const teamA: SquadPlayer[] = useMemo(() => [
    { id: 'p1', name: legend?.name || 'Katika Cap (You)', number: 10, role: 'striker', isUser: true, avatarSeed: 1 },
    { id: 'p2', name: 'Alvarez_19', number: 19, role: 'striker', isUser: false, avatarSeed: 2 },
    { id: 'p3', name: 'Rashford_11', number: 11, role: 'striker', isUser: false, avatarSeed: 3 },
  ], [legend?.name]);

  const teamB: SquadPlayer[] = useMemo(() => [
    { id: 'b1', name: 'Declan_4', number: 4, role: 'striker', isUser: false, avatarSeed: 4 },
    { id: 'b2', name: 'Haaland_9', number: 9, role: 'striker', isUser: false, avatarSeed: 5 },
    { id: 'b3', name: 'Courtois_1', number: 1, role: 'keeper', isUser: false, avatarSeed: 6 },
  ], []);

  // Active Shooter & Goalkeeper
  const currentShooter = attackingTeam === 'A' ? teamA[currentKickerSlot] : teamB[currentKickerSlot];
  const currentKeeper = attackingTeam === 'A'
    ? teamB[currentKickerSlot]
    : teamA[keeperControlAll ? 0 : currentKickerSlot];

  const isUserTurnToShoot = attackingTeam === 'A' && currentShooter.isUser;
  const isUserTurnToSave = attackingTeam === 'B' && (keeperControlAll || currentKeeper.isUser);

  // Canvas & Physics References
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Animation Progress & Physics
  const animProgressRef = useRef<{
    runup: number;
    ballT: number;
    keeperT: number;
    netRipple: number;
    ballSpin: number;
    shotDir: ShotDirection;
    diveDir: DiveDirection;
    pitchElevation: PitchElevation;
    powerKmH: number;
    runupStyle: RunupStyle;
    kickStyle: KickStyle;
    keeperMotion: KeeperMotion;
    scored: boolean;
    flashRing: number;
  }>({
    runup: 0,
    ballT: 0,
    keeperT: 0,
    netRipple: 0,
    ballSpin: 0,
    shotDir: 'centre',
    diveDir: 'centre',
    pitchElevation: 'mid',
    powerKmH: 95,
    runupStyle: 'sprint_blast',
    kickStyle: 'power_laces',
    keeperMotion: 'reflex_parry',
    scored: false,
    flashRing: 0,
  });

  const toggleSound = () => {
    audio.enabled = !soundOn;
    setSoundOn(!soundOn);
  };

  // Join Matchmaking Queue
  const joinQueue = () => {
    setMatchState('queue_matching');
    setQueuePlayersFound(1);
    setQueueStatusText('Searching 3v3 Matchmaking Cue...');
    audio.playCueJoin();

    const interval = setInterval(() => {
      setQueuePlayersFound((prev) => {
        if (prev < 6) {
          audio.playCueJoin();
          const next = prev + 1;
          if (next === 3) setQueueStatusText('Katika Squad Assembled (3/3). Finding Rivals...');
          if (next === 5) setQueueStatusText('Rivals Joining (5/6)...');
          if (next === 6) {
            setQueueStatusText('3v3 Cue Full (6/6)! Connecting Stadium...');
            clearInterval(interval);
            setTimeout(() => {
              startCountdown();
            }, 600);
          }
          return next;
        }
        clearInterval(interval);
        return prev;
      });
    }, 450);
  };

  // 3-2-1 Countdown
  const startCountdown = () => {
    setMatchState('countdown');
    setCountdownNum(3);
    audio.playCountdown(3);

    const timer = setInterval(() => {
      setCountdownNum((prev) => {
        if (prev > 1) {
          const next = prev - 1;
          audio.playCountdown(next);
          return next;
        }
        clearInterval(timer);
        startKickoff();
        return 0;
      });
    }, 750);
  };

  // Kickoff
  const startKickoff = () => {
    setScoreTeamA(0);
    setScoreTeamB(0);
    setShotsA([null, null, null]);
    setShotsB([null, null, null]);
    setCurrentRound(1);
    setCurrentKickerSlot(0);
    setAttackingTeam('A');
    setHistory([]);
    setUserSelectedDir(null);
    setActiveShotData(null);
    setMatchState('aiming');
    audio.playWhistle();
    setBannerNotice('MATCH STARTED · ROUND 1 OF 3');
  };

  // Spawn visual particles
  const spawnParticles = (x: number, y: number, color: string, count = 12, speed = 3) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (0.5 + Math.random()) * speed;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1,
        size: 1.5 + Math.random() * 2.5,
        color,
        alpha: 1,
        life: 0.9,
      });
    }
  };

  // Execute Shot Resolution
  const resolveShot = useCallback((shooterChoice: ShotDirection, keeperChoice: DiveDirection) => {
    const randomPower = Math.floor(78 + Math.random() * 46); // 78 - 124 km/h

    const elevations: PitchElevation[] = ['low', 'mid', 'high', 'panenka'];
    const randomElevation = elevations[Math.floor(Math.random() * elevations.length)];

    const runupStyles: RunupStyle[] = ['sprint_blast', 'stutter_step', 'curved_approach', 'panenka_chip'];
    const randomRunup = runupStyles[Math.floor(Math.random() * runupStyles.length)];

    const kickStyles: KickStyle[] = ['power_laces', 'finesse_curl', 'chipped_dink'];
    const randomKick = kickStyles[Math.floor(Math.random() * kickStyles.length)];

    const keeperMotions: KeeperMotion[] = [
      'top_corner_leap',
      'ground_sweep',
      'reflex_parry',
      'wrong_footed',
      'crossbar_tipper',
    ];
    const randomKeeperMotion = keeperMotions[Math.floor(Math.random() * keeperMotions.length)];

    let isGoal = false;
    let message = '';

    if (shooterChoice !== keeperChoice) {
      isGoal = true;
      message = `GOAL! Keeper wrong-footed, clinical strike into the ${shooterChoice} net!`;
    } else {
      const topCornerBullet = randomElevation === 'high' && randomPower >= 110;
      if (topCornerBullet) {
        isGoal = true;
        message = `GOAL! ${randomPower} km/h rocket sniped the top corner beyond the keeper's fingertips!`;
      } else {
        isGoal = false;
        message = `SAVED! Keeper anticipated ${keeperChoice} and pulled off a stunning reflex stop!`;
      }
    }

    const shotResult: ShotResult = {
      round: currentRound,
      kickerSlot: currentKickerSlot,
      team: attackingTeam,
      kickerName: currentShooter.name,
      keeperName: currentKeeper.name,
      shotDirection: shooterChoice,
      diveDirection: keeperChoice,
      scored: isGoal,
      powerKmH: randomPower,
      pitchElevation: randomElevation,
      runupStyle: randomRunup,
      kickStyle: randomKick,
      keeperMotion: randomKeeperMotion,
      message,
    };

    setActiveShotData(shotResult);
    animProgressRef.current = {
      runup: 0,
      ballT: 0,
      keeperT: 0,
      netRipple: 0,
      ballSpin: 0,
      shotDir: shooterChoice,
      diveDir: keeperChoice,
      pitchElevation: randomElevation,
      powerKmH: randomPower,
      runupStyle: randomRunup,
      kickStyle: randomKick,
      keeperMotion: randomKeeperMotion,
      scored: isGoal,
      flashRing: 0,
    };

    setMatchState('runup');

    // Kick impact timing
    setTimeout(() => {
      audio.playKick(randomPower / 120);
      setMatchState('ball_flight');

      // Turf particle splash at penalty spot
      const canvas = canvasRef.current;
      if (canvas) {
        spawnParticles(canvas.width / 2, canvas.height * 0.74, '#22c55e', 14, 2.5);
      }
    }, 440);

    // Goal or Save Resolution
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (isGoal) {
        audio.playGoal();
        setBannerNotice(`⚽ GOAL! ${randomPower} KM/H · ${shooterChoice.toUpperCase()}`);
        if (canvas) {
          spawnParticles(canvas.width / 2, canvas.height * 0.44, '#fef08a', 20, 4);
        }
      } else {
        audio.playSave();
        setBannerNotice(`🧤 SAVED! ${currentKeeper.name} DENIES`);
        animProgressRef.current.flashRing = 1.0;
        if (canvas) {
          spawnParticles(canvas.width / 2, canvas.height * 0.46, '#38bdf8', 18, 3.5);
        }
      }
      setMatchState('shot_result');

      if (attackingTeam === 'A') {
        if (isGoal) setScoreTeamA((prev) => prev + 1);
        setShotsA((prev) => {
          const next = [...prev];
          next[currentKickerSlot] = isGoal;
          return next;
        });
      } else {
        if (isGoal) setScoreTeamB((prev) => prev + 1);
        setShotsB((prev) => {
          const next = [...prev];
          next[currentKickerSlot] = isGoal;
          return next;
        });
      }

      setHistory((prev) => [...prev, shotResult]);
    }, 860);

    // Next Turn
    setTimeout(() => {
      progressNextTurn(isGoal);
    }, 2900);
  }, [currentRound, currentKickerSlot, attackingTeam, currentShooter.name, currentKeeper.name]);

  // Turn Progression
  const progressNextTurn = useCallback((lastShotGoal: boolean) => {
    if (attackingTeam === 'A') {
      setAttackingTeam('B');
      setUserSelectedDir(null);
      setMatchState('aiming');
      setBannerNotice(`ROUND ${currentRound} · ${teamB[currentKickerSlot].name} TO KICK`);
      audio.playWhistle();
    } else {
      if (currentKickerSlot < 2) {
        const nextSlot = currentKickerSlot + 1;
        setCurrentKickerSlot(nextSlot);
        setCurrentRound(nextSlot + 1);
        setAttackingTeam('A');
        setUserSelectedDir(null);
        setMatchState('aiming');
        setBannerNotice(`ROUND ${nextSlot + 1} OF 3 · ${teamA[nextSlot].name} TO KICK`);
        audio.playWhistle();
      } else {
        const finalA = scoreTeamA + (attackingTeam === 'A' && lastShotGoal ? 1 : 0);
        const finalB = scoreTeamB + (attackingTeam === 'B' && lastShotGoal ? 1 : 0);

        setMatchState('game_over');
        audio.playFanfare();
        if (finalA > finalB) {
          toast({ title: '🏆 VICTORY!', description: 'Katika Elite won the 3v3 Penalty Shootout!' });
        } else if (finalB > finalA) {
          toast({ title: 'Defeat', description: 'Rivals edged the shootout. Better luck next time!' });
        } else {
          toast({ title: 'Draw!', description: 'Honors even in a thrilling 3v3 shootout!' });
        }
      }
    }
  }, [attackingTeam, currentKickerSlot, currentRound, scoreTeamA, scoreTeamB, teamA, teamB, toast]);

  // Handle User Input Button Click
  const handleUserChoice = (direction: ShotDirection) => {
    if (matchState !== 'aiming') return;
    setUserSelectedDir(direction);

    if (isUserTurnToShoot) {
      const dirs: DiveDirection[] = ['left', 'centre', 'right'];
      const aiKeeperChoice = dirs[Math.floor(Math.random() * dirs.length)];
      resolveShot(direction, aiKeeperChoice);
    } else if (isUserTurnToSave) {
      const dirs: ShotDirection[] = ['left', 'centre', 'right'];
      const aiStrikerChoice = dirs[Math.floor(Math.random() * dirs.length)];
      resolveShot(aiStrikerChoice, direction);
    } else {
      const dirs: ShotDirection[] = ['left', 'centre', 'right'];
      const sChoice = dirs[Math.floor(Math.random() * dirs.length)];
      const kChoice = dirs[Math.floor(Math.random() * dirs.length)];
      resolveShot(sChoice, kChoice);
    }
  };

  // AI vs AI auto trigger
  useEffect(() => {
    if (matchState === 'aiming' && !isUserTurnToShoot && !isUserTurnToSave) {
      const timer = setTimeout(() => {
        const dirs: ShotDirection[] = ['left', 'centre', 'right'];
        const sChoice = dirs[Math.floor(Math.random() * dirs.length)];
        const kChoice = dirs[Math.floor(Math.random() * dirs.length)];
        resolveShot(sChoice, kChoice);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [matchState, isUserTurnToShoot, isUserTurnToSave, resolveShot]);

  // =============================================================================
  // CONSOLE-GRADE 3D CANVAS RENDERING ENGINE (BEHIND-THE-BALL BROADCAST VIEW)
  // =============================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      const w = canvas.width;
      const h = canvas.height;
      const now = Date.now();
      const anim = animProgressRef.current;

      // -------------------------------------------------------------
      // 1. NIGHT STADIUM ATMOSPHERE, ARCHITECTURE & FLOODLIGHT BEAMS
      // -------------------------------------------------------------
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.48);
      skyGrad.addColorStop(0, '#020604');
      skyGrad.addColorStop(0.5, '#05140d');
      skyGrad.addColorStop(1, '#0a261a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Curved stadium canopy roof arch
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(w / 2, -h * 0.5, w * 0.72, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();

      // Atmospheric Stadium Floodlights & God Rays
      const drawVolumetricFloodlight = (x: number, y: number, angleOffset: number) => {
        // God-ray light shaft streaming down onto the field
        const shaftGrad = ctx.createRadialGradient(x, y, 2, x + angleOffset, y + 220, 200);
        shaftGrad.addColorStop(0, 'rgba(255, 255, 240, 0.32)');
        shaftGrad.addColorStop(0.3, 'rgba(160, 255, 200, 0.12)');
        shaftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = shaftGrad;
        ctx.beginPath();
        ctx.moveTo(x - 12, y);
        ctx.lineTo(x + angleOffset - 110, h * 0.85);
        ctx.lineTo(x + angleOffset + 110, h * 0.85);
        ctx.lineTo(x + 12, y);
        ctx.closePath();
        ctx.fill();

        // Intense Halogen Core
        const coreGrad = ctx.createRadialGradient(x, y, 2, x, y, 75);
        coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        coreGrad.addColorStop(0.25, 'rgba(210, 255, 230, 0.6)');
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(x, y, 75, 0, Math.PI * 2);
        ctx.fill();

        // Stanchion fixture with glowing lamps
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x - 14, y - 4, 28, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 11, y - 2, 22, 3);
      };

      drawVolumetricFloodlight(w * 0.12, h * 0.08, 90);
      drawVolumetricFloodlight(w * 0.88, h * 0.08, -90);

      // -------------------------------------------------------------
      // 2. DETAILED PACKED STADIUM STANDS & VIBRANT CROWD
      // -------------------------------------------------------------
      const crowdY = h * 0.15;
      const crowdH = h * 0.21;
      ctx.fillStyle = '#06130c';
      ctx.fillRect(0, crowdY, w, crowdH);

      const crowdPalette = ['#1e382b', '#047857', '#0369a1', '#b91c1c', '#f59e0b', '#f1f5f9'];
      for (let r = 0; r < 6; r++) {
        const rowY = crowdY + r * 13;
        ctx.fillStyle = r % 2 === 0 ? 'rgba(12, 30, 20, 0.8)' : 'rgba(18, 42, 30, 0.8)';
        ctx.fillRect(0, rowY, w, 11);

        for (let c = 8; c < w; c += 14) {
          const headX = c + (r % 2) * 7;
          const color = crowdPalette[(c + r * 3) % crowdPalette.length];
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(headX, rowY + 4, 3.2, 0, Math.PI * 2);
          ctx.fill();

          // Camera flashbulb burst in stands
          if (Math.random() < 0.018) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(headX, rowY + 3, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // -------------------------------------------------------------
      // 3. PITCH-SIDE DIGITAL LED ADVERTISING HOARDINGS
      // -------------------------------------------------------------
      const ledY = h * 0.36;
      const ledH = 22;
      const ledGrad = ctx.createLinearGradient(0, ledY, 0, ledY + ledH);
      ledGrad.addColorStop(0, '#064e3b');
      ledGrad.addColorStop(0.5, '#022c22');
      ledGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = ledGrad;
      ctx.fillRect(0, ledY, w, ledH);
      ctx.strokeStyle = '#35d399';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, ledY, w, ledH);

      // High-vis scrolling tournament branding
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ KATIKA.BET · 3v3 PENALTY SHOOTOUT · EMERALD ELITE · $KTK POTS', w / 2, ledY + 14);

      // -------------------------------------------------------------
      // 4. PERSPECTIVE CUT-LAWN PITCH (3D DIAGONAL TURF STRIPES)
      // -------------------------------------------------------------
      const pitchStartY = ledY + ledH;
      const pitchH = h - pitchStartY;

      // 3D Perspective grass bands with subtle lawn sheen
      const bands = 8;
      for (let b = 0; b < bands; b++) {
        const y1 = pitchStartY + (b / bands) * pitchH;
        const y2 = pitchStartY + ((b + 1) / bands) * pitchH;
        ctx.fillStyle = b % 2 === 0 ? '#103926' : '#14462f';
        ctx.fillRect(0, y1, w, y2 - y1);
      }

      // Specular lawn gloss reflecting floodlights
      const lawnGlow = ctx.createRadialGradient(w / 2, h * 0.65, 30, w / 2, h * 0.65, 220);
      lawnGlow.addColorStop(0, 'rgba(52, 211, 153, 0.14)');
      lawnGlow.addColorStop(0.7, 'rgba(16, 185, 129, 0.05)');
      lawnGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lawnGlow;
      ctx.fillRect(0, pitchStartY, w, pitchH);

      // Glowing White Chalk Penalty Box Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.lineWidth = 2.5;

      const goalLineY = pitchStartY + pitchH * 0.12;
      ctx.beginPath();
      ctx.moveTo(w * 0.16, goalLineY);
      ctx.lineTo(w * 0.84, goalLineY);
      ctx.stroke();

      // Penalty Spot
      const spotX = w / 2;
      const spotY = h * 0.74;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(spotX, spotY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Penalty Arc (D-Box top curve)
      ctx.beginPath();
      ctx.arc(spotX, spotY - 8, 40, Math.PI * 0.16, Math.PI * 0.84);
      ctx.stroke();

      // -------------------------------------------------------------
      // 5. 3D METALLIC GOAL FRAME & HIGH-DENSITY NET MESH
      // -------------------------------------------------------------
      const goalW = w * 0.62;
      const goalX = (w - goalW) / 2;
      const crossbarY = goalLineY - 98;
      const postThickness = 8;

      const netBackY = crossbarY + 16;
      const netBackW = goalW * 0.94;
      const netBackX = (w - netBackW) / 2;
      const netBackBottomY = goalLineY - 8;

      // Net Ripple & Bulge Physics
      let netBulgeX = 0;
      let netBulgeY = 0;
      if (anim.scored && anim.ballT > 0.72) {
        anim.netRipple = Math.sin((anim.ballT - 0.72) * Math.PI * 3.6) * 14;
        if (anim.shotDir === 'left') netBulgeX = -anim.netRipple;
        if (anim.shotDir === 'right') netBulgeX = anim.netRipple;
        netBulgeY = -anim.netRipple * 0.55;
      }

      // Net Diamond Mesh with depth
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.lineWidth = 1;

      // Horizontal net lines
      for (let ny = crossbarY; ny <= goalLineY; ny += 7) {
        ctx.beginPath();
        ctx.moveTo(goalX, ny);
        ctx.lineTo(goalX + goalW, ny);
        ctx.stroke();
      }
      // Vertical net lines with dynamic impact bulge
      for (let nx = goalX; nx <= goalX + goalW; nx += 9) {
        ctx.beginPath();
        ctx.moveTo(nx, crossbarY);
        ctx.lineTo(nx + netBulgeX * 0.5, goalLineY);
        ctx.stroke();
      }

      // 3D Net Depth Box & Stanchion Cords
      ctx.beginPath();
      ctx.moveTo(goalX, crossbarY);
      ctx.lineTo(netBackX, netBackY);
      ctx.lineTo(netBackX + netBackW, netBackY);
      ctx.lineTo(goalX + goalW, crossbarY);
      ctx.stroke();

      // Stanchion poles behind net
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(netBackX, netBackY);
      ctx.lineTo(netBackX - 10, netBackBottomY);
      ctx.moveTo(netBackX + netBackW, netBackY);
      ctx.lineTo(netBackX + netBackW + 10, netBackBottomY);
      ctx.stroke();

      // Metallic Specular Goalposts & Crossbar
      const drawPost = (px: number, py: number, pw: number, ph: number) => {
        const postGrad = ctx.createLinearGradient(px, py, px + pw, py);
        postGrad.addColorStop(0, '#94a3b8');
        postGrad.addColorStop(0.3, '#ffffff');
        postGrad.addColorStop(0.7, '#e2e8f0');
        postGrad.addColorStop(1, '#64748b');
        ctx.fillStyle = postGrad;
        ctx.fillRect(px, py, pw, ph);
      };

      // Left Upright Post
      drawPost(goalX - postThickness, crossbarY, postThickness, goalLineY - crossbarY);
      // Right Upright Post
      drawPost(goalX + goalW, crossbarY, postThickness, goalLineY - crossbarY);

      // Horizontal Crossbar with Specular Bevel
      const crossGrad = ctx.createLinearGradient(goalX, crossbarY, goalX, crossbarY + postThickness);
      crossGrad.addColorStop(0, '#ffffff');
      crossGrad.addColorStop(0.4, '#f8fafc');
      crossGrad.addColorStop(0.8, '#cbd5e1');
      crossGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = crossGrad;
      ctx.fillRect(goalX - postThickness, crossbarY, goalW + postThickness * 2, postThickness);

      // -------------------------------------------------------------
      // 6. HOLOGRAPHIC 3-DIRECTION TARGET RETICLES (AIMING PHASE)
      // -------------------------------------------------------------
      if (matchState === 'aiming') {
        const targetRadius = 18;
        const pulse = Math.sin(now / 140) * 3;
        const rot = now / 400;

        const drawReticle = (rx: number, ry: number, label: string, isHovered: boolean, isSelected: boolean) => {
          const active = isHovered || isSelected;

          // Radial target halo
          const halo = ctx.createRadialGradient(rx, ry, 2, rx, ry, targetRadius + 14);
          halo.addColorStop(0, active ? 'rgba(254, 240, 138, 0.45)' : 'rgba(53, 211, 153, 0.25)');
          halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(rx, ry, targetRadius + 14, 0, Math.PI * 2);
          ctx.fill();

          // Rotating segmented compass ring
          ctx.save();
          ctx.translate(rx, ry);
          ctx.rotate(rot);
          ctx.strokeStyle = active ? '#fef08a' : '#35d399';
          ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, targetRadius + pulse, (i * Math.PI) / 2 + 0.15, ((i + 1) * Math.PI) / 2 - 0.15);
            ctx.stroke();
          }
          ctx.restore();

          // Inner crosshairs
          ctx.strokeStyle = active ? '#ffffff' : '#35d399';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(rx - 8, ry);
          ctx.lineTo(rx + 8, ry);
          ctx.moveTo(rx, ry - 8);
          ctx.lineTo(rx, ry + 8);
          ctx.stroke();

          // Target Badge Banner
          ctx.fillStyle = active ? '#fef08a' : '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(label, rx, ry - targetRadius - 6);

          // Multiplier Chip
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.fillRect(rx - 15, ry + targetRadius + 2, 30, 12);
          ctx.strokeStyle = active ? '#fef08a' : '#35d399';
          ctx.strokeRect(rx - 15, ry + targetRadius + 2, 30, 12);
          ctx.fillStyle = active ? '#fef08a' : '#35d399';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('1.92×', rx, ry + targetRadius + 11);
        };

        const leftTargetX = goalX + goalW * 0.18;
        const centreTargetX = w / 2;
        const rightTargetX = goalX + goalW * 0.82;
        const targetY = goalLineY - 36;

        drawReticle(leftTargetX, targetY, 'LEFT', hoveredDir === 'left', userSelectedDir === 'left');
        drawReticle(centreTargetX, targetY, 'CENTRE', hoveredDir === 'centre', userSelectedDir === 'centre');
        drawReticle(rightTargetX, targetY, 'RIGHT', hoveredDir === 'right', userSelectedDir === 'right');
      }

      // -------------------------------------------------------------
      // 7. HIGH-FIDELITY ANIMATED 3D GOALKEEPER
      // -------------------------------------------------------------
      const keeperBaseX = w / 2;
      const keeperBaseY = goalLineY;

      let keeperX = keeperBaseX;
      let keeperY = keeperBaseY - 28;
      let keeperAngle = 0;

      if (matchState === 'ball_flight' || matchState === 'shot_result') {
        const diveProgress = Math.min(1, anim.keeperT);

        let verticalLift = 18;
        if (anim.keeperMotion === 'top_corner_leap') verticalLift = 38;
        if (anim.keeperMotion === 'ground_sweep') verticalLift = 4;
        if (anim.keeperMotion === 'crossbar_tipper') verticalLift = 32;

        if (anim.diveDir === 'left') {
          keeperX = keeperBaseX - diveProgress * (goalW * 0.4);
          keeperY = keeperBaseY - 14 - verticalLift * Math.sin(diveProgress * Math.PI);
          keeperAngle = -0.82 * diveProgress;
        } else if (anim.diveDir === 'right') {
          keeperX = keeperBaseX + diveProgress * (goalW * 0.4);
          keeperY = keeperBaseY - 14 - verticalLift * Math.sin(diveProgress * Math.PI);
          keeperAngle = 0.82 * diveProgress;
        } else {
          keeperY = keeperBaseY - 28 - verticalLift * 0.65 * Math.sin(diveProgress * Math.PI);
        }
      } else {
        // Idle bouncing stance with subtle weight shifting
        const idleBounce = Math.sin(now / 160) * 2.5;
        keeperY += idleBounce;
      }

      ctx.save();
      ctx.translate(keeperX, keeperY);
      ctx.rotate(keeperAngle);

      // Keeper dynamic grass shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.beginPath();
      ctx.ellipse(0, 26, 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Goalkeeper Torso (High-vis neon jersey with athletic panels)
      const keeperJersey = ctx.createLinearGradient(-12, -24, 12, 10);
      keeperJersey.addColorStop(0, '#f97316');
      keeperJersey.addColorStop(0.5, '#ea580c');
      keeperJersey.addColorStop(1, '#c2410c');
      ctx.fillStyle = keeperJersey;
      ctx.beginPath();
      ctx.roundRect(-12, -24, 24, 30, 4);
      ctx.fill();
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Chest badge
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -10, 3, 0, Math.PI * 2);
      ctx.fill();

      // Goalkeeper Head & Hair
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, -32, 9, 0, Math.PI * 2);
      ctx.fill();
      // Athletic headband / hair trim
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-8, -37, 16, 5);

      // Arms & Elbow Pads
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-24, -20, 14, 7);
      ctx.fillRect(10, -20, 14, 7);

      // Neon Electric Green Goalkeeper Gloves
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(-26, -16, 7, 0, Math.PI * 2);
      ctx.arc(26, -16, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#15803d';
      ctx.stroke();

      // Shorts
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-10, 6, 9, 16);
      ctx.fillRect(1, 6, 9, 16);

      // Socks & Cleats
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-9, 18, 7, 10);
      ctx.fillRect(2, 18, 7, 10);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-10, 27, 9, 5);
      ctx.fillRect(1, 27, 9, 5);

      ctx.restore();

      // Save impact flash ring
      if (anim.flashRing > 0) {
        ctx.strokeStyle = `rgba(56, 189, 248, ${anim.flashRing})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(keeperX, keeperY, (1 - anim.flashRing) * 45 + 10, 0, Math.PI * 2);
        ctx.stroke();
        anim.flashRing -= 0.04;
      }

      // -------------------------------------------------------------
      // 8. HIGH-FIDELITY ANIMATED 3D STRIKER (KATIKA EMERALD / GOLD)
      // -------------------------------------------------------------
      let strikerX = spotX - 26;
      let strikerY = spotY + 46;
      let legAngle = 0;

      let runupStartX = spotX - 26;
      if (anim.runupStyle === 'curved_approach') runupStartX = spotX - 48;
      if (anim.runupStyle === 'sprint_blast') runupStartX = spotX - 20;

      if (matchState === 'runup' || matchState === 'ball_flight' || matchState === 'shot_result') {
        const runupT = Math.min(1, anim.runup);
        strikerX = runupStartX + runupT * (spotX - runupStartX - 4);
        strikerY = spotY + 46 - runupT * 40;
        legAngle = Math.sin(runupT * Math.PI * 2.8) * 0.9;
      }

      ctx.save();
      ctx.translate(strikerX, strikerY);

      // Striker shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.46)';
      ctx.beginPath();
      ctx.ellipse(0, 38, 24, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Striker Jersey (Katika Emerald with Metallic Gold Trim)
      const kitColor = attackingTeam === 'A' ? '#059669' : '#1d4ed8';
      const kitTrim = attackingTeam === 'A' ? '#fef08a' : '#ffffff';

      const strikerJersey = ctx.createLinearGradient(-14, -30, 14, 8);
      strikerJersey.addColorStop(0, kitColor);
      strikerJersey.addColorStop(0.6, attackingTeam === 'A' ? '#047857' : '#1e40af');
      strikerJersey.addColorStop(1, '#022c22');
      ctx.fillStyle = strikerJersey;
      ctx.beginPath();
      ctx.roundRect(-14, -30, 28, 36, 4);
      ctx.fill();

      // Gold Kit Number on Back
      ctx.fillStyle = kitTrim;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(currentShooter.number), 0, -8);

      // Name on jersey
      ctx.font = 'bold 7px sans-serif';
      ctx.fillText(attackingTeam === 'A' ? 'KATIKA' : 'RIVALS', 0, -20);

      // Head & Hair
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.arc(0, -40, 10, 0, Math.PI * 2);
      ctx.fill();

      // Shorts
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-11, 6, 10, 16);
      ctx.fillRect(1, 6, 10, 16);

      // Golden Cleats & Striking Legs
      ctx.save();
      ctx.rotate(legAngle);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-7, 20, 6, 15);
      ctx.fillStyle = '#eab308'; // Gold boot
      ctx.fillRect(-8, 34, 8, 6);
      ctx.restore();

      ctx.save();
      ctx.rotate(-legAngle * 0.7);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(2, 20, 6, 15);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(2, 34, 8, 6);
      ctx.restore();

      ctx.restore();

      // -------------------------------------------------------------
      // 9. ANIMATED 3D SOCCER BALL (ROTATION, SHADOW, & MOTION TRAIL)
      // -------------------------------------------------------------
      let ballX = spotX;
      let ballY = spotY;
      let ballScale = 1.0;

      if (matchState === 'ball_flight' || matchState === 'shot_result') {
        const flightT = Math.min(1, anim.ballT);

        let targetX = w / 2;
        if (anim.shotDir === 'left') targetX = goalX + goalW * 0.18;
        if (anim.shotDir === 'right') targetX = goalX + goalW * 0.82;

        let targetY = goalLineY - 28;
        if (anim.pitchElevation === 'low') targetY = goalLineY - 8;
        if (anim.pitchElevation === 'high') targetY = crossbarY + 12;
        if (anim.pitchElevation === 'panenka') targetY = crossbarY + 36;

        if (!anim.scored && flightT > 0.82) {
          targetX = keeperX + (anim.diveDir === 'left' ? -14 : 14);
          targetY = keeperY + 6;
        }

        // Parabolic trajectory
        ballX = spotX + flightT * (targetX - spotX);
        const linearY = spotY + flightT * (targetY - spotY);
        const arcLift = Math.sin(flightT * Math.PI) * (anim.pitchElevation === 'panenka' ? 70 : 30);
        ballY = linearY - arcLift;

        ballScale = 1.0 - flightT * 0.54;
        anim.ballSpin += 0.35;

        // High velocity flame/slipstream motion trail
        if (anim.powerKmH >= 100 && flightT < 0.88) {
          ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
          ctx.lineWidth = 5 * ballScale;
          ctx.beginPath();
          ctx.moveTo(spotX, spotY);
          ctx.quadraticCurveTo((spotX + ballX) / 2, (spotY + ballY) / 2 - arcLift, ballX, ballY);
          ctx.stroke();
        }
      }

      // Ball Turf Shadow
      const shadowY = spotY + (ballY - spotY) * 0.35;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.beginPath();
      ctx.ellipse(ballX, shadowY, 11 * ballScale, 4.5 * ballScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3D Shaded Soccer Ball Sphere
      const ballRadius = 9.5 * ballScale;
      ctx.save();
      ctx.translate(ballX, ballY);
      ctx.rotate(anim.ballSpin);

      // Shaded leather gradient
      const ballGrad = ctx.createRadialGradient(-ballRadius * 0.35, -ballRadius * 0.35, 1, 0, 0, ballRadius);
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.65, '#e2e8f0');
      ballGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(0, 0, ballRadius, 0, Math.PI * 2);
      ctx.fill();

      // Pentagonal Panels
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, ballRadius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // -------------------------------------------------------------
      // 10. PARTICLE SYSTEM ENGINE (TURF DUST & CELEBRATION SPARKS)
      // -------------------------------------------------------------
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // gravity
        p.alpha -= 0.025;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Physics Clock Update
      if (matchState === 'runup') {
        anim.runup += 0.055;
      } else if (matchState === 'ball_flight') {
        const speed = (anim.powerKmH / 100) * 0.062;
        anim.ballT += speed;
        anim.keeperT += 0.068;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [matchState, attackingTeam, currentShooter.number, userSelectedDir, hoveredDir]);

  // Click on Canvas directly to choose direction
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (matchState !== 'aiming') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;

    if (x < w * 0.38) {
      handleUserChoice('left');
    } else if (x > w * 0.62) {
      handleUserChoice('right');
    } else {
      handleUserChoice('centre');
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (matchState !== 'aiming') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;

    if (x < w * 0.38) setHoveredDir('left');
    else if (x > w * 0.62) setHoveredDir('right');
    else setHoveredDir('centre');
  };

  return (
    <div className="mx-auto flex min-h-[92vh] max-w-lg flex-col justify-between px-2 pt-1 pb-16 select-none">
      {/* ============================================================= */}
      {/* VIEW A: LOBBY & 3V3 MATCHMAKING CUE SCREEN                    */}
      {/* ============================================================= */}
      {matchState === 'lobby' ? (
        <div className="space-y-3 pt-2">
          {/* Header */}
          <div className="rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#0d2218] via-[#081711] to-[#040e0a] p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#064e3b] p-1.5 border border-[#35d399]/40 shadow-sm">
                  <KatikaLogo className="h-full w-full" />
                </div>
                <div>
                  <span className="font-mono-custom text-[10px] uppercase tracking-widest text-[#35D399]">
                    PvP STADIUM ARENA
                  </span>
                  <h1 className="text-lg font-black text-white">3v3 Penalty Shootout</h1>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-[#35D399]/40 bg-[#35D399]/15 px-2.5 py-1 text-[11px] font-mono-custom text-[#35D399]">
                <Radio size={11} className="animate-pulse" />
                <span>CUE LIVE</span>
              </div>
            </div>

            <p className="mt-2 text-xs text-[#8FA39A] leading-relaxed">
              Multiplayer 3 vs 3 penalty shootout. Players join the cue and take turns shooting and saving! Strictly 3 directions (Left, Centre, Right).
            </p>
          </div>

          {/* 3v3 Squad Lineup Preview */}
          <div className="rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono-custom text-xs font-bold text-white uppercase tracking-wider">
                3 vs 3 Squad Roster
              </span>
              <span className="font-mono-custom text-[10px] text-[#35D399]">6 Players Total</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Team Katika */}
              <div className="rounded-xl border border-[#35D399]/30 bg-black/40 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono-custom text-[10px] font-black text-[#35D399] uppercase">
                    Katika Elite
                  </span>
                  <span className="text-[9px] text-[#8FA39A]">Your Team</span>
                </div>
                {teamA.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between text-[11px] bg-white/5 px-2 py-1 rounded">
                    <span className="font-medium text-white">#{p.number} {p.name}</span>
                    <span className="text-[9px] font-mono-custom text-[#35D399]">Slot {idx + 1}</span>
                  </div>
                ))}
              </div>

              {/* Team Rivals */}
              <div className="rounded-xl border border-blue-500/30 bg-black/40 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono-custom text-[10px] font-black text-blue-400 uppercase">
                    Rivals Squad
                  </span>
                  <span className="text-[9px] text-[#8FA39A]">Opponents</span>
                </div>
                {teamB.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between text-[11px] bg-white/5 px-2 py-1 rounded">
                    <span className="font-medium text-[#cbd5e1]">#{p.number} {p.name}</span>
                    <span className="text-[9px] font-mono-custom text-blue-400">Slot {idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gameplay Mechanics Info Card */}
          <div className="rounded-2xl border border-[#1C3A2E] bg-[#0A1612] p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-mono-custom text-[#fef08a] font-bold text-[11px]">
              <Sparkles size={13} />
              <span>Shootout Rules &amp; Graphics</span>
            </div>
            <ul className="text-[11px] text-[#8FA39A] space-y-1 list-disc pl-4">
              <li><strong className="text-white">Strictly 3 Directions:</strong> Left, Centre, and Right.</li>
              <li><strong className="text-white">Randomized Telemetry:</strong> Varied shot power (78–124 km/h), pitch elevations (low, mid, high, panenka), and dynamic player motions.</li>
              <li><strong className="text-white">Take Turns:</strong> Each player in the 3v3 squad steps up to shoot as striker and defends as goalkeeper!</li>
            </ul>
          </div>

          {/* Stake Selector */}
          <div className="rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Wager Stake ($KTK)</span>
              <span className="font-mono-custom text-xs font-bold text-[#35D399]">
                {stake} KTK (Pot: {stake * 2} KTK)
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[10, 25, 50, 75].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setStake(amt)}
                  className={`rounded-xl border py-2 text-center font-mono-custom text-xs font-bold transition-all ${
                    stake === amt
                      ? 'border-[#35D399] bg-[#35D399]/20 text-[#35D399]'
                      : 'border-[#1C3A2E] bg-black/40 text-[#8FA39A] hover:text-white'
                  }`}
                >
                  {amt} KTK
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={joinQueue}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#208b61] via-[#35D399] to-[#208b61] py-3.5 text-sm font-black text-[#062018] shadow-lg transition-transform active:scale-[0.99] hover:opacity-95"
            >
              <Users size={18} />
              <span>JOIN 3v3 MATCHMAKING CUE</span>
            </button>

            <button
              type="button"
              onClick={startCountdown}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1C3A2E] bg-black/40 py-2.5 font-mono-custom text-xs font-bold text-[#8FA39A] hover:text-white"
            >
              <span>Instant Squad Kickoff (Practice) →</span>
            </button>
          </div>
        </div>
      ) : matchState === 'queue_matching' ? (
        /* ============================================================= */
        /* VIEW B: ACTIVE CUE MATCHMAKING ANIMATION                      */
        /* ============================================================= */
        <div className="my-auto rounded-3xl border border-[#35D399]/40 bg-[#091712] p-6 text-center shadow-2xl space-y-4">
          <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#064e3b]/40 border border-[#35D399]/40">
            <Radio size={32} className="text-[#35D399] animate-pulse" />
          </div>

          <div>
            <h2 className="text-xl font-black text-white">3v3 Matchmaking Cue</h2>
            <p className="mt-1 font-mono-custom text-xs text-[#35D399]">{queueStatusText}</p>
          </div>

          {/* Connected Players Bar */}
          <div className="mx-auto max-w-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-mono-custom text-[#8FA39A]">
              <span>Players in Cue:</span>
              <span className="font-bold text-[#fef08a]">{queuePlayersFound} / 6</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/60 border border-[#1C3A2E]">
              <div
                className="h-full bg-gradient-to-r from-[#35D399] to-[#fef08a] transition-all duration-300"
                style={{ width: `${(queuePlayersFound / 6) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-6 gap-1 pt-2">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div
                key={num}
                className={`py-2 rounded-lg border text-center font-mono-custom text-[10px] font-bold ${
                  num <= queuePlayersFound
                    ? 'border-[#35D399] bg-[#35D399]/20 text-[#35D399]'
                    : 'border-[#1C3A2E] bg-black/40 text-[#475569]'
                }`}
              >
                P{num}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setMatchState('lobby')}
            className="text-xs text-[#8FA39A] hover:text-white underline font-mono-custom pt-2"
          >
            Cancel Cue Search
          </button>
        </div>
      ) : matchState === 'countdown' ? (
        /* ============================================================= */
        /* VIEW C: 3-2-1 KICKOFF COUNTDOWN                               */
        /* ============================================================= */
        <div className="my-auto rounded-3xl border border-[#fef08a]/40 bg-[#091712] p-8 text-center shadow-2xl space-y-3">
          <span className="font-mono-custom text-xs font-black uppercase tracking-widest text-[#35D399]">
            Stadium Ready · 6 Players Connected
          </span>
          <div className="font-mono-custom text-7xl font-black text-[#fef08a] animate-ping">
            {countdownNum}
          </div>
          <p className="font-mono-custom text-sm font-bold text-white">GET READY TO SHOOT &amp; SAVE</p>
        </div>
      ) : (
        /* ============================================================= */
        /* VIEW D: LIVE MATCH ARENA (SCOREBOARD, CANVAS, CONTROLLER)     */
        /* ============================================================= */
        <>
          {/* BROADCAST TOP SCOREBOARD */}
          <div className="relative overflow-hidden rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#0d2218] via-[#081711] to-[#040e0a] p-3 shadow-2xl">
            <div className="flex items-center justify-between">
              {/* Team A (Katika Elite) */}
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#064e3b] p-1 border border-[#35d399]/40 shadow-sm">
                  <KatikaLogo className="h-full w-full" />
                </div>
                <div>
                  <span className="font-mono-custom text-xs font-black tracking-wider text-white">
                    KATIKA
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {shotsA.map((res, i) => (
                      <span key={i}>
                        {res === true ? (
                          <CheckCircle2 size={13} className="text-[#35d399]" />
                        ) : res === false ? (
                          <XCircle size={13} className="text-red-400" />
                        ) : (
                          <Circle size={11} className="text-[#475569]" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Central Live Score Display */}
              <div className="text-center px-4 py-1 rounded-xl bg-black/60 border border-[#1C3A2E] shadow-inner">
                <div className="font-mono-custom text-xl font-black text-[#fef08a] tracking-widest">
                  {scoreTeamA} - {scoreTeamB}
                </div>
                <span className="font-mono-custom text-[8px] font-bold uppercase tracking-widest text-[#35D399]">
                  ROUND {currentRound} / 3
                </span>
              </div>

              {/* Team B (Rivals) */}
              <div className="flex items-center gap-2 text-right">
                <div>
                  <span className="font-mono-custom text-xs font-black tracking-wider text-white">
                    RIVALS
                  </span>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {shotsB.map((res, i) => (
                      <span key={i}>
                        {res === true ? (
                          <CheckCircle2 size={13} className="text-[#35d399]" />
                        ) : res === false ? (
                          <XCircle size={13} className="text-red-400" />
                        ) : (
                          <Circle size={11} className="text-[#475569]" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#1e3a8a] text-xs font-black text-white border border-blue-400/40 shadow-sm">
                  WHU
                </div>
              </div>
            </div>

            {/* Dynamic Telemetric Banner Notice */}
            <div className="mt-2.5 flex items-center justify-between border-t border-[#1C3A2E] pt-2 text-[10px]">
              <div className="flex items-center gap-1.5 font-mono-custom text-[#8FA39A]">
                <Gauge size={12} className="text-[#fef08a]" />
                <span>KICKER: {currentShooter.name} vs KEEPER: {currentKeeper.name}</span>
              </div>
              <button
                type="button"
                onClick={toggleSound}
                className="flex items-center gap-1 text-[#8FA39A] hover:text-white"
              >
                {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>
            </div>
          </div>

          {/* 3D PENALTY CANVAS ARENA */}
          <div className="relative mt-2 overflow-hidden rounded-3xl border-2 border-[#1C3A2E] bg-black shadow-2xl">
            <canvas
              ref={canvasRef}
              width={480}
              height={380}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              className="h-full w-full object-cover cursor-pointer"
            />

            {/* Broadcast Notice Banner */}
            {bannerNotice && (
              <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-[#fef08a]/60 bg-black/80 px-4 py-1 font-mono-custom text-[11px] font-black tracking-wider text-[#fef08a] shadow-lg animate-fade-in backdrop-blur-sm">
                {bannerNotice}
              </div>
            )}

            {/* In-Game Active Shot Telemetry Overlay */}
            {activeShotData && matchState === 'shot_result' && (
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-2xl border border-[#35D399]/60 bg-black/90 px-4 py-2 font-mono-custom text-xs shadow-2xl backdrop-blur-md">
                <span className="font-bold text-[#fef08a]">{activeShotData.powerKmH} KM/H</span>
                <span className="text-white/40">|</span>
                <span className="font-bold uppercase text-[#35D399]">{activeShotData.pitchElevation}</span>
                <span className="text-white/40">|</span>
                <span className="font-black text-white">{activeShotData.shotDirection.toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* INTERACTIVE CONTROLLER: STRICTLY 3 DIRECTIONS (LEFT, CENTRE, RIGHT) */}
          <div className="mt-3">
            {matchState === 'aiming' ? (
              <div>
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="font-mono-custom text-xs font-black uppercase tracking-wider text-white">
                    {isUserTurnToShoot
                      ? '🎯 Choose Kick Direction (3 Options):'
                      : isUserTurnToSave
                      ? '🧤 Choose Goalkeeper Dive Direction:'
                      : `Watching ${currentShooter.name}...`}
                  </span>
                  <span className="font-mono-custom text-[10px] text-[#35D399]">
                    {isUserTurnToShoot ? 'Striker Turn' : isUserTurnToSave ? 'Keeper Turn' : 'Squadmate Turn'}
                  </span>
                </div>

                {/* THE 3 DIRECTIONAL TARGET BUTTONS */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUserChoice('left')}
                    onMouseEnter={() => setHoveredDir('left')}
                    onMouseLeave={() => setHoveredDir(null)}
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-[#1C3A2E] bg-gradient-to-b from-[#0E1A16] to-[#07110E] p-3.5 text-center transition-all hover:border-[#35D399] hover:bg-[#35D399]/15 active:scale-95 shadow-lg"
                  >
                    <ChevronLeft size={26} className="text-[#35D399] group-hover:-translate-x-1 transition-transform" />
                    <span className="mt-1 font-mono-custom text-sm font-black text-white">
                      LEFT
                    </span>
                    <span className="font-mono-custom text-[9px] text-[#8FA39A]">
                      {isUserTurnToShoot ? 'Post / Corner' : 'Dive Left'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUserChoice('centre')}
                    onMouseEnter={() => setHoveredDir('centre')}
                    onMouseLeave={() => setHoveredDir(null)}
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-[#1C3A2E] bg-gradient-to-b from-[#0E1A16] to-[#07110E] p-3.5 text-center transition-all hover:border-[#fef08a] hover:bg-[#fef08a]/15 active:scale-95 shadow-lg"
                  >
                    <Zap size={26} className="text-[#fef08a] group-hover:scale-110 transition-transform" />
                    <span className="mt-1 font-mono-custom text-sm font-black text-white">
                      CENTRE
                    </span>
                    <span className="font-mono-custom text-[9px] text-[#8FA39A]">
                      {isUserTurnToShoot ? 'Middle / Chip' : 'Hold Ground'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUserChoice('right')}
                    onMouseEnter={() => setHoveredDir('right')}
                    onMouseLeave={() => setHoveredDir(null)}
                    className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-[#1C3A2E] bg-gradient-to-b from-[#0E1A16] to-[#07110E] p-3.5 text-center transition-all hover:border-[#35D399] hover:bg-[#35D399]/15 active:scale-95 shadow-lg"
                  >
                    <ChevronRight size={26} className="text-[#35D399] group-hover:translate-x-1 transition-transform" />
                    <span className="mt-1 font-mono-custom text-sm font-black text-white">
                      RIGHT
                    </span>
                    <span className="font-mono-custom text-[9px] text-[#8FA39A]">
                      {isUserTurnToShoot ? 'Post / Corner' : 'Dive Right'}
                    </span>
                  </button>
                </div>
              </div>
            ) : matchState === 'game_over' ? (
              <div className="rounded-3xl border border-[#d4af37]/60 bg-[#091712] p-5 text-center shadow-2xl animate-fade-in">
                <Trophy size={40} className="mx-auto text-[#fef08a] animate-bounce" />
                <h3 className="mt-2 text-xl font-black text-white">Shootout Concluded!</h3>
                <p className="font-mono-custom text-base font-bold text-[#35D399]">
                  Final Score: {scoreTeamA} - {scoreTeamB}
                </p>
                <p className="mt-1 text-xs text-[#8FA39A]">
                  {scoreTeamA > scoreTeamB
                    ? 'Katika Elite wins the match!'
                    : scoreTeamB > scoreTeamA
                    ? 'Rivals edged the victory.'
                    : 'A hard-fought draw!'}
                </p>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMatchState('lobby')}
                    className="flex-1 rounded-xl bg-gradient-to-r from-[#fef08a] via-[#eab308] to-[#ca8a04] py-3 font-mono-custom text-xs font-black text-black shadow-lg hover:opacity-95"
                  >
                    NEW 3v3 MATCH
                  </button>
                  <Link
                    href="/pvp"
                    className="rounded-xl border border-[#1C3A2E] bg-black/40 px-4 py-3 font-mono-custom text-xs font-bold text-[#8FA39A] hover:text-white"
                  >
                    PvP Floor
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] py-4 text-center font-mono-custom text-xs text-[#8FA39A]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#fef08a] animate-ping" />
                <span>Kick in flight · Resolving strike...</span>
              </div>
            )}
          </div>

          {/* 3 VS 3 ROSTER PREVIEW STRIP */}
          <div className="mt-3 rounded-2xl border border-[#1C3A2E] bg-[#0A1612] p-3">
            <div className="flex items-center justify-between text-[10px] font-mono-custom text-[#8FA39A] uppercase tracking-wider mb-2">
              <span>3v3 Squad Lineup</span>
              <span className="text-[#35D399]">Taking Turns: Shoot &amp; Save</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Team A Lineup */}
              <div className="rounded-xl border border-[#1C3A2E]/80 bg-black/30 p-2 space-y-1">
                <span className="font-mono-custom text-[9px] font-bold text-[#35D399] uppercase">
                  Katika Elite
                </span>
                {teamA.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded ${
                      currentKickerSlot === idx && attackingTeam === 'A'
                        ? 'bg-[#35D399]/20 font-bold text-white'
                        : 'text-[#8FA39A]'
                    }`}
                  >
                    <span>#{p.number} {p.name}</span>
                    <span className="font-mono-custom text-[9px]">
                      {currentKickerSlot === idx && attackingTeam === 'A' ? 'SHOOTING ⚽' : 'Kicker'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Team B Lineup */}
              <div className="rounded-xl border border-[#1C3A2E]/80 bg-black/30 p-2 space-y-1">
                <span className="font-mono-custom text-[9px] font-bold text-blue-400 uppercase">
                  Rivals Squad
                </span>
                {teamB.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded ${
                      currentKickerSlot === idx && attackingTeam === 'B'
                        ? 'bg-blue-500/20 font-bold text-white'
                        : 'text-[#8FA39A]'
                    }`}
                  >
                    <span>#{p.number} {p.name}</span>
                    <span className="font-mono-custom text-[9px]">
                      {currentKickerSlot === idx && attackingTeam === 'B' ? 'SHOOTING ⚽' : 'Kicker'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
