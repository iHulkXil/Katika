import { randomInt } from "node:crypto";

/**
 * Ludo Quick Engine (ludo_quick_v1)
 * 2 players: 'red' (creator, player 1) and 'yellow' (opponent, player 2)
 * 2 tokens each (indices 0 and 1)
 */

export type LudoColor = "red" | "yellow";

export type TokenPos =
  | "yard"
  | `ring:${number}`
  | `home:${number}`
  | "done";

export interface LudoToken {
  id: 0 | 1;
  pos: TokenPos;
}

export interface LudoBoardState {
  phase: "await_roll" | "await_move";
  die: number; // 1-6
  extras: number; // consecutive extra turns, max 3
  legal: number[]; // which token indices (0 or 1) can move with current die
  red: [LudoToken, LudoToken];
  yellow: [LudoToken, LudoToken];
  lastRoll?: number;
  lastAction?: string;
}

// 8 classic safe tiles on the 52-ring
// 0 (red start), 26 (yellow start), 13 (green start), 39 (blue start), and the 4 stars (8, 21, 34, 47)
export const SAFE_TILES: readonly number[] = [0, 8, 13, 21, 26, 34, 39, 47];

export const RED_START_RING = 0;
export const RED_MOUTH_RING = 50; // tile before red home entrance

export const YELLOW_START_RING = 26;
export const YELLOW_MOUTH_RING = 24; // tile before yellow home entrance

export function createInitialLudoBoard(): LudoBoardState {
  return {
    phase: "await_roll",
    die: 0,
    extras: 0,
    legal: [],
    red: [
      { id: 0, pos: "yard" },
      { id: 1, pos: "yard" },
    ],
    yellow: [
      { id: 0, pos: "yard" },
      { id: 1, pos: "yard" },
    ],
  };
}

/**
 * Calculate distance from home (0 to 57 steps) for prioritizing auto-moves.
 * Higher distance = further from home.
 */
export function distanceToHome(token: LudoToken, color: LudoColor): number {
  if (token.pos === "done") return 0;
  if (token.pos === "yard") return 57;

  if (token.pos.startsWith("home:")) {
    const step = parseInt(token.pos.split(":")[1], 10);
    return Math.max(0, 6 - step);
  }

  const ringIdx = parseInt(token.pos.split(":")[1], 10);
  const start = color === "red" ? RED_START_RING : YELLOW_START_RING;
  const stepsTaken = (ringIdx - start + 52) % 52;
  const remainingOnRing = 50 - stepsTaken;
  return remainingOnRing + 6;
}

/**
 * Check if a player has a 2-token block on a ring tile.
 */
export function hasBlockOnRing(
  tokens: [LudoToken, LudoToken],
  ringIdx: number
): boolean {
  const onTile = tokens.filter((t) => t.pos === `ring:${ringIdx}`);
  return onTile.length >= 2;
}

/**
 * Evaluates whether a specific token can legally move given a die roll.
 * Returns the destination pos if legal, or null if illegal.
 */
export function getLegalMoveTarget(
  token: LudoToken,
  die: number,
  color: LudoColor,
  myTokens: [LudoToken, LudoToken],
  opponentTokens: [LudoToken, LudoToken]
): { targetPos: TokenPos; capturesOpponent: boolean } | null {
  if (die < 1 || die > 6) return null;
  if (token.pos === "done") return null;

  // 1. Leaving yard
  if (token.pos === "yard") {
    if (die !== 6) return null;
    const startTile = color === "red" ? RED_START_RING : YELLOW_START_RING;

    // Cannot land if opponent has a 2-token block on the start tile
    if (hasBlockOnRing(opponentTokens, startTile)) {
      return null;
    }

    return {
      targetPos: `ring:${startTile}`,
      capturesOpponent: false, // Starts are in SAFE_TILES, so no capture on entry
    };
  }

  // 2. Moving along home track
  if (token.pos.startsWith("home:")) {
    const currentStep = parseInt(token.pos.split(":")[1], 10);
    const nextStep = currentStep + die;
    if (nextStep === 6) {
      return { targetPos: "done", capturesOpponent: false };
    }
    if (nextStep < 6) {
      return { targetPos: `home:${nextStep}`, capturesOpponent: false };
    }
    // nextStep > 6: overshoot! Not allowed
    return null;
  }

  // 3. Moving on ring
  const currentRingIdx = parseInt(token.pos.split(":")[1], 10);
  const start = color === "red" ? RED_START_RING : YELLOW_START_RING;
  const stepsTaken = (currentRingIdx - start + 52) % 52;
  const remainingRingSteps = 50 - stepsTaken;

  if (die <= remainingRingSteps) {
    // Check intermediate steps and target for opponent block
    for (let step = 1; step <= die; step++) {
      const intermediateIdx = (currentRingIdx + step) % 52;
      if (hasBlockOnRing(opponentTokens, intermediateIdx)) {
        return null; // Blocked by opponent
      }
    }

    const targetRingIdx = (currentRingIdx + die) % 52;

    // Check if landing captures opponent
    let capturesOpponent = false;
    if (!SAFE_TILES.includes(targetRingIdx)) {
      const oppOnTile = opponentTokens.filter((t) => t.pos === `ring:${targetRingIdx}`);
      if (oppOnTile.length === 1) {
        capturesOpponent = true;
      }
    }

    return { targetPos: `ring:${targetRingIdx}`, capturesOpponent };
  } else {
    // Enters home column
    // First check ring path up to mouth for opponent block
    for (let step = 1; step <= remainingRingSteps; step++) {
      const intermediateIdx = (currentRingIdx + step) % 52;
      if (hasBlockOnRing(opponentTokens, intermediateIdx)) {
        return null;
      }
    }

    const homeStep = die - remainingRingSteps;
    if (homeStep === 6) {
      return { targetPos: "done", capturesOpponent: false };
    }
    if (homeStep < 6) {
      return { targetPos: `home:${homeStep}`, capturesOpponent: false };
    }
    // Overshoot!
    return null;
  }
}

