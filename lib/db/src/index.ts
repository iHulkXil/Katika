import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export * from "./schema";

let pool: any = null;
let db: any = null;

// In-memory fallback tables for preview/development when DATABASE_URL is not configured
const memoryUsers = new Map<string, any>();
const memoryLegends = new Map<string, any>();
const memoryBets: any[] = [];
const memoryMines = new Map<number, any>();
const memoryCashierOrders = new Map<string, any>();
const memoryClashes = new Map<string, any>();
const memoryHouseRakes: any[] = [];
let nextUserId = 1;
let nextBetId = 1;
let nextLegendId = 1;
let nextMinesId = 1;

function extractSqlValue(sqlObj: any): number | null {
  if (typeof sqlObj === "number") return sqlObj;
  if (!sqlObj?.queryChunks) return null;
  for (const chunk of sqlObj.queryChunks) {
    if (typeof chunk?.value === "number") return chunk.value;
    if (typeof chunk === "number") return chunk;
  }
  return null;
}

function extractFilterValues(filter: any): {
  privyUserId?: string;
  id?: any;
  settled?: boolean;
  minCredits?: number;
  mode?: string;
  state?: string;
  stake?: number;
} {
  const result: {
    privyUserId?: string;
    id?: any;
    settled?: boolean;
    minCredits?: number;
    mode?: string;
    state?: string;
    stake?: number;
  } = {};
  if (!filter) return result;

  // Single condition
  const colName = filter?.left?.name || filter?.left?.column?.name || filter?.column?.name || "";
  const val = filter?.right?.value ?? filter?.value;

  if (colName === "privy_user_id" || colName === "privyUserId") result.privyUserId = String(val);
  if (colName === "id") result.id = val;
  if (colName === "settled") result.settled = Boolean(val);
  if (colName === "demo_credits" || colName === "demoCredits") result.minCredits = Number(val);
  if (colName === "mode") result.mode = String(val);
  if (colName === "state") result.state = String(val);
  if (colName === "stake") result.stake = Number(val);

  // If compound condition (and / or)
  if (Array.isArray(filter?.queryChunks)) {
    for (const chunk of filter.queryChunks) {
      if (chunk && typeof chunk === "object") {
        const sub = extractFilterValues(chunk);
        Object.assign(result, sub);
      }
    }
  }
  return result;
}

