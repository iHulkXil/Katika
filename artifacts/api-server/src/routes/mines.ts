import { Router, type IRouter } from "express";
import { and, eq, gte, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";

const router: IRouter = Router();
const TILES = 25;
const HOUSE = 0.99;

type Round = {
  userId: number;
  privyUserId: string;
  wager: number;
  minesCount: number;
  mines: number[];
  revealed: number[];
  settled: boolean;
};

const rounds = new Map<string, Round>();

function pickMines(count: number) {
  const set = new Set<number>();
  while (set.size < count) set.add(randomInt(0, TILES));
  return [...set];
}

function multiplier(mines: number, reveals: number) {
  let chance = 1;
  for (let i = 0; i < reveals; i += 1) {
    chance *= (TILES - mines - i) / (TILES - i);
  }
  if (chance <= 0) return 0;
  return HOUSE / chance;
}

async function adjustCredits(privyUserId: string, delta: number, need: number) {
  const { db, usersTable } = await import("@workspace/db");
  const existing = await db.select().from(usersTable).where(eq(usersTable.privyUserId, privyUserId)).limit(1);
  const user = existing[0];
  if (!user) return { error: "User not found" as const, status: 404 as const };
  const updated = await db.update(usersTable).set({
    demoCredits: sql`${usersTable.demoCredits} + ${delta}`,
    updatedAt: new Date(),
  }).where(and(eq(usersTable.id, user.id), gte(usersTable.demoCredits, need))).returning();
  if (!updated[0]) return { error: "Not enough demo credits" as const, status: 400 as const };
  return { user, row: updated[0] };
}

function publicRound(round: Round, extra: Record<string, unknown> = {}) {
  const mult = multiplier(round.minesCount, round.revealed.length);
  return {
    active: !round.settled,
    wager: round.wager,
    minesCount: round.minesCount,
    revealed: round.revealed,
    mines: round.settled ? round.mines : [],
    multiplier: Number(mult.toFixed(4)),
    cashoutValue: Math.floor(round.wager * mult),
    ...extra,
  };
}

router.post("/games/mines/start", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Database is not configured" });
    if (rounds.get(identity.privyUserId)?.settled === false) {
      return res.status(400).json({ error: "Cash out or finish the open Mines round first" });
    }
    const wager = Number(req.body?.wager);
    const minesCount = Number(req.body?.mines);
    if (!Number.isInteger(wager) || wager < 10 || wager > 1000) {
      return res.status(400).json({ error: "Wager must be an integer from 10 to 1000" });
    }
    if (!Number.isInteger(minesCount) || minesCount < 1 || minesCount > 10) {
      return res.status(400).json({ error: "Mines must be 1 to 10" });
    }
    const paid = await adjustCredits(identity.privyUserId, -wager, wager);
    if ("error" in paid && paid.error) return res.status(paid.status).json({ error: paid.error });
    const round: Round = {
      userId: paid.row.id,
      privyUserId: identity.privyUserId,
      wager,
      minesCount,
      mines: pickMines(minesCount),
      revealed: [],
      settled: false,
    };
    rounds.set(identity.privyUserId, round);
    return res.json({ ...publicRound(round), demoCredits: paid.row.demoCredits });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Mines start failed" });
  }
});

router.post("/games/mines/reveal", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const round = rounds.get(identity.privyUserId);
    if (!round || round.settled) return res.status(400).json({ error: "No open Mines round" });
    const tile = Number(req.body?.tile);
    if (!Number.isInteger(tile) || tile < 0 || tile >= TILES) {
      return res.status(400).json({ error: "Tile must be 0-24" });
    }
    if (round.revealed.includes(tile)) return res.status(400).json({ error: "Tile already open" });
    if (round.mines.includes(tile)) {
      round.settled = true;
      round.revealed.push(tile);
      return res.json({ ...publicRound(round, { hit: tile, won: false, payout: -round.wager }), demoCredits: undefined });
    }
    round.revealed.push(tile);
    const safeLeft = TILES - round.minesCount - round.revealed.length;
    if (safeLeft <= 0) {
      const paid = await adjustCredits(identity.privyUserId, Math.floor(round.wager * multiplier(round.minesCount, round.revealed.length)), 0);
      round.settled = true;
      return res.json({
        ...publicRound(round, { hit: null, won: true, payout: Math.floor(round.wager * multiplier(round.minesCount, round.revealed.length)) - round.wager }),
        demoCredits: "row" in paid ? paid.row.demoCredits : undefined,
      });
    }
    return res.json({ ...publicRound(round, { hit: null, won: null }), demoCredits: undefined });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Mines reveal failed" });
  }
});

router.post("/games/mines/cashout", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const round = rounds.get(identity.privyUserId);
    if (!round || round.settled) return res.status(400).json({ error: "No open Mines round" });
    if (round.revealed.length < 1) return res.status(400).json({ error: "Open at least one gem first" });
    const creditReturn = Math.floor(round.wager * multiplier(round.minesCount, round.revealed.length));
    const paid = await adjustCredits(identity.privyUserId, creditReturn, 0);
    if ("error" in paid && paid.error) return res.status(paid.status).json({ error: paid.error });
    round.settled = true;
    return res.json({
      ...publicRound(round, { hit: null, won: true, payout: creditReturn - round.wager }),
      demoCredits: paid.row.demoCredits,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Mines cashout failed" });
  }
});

export default router;
