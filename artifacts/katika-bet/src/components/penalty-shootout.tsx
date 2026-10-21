import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocation, Link } from 'wouter';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { usePrivy } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { useLegend } from '@/components/legend-card';
import { useToast } from '@/hooks/use-toast';
import { KatikaLogo } from '@/components/katika-logo';
import { fireWinConfetti } from '@/lib/confetti';
import { FOOTBALLER_ANIMATED_GLB } from '@/components/penalty-models';
import { useBallEconomy } from '@/hooks/use-ball-economy';
import { BallGateModal } from '@/components/ball-gate-modal';
import {
  Trophy,
  RotateCcw,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Shield,
  Play,
  CheckCircle2,
  XCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  Flame,
  Target,
  ArrowRight,
  Gauge,
  Crosshair,
  Camera,
  Coins,
} from 'lucide-react';

// =============================================================================
// AAA PROCEDURAL STADIUM AUDIO SYNTHESIZER (WEB AUDIO API)
// =============================================================================
class StadiumAudioEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;
  private crowdNode: AudioBufferSourceNode | null = null;
  private crowdGain: GainNode | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  startAmbience() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || this.crowdNode) return;
    try {
      // Procedural stadium crowd roar generator (pink noise filtered)
      const bufferSize = this.ctx.sampleRate * 3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2) * 0.08;
      }

      this.crowdNode = this.ctx.createBufferSource();
      this.crowdNode.buffer = buffer;
      this.crowdNode.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);

      this.crowdGain = this.ctx.createGain();
      this.crowdGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      this.crowdNode.connect(filter);
      filter.connect(this.crowdGain);
      this.crowdGain.connect(this.ctx.destination);
      this.crowdNode.start();
    } catch {}
  }

  stopAmbience() {
    if (this.crowdNode) {
      try {
        this.crowdNode.stop();
        this.crowdNode.disconnect();
      } catch {}
      this.crowdNode = null;
    }
  }

  playWhistle() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // High-pitched dual referee whistle trill
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(2600, t);
      osc1.frequency.setValueAtTime(2950, t + 0.07);
      osc2.frequency.setValueAtTime(2780, t);
      osc2.frequency.setValueAtTime(3120, t + 0.07);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.38);
      osc2.stop(t + 0.38);
    } catch {}
  }

  playKick(power = 100) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // Heavy leather football impact: deep boom + transient snap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(145, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.18);

      const amp = Math.min(0.5, 0.25 + (power / 120) * 0.2);
      gain.gain.setValueAtTime(amp, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);

      // Grass brush noise snap
      const snap = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snap.type = 'sawtooth';
      snap.frequency.setValueAtTime(320, t);
      snap.frequency.exponentialRampToValueAtTime(60, t + 0.08);
      snapGain.gain.setValueAtTime(0.12, t);
      snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      snap.connect(snapGain);
      snapGain.connect(this.ctx.destination);
      snap.start(t);
      snap.stop(t + 0.08);
    } catch {}
  }

  playGoal() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // Net ripple thud
      const netOsc = this.ctx.createOscillator();
      const netGain = this.ctx.createGain();
      netOsc.type = 'sine';
      netOsc.frequency.setValueAtTime(90, t);
      netOsc.frequency.exponentialRampToValueAtTime(25, t + 0.25);
      netGain.gain.setValueAtTime(0.3, t);
      netGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      netOsc.connect(netGain);
      netGain.connect(this.ctx.destination);
      netOsc.start(t);
      netOsc.stop(t + 0.25);

      // Stadium eruption fanfare chord
      const chords = [523.25, 659.25, 783.99, 1046.5];
      chords.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t + 0.05 + idx * 0.03);
        gain.gain.setValueAtTime(0.08, t + 0.05 + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t + 0.05 + idx * 0.03);
        osc.stop(t + 0.55);
      });
    } catch {}
  }

  playSave() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // Leather glove punch deflection
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.15);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch {}
  }

  playWoodwork() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // Metallic post clang
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1850, t);
      osc.frequency.exponentialRampToValueAtTime(920, t + 0.4);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    } catch {}
  }
}

const audio = new StadiumAudioEngine();

// =============================================================================
// GAMEPLAY ENGINE TYPES & CONTRACTS
// =============================================================================
export type ShotDirection = 'left' | 'centre' | 'right';
export type DiveDirection = 'left' | 'centre' | 'right';
export type ShotHeight = 'low' | 'mid' | 'high';

interface CharacterController {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
  currentActionName?: string;
  initialBottomY: number;
}

function switchCharacterAction(
  ctrl: CharacterController | null,
  targetName: string,
  crossfadeDuration = 0.22,
  clampWhenFinished = false
) {
  if (!ctrl) return;
  if (ctrl.currentActionName === targetName) return;
  const nextAction = ctrl.actions[targetName] || ctrl.actions.Idle || ctrl.actions.idle;
  if (!nextAction) return;

  const currentAction = ctrl.currentActionName ? ctrl.actions[ctrl.currentActionName] : undefined;
  if (currentAction && currentAction !== nextAction) {
    currentAction.fadeOut(crossfadeDuration);
  }

  nextAction.reset();
  if (clampWhenFinished) {
    nextAction.clampWhenFinished = true;
    nextAction.loop = THREE.LoopOnce;
  } else {
    nextAction.loop = THREE.LoopRepeat;
  }
  nextAction.fadeIn(crossfadeDuration).play();
  ctrl.currentActionName = targetName;
}

