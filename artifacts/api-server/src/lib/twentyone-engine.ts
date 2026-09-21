import crypto from 'crypto';

export type CardSuit = 'S' | 'H' | 'D' | 'C';
export type CardRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type Card = string; // e.g. "KS", "AH", "TD"

export interface LegendStats {
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
}

export interface PlayerHand {
  cards: Card[];
  stake: number;
  status: 'playing' | 'stand' | 'bust';
  doubled?: boolean;
}

export interface Player21State {
  userId: string;
  hands: PlayerHand[];
  activeHandIndex: number;
  upCard: Card;
  holeCard: Card;
  glancedCard?: Card | null;
  glanceUsed: boolean;
  hasDoublePerk: boolean;
  hasSplitPerk: boolean;
  hasGlancePerk: boolean;
  hasDefSoak: boolean;
  clockMs: number;
  lastActionTime: number;
}

export interface TwentyOneBoard {
  shoe: Card[]; // Server-only, hidden on client responses
  creator: Player21State;
  opponent?: Player21State | null;
  phase: 'deal' | 'act' | 'resolved';
  winnerId?: string | null;
  isPush?: boolean;
  payout?: {
    pot: number;
    rake: number;
    prize: number;
    loserPays: number;
    loserRefund: number;
  };
  resolutionSummary?: string;
}

/** Standard 52-card deck */
export function createDeck(): Card[] {
  const suits: CardSuit[] = ['S', 'H', 'D', 'C'];
  const ranks: CardRank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];
  for (const s of suits) {
    for (const r of ranks) {
      deck.push(`${r}${s}`);
    }
  }
  return deck;
}

/** Server-side crypto-secure Fisher-Yates shuffle */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

/** Card pip value for initial checks (10, J, Q, K all evaluate to 10) */
export function cardValue(card: Card): number {
  const rank = card[0];
  if (rank === 'A') return 11;
  if (['T', 'J', 'Q', 'K'].includes(rank)) return 10;
  return parseInt(rank, 10);
}

/** Check if two cards form a split pair (10, J, Q, K are considered matching tens) */
export function isPair(c1: Card, c2: Card): boolean {
  return cardValue(c1) === cardValue(c2);
}

