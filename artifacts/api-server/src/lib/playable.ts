import { eq } from "drizzle-orm";

export function playableOf(onChain: number, allocated: number) {
  return Math.max(0, Math.floor(onChain) - Math.floor(allocated));
}

export async function allocatedFor(privyUserId: string) {
  const { db, legendsTable } = await import("@workspace/db");
  const rows = await db.select().from(legendsTable).where(eq(legendsTable.privyUserId, privyUserId)).limit(1);
  const row = rows[0];
  if (!row) return { allocated: 0, profileComplete: false };
  return {
    allocated: row.pace + row.shooting + row.passing + row.dribbling + row.defending + row.physical,
    profileComplete: row.profileComplete,
  };
}

export async function syncPlayable(privyUserId: string, onChain: number) {
  const { db, usersTable } = await import("@workspace/db");
  const card = await allocatedFor(privyUserId);
  const playable = playableOf(onChain, card.allocated);
  await db.update(usersTable).set({
    onChainKchip: Math.floor(onChain),
    demoCredits: playable,
    updatedAt: new Date(),
  }).where(eq(usersTable.privyUserId, privyUserId));
  return { ...card, onChain, playable };
}