// =============================================================================
// MAIN COMPONENT: AAA PENALTY SHOOTOUT ARENA
// =============================================================================
export function PenaltyShootoutPage() {
  const [, setLocation] = useLocation();
  const { getAccessToken } = usePrivy();
  const { serverUser, reloadSession } = useServerSession();
  const { legend } = useLegend();
  const { toast } = useToast();
  const { state: ballState, consumeBall } = useBallEconomy();
  const [ballModalOpen, setBallModalOpen] = useState(false);
  const matchBallConsumedRef = useRef(false);

  // Settings & Bankroll
  const [stake, setStake] = useState<number>(10);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [cameraMode, setCameraMode] = useState<'broadcast' | 'action' | 'keeper'>('broadcast');

  // Match Series (3 Rounds - Frozen in PENALTY_ENGINE.md)
  const [round, setRound] = useState<number>(1);
  const [userScore, setUserScore] = useState<number>(0);
  const [aiScore, setAiScore] = useState<number>(0);
  const [userShots, setUserShots] = useState<(boolean | null)[]>([null, null, null]);
  const [aiShots, setAiShots] = useState<(boolean | null)[]>([null, null, null]);

  // Shot Height / Trajectory
  const [shotHeight, setShotHeight] = useState<ShotHeight>('mid');
  const [selectedDirection, setSelectedDirection] = useState<ShotDirection>('centre');

  // Interactive Power & Composure Lock
  const [aimProgress, setAimProgress] = useState<number>(50);
  const [isPowerCharging, setIsPowerCharging] = useState<boolean>(false);
  const [lockedPower, setLockedPower] = useState<number>(95);

  // Phases: 'aiming' -> 'runup' -> 'ball_flight' -> 'shot_result' -> 'game_over'
  const [phase, setPhase] = useState<'aiming' | 'runup' | 'ball_flight' | 'shot_result' | 'game_over'>('aiming');
  const [bannerNotice, setBannerNotice] = useState<string>('');
  const [lastShotSpeed, setLastShotSpeed] = useState<number | null>(null);

  // Settlement
  const [isSettling, setIsSettling] = useState<boolean>(false);
  const [settlementReceipt, setSettlementReceipt] = useState<{
    settled: boolean;
    payout?: number;
    won?: boolean;
    result?: string;
  } | null>(null);

  // Three.js References
  const containerRef = useRef<HTMLDivElement>(null);
  const strikerCtrlRef = useRef<CharacterController | null>(null);
  const keeperCtrlRef = useRef<CharacterController | null>(null);

  // Shared Animation State (Zero GC per frame)
  const animRef = useRef({
    runup: 0,
    ballT: 0,
    keeperT: 0,
    shotDir: 'centre' as ShotDirection,
    diveDir: 'centre' as DiveDirection,
    shotHeight: 'mid' as ShotHeight,
    scored: false,
    powerKmH: 102,
    composureRadius: 18,
    netWave: 0,
    cameraLerp: 0,
  });

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const soundOnRef = useRef(soundOn);
  useEffect(() => {
    soundOnRef.current = soundOn;
    audio.enabled = soundOn;
    if (soundOn) {
      audio.startAmbience();
    } else {
      audio.stopAmbience();
    }
  }, [soundOn]);

  // URL stake param
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      const urlStake = Number(search.get('stake'));
      if (urlStake > 0) setStake(urlStake);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // BACKEND SETTLEMENT (COMPATIBLE WITH REAL_CASINO & PVP SPEC)
  // ---------------------------------------------------------------------------
  const settleMatch = useCallback(
    async (finalUser: number, finalAi: number) => {
      if (stake <= 0) return;
      setIsSettling(true);
      try {
        const token = await getAccessToken();
        const outcome = finalUser > finalAi ? 'win' : finalAi > finalUser ? 'loss' : 'draw';
        const res = await fetch('/api/pvp/penalty/settle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            wager: stake,
            result: outcome,
            score: `${finalUser}-${finalAi}`,
            detail: 'AAA 3D Penalty Shootout Arena',
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setSettlementReceipt({
            settled: true,
            payout: data.payout,
            won: data.won,
            result: data.result,
          });
          await reloadSession();
          if (data.won) {
            fireWinConfetti();
            toast({
              title: 'Shootout Victory!',
              description: `+${data.payout} KTK credited to your balance!`,
            });
          } else if (outcome === 'draw') {
            toast({
              title: 'Match Tied',
              description: `${stake} KTK refunded to your balance.`,
            });
          }
        } else {
          setSettlementReceipt({ settled: false });
        }
      } catch (err) {
        console.error('Settlement error:', err);
        setSettlementReceipt({ settled: false });
      } finally {
        setIsSettling(false);
      }
    },
    [stake, getAccessToken, reloadSession, toast]
  );

  // ---------------------------------------------------------------------------
  // SHOT MECHANICS & PHYSICS (FROZEN RULES IN PENALTY_ENGINE.MD)
  // ---------------------------------------------------------------------------
  const triggerShoot = (targetDir: ShotDirection, targetHeight: ShotHeight = shotHeight) => {
    if (phase !== 'aiming') return;

    // Check $BALL token requirement for match entry
    if (round === 1 && !matchBallConsumedRef.current) {
      if (ballState.balls < 1) {
        setBallModalOpen(true);
        return;
      }
      void consumeBall('Penalty Shootout Arena');
      matchBallConsumedRef.current = true;
      toast({
        title: '⚽ 1 $BALL Token Consumed',
        description: `Match entry active! (${ballState.balls - 1} $BALL remaining)`,
      });
    }

    setSelectedDirection(targetDir);
    const dirs: DiveDirection[] = ['left', 'centre', 'right'];
    const aiDive = dirs[Math.floor(Math.random() * dirs.length)];

    const anim = animRef.current;
    anim.shotDir = targetDir;
    anim.diveDir = aiDive;
    anim.shotHeight = targetHeight;

    // Exit speed calibrated between 88 - 122 km/h
    const baseSpeed = Math.floor(92 + (lockedPower / 100) * 26 + (Math.random() * 8 - 4));
    anim.powerKmH = Math.min(122, Math.max(88, baseSpeed));
    setLastShotSpeed(anim.powerKmH);

    // Rule: Score if shot direction !== keeper dive.
    // Green composure ring (<20) still scores 42% of the time even if keeper guesses!
    let isGoal = targetDir !== aiDive;
    if (!isGoal && anim.composureRadius < 20 && Math.random() < 0.42) {
      isGoal = true;
    }

    anim.scored = isGoal;
    anim.runup = 0;
    anim.ballT = 0;
    anim.keeperT = 0;
    anim.netWave = 0;

    // Phase 1: Run-up sprint
    setPhase('runup');
    audio.playWhistle();

    // Striker switches to Sprint/Run
    switchCharacterAction(strikerCtrlRef.current, 'Sprint', 0.15);

    // Phase 2: Foot strikes ball
    setTimeout(() => {
      setPhase('ball_flight');
      audio.playKick(anim.powerKmH);

      // Striker kicks
      switchCharacterAction(strikerCtrlRef.current, 'Kick', 0.08, true);

      // Goalkeeper reacts and dives
      if (keeperCtrlRef.current) {
        if (isGoal) {
          switchCharacterAction(keeperCtrlRef.current, 'GK_Miss', 0.12, true);
        } else {
          switchCharacterAction(keeperCtrlRef.current, 'GK_Catch', 0.12, true);
        }
      }

      // Phase 3: Ball hits net or saved
      setTimeout(() => {
        setPhase('shot_result');
        if (isGoal) {
          audio.playGoal();
          setBannerNotice(`GOAL! ${anim.powerKmH} KM/H`);
          setUserScore((prev) => prev + 1);

          // Striker celebration!
          switchCharacterAction(strikerCtrlRef.current, 'Bicycle', 0.2);
        } else {
          audio.playSave();
          setBannerNotice('SAVED BY GOALKEEPER!');

          // Striker frustration!
          switchCharacterAction(strikerCtrlRef.current, 'Stumble', 0.2);
        }

        // Record User Shot
        setUserShots((prev) => {
          const next = [...prev];
          next[round - 1] = isGoal;
          return next;
        });

        // Opponent's shot in round
        const aiScoredShot = Math.random() < 0.58;
        if (aiScoredShot) setAiScore((prev) => prev + 1);
        setAiShots((prev) => {
          const next = [...prev];
          next[round - 1] = aiScoredShot;
          return next;
        });

        // Phase 4: Next round or game over
        setTimeout(() => {
          setBannerNotice('');
          if (round < 3) {
            setRound((prev) => prev + 1);
            setPhase('aiming');
            // Reset character idle stances
            switchCharacterAction(strikerCtrlRef.current, 'Idle', 0.3);
            switchCharacterAction(keeperCtrlRef.current, 'Idle', 0.3);
          } else {
            setPhase('game_over');
            const finalU = userScore + (isGoal ? 1 : 0);
            const finalA = aiScore + (aiScoredShot ? 1 : 0);
            settleMatch(finalU, finalA);
          }
        }, 2400);
      }, 920);
    }, 640);
  };

  const handleRestart = () => {
    matchBallConsumedRef.current = false;
    setRound(1);
    setUserScore(0);
    setAiScore(0);
    setUserShots([null, null, null]);
    setAiShots([null, null, null]);
    setSettlementReceipt(null);
    setBannerNotice('');
    setPhase('aiming');
    switchCharacterAction(strikerCtrlRef.current, 'Idle', 0.2);
    switchCharacterAction(keeperCtrlRef.current, 'Idle', 0.2);
  };

  // ---------------------------------------------------------------------------
  // 3D GRAPHICS ENGINE (THREE.JS AAA STADIUM, SHADOWS, TURF, DYNAMICS)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Sky & Atmospheric Stadium Lighting
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060c14);
    scene.fog = new THREE.FogExp2(0x0a1626, 0.016);

    const camera = new THREE.PerspectiveCamera(44, 16 / 9, 0.1, 120);
    camera.position.set(0, 1.85, 4.2);
    camera.lookAt(0, 1.25, -7.2);

    // Renderer: ACES Filmic Tone Mapping, High-Precision Soft Shadows
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const updateSize = () => {
      if (!container) return;
      const w = container.clientWidth || 1280;
      const h = container.clientHeight || 720;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, true);
    };
    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    // Stadium Floodlights: 4 Massive High-Angle Towers with Spotlights
    const ambientLight = new THREE.AmbientLight(0x223548, 1.4);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x78a8d1, 0x1a3320, 1.2);
    scene.add(hemiLight);

    // Key Spotlight from Upper Left Tower
    const spotL = new THREE.SpotLight(0xfff5e6, 3.5, 45, Math.PI / 4, 0.4, 1);
    spotL.position.set(-14, 22, 10);
    spotL.target.position.set(0, 1, -4);
    spotL.castShadow = true;
    spotL.shadow.mapSize.set(2048, 2048);
    spotL.shadow.bias = -0.0003;
    spotL.shadow.normalBias = 0.02;
    scene.add(spotL);
    scene.add(spotL.target);

    // Rim Spotlight from Upper Right Tower
    const spotR = new THREE.SpotLight(0xd9eeff, 2.8, 45, Math.PI / 4, 0.4, 1);
    spotR.position.set(14, 22, 10);
    spotR.target.position.set(0, 1, -4);
    spotR.castShadow = true;
    spotR.shadow.mapSize.set(1024, 1024);
    scene.add(spotR);
    scene.add(spotR.target);

    // Goal Frame Fill Light
    const goalFill = new THREE.DirectionalLight(0xa5d8ff, 1.2);
    goalFill.position.set(0, 8, -12);
    goalFill.target.position.set(0, 1.2, -7.2);
    scene.add(goalFill);
    scene.add(goalFill.target);

    // 2. High-Fidelity Mown Turf Pitch
    const pitchGeo = new THREE.PlaneGeometry(42, 60);
    const turfCanvas = document.createElement('canvas');
    turfCanvas.width = 1024;
    turfCanvas.height = 1024;
    const tctx = turfCanvas.getContext('2d')!;

    // Alternate realistic grass stripes with noise texture
    for (let i = 0; i < 20; i++) {
      tctx.fillStyle = i % 2 === 0 ? '#1b4b24' : '#235e2e';
      tctx.fillRect(0, i * 51.2, 1024, 52);
    }
    // Subtle grass blade noise speckle
    for (let j = 0; j < 6000; j++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      tctx.fillStyle = Math.random() > 0.5 ? 'rgba(38, 104, 52, 0.35)' : 'rgba(18, 52, 26, 0.4)';
      tctx.fillRect(x, y, 2, 2);
    }

    // Regulation Penalty Area & Box Lines
    tctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    tctx.lineWidth = 8;
    // 18-yard box outline
    tctx.strokeRect(180, 100, 664, 420);
    // 6-yard box outline
    tctx.strokeRect(330, 100, 364, 150);
    // Penalty spot circle
    tctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    tctx.beginPath();
    tctx.arc(512, 380, 10, 0, Math.PI * 2);
    tctx.fill();
    // Penalty arc curve
    tctx.beginPath();
    tctx.arc(512, 380, 110, 0.65 * Math.PI, 1.35 * Math.PI, true);
    tctx.stroke();

    const turfTex = new THREE.CanvasTexture(turfCanvas);
    turfTex.wrapS = THREE.ClampToEdgeWrapping;
    turfTex.wrapT = THREE.ClampToEdgeWrapping;

    const pitchMat = new THREE.MeshStandardMaterial({
      map: turfTex,
      roughness: 0.88,
      metalness: 0.05,
    });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.set(0, 0, -4);
    pitch.receiveShadow = true;
    scene.add(pitch);

    // 3. 3D Stadium Stands & LED Advertising Perimeter Ribbons
    const stadiumGroup = new THREE.Group();

    // Dynamic LED Advertising Ribbon along Goal Line
    const adCanvas = document.createElement('canvas');
    adCanvas.width = 1024;
    adCanvas.height = 128;
    const adCtx = adCanvas.getContext('2d')!;
    adCtx.fillStyle = '#06130e';
    adCtx.fillRect(0, 0, 1024, 128);
    adCtx.strokeStyle = '#35d399';
    adCtx.lineWidth = 4;
    adCtx.strokeRect(4, 4, 1016, 120);

    adCtx.fillStyle = '#35d399';
    adCtx.font = 'bold 36px monospace';
    adCtx.fillText('★ KATIKA BET ★  PS3 TRUE HD 3D  ★  CASINO ROYALE  ★  PLAY & WIN', 20, 78);

    const adTex = new THREE.CanvasTexture(adCanvas);
    adTex.wrapS = THREE.RepeatWrapping;
    adTex.repeat.set(3, 1);

    const ledMat = new THREE.MeshStandardMaterial({
      map: adTex,
      roughness: 0.2,
      emissive: new THREE.Color(0x10b981),
      emissiveMap: adTex,
      emissiveIntensity: 0.65,
    });
    const ledWall = new THREE.Mesh(new THREE.BoxGeometry(32, 1.1, 0.4), ledMat);
    ledWall.position.set(0, 0.55, -12);
    stadiumGroup.add(ledWall);

    // Multi-Tiered Stadium Grandstand
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x111c29,
      roughness: 0.75,
      metalness: 0.2,
    });
    for (let tier = 0; tier < 6; tier++) {
      const tierMesh = new THREE.Mesh(
        new THREE.BoxGeometry(40, 1.2, 2.5),
        standMat
      );
      tierMesh.position.set(0, 1.5 + tier * 1.3, -14 - tier * 2.2);
      stadiumGroup.add(tierMesh);

      // Instanced Crowd Silhouettes with team colored scarves
      const crowdCount = 36;
      const crowdGeo = new THREE.BoxGeometry(0.5, 0.8, 0.4);
      const crowdMat = new THREE.MeshBasicMaterial({ color: 0x1b354b });
      const crowdInst = new THREE.InstancedMesh(crowdGeo, crowdMat, crowdCount);
      const dummy = new THREE.Object3D();
      for (let c = 0; c < crowdCount; c++) {
        dummy.position.set(-18 + c * 1.05 + (Math.random() * 0.3 - 0.15), 2.5 + tier * 1.3, -14 - tier * 2.2);
        dummy.scale.set(0.9 + Math.random() * 0.3, 0.9 + Math.random() * 0.3, 0.9);
        dummy.updateMatrix();
        crowdInst.setMatrixAt(c, dummy.matrix);
      }
      crowdInst.instanceMatrix.needsUpdate = true;
      stadiumGroup.add(crowdInst);
    }

    // 4 High-Altitude Stadium Light Pylons
    const pylonGeo = new THREE.CylinderGeometry(0.3, 0.5, 24, 12);
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const pylonHeadGeo = new THREE.BoxGeometry(4, 3, 1);
    const pylonHeadMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    [
      [-16, -14],
      [16, -14],
      [-16, 8],
      [16, 8],
    ].forEach(([px, pz]) => {
      const pylon = new THREE.Mesh(pylonGeo, pylonMat);
      pylon.position.set(px, 12, pz);
      stadiumGroup.add(pylon);

      const phead = new THREE.Mesh(pylonHeadGeo, pylonHeadMat);
      phead.position.set(px, 24, pz);
      phead.lookAt(0, 1, -4);
      stadiumGroup.add(phead);
    });

    scene.add(stadiumGroup);

    // 4. Regulation Goal Structure & 3D Reactive Net
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.7,
    });

    // Upright Left Post
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 2.44, 28), postMat);
    postL.position.set(-3.66, 1.22, -7.2);
    postL.castShadow = true;
    scene.add(postL);

    // Upright Right Post
    const postR = postL.clone();
    postR.position.x = 3.66;
    scene.add(postR);

    // Crossbar
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 7.33, 28), postMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 2.44, -7.2);
    crossbar.castShadow = true;
    scene.add(crossbar);

    // Stanchions (Support rods behind goal)
    const stanchionMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const stanL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 12), stanchionMat);
    stanL.rotation.x = 0.55;
    stanL.position.set(-3.66, 1.25, -8.1);
    scene.add(stanL);

    const stanR = stanL.clone();
    stanR.position.x = 3.66;
    scene.add(stanR);

    // 3D Hexagonal Reactive Net
    const netGeo = new THREE.PlaneGeometry(7.32, 2.44, 24, 12);
    const netMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
      roughness: 0.4,
    });
    const netBack = new THREE.Mesh(netGeo, netMat);
    netBack.position.set(0, 1.22, -8.2);
    scene.add(netBack);

    // Net Roof
    const netRoofGeo = new THREE.PlaneGeometry(7.32, 1.0, 24, 6);
    const netRoof = new THREE.Mesh(netRoofGeo, netMat);
    netRoof.rotation.x = Math.PI / 2;
    netRoof.position.set(0, 2.44, -7.7);
    scene.add(netRoof);

    // Net Sides
    const netSideGeo = new THREE.PlaneGeometry(1.0, 2.44, 6, 12);
    const netSideL = new THREE.Mesh(netSideGeo, netMat);
    netSideL.rotation.y = Math.PI / 2;
    netSideL.position.set(-3.66, 1.22, -7.7);
    scene.add(netSideL);

    const netSideR = netSideL.clone();
    netSideR.position.x = 3.66;
    scene.add(netSideR);

    // 5. Official Match Soccer Ball (FIFA Spec 32-Panel Texture)
    const ballCanvas = document.createElement('canvas');
    ballCanvas.width = 512;
    ballCanvas.height = 256;
    const bctx = ballCanvas.getContext('2d')!;
    bctx.fillStyle = '#f8fafc';
    bctx.fillRect(0, 0, 512, 256);

    // Geometric black/gold pentagon panels
    bctx.fillStyle = '#0f172a';
    for (let py = 0; py < 4; py++) {
      for (let px = 0; px < 8; px++) {
        if ((px + py) % 2 === 0) {
          bctx.beginPath();
          const cx = px * 64 + 32;
          const cy = py * 64 + 32;
          bctx.arc(cx, cy, 18, 0, Math.PI * 2);
          bctx.fill();
        }
      }
    }
    // Katika gold accent ribbons
    bctx.strokeStyle = '#35d399';
    bctx.lineWidth = 4;
    bctx.strokeRect(0, 0, 512, 256);

    const ballTex = new THREE.CanvasTexture(ballCanvas);
    const ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 36, 36),
      new THREE.MeshStandardMaterial({
        map: ballTex,
        roughness: 0.28,
        metalness: 0.1,
      })
    );
    ballMesh.position.set(0, 0.115, 0);
    ballMesh.castShadow = true;
    scene.add(ballMesh);

    // 6. Dynamic Turf Kick-Off Dust / Grass Particles
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleVel = new Float32Array(particleCount * 3);
    for (let p = 0; p < particleCount; p++) {
      particlePos[p * 3] = 0;
      particlePos[p * 3 + 1] = 0.05;
      particlePos[p * 3 + 2] = 0;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x35d399,
      size: 0.045,
      transparent: true,
      opacity: 0,
    });
    const kickParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(kickParticles);

    // 7. Composure Precision Aiming HUD Ring
    const compRingGeo = new THREE.RingGeometry(0.18, 0.22, 48);
    const compRingMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const composureMesh = new THREE.Mesh(compRingGeo, compRingMat);
    composureMesh.rotation.x = -Math.PI / 2;
    composureMesh.position.set(0, 0.015, 0);
    scene.add(composureMesh);

    // -------------------------------------------------------------------------
    // 8. LOAD DEDICATED OFFICIAL 'FOOTBALLER ANIMATED' GLB (STRIKER & KEEPER)
    // -------------------------------------------------------------------------
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      FOOTBALLER_ANIMATED_GLB,
      (gltf) => {
        // === STRIKER SETUP ===
        const strikerGroup = SkeletonUtils.clone(gltf.scene) as THREE.Group;
        const strikerMixer = new THREE.AnimationMixer(strikerGroup);
        const strikerActions: Record<string, THREE.AnimationAction> = {};

        gltf.animations.forEach((clip) => {
          strikerActions[clip.name] = strikerMixer.clipAction(clip);
        });

        // Normalize scale to 1.84m athlete
        const strikerBbox = new THREE.Box3().setFromObject(strikerGroup);
        const strikerSize = new THREE.Vector3();
        strikerBbox.getSize(strikerSize);
        const strikerScale = strikerSize.y > 0.05 ? 1.84 / strikerSize.y : 1;
        strikerGroup.scale.set(strikerScale, strikerScale, strikerScale);

        strikerBbox.setFromObject(strikerGroup);
        const strikerBottomY = strikerBbox.min.y;

        strikerGroup.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            // Tint Katika Emerald Kit for Striker
            const mesh = node as THREE.Mesh;
            if (mesh.name === 'Player_Jersey' || mesh.name === 'Player_Socks') {
              if (mesh.material && !Array.isArray(mesh.material)) {
                mesh.material = mesh.material.clone();
                (mesh.material as THREE.MeshStandardMaterial).color = new THREE.Color(0x10b981);
              }
            } else if (mesh.name === 'Player_Shorts') {
              if (mesh.material && !Array.isArray(mesh.material)) {
                mesh.material = mesh.material.clone();
                (mesh.material as THREE.MeshStandardMaterial).color = new THREE.Color(0x064e3b);
              }
            }
          }
        });

        // The model natively faces -Z (towards the goal) when rotation.y = 0.
        // Striker runup starts behind ball at z = +2.2, facing towards goal at z = -7.2.
        // Slight natural diagonal approach angle (0.08 rad)
        strikerGroup.rotation.y = 0;
        strikerGroup.position.set(-0.25, -strikerBottomY, 2.2);
        scene.add(strikerGroup);

        const sIdle = strikerActions.Idle || strikerActions.idle || Object.values(strikerActions)[0];
        if (sIdle) sIdle.play();

        strikerCtrlRef.current = {
          root: strikerGroup,
          mixer: strikerMixer,
          actions: strikerActions,
          currentActionName: 'Idle',
          initialBottomY: strikerBottomY,
        };

        // === GOALKEEPER SETUP ===
        const keeperGroup = SkeletonUtils.clone(gltf.scene) as THREE.Group;
        const keeperMixer = new THREE.AnimationMixer(keeperGroup);
        const keeperActions: Record<string, THREE.AnimationAction> = {};

        gltf.animations.forEach((clip) => {
          keeperActions[clip.name] = keeperMixer.clipAction(clip);
        });

        // Normalize scale to 1.92m tall goalkeeper
        const keeperBbox = new THREE.Box3().setFromObject(keeperGroup);
        const keeperSize = new THREE.Vector3();
        keeperBbox.getSize(keeperSize);
        const keeperScale = keeperSize.y > 0.05 ? 1.92 / keeperSize.y : 1;
        keeperGroup.scale.set(keeperScale, keeperScale, keeperScale);

        keeperBbox.setFromObject(keeperGroup);
        const keeperBottomY = keeperBbox.min.y;

        keeperGroup.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            // Tint Electric Blue / Neon Yellow Goalkeeper Kit
            const mesh = node as THREE.Mesh;
            if (mesh.name === 'Player_Jersey') {
              if (mesh.material && !Array.isArray(mesh.material)) {
                mesh.material = mesh.material.clone();
                (mesh.material as THREE.MeshStandardMaterial).color = new THREE.Color(0x38bdf8);
              }
            } else if (mesh.name === 'Player_Shorts' || mesh.name === 'Player_Socks') {
              if (mesh.material && !Array.isArray(mesh.material)) {
                mesh.material = mesh.material.clone();
                (mesh.material as THREE.MeshStandardMaterial).color = new THREE.Color(0x0284c7);
              }
            }
          }
        });

        // Goalkeeper is stationed at the goal line (z = -7.05) and faces the striker (+Z).
        // Since model natively faces -Z, rotating 180 deg (Math.PI) makes keeper face directly towards striker!
        keeperGroup.rotation.y = Math.PI;
        keeperGroup.position.set(0, -keeperBottomY, -7.05);
        scene.add(keeperGroup);

        const kIdle = keeperActions.Idle || keeperActions.idle || Object.values(keeperActions)[0];
        if (kIdle) kIdle.play();

        keeperCtrlRef.current = {
          root: keeperGroup,
          mixer: keeperMixer,
          actions: keeperActions,
          currentActionName: 'Idle',
          initialBottomY: keeperBottomY,
        };
      },
      undefined,
      (err) => {
        console.error('Error loading footballer-animated.glb:', err);
      }
    );

    // -------------------------------------------------------------------------
    // 9. ANIMATION, KINEMATICS & 60FPS GAME LOOP
    // -------------------------------------------------------------------------
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();
      const currentPhase = phaseRef.current;
      const anim = animRef.current;

      // Update Character Animation Mixers
      if (strikerCtrlRef.current) {
        strikerCtrlRef.current.mixer.update(delta);
      }
      if (keeperCtrlRef.current) {
        keeperCtrlRef.current.mixer.update(delta);
      }

      // Dynamic LED Advertising Scroller
      adTex.offset.x = (elapsed * 0.08) % 1;

      // 1. Aiming Composure Ring Pulse
      const cycle = (elapsed % 1.2) / 1.2;
      const ringRadius = 0.16 + (Math.sin(cycle * Math.PI * 2) * 0.5 + 0.5) * 0.32;
      anim.composureRadius = ringRadius * 65;
      composureMesh.scale.set(ringRadius * 3.8, ringRadius * 3.8, 1);
      composureMesh.visible = currentPhase === 'aiming';

      if (ringRadius < 0.22) {
        compRingMat.color.setHex(0x22c55e); // Green precision zone (<20)
      } else if (ringRadius < 0.32) {
        compRingMat.color.setHex(0xfacc15); // Yellow warning zone
      } else {
        compRingMat.color.setHex(0xef4444); // Red zone
      }

      // 2. Striker Movement & Run-up Kinematics
      const sCtrl = strikerCtrlRef.current;
      if (sCtrl) {
        if (currentPhase === 'runup') {
          anim.runup += delta * 1.58;
          const runupT = Math.min(1, anim.runup);
          // Striker runs forward along decreasing Z from +2.2 to +0.32 at the penalty spot!
          const currentZ = 2.2 - runupT * 1.88;
          // Smooth diagonal approach curve
          const currentX = -0.25 * (1 - runupT);
          // Natural running vertical bounce
          const bounce = Math.abs(Math.sin(runupT * Math.PI * 6)) * 0.06;

          sCtrl.root.position.set(currentX, -sCtrl.initialBottomY + bounce, currentZ);
          // Leaning into the sprint forward towards the goal
          sCtrl.root.rotation.set(0.12 * (1 - runupT), 0, 0);
        } else if (currentPhase === 'ball_flight') {
          // Striker planted planting foot follow-through at ball spot
          sCtrl.root.position.set(0, -sCtrl.initialBottomY, 0.32);
          sCtrl.root.rotation.set(-0.06, 0, 0);
        } else if (currentPhase === 'shot_result') {
          if (anim.scored) {
            // Victorious celebration hop & pose
            const hop = Math.max(0, Math.sin(elapsed * 6)) * 0.12;
            sCtrl.root.position.set(0, -sCtrl.initialBottomY + hop, 0.32);
          } else {
            sCtrl.root.position.set(0, -sCtrl.initialBottomY, 0.32);
          }
        } else {
          // Ready Idle Stance: Athletic weight shift
          const sway = Math.sin(elapsed * 2.2) * 0.015;
          sCtrl.root.position.set(-0.25, -sCtrl.initialBottomY + sway, 2.2);
          sCtrl.root.rotation.set(0, 0, 0);
        }
      }

      // 3. Ball Trajectory & Physics
      if (currentPhase === 'ball_flight' || currentPhase === 'shot_result') {
        const speedMultiplier = (anim.powerKmH / 100) * 2.3;
        anim.ballT += delta * speedMultiplier;
        const flightT = Math.min(1, anim.ballT);

        // Target coordinates in goal plane (z = -7.2)
        let targetX = 0;
        if (anim.shotDir === 'left') targetX = -2.1;
        if (anim.shotDir === 'right') targetX = 2.1;

        let targetY = 1.35;
        if (anim.shotHeight === 'low') targetY = 0.45;
        if (anim.shotHeight === 'high') targetY = 2.15;

        // Realistic aerodynamical ball trajectory with dip & spin curve
        const curveOffset = (anim.shotDir === 'left' ? -0.25 : anim.shotDir === 'right' ? 0.25 : 0) * Math.sin(flightT * Math.PI);
        ballMesh.position.x = flightT * targetX + curveOffset;
        ballMesh.position.z = -flightT * 7.2;
        ballMesh.position.y = 0.115 + flightT * (targetY - 0.115) + Math.sin(flightT * Math.PI) * 0.62;

        // Rapid ball spin rotation
        ballMesh.rotation.x += delta * 24;
        ballMesh.rotation.y += delta * 18;

        // Turf Kick Dust Emission at launch
        if (flightT < 0.35) {
          particleMat.opacity = 0.8 * (1 - flightT / 0.35);
          for (let p = 0; p < particleCount; p++) {
            particlePos[p * 3] += (Math.random() - 0.5) * 0.05;
            particlePos[p * 3 + 1] += Math.random() * 0.04;
            particlePos[p * 3 + 2] += (Math.random() - 0.5) * 0.05;
          }
          particleGeo.attributes.position.needsUpdate = true;
        } else {
          particleMat.opacity = 0;
        }

        // 3D Goal Net Reaction Physics
        if (anim.scored && flightT > 0.82) {
          anim.netWave += delta * 12;
          const ripple = Math.sin(anim.netWave) * 0.28 * Math.exp(-(flightT - 0.82) * 4);
          netBack.position.z = -8.2 - ripple;
        }
      } else {
        ballMesh.position.set(0, 0.115, 0);
        ballMesh.rotation.set(0, 0, 0);
        netBack.position.z = -8.2;
        particleMat.opacity = 0;
      }

      // 4. Goalkeeper Kinematics & Full-Stretch Dive
      const kCtrl = keeperCtrlRef.current;
      if (kCtrl) {
        if (currentPhase === 'ball_flight' || currentPhase === 'shot_result') {
          anim.keeperT += delta * 2.5;
          const diveT = Math.min(1, anim.keeperT);

          let diveX = 0;
          let diveTilt = 0;
          if (anim.diveDir === 'left') {
            diveX = -2.05 * diveT;
            diveTilt = -1.15 * diveT; // Full horizontal stretch tilt
          } else if (anim.diveDir === 'right') {
            diveX = 2.05 * diveT;
            diveTilt = 1.15 * diveT;
          }

          // Diving arc lift and ground impact
          const diveLift = Math.sin(diveT * Math.PI) * 0.52;

          kCtrl.root.position.set(diveX, -kCtrl.initialBottomY + diveLift, -7.05);
          kCtrl.root.rotation.set(0, Math.PI, diveTilt);
        } else {
          // Goalkeeper Agile Ready Bounce & Shuffling
          const hop = Math.abs(Math.sin(elapsed * 7)) * 0.04;
          const shuffle = Math.sin(elapsed * 3.5) * 0.12;
          kCtrl.root.position.set(shuffle, -kCtrl.initialBottomY + hop, -7.05);
          kCtrl.root.rotation.set(0, Math.PI, 0);
        }
      }

      // 5. Dynamic Broadcast Cameras (FIFA Broadcast Style)
      if (currentPhase === 'runup') {
        // Dramatic low tracking dolly
        camera.position.lerp(new THREE.Vector3(0, 1.55, 3.4), 0.08);
        camera.lookAt(0, 1.2, -7.2);
      } else if (currentPhase === 'ball_flight') {
        // Sweep camera following trajectory towards corner
        const camTargetX = (anim.shotDir === 'left' ? -0.8 : anim.shotDir === 'right' ? 0.8 : 0);
        camera.position.lerp(new THREE.Vector3(camTargetX, 1.75, 2.8), 0.1);
        camera.lookAt(ballMesh.position.x * 0.6, 1.3, -7.2);
      } else if (currentPhase === 'shot_result') {
        if (anim.scored) {
          // Dramatic close-up celebration orbit
          const orbitAngle = elapsed * 0.8;
          camera.position.set(Math.sin(orbitAngle) * 2.6, 1.4, 0.32 + Math.cos(orbitAngle) * 2.6);
          camera.lookAt(0, 1.2, 0.32);
        } else {
          camera.position.lerp(new THREE.Vector3(0, 1.7, -4.5), 0.08);
          camera.lookAt(0, 1.2, -7.05);
        }
      } else {
        // Default broadcast over-the-shoulder view
        camera.position.lerp(new THREE.Vector3(0, 1.85, 4.2), 0.08);
        camera.lookAt(0, 1.25, -7.2);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      audio.stopAmbience();
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-[92vh] max-w-xl flex-col justify-between px-2 pt-1 pb-16 select-none font-sans">
      {/* Top Match Header: AAA Stadium Scoreboard */}
      <div className="rounded-2xl border border-[#35d399]/40 bg-gradient-to-r from-[#0d2218] via-[#081711] to-[#040e0a] p-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#064e3b] p-1.5 border border-[#35d399]/50 shadow-inner">
              <KatikaLogo className="h-full w-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-mono-custom text-[9px] uppercase tracking-widest text-[#35D399]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#35D399] animate-pulse" />
                <span>AAA STADIUM ARENA · REAL-TIME 3D</span>
              </div>
              <h1 className="text-base font-black text-white tracking-tight">Penalty Shootout</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/mine"
              className="flex items-center gap-1 rounded-full border border-yellow-500/40 bg-black/60 px-2.5 py-1 text-[10px] font-mono-custom text-yellow-400 font-bold hover:bg-yellow-400/15 transition-colors"
              title="1 $BALL consumed per match entry"
            >
              <span>⚽ {ballState.balls} BALL</span>
            </Link>
            <button
              type="button"
              onClick={() => setSoundOn(!soundOn)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-slate-400 hover:text-white transition-colors"
              title="Toggle Audio"
            >
              {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
          </div>
        </div>

        {/* Live Scoreboard Strip */}
        <div className="mt-2.5 flex items-center justify-between rounded-xl bg-black/60 border border-white/10 px-3 py-1.5 font-mono-custom text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#35D399]">YOU: {userScore}</span>
            <div className="flex gap-1">
              {userShots.map((s, idx) => (
                <span key={idx}>
                  {s === true ? (
                    <CheckCircle2 size={13} className="text-[#35D399]" />
                  ) : s === false ? (
                    <XCircle size={13} className="text-red-400" />
                  ) : (
                    <Circle size={11} className="text-slate-600" />
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-full bg-yellow-500/15 border border-yellow-400/30 px-2.5 py-0.5 text-[10px] font-black text-yellow-400">
            ROUND {round} / 3
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {aiShots.map((s, idx) => (
                <span key={idx}>
                  {s === true ? (
                    <CheckCircle2 size={13} className="text-[#35D399]" />
                  ) : s === false ? (
                    <XCircle size={13} className="text-red-400" />
                  ) : (
                    <Circle size={11} className="text-slate-600" />
                  )}
                </span>
              ))}
            </div>
            <span className="font-bold text-[#38bdf8]">GK: {aiScore}</span>
          </div>
        </div>
      </div>

      {/* 3D WebGL HD Stadium Viewport */}
      <div className="relative mt-2 overflow-hidden rounded-3xl border-2 border-slate-700 bg-slate-950 shadow-2xl aspect-video w-full">
        <div ref={containerRef} className="h-full w-full [&>canvas]:h-full [&>canvas]:w-full [&>canvas]:block" />

        {/* Live Result Banner */}
        {bannerNotice && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-yellow-400/60 bg-black/90 px-5 py-1.5 font-mono-custom text-xs font-black text-[#fde047] shadow-2xl animate-fade-in backdrop-blur-md whitespace-nowrap">
            {bannerNotice}
          </div>
        )}

        {/* Real-time Radar Gun Speed Readout */}
        {lastShotSpeed && phase !== 'aiming' && (
          <div className="pointer-events-none absolute top-3 right-3 rounded-lg bg-black/80 px-2.5 py-1 font-mono-custom text-[10px] text-white border border-white/10 backdrop-blur-sm flex items-center gap-1.5 shadow-lg">
            <Gauge size={12} className="text-yellow-400" />
            <span className="font-bold text-yellow-400">{lastShotSpeed}</span>
            <span className="text-[8px] text-slate-400">KM/H</span>
          </div>
        )}

        {/* Match HUD Status */}
        <div className="pointer-events-none absolute bottom-2 left-3 flex gap-2">
          <div className="rounded-lg bg-black/80 px-2.5 py-1 font-mono-custom text-[10px] text-[#35D399] border border-white/10 backdrop-blur-sm flex items-center gap-1.5 shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#35D399]" />
            <span>STRIKER: PRO FOOTBALLER</span>
          </div>
          <div className="rounded-lg bg-black/80 px-2.5 py-1 font-mono-custom text-[10px] text-[#38bdf8] border border-white/10 backdrop-blur-sm flex items-center gap-1.5 shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
            <span>KEEPER: PRO GOALIE</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Controls */}
      <div className="mt-2 space-y-2">
        {phase === 'aiming' ? (
          <div className="space-y-2">
            {/* Trajectory Elevation Toggle */}
            <div className="flex items-center justify-between rounded-xl bg-black/40 border border-white/10 px-3 py-1.5">
              <span className="font-mono-custom text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Crosshair size={12} className="text-[#35D399]" /> ELEVATION:
              </span>
              <div className="flex gap-1.5">
                {(['low', 'mid', 'high'] as ShotHeight[]).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setShotHeight(h)}
                    className={`rounded-lg px-2.5 py-0.5 font-mono-custom text-[10px] font-bold uppercase transition-all ${
                      shotHeight === h
                        ? 'bg-[#35D399] text-black shadow-sm'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Direction Buttons (FIFA Style 3-Sector Goal Face) */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => triggerShoot('left')}
                className="group flex flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-3.5 transition-all hover:border-[#35D399] hover:bg-[#35D399]/15 active:scale-95 shadow-xl"
              >
                <ChevronLeft size={26} className="text-[#35D399] group-hover:-translate-x-1 transition-transform" />
                <span className="mt-1 font-mono-custom text-xs font-black text-white">LEFT CORNER</span>
                <span className="text-[9px] text-slate-400 font-mono-custom">Левый угол</span>
              </button>

              <button
                type="button"
                onClick={() => triggerShoot('centre')}
                className="group flex flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-3.5 transition-all hover:border-[#facc15] hover:bg-[#facc15]/15 active:scale-95 shadow-xl"
              >
                <Zap size={26} className="text-[#facc15] group-hover:scale-110 transition-transform" />
                <span className="mt-1 font-mono-custom text-xs font-black text-white">CENTRE CHIP</span>
                <span className="text-[9px] text-slate-400 font-mono-custom">По центру</span>
              </button>

              <button
                type="button"
                onClick={() => triggerShoot('right')}
                className="group flex flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-3.5 transition-all hover:border-[#38bdf8] hover:bg-[#38bdf8]/15 active:scale-95 shadow-xl"
              >
                <ChevronRight size={26} className="text-[#38bdf8] group-hover:translate-x-1 transition-transform" />
                <span className="mt-1 font-mono-custom text-xs font-black text-white">RIGHT CORNER</span>
                <span className="text-[9px] text-slate-400 font-mono-custom">Правый угол</span>
              </button>
            </div>
          </div>
        ) : phase === 'game_over' ? (
          <div className="rounded-3xl border border-yellow-500/60 bg-slate-900 p-4 text-center shadow-2xl animate-fade-in space-y-3">
            <Trophy size={36} className="mx-auto text-yellow-400 animate-bounce" />
            <div>
              <h3 className="text-lg font-black text-white">Shootout Concluded!</h3>
              <p className="font-mono-custom text-base font-bold text-[#35D399]">
                Final: {userScore} - {aiScore}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {userScore > aiScore
                  ? 'Victory! You defeated the goalkeeper!'
                  : aiScore > userScore
                  ? 'Goalkeeper edged the win.'
                  : 'A thrilling draw!'}
              </p>
            </div>

            {/* Grok's Backend Settlement Receipt */}
            <div className="rounded-2xl border border-white/10 bg-black/50 p-3 text-left space-y-1.5 font-mono-custom text-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>WAGER STAKE:</span>
                <span className="font-bold text-white">{stake} KTK</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">SETTLEMENT RECEIPT:</span>
                {isSettling ? (
                  <span className="text-yellow-400 animate-pulse font-bold">Settling with Server...</span>
                ) : settlementReceipt?.settled ? (
                  settlementReceipt.won ? (
                    <span className="text-[#35D399] font-black">+{settlementReceipt.payout} KTK (WON)</span>
                  ) : settlementReceipt.result === 'draw' ? (
                    <span className="text-yellow-400 font-bold">{stake} KTK (REFUNDED)</span>
                  ) : (
                    <span className="text-red-400 font-bold">-{stake} KTK (SETTLED)</span>
                  )
                ) : (
                  <span className="text-slate-400">Practice Match</span>
                )}
              </div>
              {serverUser && (
                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-white/5 pt-1.5">
                  <span>BALANCE:</span>
                  <span className="font-bold text-[#35D399]">{serverUser.playable ?? 0} KTK</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleRestart}
                className="flex-1 rounded-2xl bg-gradient-to-r from-[#35D399] to-[#10b981] py-3 font-mono-custom text-xs font-black text-black shadow-lg hover:brightness-110 active:scale-95"
              >
                PLAY AGAIN
              </button>
              <Link
                href="/pvp"
                className="flex-1 rounded-2xl border border-slate-700 bg-black/40 py-3 font-mono-custom text-xs font-bold text-white hover:bg-white/10 flex items-center justify-center"
              >
                PVP LOBBY
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 text-center">
            <div className="flex items-center justify-center gap-2 font-mono-custom text-xs text-[#35D399]">
              <Flame size={14} className="animate-pulse" />
              <span>
                {phase === 'runup'
                  ? 'Striker is running up to strike the ball...'
                  : phase === 'ball_flight'
                  ? 'Ball in flight towards the goal!'
                  : 'Penalty outcome recorded!'}
              </span>
            </div>
          </div>
        )}

        {/* Wager Selection Strip */}
        <div className="rounded-2xl border border-[#1C3A2E] bg-[#0E1A16] p-3 flex items-center justify-between">
          <div className="font-mono-custom text-xs">
            <span className="text-slate-400 block text-[10px]">WAGER STAKE</span>
            <span className="text-white font-bold">{stake} KTK</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[10, 25, 50, 100].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setStake(amt)}
                className={`rounded-lg px-2.5 py-1 font-mono-custom text-xs font-bold transition-all ${
                  stake === amt
                    ? 'bg-[#35D399] text-black shadow-sm'
                    : 'bg-black/50 text-slate-300 hover:bg-white/10'
                }`}
              >
                {amt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <BallGateModal
        isOpen={ballModalOpen}
        onClose={() => setBallModalOpen(false)}
        gameTitle="Penalty Shootout Arena"
        ballsMinedToday={ballState.ballsMinedToday}
      />
    </div>
  );
}
