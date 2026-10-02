import { Router, type IRouter } from "express";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";
import {
  creditBought,
  getKtkEconomy,
  getOrCreateUser,
} from "../lib/ktk-economy";
import { recordBet } from "../lib/record-bet";

const router: IRouter = Router();

// 100 Tap Points = 1 $KTK Token
export const SWAP_RATE_POINTS_PER_KTK = 100;
export const MIN_SWAP_POINTS = 100;

router.get("/tap/info", async (_req, res) => {
  return res.json({
    rate: SWAP_RATE_POINTS_PER_KTK,
    minSwap: MIN_SWAP_POINTS,
    currency: "KTK",
    tokenName: "Katika Points (KPTS)",
  });
});

router.post("/tap/swap", async (req, res) => {
  try {
    let privyUserId = "guest_telegram_user";
    try {
      const identity = await authenticateRequest(req);
      privyUserId = identity.privyUserId;
    } catch {
      // If Telegram user without Privy session, use telegram user id if passed
      if (req.body?.telegramId) {
        privyUserId = `tg_${req.body.telegramId}`;
      }
    }

    const points = Number(req.body?.points ?? 0);
    if (!Number.isFinite(points) || points < MIN_SWAP_POINTS) {
      return res.status(400).json({
        error: `Minimum swap amount is ${MIN_SWAP_POINTS} Points.`,
      });
    }

    const ktkEarned = Math.floor(points / SWAP_RATE_POINTS_PER_KTK);
    if (ktkEarned <= 0) {
      return res.status(400).json({ error: "Insufficient points to convert to at least 1 KTK." });
    }

    const user = await getOrCreateUser(privyUserId);
    const creditResult = await creditBought(user.id, privyUserId, ktkEarned);

    // Record the swap transaction in ledger history
    await recordBet({
      userId: user.id,
      privyUserId,
      game: "tap_swap",
      wager: points,
      payout: ktkEarned,
      won: true,
      detail: {
        type: "tap_points_swap",
        pointsSwapped: points,
        ktkCredited: ktkEarned,
        rate: SWAP_RATE_POINTS_PER_KTK,
      },
    }).catch(() => null);

    const economy = await getKtkEconomy(privyUserId);

    return res.json({
      success: true,
      pointsSwapped: points,
      ktkCredited: ktkEarned,
      newBought: creditResult.newBought,
      playable: creditResult.playable,
      message: `Successfully swapped ${points.toLocaleString()} Points for ${ktkEarned.toLocaleString()} $KTK!`,
      ...economy,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to swap points for KTK" });
  }
});

export default router;
