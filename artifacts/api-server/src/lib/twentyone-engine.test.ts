import assert from 'assert';
import {
  evaluateHand,
  createDeck,
  shuffleDeck,
  deal21Match,
  apply21Action,
  resolve21,
  calculatePayout,
  compareStats,
  isPair,
  type TwentyOneBoard,
  type LegendStats,
} from './twentyone-engine';

console.log('--- RUNNING KATIKA 21 UNIT TESTS ---');

// 1. Hand Evaluation & Soft Aces
{
  const h1 = evaluateHand(['AS', '9H']);
  assert.strictEqual(h1.total, 20);
  assert.strictEqual(h1.isSoft, true);
  assert.strictEqual(h1.isBust, false);

  const h2 = evaluateHand(['AS', '8H', '5C']); // 1 + 8 + 5 = 14 (Ace stepped down)
  assert.strictEqual(h2.total, 14);
  assert.strictEqual(h2.isSoft, false);
  assert.strictEqual(h2.isBust, false);

  const h3 = evaluateHand(['KS', 'QD', '5C']); // 10 + 10 + 5 = 25 (Bust)
  assert.strictEqual(h3.total, 25);
  assert.strictEqual(h3.isBust, true);

  const h4 = evaluateHand(['AH', 'KD']); // Natural 21
  assert.strictEqual(h4.total, 21);
  assert.strictEqual(h4.isNatural21, true);

  console.log('✓ Hand evaluation & soft Ace tests passed');
}

