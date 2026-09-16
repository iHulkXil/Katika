import { and, eq, gte, sql } from "drizzle-orm";
import { MINT_FEE_KTK } from "./perks";

export async function chargeMintFee(privyUserId: string) {
  const { db, usersTable } = await import("@workspace/db");
  const updated = await db.update(usersTable).set({
    demoCredits: sql`${usersTable.demoCredits} - ${MINT_FEE_KTK}`,
    updatedAt: new Date(),
  }).where(and(
    eq(usersTable.privyUserId, privyUserId),
    gte(usersTable.demoCredits, MINT_FEE_KTK),
  )).returning();
  if (!updated[0]) {
    throw new Error(`Need ${MINT_FEE_KTK} KTK to mint ($1 stand-in until card rails).`);
  }
  return updated[0].demoCredits;
}
