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
import { STRIKER_GLB, KEEPER_GLB } from '@/components/penalty-models';
import {
  Trophy,
  Swords,
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
  Upload,
  Layers,
  ArrowRight,
} from 'lucide-react';

// =============================================================================
// PROCEDURAL AUDIO SYNTHESIZER
// =============================================================================
class PenaltyAudio {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
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
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2600, t);
      osc.frequency.setValueAtTime(2900, t + 0.08);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    } catch {}
  }

  playKick(force = 1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.16);
      gain.gain.setValueAtTime(0.3 * force, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    } catch {}
  }

  playGoal() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.05);
        gain.gain.setValueAtTime(0.12, t + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t + idx * 0.05);
        osc.stop(t + 0.35);
      });
    } catch {}
  }

  playSave() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.22);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    } catch {}
  }
}

const audio = new PenaltyAudio();

// =============================================================================
// TYPES
// =============================================================================
export type ShotDirection = 'left' | 'centre' | 'right';
export type DiveDirection = 'left' | 'centre' | 'right';

interface HumanoidBones {
  hips?: THREE.Bone;
  spine?: THREE.Bone;
  chest?: THREE.Bone;
  neck?: THREE.Bone;
  head?: THREE.Bone;
  leftUpLeg?: THREE.Bone;
  leftLeg?: THREE.Bone;
  leftFoot?: THREE.Bone;
  rightUpLeg?: THREE.Bone;
  rightLeg?: THREE.Bone;
  rightFoot?: THREE.Bone;
  leftArm?: THREE.Bone;
  leftForeArm?: THREE.Bone;
  rightArm?: THREE.Bone;
  rightForeArm?: THREE.Bone;
}

interface RigController {
  bones: HumanoidBones;
  restRotations: Map<THREE.Bone, THREE.Quaternion>;
  initialHipsY: number;
  initialBottomY: number;
  mixer?: THREE.AnimationMixer;
  /** -1 if model natively faces -Z (e.g. Soldier, Cartoon), +1 if faces +Z (e.g. Xbot) */
  facingSign: number;
  actions: {
    idle?: THREE.AnimationAction;
    run?: THREE.AnimationAction;
    kick?: THREE.AnimationAction;
    celebrate?: THREE.AnimationAction;
    sad?: THREE.AnimationAction;
    dive?: THREE.AnimationAction;
    catch?: THREE.AnimationAction;
    miss?: THREE.AnimationAction;
  };
  currentActionName?: string;
}

function extractHumanoidBones(root: THREE.Object3D): HumanoidBones {
  const bones: HumanoidBones = {};
  root.traverse((child) => {
    if ((child as THREE.Bone).isBone) {
      const name = child.name.toLowerCase().replace(/[:_]/g, '');
      if (name.includes('hips') || name.includes('pelvis')) {
        bones.hips = child as THREE.Bone;
      } else if (name.includes('leftforearm') || name.includes('forearml') || name.includes('leftlowerarm')) {
        bones.leftForeArm = child as THREE.Bone;
      } else if (name.includes('rightforearm') || name.includes('forearmr') || name.includes('rightlowerarm')) {
        bones.rightForeArm = child as THREE.Bone;
      } else if (name.includes('leftarm') || name.includes('arml') || name.includes('leftupperarm')) {
        bones.leftArm = child as THREE.Bone;
      } else if (name.includes('rightarm') || name.includes('armr') || name.includes('rightupperarm')) {
        bones.rightArm = child as THREE.Bone;
      } else if (name.includes('leftfoot') || name.includes('footl') || name.includes('lefttoe')) {
        bones.leftFoot = child as THREE.Bone;
      } else if (name.includes('rightfoot') || name.includes('footr') || name.includes('righttoe')) {
        bones.rightFoot = child as THREE.Bone;
      } else if (name.includes('leftupleg') || name.includes('leftthigh') || name.includes('uplegl')) {
        bones.leftUpLeg = child as THREE.Bone;
      } else if (name.includes('rightupleg') || name.includes('rightthigh') || name.includes('uplegr')) {
        bones.rightUpLeg = child as THREE.Bone;
      } else if (name.includes('leftleg') || name.includes('leftcalf') || name.includes('legl')) {
        bones.leftLeg = child as THREE.Bone;
      } else if (name.includes('rightleg') || name.includes('rightcalf') || name.includes('legr')) {
        bones.rightLeg = child as THREE.Bone;
      } else if (name.includes('spine1') || name.includes('spine2') || name.includes('chest')) {
        bones.chest = child as THREE.Bone;
      } else if (name.includes('spine')) {
        bones.spine = child as THREE.Bone;
      } else if (name.includes('neck')) {
        bones.neck = child as THREE.Bone;
      } else if (name.includes('head') && !name.includes('top')) {
        bones.head = child as THREE.Bone;
      }
    }
  });
  return bones;
}