function createMemoryDb() {
  return {
    select: (fields?: any) => {
      let targetTable: any = null;
      let whereFilter: any = null;
      let limitCount: number | null = null;

      const builder: any = {
        from: (tbl: any) => {
          targetTable = tbl;
          return builder;
        },
        where: (filter: any) => {
          whereFilter = filter;
          return builder;
        },
        limit: (n: number) => {
          limitCount = n;
          return builder;
        },
        orderBy: () => builder,
        then: (onFulfilled: any, onRejected: any) => {
          return Promise.resolve(executeSelect()).then(onFulfilled, onRejected);
        },
      };

      function executeSelect() {
        let results: any[] = [];
        const tableName = targetTable?._?.name || targetTable?.name || "";
        if (tableName === "users") {
          results = Array.from(memoryUsers.values());
        } else if (tableName === "legends") {
          results = Array.from(memoryLegends.values());
        } else if (tableName === "game_bets") {
          results = [...memoryBets].reverse();
        } else if (tableName === "mines_rounds") {
          results = Array.from(memoryMines.values());
        } else if (tableName === "cashier_orders") {
          results = Array.from(memoryCashierOrders.values()).reverse();
        } else if (tableName === "clashes") {
          results = Array.from(memoryClashes.values()).reverse();
        } else if (tableName === "house_rake") {
          results = [...memoryHouseRakes].reverse();
        }

        const filters = extractFilterValues(whereFilter);
        if (filters.privyUserId !== undefined) {
          results = results.filter((r) => r.privyUserId === filters.privyUserId);
        }
        if (filters.id !== undefined) {
          results = results.filter((r) => r.id === filters.id);
        }
        if (filters.settled !== undefined) {
          results = results.filter((r) => r.settled === filters.settled);
        }
        if (filters.state !== undefined) {
          results = results.filter((r) => r.state === filters.state);
        }
        if (filters.mode !== undefined) {
          results = results.filter((r) => r.mode === filters.mode);
        }
        if (filters.stake !== undefined) {
          results = results.filter((r) => r.stake === filters.stake);
        }

        if (fields && typeof fields === "object" && "volume" in fields) {
          const totalWager = results.reduce((acc, curr) => acc + (Number(curr.wager) || 0), 0);
          return [{ volume: totalWager }];
        }

        if (limitCount !== null) {
          results = results.slice(0, limitCount);
        }
        return results;
      }

      return builder;
    },
    insert: (tbl: any) => {
      let insertVals: any = null;
      const builder: any = {
        values: (v: any) => {
          insertVals = v;
          return builder;
        },
        returning: () => builder,
        then: (onFulfilled: any, onRejected: any) => {
          return Promise.resolve(executeInsert()).then(onFulfilled, onRejected);
        },
      };

      function executeInsert() {
        const tableName = tbl?._?.name || tbl?.name || "";
        const now = new Date();
        if (tableName === "users") {
          const id = nextUserId++;
          const row = {
            id,
            privyUserId: insertVals.privyUserId,
            demoCredits: insertVals.demoCredits ?? 600,
            ktkGrantedWallet: insertVals.ktkGrantedWallet ?? (insertVals.demoCredits ?? 600),
            ktkBoughtWallet: insertVals.ktkBoughtWallet ?? 0,
            clashSlotsUsed: insertVals.clashSlotsUsed ?? 0,
            clashSlotsDate: insertVals.clashSlotsDate || null,
            walletAddress: insertVals.walletAddress || null,
            onChainKchip: insertVals.onChainKchip ?? 0,
            createdAt: now,
            updatedAt: now,
          };
          memoryUsers.set(row.privyUserId, row);
          return [row];
        } else if (tableName === "legends") {
          const id = nextLegendId++;
          const row = {
            id,
            privyUserId: insertVals.privyUserId,
            name: insertVals.name || "K. Ronaldo",
            position: insertVals.position || "CAM",
            pace: insertVals.pace ?? 50,
            shooting: insertVals.shooting ?? 50,
            passing: insertVals.passing ?? 50,
            dribbling: insertVals.dribbling ?? 50,
            defending: insertVals.defending ?? 50,
            physical: insertVals.physical ?? 50,
            perkId: insertVals.perkId || null,
            ruleset: insertVals.ruleset ?? 1,
            tokenId: insertVals.tokenId || null,
            mint: insertVals.mint || null,
            allocatedTotal: insertVals.allocatedTotal ?? 0,
            allocatedFromGrant: insertVals.allocatedFromGrant ?? 0,
            allocatedFromBought: insertVals.allocatedFromBought ?? 0,
            rolloverBaseU0: insertVals.rolloverBaseU0 || null,
            rolloverTargetR: insertVals.rolloverTargetR || null,
            profileComplete: insertVals.profileComplete ?? false,
            createdAt: now,
            updatedAt: now,
          };
          memoryLegends.set(row.privyUserId, row);
          return [row];
        } else if (tableName === "game_bets") {
          const id = nextBetId++;
          const row = { id, ...insertVals, createdAt: now };
          memoryBets.push(row);
          return [row];
        } else if (tableName === "mines_rounds") {
          const id = nextMinesId++;
          const row = {
            id,
            ...insertVals,
            settled: insertVals.settled ?? false,
            createdAt: now,
            updatedAt: now,
          };
          memoryMines.set(id, row);
          return [row];
        } else if (tableName === "cashier_orders") {
          const row = { ...insertVals, createdAt: now };
          memoryCashierOrders.set(row.id, row);
          return [row];
        } else if (tableName === "clashes") {
          const row = { ...insertVals, createdAt: now };
          memoryClashes.set(row.id, row);
          return [row];
        } else if (tableName === "house_rake") {
          const row = { ...insertVals, createdAt: now };
          memoryHouseRakes.push(row);
          return [row];
        }
        return [insertVals];
      }

      return builder;
    },
    update: (tbl: any) => {
      let setVals: any = null;
      let whereFilter: any = null;

      const builder: any = {
        set: (v: any) => {
          setVals = v;
          return builder;
        },
        where: (filter: any) => {
          whereFilter = filter;
          return builder;
        },
        returning: () => builder,
        then: (onFulfilled: any, onRejected: any) => {
          return Promise.resolve(executeUpdate()).then(onFulfilled, onRejected);
        },
      };

      function executeUpdate() {
        const tableName = tbl?._?.name || tbl?.name || "";
        const now = new Date();
        const filters = extractFilterValues(whereFilter);

        if (tableName === "users") {
          let user: any = null;
          if (filters.privyUserId) {
            user = memoryUsers.get(filters.privyUserId);
          } else if (filters.id) {
            user = Array.from(memoryUsers.values()).find((u) => u.id === filters.id);
          } else {
            user = Array.from(memoryUsers.values())[0];
          }

          if (!user) return [];
          if (filters.minCredits !== undefined && user.demoCredits < filters.minCredits) {
            return [];
          }

          let newCredits = user.demoCredits;
          if (typeof setVals.demoCredits === "number") {
            newCredits = setVals.demoCredits;
          } else if (setVals.demoCredits) {
            const delta = extractSqlValue(setVals.demoCredits) ?? 0;
            newCredits = Math.max(0, user.demoCredits + delta);
          }

          const updated = {
            ...user,
            ...setVals,
            demoCredits: newCredits,
            updatedAt: now,
          };
          memoryUsers.set(updated.privyUserId, updated);
          return [updated];
        } else if (tableName === "legends") {
          let legend = filters.privyUserId
            ? memoryLegends.get(filters.privyUserId)
            : Array.from(memoryLegends.values())[0];
          if (!legend) return [];
          const updated = { ...legend, ...setVals, updatedAt: now };
          memoryLegends.set(updated.privyUserId, updated);
          return [updated];
        } else if (tableName === "mines_rounds") {
          let round = filters.id
            ? memoryMines.get(filters.id)
            : Array.from(memoryMines.values()).find((m) => !m.settled);
          if (!round) return [];
          const updated = { ...round, ...setVals, updatedAt: now };
          memoryMines.set(updated.id, updated);
          return [updated];
        } else if (tableName === "clashes") {
          let clash = filters.id ? memoryClashes.get(filters.id) : null;
          if (!clash) return [];
          const updated = { ...clash, ...setVals };
          memoryClashes.set(clash.id, updated);
          return [updated];
        } else if (tableName === "cashier_orders") {
          let order = filters.id ? memoryCashierOrders.get(filters.id) : null;
          if (!order) return [];
          const updated = { ...order, ...setVals };
          memoryCashierOrders.set(order.id, updated);
          return [updated];
        }
        return [];
      }

      return builder;
    },
  };
}

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 10,
    });
    pool.on("error", (err: Error) => {
      console.error("[DB] Unexpected error on idle client:", err);
    });
    db = drizzle(pool, { schema });
  } catch (err) {
    console.warn("[AI Studio] PostgreSQL connection failed, using in-memory mock store:", err);
    db = createMemoryDb();
  }
} else {
  console.warn("[AI Studio] DATABASE_URL not set — using in-memory mock store");
  db = createMemoryDb();
}

export { pool, db };
