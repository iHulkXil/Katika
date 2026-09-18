import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { randomInt } from "node:crypto";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";
import { recordBet } from "../lib/record-bet";
import {
  creditBought,
  debitPlayable,
  getKtkEconomy,
  getOrCreateUser,
  maxWagerForPerk,
  HOUSE_EDGE,
} from "../lib/ktk-economy";

const router: IRouter = Router();
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

// 6 percent house edge:
// RTP = 0.94.
// For red/black/odd/even (18/37): multiplier = 0.94 / (18/37) = 1.9322
// For single number (1/37): multiplier = 0.94 / (1/37) = 34.78
const EVEN_MULTIPLIER = 1.9322;
const NUMBER_MULTIPLIER = 34.78;

router.post("/games/roulette", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const wager = Number(req.body?.wager);
    const bet = req.body?.bet;
    const number = Number(req.body?.number);

    const { db, legendsTable } = await import("@workspace/db");
    const user = await getOrCreateUser(identity.privyUserId);
    const cards = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, identity.privyUserId)).limit(1);
    const card = cards[0];
    const maxWager = maxWagerForPerk(card?.perkId);

    if (!Number.isInteger(wager) || wager < 1 || wager > maxWager) {
      return res.status(400).json({ error: `Wager must be an integer from 1 to ${maxWager} KTK` });
    }
    const allowed = ["red", "black", "odd", "even", "number"];
    if (!allowed.includes(bet)) {
      return res.status(400).json({ error: "Bet must be red, black, odd, even, or number" });
    }
    if (bet === "number" && (!Number.isInteger(number) || number < 0 || number > 36)) {
      return res.status(400).json({ error: "Number must be 0-36" });
    }

    const debit = await debitPlayable(user.id, identity.privyUserId, wager);
    if (!debit.success) {
      return res.status(400).json({ error: debit.error ?? "Not enough KTK" });
    }

    const roll = randomInt(0, 37);
    const color = roll === 0 ? "green" : RED.has(roll) ? "red" : "black";
    let won = false;
    let multiplier = 0;
    if (bet === "red") { won = color === "red"; multiplier = EVEN_MULTIPLIER; }
    if (bet === "black") { won = color === "black"; multiplier = EVEN_MULTIPLIER; }
    if (bet === "odd") { won = roll > 0 && roll % 2 === 1; multiplier = EVEN_MULTIPLIER; }
    if (bet === "even") { won = roll > 0 && roll % 2 === 0; multiplier = EVEN_MULTIPLIER; }
    if (bet === "number") { won = roll === number; multiplier = NUMBER_MULTIPLIER; }

    const creditReturn = won ? Math.max(wager, Math.floor(wager * multiplier)) : 0;
    const delta = won ? creditReturn - wager : -wager;

    if (creditReturn > 0) {
      await creditBought(user.id, identity.privyUserId, creditReturn);
    }

    await recordBet({
      userId: user.id,
      privyUserId: identity.privyUserId,
      game: "roulette",
      wager,
      payout: delta,
      won,
      detail: { roll, color, bet, number: bet === "number" ? number : null, houseEdge: HOUSE_EDGE },
    });

    const economy = await getKtkEconomy(identity.privyUserId);
    return res.json({
      roll, color, bet, number: bet === "number" ? number : null, wager, won,
      multiplier: Number(multiplier.toFixed(4)),
      payout: delta,
      ...economy,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Roulette play failed" });
  }
});

export default router;
