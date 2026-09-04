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
const HOUSE_EDGE = 0.01;

function diceStats(target: number, prediction: "over" | "under") {
  const winOutcomes = prediction === "over" ? 100 - target : target - 1;
  const winChance = winOutcomes / 100;
  const multiplier = HOUSE_EDGE < 1 && winChance > 0 ? (1 - HOUSE_EDGE) / winChance : 0;
  return { winChance, multiplier };
}

router.post("/games/dice", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Database is not configured" });
    const wager = Number(req.body?.wager);
    const target = Number(req.body?.target);
    const prediction = req.body?.prediction;
    if (!Number.isInteger(wager) || wager < 10 || wager > 1000) {
      return res.status(400).json({ error: "Wager must be an integer from 10 to 1000" });
    }
    if (prediction !== "over" && prediction !== "under") {
      return res.status(400).json({ error: "Prediction must be over or under" });
    }
    if (!Number.isInteger(target) || target < 2 || target > 98) {
      return res.status(400).json({ error: "Target must be an integer from 2 to 98" });
    }
    const { winChance, multiplier } = diceStats(target, prediction);
    if (winChance <= 0 || winChance >= 1) {
      return res.status(400).json({ error: "Target is outside a playable range" });
    }
    const roll = randomInt(1, 101);
    const won = prediction === "over" ? roll > target : roll < target;
    const creditReturn = won ? Math.max(wager, Math.floor(wager * multiplier)) : 0;
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
    await recordBet({
      userId: user.id,
      privyUserId: identity.privyUserId,
      game: "dice",
      wager,
      payout: delta,
      won,
      detail: { roll, target, prediction },
    });
    return res.json({
      roll, target, prediction, wager, won,
      multiplier: Number(multiplier.toFixed(4)),
      winChance: Number((winChance * 100).toFixed(2)),
      payout: delta,
      demoCredits: updated[0].demoCredits,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Dice play failed" });
  }
});

export default router;
