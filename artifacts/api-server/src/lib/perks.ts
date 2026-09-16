export const RULESET = 1;
export const PERK_IDS = ["kit_prime", "table_skin", "stake_plus"] as const;
export type PerkId = (typeof PERK_IDS)[number];

export const BASE_MAX_WAGER = 50;
export const STAKE_PLUS_MAX_WAGER = 75;

export function isPerkId(value: unknown): value is PerkId {
  return PERK_IDS.includes(value as PerkId);
}

export function maxWagerForPerk(perkId?: string | null) {
  return perkId === "stake_plus" ? STAKE_PLUS_MAX_WAGER : BASE_MAX_WAGER;
}

export function perkLabel(perkId?: string | null) {
  if (perkId === "kit_prime") return "Prime kit";
  if (perkId === "table_skin") return "Table skin";
  if (perkId === "stake_plus") return "Stake +";
  return "None";
}
