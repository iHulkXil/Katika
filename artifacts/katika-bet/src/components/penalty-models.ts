/** Footballer Animated rigged model (.glb) with 22 animations for Striker & Goalkeeper */
export const FOOTBALLER_ANIMATED_GLB = '/models/footballer-animated.glb';
export const STRIKER_GLB = FOOTBALLER_ANIMATED_GLB;
export const KEEPER_GLB = FOOTBALLER_ANIMATED_GLB;

export const PENALTY_ASSET_CONFIG = {
  footballerGlb: FOOTBALLER_ANIMATED_GLB,
  clips: {
    idle: 'Idle',
    run: 'Run',
    sprint: 'Sprint',
    kick: 'Kick',
    celebrateSpin: 'Spin',
    celebrateBicycle: 'Bicycle',
    miss: 'Stumble',
    gkDive: 'GK_Dive',
    gkCatch: 'GK_Catch',
    gkMiss: 'GK_Miss',
    getUp: 'GetUp',
  },
} as const;
