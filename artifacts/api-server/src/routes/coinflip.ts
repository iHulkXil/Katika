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
const MULTIPLIER = 1.98;

router.post("/games/coinflip", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Database is not configured" });
    const wager = Number(req.body?.wager);
    const side = req.body?.side;
    if (!Number.isInteger(wager) || wager < 10 || wager > 1000) {
      return res.status(400).json({ error: "Wager must be an integer from 10 to 1000" });
    }
    if (side !== "heads" && side !== "tails") {
      return res.status(400).json({ error: "Side must be heads or tails" });
    }
    const result = randomInt(0, 2) === 0 ? "heads" : "tails";
    const won = result === side;
    const creditReturn = won ? Math.max(wager, Math.floor(wager * MULTIPLIER)) : 0;
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
      game: "coinflip",
      wager,
      payout: delta,
      won,
      detail: { result, side },
    });
    return res.json({
      result, side, wager, won, multiplier: MULTIPLIER, payout: delta, demoCredits: updated[0].demoCredits,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Coin flip failed" });
  }
});

export default router;
