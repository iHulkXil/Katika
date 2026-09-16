import { RULESET, type PerkId } from "./perks";

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

export function setMint(privyUserId: string, record: MintRecord) {
  mintStore.set(privyUserId, record);
  return record;
}

export const CURRENT_RULESET = RULESET;
