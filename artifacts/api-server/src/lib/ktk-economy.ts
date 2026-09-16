import { eq, sql } from "drizzle-orm";
import { getMint } from "./mint-store";
import { maxWagerForPerk, perkLabel, RULESET } from "./perks";

export const KTK_GRANT = 600;
export const KTK_FIRST_CAP = 333;
export const KTK_ROLLOVER_X = 10;

export function ktkRolloverNeed() {
  return (KTK_GRANT - KTK_FIRST_CAP) * KTK_ROLLOVER_X;
}

export async function getKtkEconomy(privyUserId: string, demoCredits: number) {
  const { db, legendsTable, gameBetsTable } = await import("@workspace/db");
  const cards = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, privyUserId)).limit(1);
  const card = cards[0];
  const allocated = card
    ? card.pace + card.shooting + card.passing + card.dribbling + card.defending + card.physical
    : 0;
  const volumeRows = await db.select({
    volume: sql<number>`coalesce(sum(${gameBetsTable.wager}), 0)`,
  }).from(gameBetsTable).where(eq(gameBetsTable.privyUserId, privyUserId));
  const wagered = Number(volumeRows[0]?.volume ?? 0);
  const rolloverNeed = ktkRolloverNeed();
  const rolloverLeft = Math.max(0, rolloverNeed - wagered);
  const mint = getMint(privyUserId);
  return {
    ktk: demoCredits,
    demoCredits,
    allocated,
    wagered,
    rolloverNeed,
    rolloverLeft,
    unlocked: wagered >= rolloverNeed,
    profileComplete: Boolean(card?.profileComplete),
    token: "KTK",
    perkId: mint?.perkId ?? null,
    perkLabel: perkLabel(mint?.perkId),
    ruleset: mint?.ruleset ?? RULESET,
    maxWager: maxWagerForPerk(mint?.perkId),
    tokenId: mint?.tokenId ?? null,
  };
}