/**
 * Returns array of token indices (0, 1) that can legally move with the die.
 */
export function getLegalTokens(
  board: LudoBoardState,
  color: LudoColor,
  die: number
): number[] {
  const myTokens = color === "red" ? board.red : board.yellow;
  const oppTokens = color === "red" ? board.yellow : board.red;

  const legal: number[] = [];
  for (let i = 0; i < 2; i++) {
    const move = getLegalMoveTarget(myTokens[i], die, color, myTokens, oppTokens);
    if (move !== null) {
      legal.push(i);
    }
  }
  return legal;
}

/**
 * Server dice roll using crypto.randomInt(1, 7)
 */
export function serverRollDice(): number {
  return randomInt(1, 7);
}

/**
 * Apply roll action. If legal is empty, automatically passes turn.
 */
export function applyRoll(
  board: LudoBoardState,
  currentColor: LudoColor,
  fixedDie?: number
): {
  nextBoard: LudoBoardState;
  nextTurnColor: LudoColor;
  turnPassed: boolean;
} {
  const die = fixedDie ?? serverRollDice();
  const legal = getLegalTokens(board, currentColor, die);

  if (legal.length === 0) {
    // No legal moves: turn passes immediately!
    const nextTurnColor = currentColor === "red" ? "yellow" : "red";
    const nextBoard: LudoBoardState = {
      ...board,
      die,
      legal: [],
      phase: "await_roll",
      extras: 0, // reset extras
      lastRoll: die,
      lastAction: `${currentColor} rolled ${die}, no legal moves. Turn passed.`,
    };
    return { nextBoard, nextTurnColor, turnPassed: true };
  }

  // Legal moves available: wait for move
  const nextBoard: LudoBoardState = {
    ...board,
    die,
    legal,
    phase: "await_move",
    lastRoll: die,
    lastAction: `${currentColor} rolled ${die}. Choose token to move.`,
  };
  return { nextBoard, nextTurnColor: currentColor, turnPassed: false };
}

/**
 * Apply token move action.
 */
export function applyMove(
  board: LudoBoardState,
  currentColor: LudoColor,
  tokenIndex: 0 | 1
): {
  nextBoard: LudoBoardState;
  nextTurnColor: LudoColor;
  winner: LudoColor | null;
  captured: boolean;
  reachedHome: boolean;
  extraTurn: boolean;
} {
  const myTokens = currentColor === "red" ? board.red : board.yellow;
  const oppTokens = currentColor === "red" ? board.yellow : board.red;

  const move = getLegalMoveTarget(myTokens[tokenIndex], board.die, currentColor, myTokens, oppTokens);
  if (!move) {
    throw new Error(`Token ${tokenIndex} cannot legally move with die ${board.die}`);
  }

  // Copy tokens
  const nextMyTokens: [LudoToken, LudoToken] = [
    { ...myTokens[0] },
    { ...myTokens[1] },
  ];
  const nextOppTokens: [LudoToken, LudoToken] = [
    { ...oppTokens[0] },
    { ...oppTokens[1] },
  ];

  nextMyTokens[tokenIndex].pos = move.targetPos;

  // Handle capture if applicable
  let captured = false;
  if (move.capturesOpponent) {
    for (const opp of nextOppTokens) {
      if (opp.pos === move.targetPos) {
        opp.pos = "yard";
        captured = true;
        break;
      }
    }
  }

  const reachedHome = move.targetPos === "done";
  const rolledSix = board.die === 6;

  // Check win: both tokens done
  const won = nextMyTokens.every((t) => t.pos === "done");
  if (won) {
    const nextBoard: LudoBoardState = {
      ...board,
      phase: "await_roll",
      legal: [],
      red: currentColor === "red" ? nextMyTokens : nextOppTokens,
      yellow: currentColor === "yellow" ? nextMyTokens : nextOppTokens,
      lastAction: `${currentColor} moved token to home. Both tokens home!`,
    };
    return {
      nextBoard,
      nextTurnColor: currentColor,
      winner: currentColor,
      captured,
      reachedHome,
      extraTurn: false,
    };
  }

  // Check extra turn: 6, capture, or home
  // Max 3 extra turns in a row
  const earnsBonus = rolledSix || captured || reachedHome;
  const canTakeExtra = earnsBonus && board.extras < 3;

  let nextTurnColor: LudoColor = currentColor;
  let nextExtras = board.extras;

  if (canTakeExtra) {
    nextExtras += 1;
    nextTurnColor = currentColor;
  } else {
    nextExtras = 0;
    nextTurnColor = currentColor === "red" ? "yellow" : "red";
  }

  const actionNotes: string[] = [];
  if (rolledSix) actionNotes.push("rolled 6");
  if (captured) actionNotes.push("captured token");
  if (reachedHome) actionNotes.push("token home");

  const nextBoard: LudoBoardState = {
    ...board,
    phase: "await_roll",
    legal: [],
    extras: nextExtras,
    red: currentColor === "red" ? nextMyTokens : nextOppTokens,
    yellow: currentColor === "yellow" ? nextMyTokens : nextOppTokens,
    lastAction: `${currentColor} moved token ${tokenIndex}${
      actionNotes.length ? ` (${actionNotes.join(", ")})` : ""
    }.${canTakeExtra ? " Extra turn!" : ""}`,
  };

  return {
    nextBoard,
    nextTurnColor,
    winner: null,
    captured,
    reachedHome,
    extraTurn: canTakeExtra,
  };
}
