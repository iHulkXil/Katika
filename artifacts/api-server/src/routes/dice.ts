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

function diceStats(target: number, prediction: "over" | "under") {
  const winOutcomes = prediction === "over" ? 100 - target : target - 1;
  const winChance = winOutcomes / 100;
  const multiplier = HOUSE_EDGE < 1 && winChance > 0 ? (1 - HOUSE_EDGE) / winChance : 0;
  return { winChance, multiplier };
}

router.post("/games/dice", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const wager = Number(req.body?.wager);
    const target = Number(req.body?.target);
    const prediction = req.body?.prediction;

    const { db, legendsTable } = await import("@workspace/db");
    const user = await getOrCreateUser(identity.privyUserId);
    const cards = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, identity.privyUserId)).limit(1);
    const card = cards[0];
    const maxWager = maxWagerForPerk(card?.perkId);

    if (!Number.isInteger(wager) || wager < 1 || wager > maxWager) {
      return res.status(400).json({ error: `Wager must be an integer from 1 to ${maxWager} KTK` });
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

    const debit = await debitPlayable(user.id, identity.privyUserId, wager);
    if (!debit.success) {
      return res.status(400).json({ error: debit.error ?? "Not enough KTK" });
    }

    const roll = randomInt(1, 101);
    const won = prediction === "over" ? roll > target : roll < target;
    const creditReturn = won ? Math.max(wager, Math.floor(wager * multiplier)) : 0;
    const delta = won ? creditReturn - wager : -wager;

    if (creditReturn > 0) {
      await creditBought(user.id, identity.privyUserId, creditReturn);
    }

    await recordBet({
      userId: user.id,
      privyUserId: identity.privyUserId,
      game: "dice",
      wager,
      payout: delta,
      won,
      detail: { roll, target, prediction, houseEdge: HOUSE_EDGE },
    });

    const economy = await getKtkEconomy(identity.privyUserId);
    return res.json({
      roll, target, prediction, wager, won,
      multiplier: Number(multiplier.toFixed(4)),
      winChance: Number((winChance * 100).toFixed(2)),
      payout: delta,
      ...economy,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Dice play failed" });
  }
});

export default router;