/** Calculate best blackjack hand total (Ace = 11 or 1, best legal total <= 21) */
export function evaluateHand(cards: Card[]): {
  total: number;
  isSoft: boolean;
  isBust: boolean;
  isNatural21: boolean;
} {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    const rank = card[0];
    if (rank === 'A') {
      aces += 1;
      total += 11;
    } else if (['T', 'J', 'Q', 'K'].includes(rank)) {
      total += 10;
    } else {
      total += parseInt(rank, 10);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  const isBust = total > 21;
  const isSoft = aces > 0 && total <= 21;
  const isNatural21 = cards.length === 2 && total === 21;

  return { total, isSoft, isBust, isNatural21 };
}

/**
 * Calculate stat advantages:
 * Strictly higher stat unlocks the bonus feature for that player.
 */
export function compareStats(
  p1: LegendStats,
  p2: LegendStats
): {
  p1ClockMs: number;
  p2ClockMs: number;
  p1Double: boolean;
  p2Double: boolean;
  p1Split: boolean;
  p2Split: boolean;
  p1Glance: boolean;
  p2Glance: boolean;
  p1DefSoak: boolean;
  p2DefSoak: boolean;
} {
  // PAC: Opponent clock clamp(12000 - 80*(yourPAC - 50), 4000, 15000) ms
  // If not strictly higher, uses base 12s
  let p1ClockMs = 12000;
  let p2ClockMs = 12000;

  if (p1.pac > p2.pac) {
    p2ClockMs = Math.min(15000, Math.max(4000, 12000 - 80 * (p1.pac - 50)));
  } else if (p2.pac > p1.pac) {
    p1ClockMs = Math.min(15000, Math.max(4000, 12000 - 80 * (p2.pac - 50)));
  }

  return {
    p1ClockMs,
    p2ClockMs,
    p1Double: p1.sho > p2.sho,
    p2Double: p2.sho > p1.sho,
    p1Split: p1.pas > p2.pas,
    p2Split: p2.pas > p1.pas,
    p1Glance: p1.dri > p2.dri,
    p2Glance: p2.dri > p1.dri,
    p1DefSoak: p1.def > p2.def,
    p2DefSoak: p2.def > p1.def,
  };
}

/** Initialize a fresh 21 board upon match acceptance */
export function deal21Match(
  creatorId: string,
  opponentId: string,
  stake: number,
  creatorStats: LegendStats,
  opponentStats: LegendStats
): TwentyOneBoard {
  const shoe = shuffleDeck(createDeck());
  const perks = compareStats(creatorStats, opponentStats);

  // Deal 2 cards to each player: Card 0 = up (public), Card 1 = hole (private)
  const cUp = shoe.pop()!;
  const oUp = shoe.pop()!;
  const cHole = shoe.pop()!;
  const oHole = shoe.pop()!;

  const now = Date.now();

  const creatorState: Player21State = {
    userId: creatorId,
    hands: [
      {
        cards: [cUp, cHole],
        stake,
        status: 'playing',
      },
    ],
    activeHandIndex: 0,
    upCard: cUp,
    holeCard: cHole,
    glanceUsed: false,
    hasDoublePerk: perks.p1Double,
    hasSplitPerk: perks.p1Split,
    hasGlancePerk: perks.p1Glance,
    hasDefSoak: perks.p1DefSoak,
    clockMs: perks.p1ClockMs,
    lastActionTime: now,
  };

  const opponentState: Player21State = {
    userId: opponentId,
    hands: [
      {
        cards: [oUp, oHole],
        stake,
        status: 'playing',
      },
    ],
    activeHandIndex: 0,
    upCard: oUp,
    holeCard: oHole,
    glanceUsed: false,
    hasDoublePerk: perks.p2Double,
    hasSplitPerk: perks.p2Split,
    hasGlancePerk: perks.p2Glance,
    hasDefSoak: perks.p2DefSoak,
    clockMs: perks.p2ClockMs,
    lastActionTime: now,
  };

  // If initial hand is 21, player doesn't need to hit
  const cEval = evaluateHand(creatorState.hands[0].cards);
  if (cEval.total === 21) {
    creatorState.hands[0].status = 'stand';
  }

  const oEval = evaluateHand(opponentState.hands[0].cards);
  if (oEval.total === 21) {
    opponentState.hands[0].status = 'stand';
  }

  const board: TwentyOneBoard = {
    shoe,
    creator: creatorState,
    opponent: opponentState,
    phase: 'act',
  };

  // Check if both already stand (both dealt 21)
  if (isPlayerFinished(creatorState) && isPlayerFinished(opponentState)) {
    return resolve21(board);
  }

  return board;
}

/** Check if player has finished all hands */
export function isPlayerFinished(player: Player21State): boolean {
  return player.hands.every((h) => h.status === 'stand' || h.status === 'bust');
}

/**
 * Apply player action (hit, stand, double, split, glance)
 */
export function apply21Action(
  board: TwentyOneBoard,
  userId: string,
  action: 'hit' | 'stand' | 'double' | 'split' | 'glance'
): { board: TwentyOneBoard; extraStakeDebited?: number } {
  if (board.phase !== 'act') {
    throw new Error('Game is not in action phase');
  }

  const player =
    board.creator.userId === userId
      ? board.creator
      : board.opponent?.userId === userId
      ? board.opponent
      : null;

  if (!player) {
    throw new Error('User is not in this match');
  }

  if (isPlayerFinished(player)) {
    throw new Error('Player has already finished their turn');
  }

  const hand = player.hands[player.activeHandIndex];
  if (!hand || hand.status !== 'playing') {
    throw new Error('No active playing hand');
  }

  let extraStakeDebited = 0;
  player.lastActionTime = Date.now();

  switch (action) {
    case 'hit': {
      if (board.shoe.length === 0) {
        throw new Error('Shoe is empty');
      }
      const card = board.shoe.pop()!;
      hand.cards.push(card);

      const evaluation = evaluateHand(hand.cards);
      if (evaluation.isBust) {
        hand.status = 'bust';
        advanceActiveHand(player);
      } else if (evaluation.total === 21) {
        hand.status = 'stand';
        advanceActiveHand(player);
      }
      break;
    }

    case 'stand': {
      hand.status = 'stand';
      advanceActiveHand(player);
      break;
    }

    case 'double': {
      if (!player.hasDoublePerk) {
        throw new Error('Double action not unlocked (SHO contest lost or tied)');
      }
      if (hand.cards.length !== 2) {
        throw new Error('Double only allowed on first two cards');
      }
      if (board.shoe.length === 0) {
        throw new Error('Shoe is empty');
      }

      extraStakeDebited = hand.stake;
      hand.stake *= 2;
      hand.doubled = true;

      const card = board.shoe.pop()!;
      hand.cards.push(card);

      const evaluation = evaluateHand(hand.cards);
      hand.status = evaluation.isBust ? 'bust' : 'stand';
      advanceActiveHand(player);
      break;
    }

    case 'split': {
      if (!player.hasSplitPerk) {
        throw new Error('Split action not unlocked (PAS contest lost or tied)');
      }
      if (hand.cards.length !== 2) {
        throw new Error('Split only allowed on first two cards');
      }
      if (!isPair(hand.cards[0], hand.cards[1])) {
        throw new Error('Split only allowed on matching pairs');
      }
      if (player.hands.length >= 2) {
        throw new Error('Max 1 split per hand allowed');
      }
      if (board.shoe.length < 2) {
        throw new Error('Not enough cards in shoe to split');
      }

      extraStakeDebited = hand.stake;

      const card1 = hand.cards[0];
      const card2 = hand.cards[1];

      // Hand 0 gets card1 + 1 new card
      hand.cards = [card1, board.shoe.pop()!];

      // Hand 1 gets card2 + 1 new card
      player.hands.push({
        cards: [card2, board.shoe.pop()!],
        stake: hand.stake,
        status: 'playing',
      });

      // Re-evaluate hand 0
      const eval0 = evaluateHand(hand.cards);
      if (eval0.total === 21) {
        hand.status = 'stand';
        advanceActiveHand(player);
      }
      break;
    }

    case 'glance': {
      if (!player.hasGlancePerk) {
        throw new Error('Glance action not unlocked (DRI contest lost or tied)');
      }
      if (player.glanceUsed) {
        throw new Error('Glance already used this match');
      }
      if (board.shoe.length === 0) {
        throw new Error('Shoe is empty');
      }

      player.glanceUsed = true;
      player.glancedCard = board.shoe[board.shoe.length - 1]; // Look at top card without popping
      break;
    }
  }

  // Check if both players have now finished all hands
  if (board.opponent && isPlayerFinished(board.creator) && isPlayerFinished(board.opponent)) {
    return { board: resolve21(board), extraStakeDebited };
  }

  return { board, extraStakeDebited };
}

function advanceActiveHand(player: Player21State) {
  const nextIdx = player.hands.findIndex((h) => h.status === 'playing');
  if (nextIdx !== -1) {
    player.activeHandIndex = nextIdx;
  }
}

/** Check if player's clock has expired and auto-stand */
export function check21Timeouts(board: TwentyOneBoard): boolean {
  if (board.phase !== 'act' || !board.opponent) return false;

  const now = Date.now();
  let changed = false;

  const checkUser = (p: Player21State) => {
    if (isPlayerFinished(p)) return;
    const elapsed = now - p.lastActionTime;
    if (elapsed > p.clockMs) {
      // Timeout = Stand
      const hand = p.hands[p.activeHandIndex];
      if (hand && hand.status === 'playing') {
        hand.status = 'stand';
        advanceActiveHand(p);
        p.lastActionTime = now;
        changed = true;
      }
    }
  };

  checkUser(board.creator);
  checkUser(board.opponent);

  if (isPlayerFinished(board.creator) && isPlayerFinished(board.opponent)) {
    resolve21(board);
    changed = true;
  }

  return changed;
}

/**
 * Resolve 21 Match:
 * Resolves hands, determines winner/push, applies DEF soak, 4% rake.
 */
export function resolve21(board: TwentyOneBoard): TwentyOneBoard {
  if (!board.opponent) {
    throw new Error('Cannot resolve match without opponent');
  }

  board.phase = 'resolved';

  const creatorHands = board.creator.hands;
  const opponentHands = board.opponent.hands;

  // Compute total stakes on table
  const creatorTotalStake = creatorHands.reduce((acc, h) => acc + h.stake, 0);
  const opponentTotalStake = opponentHands.reduce((acc, h) => acc + h.stake, 0);
  const totalPot = creatorTotalStake + opponentTotalStake;

  // Score hands
  // For each hand comparison, evaluate score:
  // Result per comparison: 1 (creator wins), -1 (opponent wins), 0 (push)
  let creatorWins = 0;
  let opponentWins = 0;
  let pushes = 0;

  for (const cHand of creatorHands) {
    const cEval = evaluateHand(cHand.cards);
    for (const oHand of opponentHands) {
      const oEval = evaluateHand(oHand.cards);

      if (cEval.isBust && oEval.isBust) {
        // Both bust -> push (PVP_SPEC.md §2)
        pushes++;
      } else if (cEval.isBust && !oEval.isBust) {
        opponentWins++;
      } else if (!cEval.isBust && oEval.isBust) {
        creatorWins++;
      } else {
        // Both <= 21
        if (cEval.total > oEval.total) {
          creatorWins++;
        } else if (oEval.total > cEval.total) {
          opponentWins++;
        } else {
          pushes++;
        }
      }
    }
  }

  if (creatorWins > opponentWins) {
    // Creator wins
    board.winnerId = board.creator.userId;
    board.isPush = false;
    board.payout = calculatePayout(
      creatorTotalStake,
      opponentTotalStake,
      board.opponent.hasDefSoak
    );
    board.resolutionSummary = `Creator wins (${creatorWins}-${opponentWins})`;
  } else if (opponentWins > creatorWins) {
    // Opponent wins
    board.winnerId = board.opponent.userId;
    board.isPush = false;
    board.payout = calculatePayout(
      opponentTotalStake,
      creatorTotalStake,
      board.creator.hasDefSoak
    );
    board.resolutionSummary = `Opponent wins (${opponentWins}-${creatorWins})`;
  } else {
    // Push! Full refund, rake 0
    board.winnerId = null;
    board.isPush = true;
    board.payout = {
      pot: totalPot,
      rake: 0,
      prize: 0,
      loserPays: 0,
      loserRefund: 0,
    };
    board.resolutionSummary = `Push (${pushes} tied/split)`;
  }

  return board;
}

/**
 * Calculate winner payout with DEF soak and 4% rake:
 * If loser has DEF soak: loser pays half stake.
 * pot = winner.stake + loser_pays
 * rake = floor(pot * 0.04)
 * prize = pot - rake
 * refund_loser = loser.stake - loser_pays
 */
export function calculatePayout(
  winnerStake: number,
  loserStake: number,
  loserHasDefSoak: boolean
): {
  pot: number;
  rake: number;
  prize: number;
  loserPays: number;
  loserRefund: number;
} {
  const loserPays = loserHasDefSoak ? Math.floor(loserStake / 2) : loserStake;
  const loserRefund = loserStake - loserPays;
  const pot = winnerStake + loserPays;
  const rake = Math.floor(pot * 0.04);
  const prize = pot - rake;

  return {
    pot,
    rake,
    prize,
    loserPays,
    loserRefund,
  };
}

/**
 * Filter board state for specific client view:
 * Never sends full shoe or opponent hole card before resolution!
 */
export function sanitize21BoardForClient(
  board: TwentyOneBoard,
  forUserId: string
): any {
  const isCreator = board.creator.userId === forUserId;
  const isResolved = board.phase === 'resolved';

  const me = isCreator ? board.creator : board.opponent;
  const opp = isCreator ? board.opponent : board.creator;

  return {
    phase: board.phase,
    winnerId: board.winnerId,
    isPush: board.isPush,
    payout: board.payout,
    resolutionSummary: board.resolutionSummary,
    me: me
      ? {
          userId: me.userId,
          hands: me.hands.map((h) => ({
            cards: h.cards,
            stake: h.stake,
            status: h.status,
            doubled: h.doubled,
            eval: evaluateHand(h.cards),
          })),
          activeHandIndex: me.activeHandIndex,
          glancedCard: me.glancedCard || null,
          glanceUsed: me.glanceUsed,
          perks: {
            double: me.hasDoublePerk,
            split: me.hasSplitPerk,
            glance: me.hasGlancePerk,
            defSoak: me.hasDefSoak,
          },
          clockMs: me.clockMs,
        }
      : null,
    opp: opp
      ? {
          userId: opp.userId,
          upCard: opp.upCard,
          // Only show hole card and full cards once resolved!
          cards: isResolved
            ? opp.hands[0]?.cards || []
            : [opp.upCard, '??'],
          hands: isResolved
            ? opp.hands.map((h) => ({
                cards: h.cards,
                stake: h.stake,
                status: h.status,
                doubled: h.doubled,
                eval: evaluateHand(h.cards),
              }))
            : opp.hands.map((h, i) => ({
                cards: i === 0 ? [opp.upCard, '??'] : ['??', '??'],
                stake: h.stake,
                status: h.status,
                doubled: h.doubled,
              })),
          cardCount: opp.hands.reduce((sum, h) => sum + h.cards.length, 0),
          perks: {
            double: opp.hasDoublePerk,
            split: opp.hasSplitPerk,
            glance: opp.hasGlancePerk,
            defSoak: opp.hasDefSoak,
          },
          clockMs: opp.clockMs,
        }
      : null,
  };
}
