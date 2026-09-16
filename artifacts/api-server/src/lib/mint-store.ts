import { eq } from "drizzle-orm";
import { RULESET, isPerkId, type PerkId } from "./perks";

export type MintRecord = {
  tokenId: number;
  contractAddress: string;
  txHash: string;
  blockNumber: number;
  mintedAt: string;
  chain: string;
  chainId: number;
  tokenUri: string;
  perkId: PerkId;
  ruleset: number;
  snapshot: {
    name: string;
    position: string;
    overall: number;
    stats: {
      pace: number;
      shooting: number;
      passing: number;
      dribbling: number;
      defending: number;
      physical: number;
    };
    allocatedKtk: number;
    avatarSeed: string;
  };
};

export const mintStore = new Map<string, MintRecord>();

export function getMint(privyUserId: string) {
  return mintStore.get(privyUserId) ?? null;
}

export function hydrateMint(privyUserId: string, row?: {
  perkId?: string | null;
  ruleset?: number | null;
  tokenId?: number | null;
  mint?: unknown;
} | null) {
  if (!row) return getMint(privyUserId);
  const stored = row.mint as MintRecord | null;
  if (stored && stored.tokenId && isPerkId(stored.perkId)) {
    mintStore.set(privyUserId, stored);
    return stored;
  }
  return getMint(privyUserId);
}

export function setMint(privyUserId: string, record: MintRecord) {
  mintStore.set(privyUserId, record);
  return record;
}

export async function persistMint(privyUserId: string, record: MintRecord) {
  setMint(privyUserId, record);
  try {
    const { db, legendsTable } = await import("@workspace/db");
    await db.update(legendsTable).set({
      perkId: record.perkId,
      ruleset: record.ruleset,
      tokenId: record.tokenId,
      mint: record,
      updatedAt: new Date(),
    }).where(eq(legendsTable.privyUserId, privyUserId));
  } catch {
    /* columns missing until Neon ALTER */
  }
  return record;
}

export const CURRENT_RULESET = RULESET;
