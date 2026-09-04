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
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

router.post("/games/roulette", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: "Database is not configured" });
    const wager = Number(req.body?.wager);
    const bet = req.body?.bet;
    const number = Number(req.body?.number);
    if (!Number.isInteger(wager) || wager < 10 || wager > 1000) {
      return res.status(400).json({ error: "Wager must be an integer from 10 to 1000" });
    }
    const allowed = ["red", "black", "odd", "even", "number"];
    if (!allowed.includes(bet)) {
      return res.status(400).json({ error: "Bet must be red, black, odd, even, or number" });
    }
    if (bet === "number" && (!Number.isInteger(number) || number < 0 || number > 36)) {
      return res.status(400).json({ error: "Number must be 0-36" });
    }
    const roll = randomInt(0, 37);
    const color = roll === 0 ? "green" : RED.has(roll) ? "red" : "black";
    let won = false;
    let multiplier = 0;
    if (bet === "red") { won = color === "red"; multiplier = 1.98; }
    if (bet === "black") { won = color === "black"; multiplier = 1.98; }
    if (bet === "odd") { won = roll > 0 && roll % 2 === 1; multiplier = 1.98; }
    if (bet === "even") { won = roll > 0 && roll % 2 === 0; multiplier = 1.98; }
    if (bet === "number") { won = roll === number; multiplier = 35; }
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
      game: "roulette",
      wager,
      payout: delta,
      won,
      detail: { roll, color, bet, number: bet === "number" ? number : null },
    });
    return res.json({
      roll, color, bet, number: bet === "number" ? number : null, wager, won, multiplier, payout: delta,
      demoCredits: updated[0].demoCredits,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Roulette play failed" });
  }
});

export default router;
