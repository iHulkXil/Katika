import { Router, type IRouter } from "express";
import { and, eq, gte, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";
import { recordBet } from "../lib/record-bet";

const router: IRouter = Router();
const TILES = 25;
const HOUSE = 0.99;

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

function asNumbers(value: unknown) {
  return Array.isArray(value) ? value.map(Number).filter((n) => Number.isInteger(n)) : [];
}

function publicRound(row: {
  wager: number;
  minesCount: number;
  mines: unknown;
  revealed: unknown;
  settled: boolean;
}, extra: Record<string, unknown> = {}) {
  const revealed = asNumbers(row.revealed);
  const mines = asNumbers(row.mines);
  const mult = multiplier(row.minesCount, revealed.length);
  return {
    active: !row.settled,
    wager: row.wager,
    minesCount: row.minesCount,
    revealed,
    mines: row.settled ? mines : [],
    multiplier: Number(mult.toFixed(4)),
    cashoutValue: Math.floor(row.wager * mult),
    ...extra,
  };
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

async function openRound(privyUserId: string) {
  const { db, minesRoundsTable } = await import("@workspace/db");
  const rows = await db.select().from(minesRoundsTable).where(
    and(eq(minesRoundsTable.privyUserId, privyUserId), eq(minesRoundsTable.settled, false)),
  ).limit(1);
  return { db, minesRoundsTable, row: rows[0] };
}

router.get("/games/mines/active", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Database is not configured" });
    const { row } = await openRound(identity.privyUserId);
    if (!row) return res.json({ active: false });
    return res.json(publicRound(row));
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Mines lookup failed" });
  }
});

router.post("/games/mines/start", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Database is not configured" });
    const existing = await openRound(identity.privyUserId);
    if (existing.row) return res.status(400).json({ error: "Cash out or finish the open Mines round first" });
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
    const { db, minesRoundsTable } = await import("@workspace/db");
    const created = await db.insert(minesRoundsTable).values({
      userId: paid.row.id,
      privyUserId: identity.privyUserId,
      wager,
      minesCount,
      mines: pickMines(minesCount),
      revealed: [],
      settled: false,
    }).returning();
    return res.json({ ...publicRound(created[0]), demoCredits: paid.row.demoCredits });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Mines start failed" });
  }
});

router.post("/games/mines/reveal", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const { db, minesRoundsTable, row } = await openRound(identity.privyUserId);
    if (!row) return res.status(400).json({ error: "No open Mines round" });
    const tile = Number(req.body?.tile);
    if (!Number.isInteger(tile) || tile < 0 || tile >= TILES) {
      return res.status(400).json({ error: "Tile must be 0-24" });
    }
    const mines = asNumbers(row.mines);
    const revealed = asNumbers(row.revealed);
    if (revealed.includes(tile)) return res.status(400).json({ error: "Tile already open" });
    revealed.push(tile);
    if (mines.includes(tile)) {
      const updated = await db.update(minesRoundsTable).set({
        revealed, settled: true, updatedAt: new Date(),
      }).where(eq(minesRoundsTable.id, row.id)).returning();
      await recordBet({
        userId: row.userId,
        privyUserId: identity.privyUserId,
        game: "mines",
        wager: row.wager,
        payout: -row.wager,
        won: false,
        detail: { hit: tile, minesCount: row.minesCount },
      });
      return res.json(publicRound(updated[0], { hit: tile, won: false, payout: -row.wager }));
    }
    const safeLeft = TILES - row.minesCount - revealed.length;
    if (safeLeft <= 0) {
      const creditReturn = Math.floor(row.wager * multiplier(row.minesCount, revealed.length));
      const paid = await adjustCredits(identity.privyUserId, creditReturn, 0);
      const updated = await db.update(minesRoundsTable).set({
        revealed, settled: true, updatedAt: new Date(),
      }).where(eq(minesRoundsTable.id, row.id)).returning();
      await recordBet({
        userId: row.userId,
        privyUserId: identity.privyUserId,
        game: "mines",
        wager: row.wager,
        payout: creditReturn - row.wager,
        won: true,
        detail: { cleared: true, minesCount: row.minesCount },
      });
      return res.json({
        ...publicRound(updated[0], { hit: null, won: true, payout: creditReturn - row.wager }),
        demoCredits: "row" in paid ? paid.row.demoCredits : undefined,
      });
    }
    const updated = await db.update(minesRoundsTable).set({
      revealed, updatedAt: new Date(),
    }).where(eq(minesRoundsTable.id, row.id)).returning();
    return res.json(publicRound(updated[0], { hit: null, won: null }));
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Mines reveal failed" });
  }
});

router.post("/games/mines/cashout", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const { db, minesRoundsTable, row } = await openRound(identity.privyUserId);
    if (!row) return res.status(400).json({ error: "No open Mines round" });
    const revealed = asNumbers(row.revealed);
    if (revealed.length < 1) return res.status(400).json({ error: "Open at least one gem first" });
    const creditReturn = Math.floor(row.wager * multiplier(row.minesCount, revealed.length));
    const paid = await adjustCredits(identity.privyUserId, creditReturn, 0);
    if ("error" in paid && paid.error) return res.status(paid.status).json({ error: paid.error });
    const updated = await db.update(minesRoundsTable).set({
      settled: true, updatedAt: new Date(),
    }).where(eq(minesRoundsTable.id, row.id)).returning();
    await recordBet({
      userId: row.userId,
      privyUserId: identity.privyUserId,
      game: "mines",
      wager: row.wager,
      payout: creditReturn - row.wager,
      won: true,
      detail: { cashout: true, tiles: revealed.length, minesCount: row.minesCount },
    });
    return res.json({
      ...publicRound(updated[0], { hit: null, won: true, payout: creditReturn - row.wager }),
      demoCredits: paid.row.demoCredits,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Mines cashout failed" });
  }
});

export default router;
