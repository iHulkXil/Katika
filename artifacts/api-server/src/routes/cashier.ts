import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
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

const router: IRouter = Router();

export interface CashierPackage {
  id: string;
  name: string;
  ktkAmount: number;
  priceUsdCents: number;
  popular?: boolean;
  bonus?: string;
}

export const CASHIER_PACKAGES: CashierPackage[] = [
  {
    id: "starter_500",
    name: "Starter Reserve",
    ktkAmount: 500,
    priceUsdCents: 500, // $5.00
  },
  {
    id: "pro_1200",
    name: "Pro Pack",
    ktkAmount: 1200,
    priceUsdCents: 1000, // $10.00 (20% bonus)
    popular: true,
    bonus: "+20% Free KTK",
  },
  {
    id: "champion_3000",
    name: "Champion Vault",
    ktkAmount: 3000,
    priceUsdCents: 2500, // $25.00 (20% bonus)
    bonus: "+20% Free KTK",
  },
];

// Lazy Stripe initialization as per environment constraints
let stripeClient: any = null;
async function getStripe() {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    const { default: Stripe } = await import("stripe");
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

router.get("/cashier/packages", async (_req, res) => {
  const feeMode = process.env.STRIPE_SECRET_KEY ? "stripe" : "ktk_standin";
  return res.json({
    packages: CASHIER_PACKAGES,
    feeMode,
  });
});

router.post("/cashier/checkout", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const packageId = String(req.body?.packageId ?? "");
    const pkg = CASHIER_PACKAGES.find((p) => p.id === packageId);

    if (!pkg) {
      return res.status(400).json({ error: "Invalid package selected" });
    }

    const { db, cashierOrdersTable } = await import("@workspace/db");
    const user = await getOrCreateUser(identity.privyUserId);
    const stripe = await getStripe();

    if (stripe) {
      // Live Stripe Checkout Session
      const origin = req.headers.origin || "http://localhost:3000";
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Katika Bet - ${pkg.name} (${pkg.ktkAmount} KTK)`,
                description: `Instant digital deposit into your Katika KTK Bought Wallet`,
              },
              unit_amount: pkg.priceUsdCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/cashier?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cashier?status=cancelled`,
        client_reference_id: identity.privyUserId,
        metadata: {
          packageId: pkg.id,
          ktkAmount: String(pkg.ktkAmount),
          userId: String(user.id),
        },
      });

      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await db.insert(cashierOrdersTable).values({
        id: orderId,
        userId: identity.privyUserId,
        packId: pkg.id,
        usdCents: pkg.priceUsdCents,
        ktk: pkg.ktkAmount,
        status: "pending",
        stripeSession: session.id,
      });

      return res.json({
        mode: "stripe",
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    }

    // Stand-in / Demo Mode: Instant credit to Bought Wallet
    await creditBought(user.id, identity.privyUserId, pkg.ktkAmount);

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const order = await db.insert(cashierOrdersTable).values({
      id: orderId,
      userId: identity.privyUserId,
      packId: pkg.id,
      usdCents: pkg.priceUsdCents,
      ktk: pkg.ktkAmount,
      status: "completed",
      stripeSession: `standin_${Date.now()}`,
    }).returning();

    const economy = await getKtkEconomy(identity.privyUserId);

    return res.json({
      mode: "ktk_standin",
      success: true,
      order: order[0],
      creditedKtk: pkg.ktkAmount,
      message: `Successfully credited ${pkg.ktkAmount} KTK to your bought wallet.`,
      ...economy,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Checkout initiation failed" });
  }
});

router.post("/cashier/webhook", async (req, res) => {
  const stripe = await getStripe();
  if (!stripe) {
    return res.status(400).json({ error: "Stripe not configured" });
  }

  const sig = req.headers["stripe-signature"];
  let event: any;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } else {
      event = req.body;
    }
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const privyUserId = session.client_reference_id;
    const ktkAmount = Number(session.metadata?.ktkAmount ?? 0);

    if (privyUserId && ktkAmount > 0) {
      const { db, cashierOrdersTable } = await import("@workspace/db");
      const user = await getOrCreateUser(privyUserId);

      // Credit purchased KTK directly to bought wallet
      await creditBought(user.id, privyUserId, ktkAmount);

      // Mark order completed
      if (session.id) {
        await db.update(cashierOrdersTable).set({
          status: "completed",
        }).where(eq(cashierOrdersTable.stripeSession, session.id));
      }
    }
  }

  return res.json({ received: true });
});

router.get("/cashier/orders", async (req, res) => {
  try {
    const identity = await authenticateRequest(req);
    const { db, cashierOrdersTable } = await import("@workspace/db");
    const rows = await db.select().from(cashierOrdersTable).where(
      eq(cashierOrdersTable.userId, identity.privyUserId),
    ).orderBy(desc(cashierOrdersTable.createdAt)).limit(20);

    const orders = rows.map((r) => ({
      id: r.id,
      packageId: r.packId,
      amountKtk: r.ktk,
      fiatAmountCents: r.usdCents,
      status: r.status,
      createdAt: r.createdAt,
    }));

    return res.json({ orders });
  } catch (error) {
    if (error instanceof AuthConfigError) return res.status(503).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    return res.status(500).json({ error: "Failed to fetch cashier orders" });
  }
});

export default router;
