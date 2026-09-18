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
const MULTIPLIER = 1.88; // 6 percent house edge: 2 * (1 - 0.06) = 1.88

router.post("/games/coinflip", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const wager = Number(req.body?.wager);
    const side = req.body?.side;

    const { db, legendsTable } = await import("@workspace/db");
    const user = await getOrCreateUser(identity.privyUserId);
    const cards = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, identity.privyUserId)).limit(1);
    const card = cards[0];
    const maxWager = maxWagerForPerk(card?.perkId);

    if (!Number.isInteger(wager) || wager < 1 || wager > maxWager) {
      return res.status(400).json({ error: `Wager must be an integer from 1 to ${maxWager} KTK` });
    }
    if (side !== "heads" && side !== "tails") {
      return res.status(400).json({ error: "Side must be heads or tails" });
    }

    const debit = await debitPlayable(user.id, identity.privyUserId, wager);
    if (!debit.success) {
      return res.status(400).json({ error: debit.error ?? "Not enough KTK" });
    }

    const result = randomInt(0, 2) === 0 ? "heads" : "tails";
    const won = result === side;
    const creditReturn = won ? Math.max(wager, Math.floor(wager * MULTIPLIER)) : 0;
    const delta = won ? creditReturn - wager : -wager;

    if (creditReturn > 0) {
      await creditBought(user.id, identity.privyUserId, creditReturn);
    }

    await recordBet({
      userId: user.id,
      privyUserId: identity.privyUserId,
      game: "coinflip",
      wager,
      payout: delta,
      won,
      detail: { result, side, houseEdge: HOUSE_EDGE },
    });

    const economy = await getKtkEconomy(identity.privyUserId);
    return res.json({
      result, side, wager, won, multiplier: MULTIPLIER, payout: delta, ...economy,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Coin flip failed" });
  }
});

export default router;