function createRigController(root: THREE.Object3D, animations?: THREE.AnimationClip[], bottomY = 0): RigController {
  const bones = extractHumanoidBones(root);
  const restRotations = new Map<THREE.Bone, THREE.Quaternion>();
  root.traverse((child) => {
    if ((child as THREE.Bone).isBone) {
      restRotations.set(child as THREE.Bone, child.quaternion.clone());
    }
  });

  let mixer: THREE.AnimationMixer | undefined;
  const actions: RigController['actions'] = {};

  if (animations && animations.length > 0) {
    mixer = new THREE.AnimationMixer(root);
    for (const clip of animations) {
      const name = clip.name.toLowerCase();
      if (!actions.idle && (name.includes('idle') || name.includes('ready') || name.includes('stand'))) {
        actions.idle = mixer.clipAction(clip);
      } else if (!actions.run && (name.includes('run') || name.includes('sprint') || name.includes('walk'))) {
        actions.run = mixer.clipAction(clip);
      } else if (!actions.kick && (name.includes('kick') || name.includes('shoot') || name.includes('strike') || name.includes('pass'))) {
        actions.kick = mixer.clipAction(clip);
      } else if (!actions.celebrate && (name.includes('celebrat') || name.includes('dance') || name.includes('agree') || name.includes('win') || name.includes('bicycle'))) {
        actions.celebrate = mixer.clipAction(clip);
      } else if (!actions.sad && (name.includes('sad') || name.includes('headshake') || name.includes('lose') || name.includes('fallen') || name.includes('stumble') || name.includes('gk_miss'))) {
        actions.sad = mixer.clipAction(clip);
      } else if (!actions.dive && (name.includes('dive') || name.includes('gk_dive') || name.includes('tackle'))) {
        actions.dive = mixer.clipAction(clip);
      } else if (!actions.catch && (name.includes('catch') || name.includes('gk_catch') || name.includes('receive'))) {
        actions.catch = mixer.clipAction(clip);
      } else if (!actions.miss && (name.includes('miss') || name.includes('gk_miss') || name.includes('fall'))) {
        actions.miss = mixer.clipAction(clip);
      }
    }

    if (!actions.idle && animations[0]) actions.idle = mixer.clipAction(animations[0]);
    if (!actions.run && animations[1]) actions.run = mixer.clipAction(animations[1]);
    if (!actions.kick && animations[2]) actions.kick = mixer.clipAction(animations[2]);
    if (!actions.celebrate && animations[3]) actions.celebrate = mixer.clipAction(animations[3]);

    if (actions.idle) actions.idle.play();
  }

  // Detect native model facing direction (difference between toe/foot and heel in rest orientation)
  let facingSign = -1; // default to -Z facing (standard three.js examples like Soldier)
  const leftToe = new THREE.Vector3();
  const leftHeel = new THREE.Vector3();
  let foundToe = false;
  let foundFoot = false;
  root.traverse((node) => {
    const n = node.name.toLowerCase();
    if (n.includes('toe')) {
      node.getWorldPosition(leftToe);
      foundToe = true;
    } else if (n.includes('foot')) {
      node.getWorldPosition(leftHeel);
      foundFoot = true;
    }
  });
  if (foundToe && foundFoot) {
    facingSign = leftToe.z > leftHeel.z ? 1 : -1;
  }

  return {
    bones,
    restRotations,
    initialHipsY: bones.hips ? bones.hips.position.y : 0,
    initialBottomY: bottomY,
    mixer,
    facingSign,
    actions,
    currentActionName: actions.idle ? 'idle' : undefined,
  };
}

