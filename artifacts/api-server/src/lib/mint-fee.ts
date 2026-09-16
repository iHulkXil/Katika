import { MINT_FEE_KTK, MINT_FEE_USD } from "./perks";

export function mintFeeState() {
  const stripe = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
  return {
    feeUsd: MINT_FEE_USD,
    feeKtk: MINT_FEE_KTK,
    feeMode: stripe ? "stripe" : "ktk",
    stripeReady: stripe,
  };
}
