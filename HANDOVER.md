# Katika / Become A Legend — handover for the next AI

Repo: `iHulkXil/Katika` (public). ChromeOS local clone + live:
- API: Render `https://katika-w8bs.onrender.com`
- Web: Vercel (custom domain later; user disliked `*.vercel.app`)
- DB: Neon Postgres
- Auth: Privy
- Chain (testnet stamp only): Sepolia. KCHIP ERC-20 exists but **KTK is the visible token**. KCHIP stays hidden.

Read this file first. Then `SOFT_LAUNCH.md`. Then code.

---

## Product in one paragraph

User signs up → **600 KTK** grant. First legend card may lock **≤333** of that. Remaining grant must **10× rollover** (wager volume) before realloc / remint. Six FIFA stats (PAC SHO PAS DRI DEF PHY) are identity. One house perk on mint. Games debit **playable KTK only**, never card points. Licence is approved; tables are house games (dice, coinflip, mines, roulette), not a third-party aggregator.

---

## Economy (frozen unless the owner changes it)

| Rule | Value |
| --- | --- |
| Grant | 600 KTK |
| First-legend cap | 333 |
| Rollover | 10× on (600-333) = **2670** wager volume |
| Base max wager | 50 |
| Stake+ max wager | 75 |
| Mint / remint price | **$1**. Live stand-in = **10 playable KTK** |
| Remint gate | rollover complete |
| Stats | keep all 6 |
| Perks | exactly one: `kit_prime` \| `table_skin` \| `stake_plus` |
| Ruleset | `1` (house may retune perks without changing stats) |

---

## Neon columns on `legends` (already run)

```sql
ALTER TABLE legends ADD COLUMN IF NOT EXISTS perk_id text;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS ruleset integer NOT NULL DEFAULT 1;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS token_id integer;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS mint jsonb;
```

---

## Vercel deploy (2026-09-17)

Symptom: `ERR_INVALID_THIS` / `ERR_PNPM_META_FETCH_FAIL` / `Value of "this" must be of type URLSearchParams` on every `registry.npmjs.org` GET. Install command `pnpm install --no-frozen-lockfile` exits 1. **Not an app bug.** Vercel Node + pnpm fetch binding mismatch (often Node 22/24 + pnpm 10).

Fix committed:
- `package.json` → `"packageManager": "pnpm@9.15.9"`, `"engines": { "node": "20.x" }`
- `.nvmrc` → `20`
- `.npmrc` → registry + long timeout + `frozen-lockfile=false`
- `vercel.json` install: `corepack enable && corepack prepare pnpm@9.15.9 --activate && pnpm install --no-frozen-lockfile`

Owner must also set in Vercel project Settings:
1. **Node.js Version = 20.x**
2. Env `ENABLE_EXPERIMENTAL_COREPACK=1`
3. Redeploy from latest `main` (do not retry the failed build; it is on old install command)

Output directory stays `artifacts/katika-bet/dist/public`.

---

## What is already built / not done

See previous cuts. Still open: WagerRow on dice/flip/roulette; Stripe checkout route; real ERC-721; custom domain.

## Owner preferences

KTK not KCHIP in UI. Keep 6 stats. Update this file after every build.