// 2. Win / Bust / Push Resolutions (PVP_SPEC.md §2)
{
  // Test A: Higher total wins (21 vs 20)
  const boardA: TwentyOneBoard = {
    shoe: ['2S', '3S'],
    phase: 'act',
    creator: {
      userId: 'creator',
      hands: [{ cards: ['AS', 'KS'], stake: 50, status: 'stand' }], // 21
      activeHandIndex: 0,
      upCard: 'AS',
      holeCard: 'KS',
      glanceUsed: false,
      hasDoublePerk: false,
      hasSplitPerk: false,
      hasGlancePerk: false,
      hasDefSoak: false,
      clockMs: 12000,
      lastActionTime: Date.now(),
    },
    opponent: {
      userId: 'opponent',
      hands: [{ cards: ['TS', 'TD'], stake: 50, status: 'stand' }], // 20
      activeHandIndex: 0,
      upCard: 'TS',
      holeCard: 'TD',
      glanceUsed: false,
      hasDoublePerk: false,
      hasSplitPerk: false,
      hasGlancePerk: false,
      hasDefSoak: false,
      clockMs: 12000,
      lastActionTime: Date.now(),
    },
  };
  const resA = resolve21(boardA);
  assert.strictEqual(resA.winnerId, 'creator');
  assert.strictEqual(resA.isPush, false);
  assert.strictEqual(resA.payout?.prize, 96);
  assert.strictEqual(resA.payout?.rake, 4);
  console.log('✓ Higher total (21 vs 20) win passed (pot 100 -> rake 4, prize 96)');

  // Test B: Bust loses to <= 21
  const boardB: TwentyOneBoard = {
    shoe: ['2S', '3S'],
    phase: 'act',
    creator: {
      userId: 'creator',
      hands: [{ cards: ['TS', '7D'], stake: 50, status: 'stand' }], // 17
      activeHandIndex: 0,
      upCard: 'TS',
      holeCard: '7D',
      glanceUsed: false,
      hasDoublePerk: false,
      hasSplitPerk: false,
      hasGlancePerk: false,
      hasDefSoak: false,
      clockMs: 12000,
      lastActionTime: Date.now(),
    },
    opponent: {
      userId: 'opponent',
      hands: [{ cards: ['TS', '8D', '5C'], stake: 50, status: 'bust' }], // 23 (Bust)
      activeHandIndex: 0,
      upCard: 'TS',
      holeCard: '8D',
      glanceUsed: false,
      hasDoublePerk: false,
      hasSplitPerk: false,
      hasGlancePerk: false,
      hasDefSoak: false,
      clockMs: 12000,
      lastActionTime: Date.now(),
    },
  };
  const resB = resolve21(boardB);
  assert.strictEqual(resB.winnerId, 'creator');
  assert.strictEqual(resB.isPush, false);
  console.log('✓ Bust loses to <= 21 passed');

  // Test C: Equal totals -> Push (refund both, rake 0)
  const boardC: TwentyOneBoard = {
    shoe: ['2S', '3S'],
    phase: 'act',
    creator: {
      userId: 'creator',
      hands: [{ cards: ['9S', 'TD'], stake: 50, status: 'stand' }], // 19
      activeHandIndex: 0,
      upCard: '9S',
      holeCard: 'TD',
      glanceUsed: false,
      hasDoublePerk: false,
      hasSplitPerk: false,
      hasGlancePerk: false,
      hasDefSoak: false,
      clockMs: 12000,
      lastActionTime: Date.now(),
    },
    opponent: {
      userId: 'opponent',
      hands: [{ cards: ['8S', 'AC'], stake: 50, status: 'stand' }], // 19
      activeHandIndex: 0,
      upCard: '8S',
      holeCard: 'AC',
      glanceUsed: false,
      hasDoublePerk: false,
      hasSplitPerk: false,
      hasGlancePerk: false,
      hasDefSoak: false,
      clockMs: 12000,
      lastActionTime: Date.now(),
    },
  };
  const resC = resolve21(boardC);
  assert.strictEqual(resC.winnerId, null);
  assert.strictEqual(resC.isPush, true);
  assert.strictEqual(resC.payout?.rake, 0);
  console.log('✓ Equal totals (19 vs 19) push & refund passed');

  // Test D: Both bust -> Push (PVP_SPEC.md §2: "Both bust -> push (do not play least over)")
  const boardD: TwentyOneBoard = {
    shoe: ['2S', '3S'],
    phase: 'act',
    creator: {
      userId: 'creator',
      hands: [{ cards: ['TS', '8D', '5C'], stake: 50, status: 'bust' }], // 23
      activeHandIndex: 0,
      upCard: 'TS',
      holeCard: '8D',
      glanceUsed: false,
      hasDoublePerk: false,
      hasSplitPerk: false,
      hasGlancePerk: false,
      hasDefSoak: false,
      clockMs: 12000,
      lastActionTime: Date.now(),
    },
    opponent: {
      userId: 'opponent',
      hands: [{ cards: ['JS', '9D', '7C'], stake: 50, status: 'bust' }], // 26
      activeHandIndex: 0,
      upCard: 'JS',
      holeCard: '9D',
      glanceUsed: false,
      hasDoublePerk: false,
      hasSplitPerk: false,
      hasGlancePerk: false,
      hasDefSoak: false,
      clockMs: 12000,
      lastActionTime: Date.now(),
    },
  };
  const resD = resolve21(boardD);
  assert.strictEqual(resD.winnerId, null);
  assert.strictEqual(resD.isPush, true);
  assert.strictEqual(resD.payout?.rake, 0);
  console.log('✓ Both bust (23 vs 26) push & full refund passed');
}

// 3. DEF Soak Math Test (ECONOMY_SPEC.md §DEF soak + PVP_SPEC.md §3)
{
  // Stake 50 each. Loser has higher DEF -> loser_pays = 25, pot = 75, rake = 3, prize = 72, refund = 25
  const payout = calculatePayout(50, 50, true);
  assert.strictEqual(payout.loserPays, 25);
  assert.strictEqual(payout.loserRefund, 25);
  assert.strictEqual(payout.pot, 75);
  assert.strictEqual(payout.rake, 3);
  assert.strictEqual(payout.prize, 72);
  console.log('✓ DEF soak payout passed: 50 stake each, soak -> pot 75, rake 3, prize 72, loser refund 25');
}