function switchAction(rig: RigController, targetName: 'idle' | 'run' | 'kick' | 'celebrate' | 'sad' | 'dive' | 'catch' | 'miss') {
  if (!rig.mixer || rig.currentActionName === targetName) return;
  const targetAction = rig.actions[targetName] || rig.actions.idle;
  if (!targetAction) return;

  const currentAction = rig.currentActionName ? rig.actions[rig.currentActionName as keyof typeof rig.actions] : undefined;
  if (currentAction && currentAction !== targetAction) {
    currentAction.fadeOut(0.2);
  }
  targetAction.reset().fadeIn(0.2).play();
  rig.currentActionName = targetName;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export function PenaltyShootoutPage() {
  const [, setLocation] = useLocation();
  const { getAccessToken } = usePrivy();
  const { serverUser, reloadSession } = useServerSession();
  const { legend } = useLegend();
  const { toast } = useToast();

  // Settings & Bankroll
  const [stake, setStake] = useState<number>(10);
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Model & Asset Selection
  const [activeModelName, setActiveModelName] = useState<string>('Athlete Motion (.GLB)');
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Match Series (3 Rounds)
  const [round, setRound] = useState<number>(1);
  const [userScore, setUserScore] = useState<number>(0);
  const [aiScore, setAiScore] = useState<number>(0);
  const [userShots, setUserShots] = useState<(boolean | null)[]>([null, null, null]);
  const [aiShots, setAiShots] = useState<(boolean | null)[]>([null, null, null]);

  // Game Phases
  // 'aiming' -> 'runup' -> 'ball_flight' -> 'shot_result' -> 'game_over'
  const [phase, setPhase] = useState<'aiming' | 'runup' | 'ball_flight' | 'shot_result' | 'game_over'>('aiming');
  const [userTarget, setUserTarget] = useState<ShotDirection | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string>('');
  const [isSettling, setIsSettling] = useState<boolean>(false);
  const [settlementReceipt, setSettlementReceipt] = useState<{
    settled: boolean;
    payout?: number;
    won?: boolean;
    result?: string;
  } | null>(null);

  // Three.js Canvas Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const customModelRef = useRef<THREE.Group | null>(null);
  const rigRef = useRef<RigController | null>(null);
  const customKeeperModelRef = useRef<THREE.Group | null>(null);
  const keeperRigRef = useRef<RigController | null>(null);
  const [activeKeeperName, setActiveKeeperName] = useState<string>('Pro Goalkeeper (.GLB)');

  // Shared Animation State (Ref avoids re-render loops)
  const animRef = useRef({
    runup: 0,
    ballT: 0,
    keeperT: 0,
    shotDir: 'centre' as ShotDirection,
    diveDir: 'centre' as DiveDirection,
    scored: false,
    powerKmH: 98,
    composureRadius: 24,
    netRipple: 0,
  });

  // Keep state synced in refs for the 60fps render loop
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // URL query parameter for stake
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      const urlStake = Number(search.get('stake'));
      if (urlStake > 0) setStake(urlStake);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // MODEL APPLICATION (PERSISTENT & NORMALIZED)
  // ---------------------------------------------------------------------------
  const applyModel = useCallback(
    (sceneGroup: THREE.Group, name: string, animations?: THREE.AnimationClip[]) => {
      const bbox = new THREE.Box3().setFromObject(sceneGroup);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const targetHeight = 1.82;
      const scale = size.y > 0.05 ? targetHeight / size.y : 1;
      sceneGroup.scale.set(scale, scale, scale);

      bbox.setFromObject(sceneGroup);
      const bottomY = bbox.min.y;

      sceneGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // First create rig controller and detect native orientation
      const rig = createRigController(sceneGroup, animations, bottomY);
      rigRef.current = rig;

      // In Three.js world, the goal is at -Z (z: -7.05).
      // The striker starts at z: +1.4 and must face towards -Z (the goal).
      // If a model natively faces -Z (facingSign === -1, e.g. Soldier, Cartoon Footballer),
      // rotation.y should be 0 to face the goal!
      // If a model natively faces +Z (facingSign === 1, e.g. Xbot, RPM),
      // rotation.y should be Math.PI to turn 180 and face the goal!
      const targetRotationY = rig.facingSign === -1 ? 0 : Math.PI;
      sceneGroup.rotation.y = targetRotationY;
      sceneGroup.position.set(0, -bottomY, 1.4);

      customModelRef.current = sceneGroup;
      setActiveModelName(name);

      toast({
        title: 'Striker Model Active',
        description: `${name} calibrated on penalty spot!`,
      });
    },
    [toast]
  );

  const applyKeeperModel = useCallback(
    (sceneGroup: THREE.Group, name: string, animations?: THREE.AnimationClip[]) => {
      const bbox = new THREE.Box3().setFromObject(sceneGroup);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const targetHeight = 1.88;
      const scale = size.y > 0.05 ? targetHeight / size.y : 1;
      sceneGroup.scale.set(scale, scale, scale);

      bbox.setFromObject(sceneGroup);
      const bottomY = bbox.min.y;

      sceneGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Goalkeeper is positioned at z: -7.05 on the goal line and must face towards +Z (the striker).
      // If a model natively faces -Z (facingSign === -1, e.g. Soldier, Cartoon Footballer),
      // rotation.y should be Math.PI to face the penalty spot!
      // If a model natively faces +Z (facingSign === 1, e.g. Xbot),
      // rotation.y should be 0 to face the penalty spot!
      const kRig = createRigController(sceneGroup, animations, bottomY);
      keeperRigRef.current = kRig;

      const targetKeeperRotationY = kRig.facingSign === -1 ? Math.PI : 0;
      sceneGroup.rotation.y = targetKeeperRotationY;
      sceneGroup.position.set(0, -bottomY, -7.05);

      customKeeperModelRef.current = sceneGroup;
      setActiveKeeperName(name);

      toast({
        title: 'Goalkeeper Model Active',
        description: `${name} positioned on the goal line!`,
      });
    },
    [toast]
  );

  const loadModelPreset = useCallback(
    (type: 'striker' | 'cartoon' | 'athlete' | 'ronaldo') => {
      setIsLoadingModel(true);
      const loader = new GLTFLoader();
      let path = STRIKER_GLB;
      let label = 'Soldier Striker (.GLB)';
      if (type === 'cartoon') {
        path = '/models/cartoon-footballer.glb';
        label = 'Cartoon Striker (.GLB)';
      } else if (type === 'athlete') {
        path = '/models/athlete-motion.glb';
        label = 'Athlete Motion (.GLB)';
      } else if (type === 'ronaldo') {
        path = '/models/real-footballer.glb';
        label = 'Realistic Pro (.GLB)';
      }

      loader.load(
        path,
        (gltf) => {
          setIsLoadingModel(false);
          applyModel(gltf.scene, label, gltf.animations);
        },
        undefined,
        (err) => {
          setIsLoadingModel(false);
          console.error(`Failed to load striker ${type}:`, err);
        }
      );
    },
    [applyModel]
  );

  const loadKeeperPreset = useCallback(
    (type: 'xbot' | 'cartoon') => {
      const loader = new GLTFLoader();
      const path = type === 'xbot' ? KEEPER_GLB : '/models/cartoon-footballer.glb';
      const label = type === 'xbot' ? 'Xbot Goalkeeper (.GLB)' : 'Animated Goalkeeper (.GLB)';

      loader.load(
        path,
        (gltf) => {
          applyKeeperModel(gltf.scene, label, gltf.animations);
        },
        undefined,
        (err) => {
          console.error(`Failed to load keeper ${type}:`, err);
        }
      );
    },
    [applyKeeperModel]
  );

  // Auto-load official Soldier Striker and Xbot Goalkeeper on mount
  useEffect(() => {
    loadModelPreset('striker');
    loadKeeperPreset('xbot');
  }, [loadModelPreset, loadKeeperPreset]);

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoadingModel(true);
    const url = URL.createObjectURL(file);
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        setIsLoadingModel(false);
        applyModel(gltf.scene, file.name, gltf.animations);
      },
      undefined,
      () => {
        setIsLoadingModel(false);
        toast({
          title: 'Load Failed',
          description: 'Could not load .glb file',
          variant: 'destructive',
        });
      }
    );
  };

  // ---------------------------------------------------------------------------
  // GROK'S BACKEND SETTLEMENT CALL
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
            detail: '3v3 Penalty Shootout Arena',
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
              title: 'Wager Won & Credited!',
              description: `+${data.payout} KTK payout added to your balance!`,
            });
          } else if (outcome === 'draw') {
            toast({
              title: 'Wager Refunded',
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
  // SHOT MECHANICS & ROUND PROGRESSION
  // ---------------------------------------------------------------------------
  const handleShoot = (targetDir: ShotDirection) => {
    if (phase !== 'aiming') return;
    setUserTarget(targetDir);

    const dirs: DiveDirection[] = ['left', 'centre', 'right'];
    const aiDive = dirs[Math.floor(Math.random() * dirs.length)];

    const anim = animRef.current;
    anim.shotDir = targetDir;
    anim.diveDir = aiDive;
    anim.powerKmH = Math.floor(86 + Math.random() * 32);

    // Green timing precision chance
    let isGoal = targetDir !== aiDive;
    if (!isGoal && anim.composureRadius < 22 && Math.random() < 0.4) {
      isGoal = true;
    }
    anim.scored = isGoal;
    anim.runup = 0;
    anim.ballT = 0;
    anim.keeperT = 0;

    // 1. Run-up Phase
    setPhase('runup');
    audio.playWhistle();

    // 2. Ball Flight Phase
    setTimeout(() => {
      setPhase('ball_flight');
      audio.playKick();

      // 3. Goal / Save Result
      setTimeout(() => {
        setPhase('shot_result');
        if (isGoal) {
          audio.playGoal();
          setBannerNotice(`GOAL! ${anim.powerKmH} KM/H`);
          setUserScore((prev) => prev + 1);
        } else {
          audio.playSave();
          setBannerNotice('SAVED BY GOALKEEPER!');
        }

        // Record User Shot
        setUserShots((prev) => {
          const next = [...prev];
          next[round - 1] = isGoal;
          return next;
        });

        // Simulate Opponent's Shot in the round
        const aiScoredShot = Math.random() < 0.6;
        if (aiScoredShot) setAiScore((prev) => prev + 1);
        setAiShots((prev) => {
          const next = [...prev];
          next[round - 1] = aiScoredShot;
          return next;
        });

        // 4. Next Round or Finish
        setTimeout(() => {
          setBannerNotice('');
          if (round < 3) {
            setRound((prev) => prev + 1);
            setPhase('aiming');
            setUserTarget(null);
          } else {
            setPhase('game_over');
            const finalU = userScore + (isGoal ? 1 : 0);
            const finalA = aiScore + (aiScoredShot ? 1 : 0);
            settleMatch(finalU, finalA);
          }
        }, 2200);
      }, 950);
    }, 700);
  };

  const handleRestart = () => {
    setRound(1);
    setUserScore(0);
    setAiScore(0);
    setUserShots([null, null, null]);
    setAiShots([null, null, null]);
    setUserTarget(null);
    setSettlementReceipt(null);
    setPhase('aiming');
  };

  // ---------------------------------------------------------------------------
  // 3D WEBGL ENGINE (1280x720 TRUE HD, PCF SHADOWS, FLUID KINEMATICS)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb5e0f7);
    scene.fog = new THREE.Fog(0xb5e0f7, 24, 60);

    const camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 80);
    camera.position.set(0, 1.75, 4.4);
    camera.lookAt(0, 1.2, -6.5);

    // Renderer: Antialiased, DPR clamped up to 2.5 for true zero pixelation
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

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

    // Stadium Daylight Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x3d663d, 0.95);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbee, 2.2);
    sunLight.position.set(-6, 15, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    // Realistic Mowed Turf Pitch
    const pitchGeo = new THREE.PlaneGeometry(36, 44);
    const turfCanvas = document.createElement('canvas');
    turfCanvas.width = 512;
    turfCanvas.height = 512;
    const tctx = turfCanvas.getContext('2d')!;
    for (let i = 0; i < 16; i++) {
      tctx.fillStyle = i % 2 === 0 ? '#38732e' : '#428536';
      tctx.fillRect(0, i * 32, 512, 32);
    }
    tctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    tctx.lineWidth = 6;
    tctx.strokeRect(16, 16, 480, 480);

    const turfTex = new THREE.CanvasTexture(turfCanvas);
    turfTex.wrapS = THREE.RepeatWrapping;
    turfTex.wrapT = THREE.RepeatWrapping;
    turfTex.repeat.set(2, 2);

    const pitch = new THREE.Mesh(
      pitchGeo,
      new THREE.MeshStandardMaterial({ map: turfTex, roughness: 0.85 })
    );
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.set(0, 0, -5);
    pitch.receiveShadow = true;
    scene.add(pitch);

    // Penalty Spot
    const spot = new THREE.Mesh(
      new THREE.CircleGeometry(0.08, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(0, 0.005, 0);
    scene.add(spot);

    // Goal Post & Net
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.6 });
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.44, 24), postMat);
    postL.position.set(-3.66, 1.22, -7.2);
    postL.castShadow = true;
    scene.add(postL);

    const postR = postL.clone();
    postR.position.x = 3.66;
    scene.add(postR);

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7.32, 24), postMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 2.44, -7.2);
    crossbar.castShadow = true;
    scene.add(crossbar);

    const netGeo = new THREE.PlaneGeometry(7.32, 2.44, 18, 8);
    const netMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.45 });
    const netBack = new THREE.Mesh(netGeo, netMat);
    netBack.position.set(0, 1.22, -8.0);
    scene.add(netBack);

    // Soccer Ball
    const ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 })
    );
    ballMesh.position.set(0, 0.12, 0);
    ballMesh.castShadow = true;
    scene.add(ballMesh);

    // Composure Aiming Ring
    const compRingGeo = new THREE.RingGeometry(0.18, 0.22, 48);
    const compRingMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const composureMesh = new THREE.Mesh(compRingGeo, compRingMat);
    composureMesh.rotation.x = -Math.PI / 2;
    composureMesh.position.set(0, 0.015, 0);
    scene.add(composureMesh);

    // Procedural Goalkeeper Group
    const keeperGroup = new THREE.Group();
    keeperGroup.position.set(0, 0, -7.05);

    const keeperBodyMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5 });
    const keeperSkinMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.65 });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });

    const kTorso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.26), keeperBodyMat);
    kTorso.position.y = 1.35;
    kTorso.castShadow = true;
    keeperGroup.add(kTorso);

    const kHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 20), keeperSkinMat);
    kHead.position.y = 1.8;
    kHead.castShadow = true;
    keeperGroup.add(kHead);

    const kArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.55), keeperBodyMat);
    kArmL.position.set(-0.35, 1.35, 0);
    kArmL.rotation.z = 0.4;
    kArmL.castShadow = true;
    keeperGroup.add(kArmL);

    const kGloveL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.06), gloveMat);
    kGloveL.position.set(-0.46, 1.08, 0);
    keeperGroup.add(kGloveL);

    const kArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.55), keeperBodyMat);
    kArmR.position.set(0.35, 1.35, 0);
    kArmR.rotation.z = -0.4;
    kArmR.castShadow = true;
    keeperGroup.add(kArmR);

    const kGloveR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.06), gloveMat);
    kGloveR.position.set(0.46, 1.08, 0);
    keeperGroup.add(kGloveR);

    const kLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.85), keeperBodyMat);
    kLegL.position.set(-0.16, 0.55, 0);
    kLegL.castShadow = true;
    keeperGroup.add(kLegL);

    const kLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.85), keeperBodyMat);
    kLegR.position.set(0.16, 0.55, 0);
    kLegR.castShadow = true;
    keeperGroup.add(kLegR);

    scene.add(keeperGroup);

    // Render & Kinematics Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const currentPhase = phaseRef.current;
      const anim = animRef.current;

      // 1. Ensure custom models are in scene
      if (customModelRef.current && !scene.children.includes(customModelRef.current)) {
        scene.add(customModelRef.current);
      }
      if (customKeeperModelRef.current) {
        if (!scene.children.includes(customKeeperModelRef.current)) {
          scene.add(customKeeperModelRef.current);
        }
        keeperGroup.visible = false;
      } else {
        keeperGroup.visible = true;
      }

      // 2. Pulse Composure Ring
      const cycle = (elapsed % 1.4) / 1.4;
      const ringRadius = 0.18 + (Math.sin(cycle * Math.PI * 2) * 0.5 + 0.5) * 0.35;
      anim.composureRadius = ringRadius * 70;
      composureMesh.scale.set(ringRadius * 3.5, ringRadius * 3.5, 1);
      composureMesh.visible = currentPhase === 'aiming';

      if (ringRadius < 0.24) {
        compRingMat.color.setHex(0x22c55e);
      } else if (ringRadius < 0.34) {
        compRingMat.color.setHex(0xfacc15);
      } else {
        compRingMat.color.setHex(0xef4444);
      }

      // 3. Striker Kinematics & Realistic Footballer Animations
      const strikerModel = customModelRef.current;
      const rig = rigRef.current;
      const strikerBaseRotY = rig?.facingSign === -1 ? 0 : Math.PI;

      if (currentPhase === 'runup') {
        anim.runup += delta * 1.6;
        const runupT = Math.min(1, anim.runup);
        // Striker runs forward towards the penalty spot (z: 1.4 down to 0.15)
        const zPos = 1.4 - runupT * 1.25;
        // Athletic running bounce and lean
        const bounce = Math.abs(Math.sin(runupT * Math.PI * 8)) * 0.08;
        const forwardLean = runupT < 0.75 ? 0.12 : -0.08; // Lean into the sprint, then lean back slightly for the shot

        if (strikerModel) {
          strikerModel.position.z = zPos;
          strikerModel.position.y = -(rig?.initialBottomY || 0) + bounce;
          strikerModel.rotation.y = strikerBaseRotY;
          strikerModel.rotation.x = forwardLean;
        }

        if (rig) {
          if (rig.mixer) {
            // Smoothly switch between full run-up sprint and striking kick
            switchAction(rig, runupT < 0.72 ? 'run' : 'kick');
            rig.mixer.update(delta);
          } else {
            rig.restRotations.forEach((q, bone) => bone.quaternion.copy(q));
            const b = rig.bones;
            if (runupT < 0.72) {
              const stride = Math.sin(runupT * Math.PI * 8);
              b.leftUpLeg?.rotateX(stride * 1.15);
              b.rightUpLeg?.rotateX(-stride * 1.15);
              b.leftLeg?.rotateX(Math.max(0, -stride) * 1.4);
              b.rightLeg?.rotateX(Math.max(0, stride) * 1.4);
              b.leftArm?.rotateX(-stride * 1.1);
              b.rightArm?.rotateX(stride * 1.1);
              b.spine?.rotateX(0.1);
            } else {
              // Striking follow-through
              const kickProgress = (runupT - 0.72) / 0.28;
              b.rightUpLeg?.rotateX(1.4 * kickProgress);
              b.rightLeg?.rotateX(-0.6 * (1 - kickProgress));
              b.leftUpLeg?.rotateX(-0.25);
              b.leftArm?.rotateZ(0.9);
              b.rightArm?.rotateZ(-0.9);
              b.spine?.rotateX(-0.15);
            }
          }
        }
      } else if (currentPhase === 'shot_result' && anim.scored) {
        // Goal Celebration (Leaping & pumping arms)
        const hop = Math.max(0, Math.sin(elapsed * 7)) * 0.16;
        if (strikerModel) {
          strikerModel.position.z = 0.15;
          strikerModel.position.y = -(rig?.initialBottomY || 0) + hop;
          strikerModel.rotation.y = strikerBaseRotY;
          strikerModel.rotation.x = 0;
        }
        if (rig) {
          if (rig.mixer) {
            switchAction(rig, 'celebrate');
            rig.mixer.update(delta);
          } else {
            rig.restRotations.forEach((q, bone) => bone.quaternion.copy(q));
            const b = rig.bones;
            b.leftArm?.rotateZ(2.8);
            b.rightArm?.rotateZ(-2.8);
            b.spine?.rotateX(-0.22);
            b.head?.rotateX(-0.2);
          }
        }
      } else if (currentPhase === 'shot_result' && !anim.scored) {
        // Miss / Save Despair
        if (strikerModel) {
          strikerModel.position.z = 0.15;
          strikerModel.position.y = -(rig?.initialBottomY || 0);
          strikerModel.rotation.y = strikerBaseRotY;
          strikerModel.rotation.x = 0;
        }
        if (rig) {
          if (rig.mixer) {
            switchAction(rig, 'sad');
            rig.mixer.update(delta);
          } else {
            rig.restRotations.forEach((q, bone) => bone.quaternion.copy(q));
            const b = rig.bones;
            b.leftArm?.rotateZ(1.2);
            b.leftArm?.rotateX(-1.1);
            b.rightArm?.rotateZ(-1.2);
            b.rightArm?.rotateX(-1.1);
            b.head?.rotateX(0.45);
            b.spine?.rotateX(0.18);
          }
        }
      } else {
        // Ready Idle Stance with Realistic Breathing and Weight Shift
        const breathe = Math.sin(elapsed * 2.5);
        if (strikerModel) {
          strikerModel.position.set(0, -(rig?.initialBottomY || 0) + breathe * 0.015, 1.4);
          strikerModel.rotation.y = strikerBaseRotY;
          strikerModel.rotation.x = 0;
        }
        if (rig) {
          if (rig.mixer) {
            switchAction(rig, 'idle');
            rig.mixer.update(delta);
          } else {
            rig.restRotations.forEach((q, bone) => bone.quaternion.copy(q));
            const b = rig.bones;
            b.leftArm?.rotateZ(1.25);
            b.rightArm?.rotateZ(-1.25);
            b.leftForeArm?.rotateX(-0.35);
            b.rightForeArm?.rotateX(-0.35);
            b.spine?.rotateX(breathe * 0.035);
          }
        }
      }

      // 4. Ball Flight Physics
      if (currentPhase === 'ball_flight' || currentPhase === 'shot_result') {
        const speed = (anim.powerKmH / 100) * 2.2;
        anim.ballT += delta * speed;
        const flightT = Math.min(1, anim.ballT);

        let targetX = 0;
        if (anim.shotDir === 'left') targetX = -1.9;
        if (anim.shotDir === 'right') targetX = 1.9;

        const targetY = 1.25;
        ballMesh.position.x = flightT * targetX;
        ballMesh.position.z = -flightT * 7.2;
        ballMesh.position.y = 0.12 + flightT * (targetY - 0.12) + Math.sin(flightT * Math.PI) * 0.55;

        ballMesh.rotation.x += delta * 18;
        ballMesh.rotation.y += delta * 12;

        if (anim.scored && flightT > 0.8) {
          netBack.position.z = -8.0 - Math.sin((flightT - 0.8) * Math.PI * 4) * 0.18;
        }
      } else {
        ballMesh.position.set(0, 0.12, 0);
        ballMesh.rotation.set(0, 0, 0);
        netBack.position.z = -8.0;
      }

      // 5. Goalkeeper Diving & Animation Motion
      const keeperModel = customKeeperModelRef.current;
      const kRig = keeperRigRef.current;
      const keeperBaseRotY = kRig?.facingSign === -1 ? Math.PI : 0;

      if (currentPhase === 'ball_flight' || currentPhase === 'shot_result') {
        anim.keeperT += delta * 2.4;
        const diveT = Math.min(1, anim.keeperT);

        let diveX = 0;
        let diveAngle = 0;
        if (anim.diveDir === 'left') {
          diveX = -1.95 * diveT;
          diveAngle = 1.15 * diveT;
        } else if (anim.diveDir === 'right') {
          diveX = 1.95 * diveT;
          diveAngle = -1.15 * diveT;
        }

        const diveLift = Math.sin(diveT * Math.PI) * 0.42;

        keeperGroup.position.x = diveX;
        keeperGroup.position.y = diveLift;
        keeperGroup.rotation.z = diveAngle;

        if (keeperModel) {
          keeperModel.position.x = diveX;
          keeperModel.position.y = -(kRig?.initialBottomY || 0) + diveLift;
          keeperModel.position.z = -7.05;
          keeperModel.rotation.y = keeperBaseRotY;
          // When facing backwards, roll around Z is reversed for correct tilt relative to goal
          keeperModel.rotation.z = kRig?.facingSign === -1 ? -diveAngle : diveAngle;
        }

        if (kRig) {
          if (kRig.mixer) {
            if (anim.scored) {
              switchAction(kRig, kRig.actions.miss ? 'miss' : 'sad');
            } else {
              switchAction(kRig, kRig.actions.catch ? 'catch' : kRig.actions.dive ? 'dive' : 'celebrate');
            }
            kRig.mixer.update(delta);
          } else {
            kRig.restRotations.forEach((q, bone) => bone.quaternion.copy(q));
            const b = kRig.bones;
            if (anim.diveDir === 'left') {
              b.leftArm?.rotateZ(2.5);
              b.rightArm?.rotateZ(1.8);
            } else if (anim.diveDir === 'right') {
              b.rightArm?.rotateZ(-2.5);
              b.leftArm?.rotateZ(-1.8);
            }
          }
        }
      } else {
        // Goalie Idle Hop on Toes & Stance
        const hop = Math.abs(Math.sin(elapsed * 6)) * 0.04;
        keeperGroup.position.set(0, hop, -7.05);
        keeperGroup.rotation.set(0, 0, 0);

        if (keeperModel) {
          keeperModel.position.set(0, -(kRig?.initialBottomY || 0) + hop, -7.05);
          keeperModel.rotation.set(0, keeperBaseRotY, 0);
        }

        if (kRig) {
          if (kRig.mixer) {
            switchAction(kRig, 'idle');
            kRig.mixer.update(delta);
          } else {
            kRig.restRotations.forEach((q, bone) => bone.quaternion.copy(q));
            const b = kRig.bones;
            b.leftArm?.rotateZ(0.7);
            b.rightArm?.rotateZ(-0.7);
            b.leftForeArm?.rotateX(-0.5);
            b.rightForeArm?.rotateX(-0.5);
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-[92vh] max-w-lg flex-col justify-between px-2 pt-1 pb-16 select-none font-sans">
      {/* Top Match Header */}
      <div className="rounded-2xl border border-[#35d399]/40 bg-gradient-to-r from-[#0d2218] via-[#081711] to-[#040e0a] p-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#064e3b] p-1.5 border border-[#35d399]/40">
              <KatikaLogo className="h-full w-full" />
            </div>
            <div>
              <span className="font-mono-custom text-[9px] uppercase tracking-widest text-[#35D399]">
                PS3 TRUE HD 3D · GROK ENGINE
              </span>
              <h1 className="text-base font-black text-white">Penalty Shootout</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className="flex items-center gap-1 text-slate-400 hover:text-white p-1"
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>

        {/* Live Score & Attempts */}
        <div className="mt-2.5 flex items-center justify-between rounded-xl bg-black/60 border border-white/10 px-3 py-1.5 font-mono-custom text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#35D399]">YOU: {userScore}</span>
            <div className="flex gap-1">
              {userShots.map((s, idx) => (
                <span key={idx}>
                  {s === true ? (
                    <CheckCircle2 size={12} className="text-[#35D399]" />
                  ) : s === false ? (
                    <XCircle size={12} className="text-red-400" />
                  ) : (
                    <Circle size={10} className="text-slate-600" />
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="text-[10px] font-bold text-yellow-400">
            ROUND {round} / 3
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {aiShots.map((s, idx) => (
                <span key={idx}>
                  {s === true ? (
                    <CheckCircle2 size={12} className="text-[#35D399]" />
                  ) : s === false ? (
                    <XCircle size={12} className="text-red-400" />
                  ) : (
                    <Circle size={10} className="text-slate-600" />
                  )}
                </span>
              ))}
            </div>
            <span className="font-bold text-[#38bdf8]">GK: {aiScore}</span>
          </div>
        </div>
      </div>

      {/* 3D WebGL HD Viewport */}
      <div className="relative mt-2 overflow-hidden rounded-3xl border-2 border-slate-700 bg-slate-950 shadow-2xl aspect-video w-full">
        <div ref={containerRef} className="h-full w-full [&>canvas]:h-full [&>canvas]:w-full [&>canvas]:block" />

        {/* Live Banner */}
        {bannerNotice && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-yellow-400/60 bg-black/85 px-4 py-1 font-mono-custom text-xs font-black text-[#fde047] shadow-xl animate-fade-in backdrop-blur-sm whitespace-nowrap">
            {bannerNotice}
          </div>
        )}

        {/* Active Models Indicator */}
        <div className="pointer-events-none absolute bottom-2 left-3 flex gap-2">
          <div className="rounded-lg bg-black/75 px-2.5 py-1 font-mono-custom text-[10px] text-[#35D399] border border-white/10 backdrop-blur-sm flex items-center gap-1.5 shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#35D399] animate-pulse" />
            <span>STRIKER: {activeModelName}</span>
          </div>
          <div className="rounded-lg bg-black/75 px-2.5 py-1 font-mono-custom text-[10px] text-[#38bdf8] border border-white/10 backdrop-blur-sm flex items-center gap-1.5 shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
            <span>KEEPER: {activeKeeperName}</span>
          </div>
        </div>
      </div>

      {/* 3D Model Quick Selector for Striker and Goalkeeper */}
      <div className="mt-2 rounded-2xl border border-white/10 bg-[#0E1A16] p-2.5 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono-custom">
          <span className="text-slate-400">STRIKER MODEL (.GLB):</span>
          <span className="text-yellow-400">Official Presets</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => loadModelPreset('striker')}
            disabled={isLoadingModel}
            className={`rounded-xl border p-2 text-left transition-all ${
              activeModelName.includes('Soldier')
                ? 'border-[#35D399] bg-[#35D399]/20 text-white ring-1 ring-[#35D399]/40'
                : 'border-slate-800 bg-black/40 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] block font-mono-custom font-bold text-[#35D399]">🎯 Soldier .GLB</span>
            <span className="text-[9px] text-slate-400 block truncate">Three.js Model</span>
          </button>

          <button
            type="button"
            onClick={() => loadModelPreset('cartoon')}
            disabled={isLoadingModel}
            className={`rounded-xl border p-2 text-left transition-all ${
              activeModelName.includes('Cartoon')
                ? 'border-yellow-400 bg-yellow-400/20 text-white ring-1 ring-yellow-400/40'
                : 'border-slate-800 bg-black/40 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] block font-mono-custom font-bold text-yellow-400">⚽ Footballer</span>
            <span className="text-[9px] text-slate-400 block truncate">Animated Kit</span>
          </button>

          <button
            type="button"
            onClick={() => loadModelPreset('athlete')}
            disabled={isLoadingModel}
            className={`rounded-xl border p-2 text-left transition-all ${
              activeModelName.includes('Athlete Motion')
                ? 'border-[#38bdf8] bg-[#38bdf8]/20 text-white ring-1 ring-[#38bdf8]/40'
                : 'border-slate-800 bg-black/40 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] block font-mono-custom font-bold text-[#38bdf8]">🏃 Athlete</span>
            <span className="text-[9px] text-slate-400 block truncate">Motion Clips</span>
          </button>

          <label className="cursor-pointer rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-2 text-left hover:bg-yellow-500/20 transition-all flex flex-col justify-center">
            <span className="text-[10px] block font-mono-custom font-bold text-yellow-400 flex items-center gap-1">
              <Upload size={11} /> Upload
            </span>
            <span className="text-[9px] text-slate-400 block truncate">Custom .glb</span>
            <input ref={fileInputRef} type="file" accept=".glb,.gltf" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Goalkeeper Model Switcher */}
        <div className="pt-1.5 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-mono-custom text-slate-400">
            <Shield size={12} className="text-[#38bdf8]" />
            <span>KEEPER (.GLB):</span>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => loadKeeperPreset('xbot')}
              className={`rounded-lg px-2 py-0.5 text-[9px] font-mono-custom font-bold border transition-all ${
                activeKeeperName.includes('Xbot')
                  ? 'border-[#38bdf8] bg-[#38bdf8]/20 text-white'
                  : 'border-slate-800 bg-black/40 text-slate-400 hover:text-white'
              }`}
            >
              🤖 Xbot .GLB
            </button>
            <button
              type="button"
              onClick={() => loadKeeperPreset('cartoon')}
              className={`rounded-lg px-2 py-0.5 text-[9px] font-mono-custom font-bold border transition-all ${
                activeKeeperName.includes('Animated')
                  ? 'border-[#38bdf8] bg-[#38bdf8]/20 text-white'
                  : 'border-slate-800 bg-black/40 text-slate-400 hover:text-white'
              }`}
            >
              ⚽ Footballer GK
            </button>
          </div>
        </div>
      </div>

      {/* Main Game Control Panel */}
      <div className="mt-2 space-y-2">
        {phase === 'aiming' ? (
          <div>
            <div className="text-center font-mono-custom text-xs font-semibold text-slate-300 mb-2">
              SELECT TARGET ZONE TO SHOOT
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleShoot('left')}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-3.5 transition-all hover:border-[#35D399] hover:bg-[#35D399]/15 active:scale-95 shadow-lg"
              >
                <ChevronLeft size={24} className="text-[#35D399]" />
                <span className="mt-1 font-mono-custom text-xs font-black text-white">LEFT</span>
                <span className="text-[9px] text-slate-400 font-mono-custom">Левый угол</span>
              </button>

              <button
                type="button"
                onClick={() => handleShoot('centre')}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-3.5 transition-all hover:border-[#facc15] hover:bg-[#facc15]/15 active:scale-95 shadow-lg"
              >
                <Zap size={24} className="text-[#facc15]" />
                <span className="mt-1 font-mono-custom text-xs font-black text-white">CENTRE</span>
                <span className="text-[9px] text-slate-400 font-mono-custom">По центру</span>
              </button>

              <button
                type="button"
                onClick={() => handleShoot('right')}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-3.5 transition-all hover:border-[#38bdf8] hover:bg-[#38bdf8]/15 active:scale-95 shadow-lg"
              >
                <ChevronRight size={24} className="text-[#38bdf8]" />
                <span className="mt-1 font-mono-custom text-xs font-black text-white">RIGHT</span>
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
                  ? 'Striker is running up to the ball...'
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
    </div>
  );
}
