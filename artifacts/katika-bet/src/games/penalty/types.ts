/**
 * Cartoon 3D Penalty Shootout - Type Contracts & Asset Manifest Interfaces
 * Based on jainalokk/soccer.io (MIT License, Copyright (c) 2025 jainalokk)
 */

export type PenaltyGameMode =
  | 'shootout-ai'
  | 'local-2p'
  | 'arcade-shoot'
  | 'arcade-save';

export type Local2PControlStyle = 'pass-and-play' | 'simultaneous';

export type TurnRole = 'shoot' | 'save';

export type ShotOutcome = 'goal' | 'saved' | 'missed';

export type MatchPhase =
  | 'ready'
  | 'handoff'
  | 'countdown'
  | 'running-up'
  | 'ball-flight'
  | 'shot-result'
  | 'level-complete'
  | 'match-over';

export interface TeamConfig {
  code: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  socksColor: string;
  gkPrimaryColor: string;
  gkSecondaryColor: string;
  flagColors: [string, string, string];
  flagUrl?: string;
}

export type CharacterAssetSource =
  | {
      type: 'gltf';
      url: string;
      scale?: number;
      animations?: Partial<Record<CharacterAnimState, string>>;
    }
  | {
      type: 'spritesheet';
      url: string;
      cols: number;
      rows: number;
      fps?: number;
      width?: number;
      height?: number;
      states?: Partial<
        Record<CharacterAnimState, { startFrame: number; endFrame: number; loop?: boolean }>
      >;
    }
  | {
      type: 'procedural-toon';
    };

export type CharacterAnimState =
  | 'idle'
  | 'run'
  | 'kick'
  | 'celebrate'
  | 'miss'
  | 'diveLeft'
  | 'diveRight'
  | 'diveCenter'
  | 'catch'
  | 'getUp';

export interface CharacterProfile {
  id: string;
  name: string;
  role: 'striker' | 'goalkeeper' | 'both';
  tagline: string;
  hairColor: string;
  bootsColor: string;
  gloveColor: string;
  skinToneTint?: string;
  celebrationAnim: 'Spin' | 'Bicycle';
  source: CharacterAssetSource;
}

export interface StadiumTheme {
  id: string;
  name: string;
  skyTopColor: string;
  skyBottomColor: string;
  fogColor: string;
  turfLightColor: string;
  turfDarkColor: string;
  standColor: string;
  standAccentColor: string;
  postColor: string;
  netColor: string;
  turfTextureUrl?: string;
  crowdBannerText?: string;
}

export interface BallTheme {
  id: string;
  name: string;
  primaryColor: string;
  patternColor: string;
  textureUrl?: string;
  modelUrl?: string;
}

export type SoundEffectKey =
  | 'whistle'
  | 'kick'
  | 'save'
  | 'goal'
  | 'post'
  | 'miss'
  | 'tick'
  | 'win';

export interface AssetManifest {
  teams: TeamConfig[];
  characters: CharacterProfile[];
  stadiums: StadiumTheme[];
  balls: BallTheme[];
  audioUrls: Partial<Record<SoundEffectKey, string>>;
}

export interface ShotRecord {
  round: number;
  teamIndex: 0 | 1;
  teamCode: string;
  outcome: ShotOutcome;
  isSuddenDeath: boolean;
  shotSpeedKmh: number;
}

export interface ShootoutMatchConfig {
  mode: PenaltyGameMode;
  local2pStyle: Local2PControlStyle;
  difficulty: number; // 1..100 (preserved from soccer.io)
  homeTeamCode: string;
  awayTeamCode: string;
  homeStrikerId: string;
  homeKeeperId: string;
  awayStrikerId: string;
  awayKeeperId: string;
  stadiumId: string;
  ballId: string;
  soundEnabled: boolean;
}

export interface MatchStateSnapshot {
  phase: MatchPhase;
  mode: PenaltyGameMode;
  local2pStyle: Local2PControlStyle;
  activeTeamIndex: 0 | 1; // 0 = Home, 1 = Away
  activeControlRole: TurnRole; // What human is currently controlling ('shoot' or 'save')
  round: number; // 1..5, 6+ for sudden death
  isSuddenDeath: boolean;
  kicksTaken: [number, number];
  scores: [number, number];
  history: ShotRecord[];
  // Arcade level mode fields (preserved from soccer.io)
  currentLevel: number;
  maxLevel: number;
  levelGoals: number;
  levelGoalsRequired: number;
  arcadeShotsTaken: number;
  arcadeMaxShots: number;
  // Live feedback & HUD
  power: number; // 0..1
  isPowerActive: boolean;
  aimDirection: { x: number; y: number };
  countdownSeconds: number | null;
  lastOutcome: ShotOutcome | null;
  statusMessage: string;
  subMessage: string;
  handoffNextPlayerLabel: string | null;
  winnerTeamIndex: 0 | 1 | 'draw' | null;
  winReason: string | null;
}
