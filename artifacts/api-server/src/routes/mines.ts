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

router.post("/games/mines", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ error: "Database is not configured" });
    }
    const wager = Number(req.body?.wager);
    const minesCount = Number(req.body?.mines);
    const picks = Array.isArray(req.body?.picks) ? req.body.picks.map(Number) : [];
    if (!Number.isInteger(wager) || wager < 10 || wager > 1000) {
      return res.status(400).json({ error: "Wager must be an integer from 10 to 1000" });
    }
    if (!Number.isInteger(minesCount) || minesCount < 1 || minesCount > 10) {
      return res.status(400).json({ error: "Mines must be 1 to 10" });
    }
    if (picks.length < 1 || picks.length > TILES - minesCount) {
      return res.status(400).json({ error: "Pick between 1 tile and the safe maximum" });
    }
    if (new Set(picks).size !== picks.length || picks.some((n: number) => !Number.isInteger(n) || n < 0 || n >= TILES)) {
      return res.status(400).json({ error: "Picks must be unique tiles 0-24" });
    }

    const mines = pickMines(minesCount);
    const hit = picks.find((p: number) => mines.includes(p));
    const won = hit === undefined;
    const mult = won ? multiplier(minesCount, picks.length) : 0;
    const creditReturn = won ? Math.max(wager, Math.floor(wager * mult)) : 0;
    const delta = won ? creditReturn - wager : -wager;

    const { db, usersTable } = await import("@workspace/db");
    const existing = await db.select().from(usersTable).where(eq(usersTable.privyUserId, identity.privyUserId)).limit(1);
    const user = existing[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    const updated = await db.update(usersTable).set({
      demoCredits: sql`${usersTable.demoCredits} + ${delta}`,
      updatedAt: new Date(),
    }).where(and(eq(usersTable.id, user.id), gte(usersTable.demoCredits, wager))).returning();
    if (!updated[0]) return res.status(400).json({ error: "Not enough demo credits" });

    return res.json({
      mines,
      picks,
      hit: hit ?? null,
      won,
      wager,
      multiplier: Number(mult.toFixed(4)),
      payout: delta,
      demoCredits: updated[0].demoCredits,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Mines play failed" });
  }
});

export default router;