// 4. Hit & Stand Mechanics
{
  const s1: LegendStats = { pac: 50, sho: 50, pas: 50, dri: 50, def: 50, phy: 50 };
  const s2: LegendStats = { pac: 50, sho: 50, pas: 50, dri: 50, def: 50, phy: 50 };

  const match = deal21Match('user1', 'user2', 20, s1, s2);
  assert.strictEqual(match.phase, 'act');
  assert.strictEqual(match.creator.hands[0].cards.length, 2);
  assert.strictEqual(match.opponent?.hands[0].cards.length, 2);

  // Set predictable hand for user1: 5S, 6S = 11
  match.creator.hands[0].cards = ['5S', '6S'];
  match.creator.hands[0].status = 'playing';
  match.shoe = ['TS']; // next hit will draw TS -> 21

  const { board: hitBoard } = apply21Action(match, 'user1', 'hit');
  assert.strictEqual(hitBoard.creator.hands[0].cards.length, 3);
  assert.strictEqual(hitBoard.creator.hands[0].status, 'stand'); // auto-stands on 21
  console.log('✓ Hit mechanic passed (drew card, stood on 21)');
}

// 5. Stat Contests & Bonuses (Double, Split, Glance, Clock)
{
  // Player 1 has higher SHO (Double) and DRI (Glance)
  // Player 2 has higher PAS (Split) and PAC (Clock)
  const p1Stats: LegendStats = { pac: 50, sho: 80, pas: 50, dri: 75, def: 60, phy: 50 };
  const p2Stats: LegendStats = { pac: 75, sho: 50, pas: 70, dri: 50, def: 40, phy: 50 };

  const perks = compareStats(p1Stats, p2Stats);
  assert.strictEqual(perks.p1Double, true);
  assert.strictEqual(perks.p2Double, false);
  assert.strictEqual(perks.p1Split, false);
  assert.strictEqual(perks.p2Split, true);
  assert.strictEqual(perks.p1Glance, true);
  assert.strictEqual(perks.p2Glance, false);
  assert.strictEqual(perks.p1DefSoak, true);
  assert.strictEqual(perks.p2DefSoak, false);

  // PAC clock check: P2 PAC is 75 -> P1 clock is clamp(12000 - 80*(75-50), 4000, 15000) = 12000 - 2000 = 10000ms
  assert.strictEqual(perks.p1ClockMs, 10000);
  assert.strictEqual(perks.p2ClockMs, 12000); // base 12s

  console.log('✓ Stat contests & PAC opponent clock reduction passed');

  // Test Double action
  const match = deal21Match('p1', 'p2', 25, p1Stats, p2Stats);
  match.creator.hands[0].cards = ['5H', '6D'];
  match.creator.hands[0].status = 'playing';
  match.shoe = ['8S'];

  const { board: doubleBoard, extraStakeDebited } = apply21Action(match, 'p1', 'double');
  assert.strictEqual(extraStakeDebited, 25);
  assert.strictEqual(doubleBoard.creator.hands[0].stake, 50);
  assert.strictEqual(doubleBoard.creator.hands[0].cards.length, 3);
  assert.strictEqual(doubleBoard.creator.hands[0].status, 'stand');
  console.log('✓ Double action passed (extra stake debited, drew 1 card, locked)');

  // Test Split action
  const splitMatch = deal21Match('p2', 'p1', 30, p2Stats, p1Stats);
  splitMatch.creator.hands[0].cards = ['8H', '8S'];
  splitMatch.creator.hands[0].status = 'playing';
  splitMatch.shoe = ['3C', '4D', '5D', '6D'];

  const { board: splitBoard, extraStakeDebited: splitDebit } = apply21Action(splitMatch, 'p2', 'split');
  assert.strictEqual(splitDebit, 30);
  assert.strictEqual(splitBoard.creator.hands.length, 2);
  assert.strictEqual(splitBoard.creator.hands[0].cards.length, 2);
  assert.strictEqual(splitBoard.creator.hands[1].cards.length, 2);
  console.log('✓ Split action passed (split into 2 hands, each dealt card from shoe)');

  // Test Glance action
  const glanceMatch = deal21Match('p1', 'p2', 15, p1Stats, p2Stats);
  glanceMatch.shoe = ['KH', 'QS', 'AC']; // top card is AC
  const { board: glanceBoard } = apply21Action(glanceMatch, 'p1', 'glance');
  assert.strictEqual(glanceBoard.creator.glancedCard, 'AC');
  assert.strictEqual(glanceBoard.shoe.length, 3); // Shoe not altered
  console.log('✓ Glance action passed (privately inspected top shoe card without popping)');
}

console.log('ALL KATIKA 21 ENGINE TESTS PASSED! ♠️♥️♦️♣️');
