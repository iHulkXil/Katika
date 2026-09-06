import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  AuthConfigError,
  AuthError,
  authenticateRequest,
} from "../lib/privy-auth";

const router: IRouter = Router();
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

function playable(onChain: number, allocated: number) {
  return Math.max(0, onChain - allocated);
}

router.get("/wallet/me", async (req, res) => {
  try {
    await authenticateRequest(req);
    return res.json({
      walletAddress: null,
      onChainKchip: 0,
      allocatedKchip: 0,
      playableKchip: 0,
      profileComplete: false,
      chipContract: process.env.SEPOLIA_CHIP || process.env.VITE_SEPOLIA_CHIP || null,
      note: "Link a Sepolia address to read KCHIP",
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
    return res.json({
      walletAddress: address.toLowerCase(),
      onChainKchip: onChain,
      allocatedKchip: 0,
      playableKchip: playable(onChain, 0),
      profileComplete: false,
      chipContract: process.env.SEPOLIA_CHIP || process.env.VITE_SEPOLIA_CHIP || null,
      privyUserId: identity.privyUserId,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Wallet link failed" });
  }
});

export default router;
