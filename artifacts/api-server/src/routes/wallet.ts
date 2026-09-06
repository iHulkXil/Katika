import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";
import { allocatedFor, playableOf, syncPlayable } from "../lib/playable";

const router: IRouter = Router();
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

router.get("/wallet/me", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const { db, usersTable } = await import("@workspace/db");
    const users = await db.select().from(usersTable).where(eq(usersTable.privyUserId, identity.privyUserId)).limit(1);
    const user = users[0];
    const card = await allocatedFor(identity.privyUserId);
    const onChain = user?.onChainKchip ?? 0;
    return res.json({
      walletAddress: user?.walletAddress ?? null,
      onChainKchip: onChain,
      allocatedKchip: card.allocated,
      playableKchip: user?.demoCredits ?? playableOf(onChain, card.allocated),
      profileComplete: card.profileComplete,
      chipContract: process.env.SEPOLIA_CHIP || process.env.VITE_SEPOLIA_CHIP || null,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Wallet read failed" });
  }
});

router.post("/wallet/link", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const address = String((req.body as { address?: string })?.address ?? "").trim();
    if (!ADDRESS.test(address)) {
      return res.status(400).json({ error: "Use a Sepolia wallet address." });
    }
    let onChain = 0;
    try {
      const { readKchipBalance } = await import("../lib/kchip");
      onChain = await readKchipBalance(address.toLowerCase());
    } catch {
      onChain = 0;
    }
    const { db, usersTable } = await import("@workspace/db");
    await db.update(usersTable).set({
      walletAddress: address.toLowerCase(),
      updatedAt: new Date(),
    }).where(eq(usersTable.privyUserId, identity.privyUserId));
    const synced = await syncPlayable(identity.privyUserId, onChain);
    return res.json({
      walletAddress: address.toLowerCase(),
      onChainKchip: synced.onChain,
      allocatedKchip: synced.allocated,
      playableKchip: synced.playable,
      profileComplete: synced.profileComplete,
      chipContract: process.env.SEPOLIA_CHIP || process.env.VITE_SEPOLIA_CHIP || null,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Wallet link failed. Add wallet_address columns in Neon." });
  }
});

export default router;
