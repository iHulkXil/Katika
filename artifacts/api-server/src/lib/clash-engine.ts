import { randomInt } from "node:crypto";
import { CLASH_RAKE_RATE } from "./ktk-economy";

export type LegendCombatant = {
  id: string;
  name: string;
  position: string;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  overall: number;
};

export type ClashRoundEvent = {
  lane: number;
  laneName: string;
  description: string;
  p1StatUsed: string;
  p1Score: number;
  p2StatUsed: string;
  p2Score: number;
  winner: "p1" | "p2" | "draw";
  narrative: string;
};

export type ClashSimulationResult = {
  p1Score: number;
  p2Score: number;
  winnerId: "p1" | "p2" | "draw";
  rounds: ClashRoundEvent[];
  p1TotalPoints: number;
  p2TotalPoints: number;
};

const BOT_LEGENDS: LegendCombatant[] = [
  { id: "bot_1", name: "Apex Striker", position: "ST", pace: 82, shooting: 85, passing: 65, dribbling: 78, defending: 35, physical: 75, overall: 70 },
  { id: "bot_2", name: "Vanguard Titan", position: "CB", pace: 68, shooting: 40, passing: 68, dribbling: 62, defending: 86, physical: 88, overall: 69 },
  { id: "bot_3", name: "Phantom Maestro", position: "CAM", pace: 76, shooting: 78, passing: 86, dribbling: 84, defending: 48, physical: 64, overall: 73 },
  { id: "bot_4", name: "Blitz Wing", position: "RW", pace: 90, shooting: 74, passing: 72, dribbling: 85, defending: 38, physical: 60, overall: 70 },
  { id: "bot_5", name: "Iron Anchor", position: "CDM", pace: 70, shooting: 55, passing: 78, dribbling: 70, defending: 82, physical: 84, overall: 73 },
];

export function getBotOpponent(targetOvr: number = 70): LegendCombatant {
  const template = BOT_LEGENDS[randomInt(0, BOT_LEGENDS.length)];
  const variance = () => randomInt(-4, 5);
  return {
    ...template,
    id: `bot_${Date.now()}_${randomInt(100, 999)}`,
    pace: Math.min(99, Math.max(30, template.pace + variance())),
    shooting: Math.min(99, Math.max(30, template.shooting + variance())),
    passing: Math.min(99, Math.max(30, template.passing + variance())),
    dribbling: Math.min(99, Math.max(30, template.dribbling + variance())),
    defending: Math.min(99, Math.max(30, template.defending + variance())),
    physical: Math.min(99, Math.max(30, template.physical + variance())),
    overall: Math.min(99, Math.max(30, targetOvr + variance())),
  };
}

export function simulateClash(p1: LegendCombatant, p2: LegendCombatant): ClashSimulationResult {
  const lanes = [
    {
      lane: 1,
      name: "Wing Sprint & Transition",
      p1Stat: "pace",
      p1Val: p1.pace + p1.dribbling * 0.5,
      p2Stat: "pace",
      p2Val: p2.pace + p2.defending * 0.5,
      narrativeWinP1: `${p1.name} blazes past on the flank with blistering acceleration!`,
      narrativeWinP2: `${p2.name} closes the angle with sharp tactical positioning!`,
    },
    {
      lane: 2,
      name: "Midfield Command & Duel",
      p1Stat: "passing",
      p1Val: p1.passing + p1.physical * 0.5,
      p2Stat: "passing",
      p2Val: p2.passing + p2.physical * 0.5,
      narrativeWinP1: `${p1.name} threads a pinpoint pass through heavy midfield pressure!`,
      narrativeWinP2: `${p2.name} dominates the center circle with physical authority!`,
    },
    {
      lane: 3,
      name: "Box Decider & Finish",
      p1Stat: "shooting",
      p1Val: p1.shooting + p1.pace * 0.3,
      p2Stat: "defending",
      p2Val: p2.defending + p2.physical * 0.3,
      narrativeWinP1: `${p1.name} unleashes a ferocious strike into the top corner!`,
      narrativeWinP2: `${p2.name} makes a heroic goal-line block to deny the strike!`,
    },
  ];

  let p1Points = 0;
  let p2Points = 0;
  const rounds: ClashRoundEvent[] = [];

  for (const lane of lanes) {
    const p1Roll = randomInt(1, 21);
    const p2Roll = randomInt(1, 21);
    const p1Score = Math.round(lane.p1Val + p1Roll);
    const p2Score = Math.round(lane.p2Val + p2Roll);

    let roundWinner: "p1" | "p2" | "draw" = "draw";
    let narrative = "Both legends clash head-on in an evenly matched deadlock.";

    if (p1Score > p2Score) {
      roundWinner = "p1";
      p1Points += 1;
      narrative = lane.narrativeWinP1;
    } else if (p2Score > p1Score) {
      roundWinner = "p2";
      p2Points += 1;
      narrative = lane.narrativeWinP2;
    }

    rounds.push({
      lane: lane.lane,
      laneName: lane.name,
      description: `${p1.name} (${lane.p1Stat}) vs ${p2.name} (${lane.p2Stat})`,
      p1StatUsed: lane.p1Stat,
      p1Score,
      p2StatUsed: lane.p2Stat,
      p2Score,
      winner: roundWinner,
      narrative,
    });
  }

  // If tied after 3 lanes, sudden death round based on physical stat
  if (p1Points === p2Points) {
    const p1Roll = randomInt(1, 100);
    const p2Roll = randomInt(1, 100);
    const p1Tie = p1.physical + p1Roll;
    const p2Tie = p2.physical + p2Roll;

    if (p1Tie >= p2Tie) {
      p1Points += 1;
      rounds.push({
        lane: 4,
        laneName: "Stamina Sudden Death",
        description: "Exhaustion sets in as the clash enters a sudden death battle of will!",
        p1StatUsed: "physical",
        p1Score: p1Tie,
        p2StatUsed: "physical",
        p2Score: p2Tie,
        winner: "p1",
        narrative: `${p1.name} digs deep with supreme stamina to claim the match!`,
      });
    } else {
      p2Points += 1;
      rounds.push({
        lane: 4,
        laneName: "Stamina Sudden Death",
        description: "Exhaustion sets in as the clash enters a sudden death battle of will!",
        p1StatUsed: "physical",
        p1Score: p1Tie,
        p2StatUsed: "physical",
        p2Score: p2Tie,
        winner: "p2",
        narrative: `${p2.name} outlasts their opponent with relentless endurance!`,
      });
    }
  }

  return {
    p1Score: p1Points,
    p2Score: p2Points,
    winnerId: p1Points > p2Points ? "p1" : "p2",
    rounds,
    p1TotalPoints: p1Points,
    p2TotalPoints: p2Points,
  };
}

export function calculateClashPot(stake: number) {
  const totalPot = stake * 2;
  const houseRake = Math.round(totalPot * CLASH_RAKE_RATE);
  const winnerPayout = totalPot - houseRake;
  return { totalPot, houseRake, winnerPayout, rakeRate: CLASH_RAKE_RATE };
}
