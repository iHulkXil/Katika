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

Code constants: `lib/db/src/schema/index.ts`, `artifacts/api-server/src/lib/ktk-economy.ts`, `artifacts/api-server/src/lib/perks.ts`.

---

## Layout

Monorepo, pnpm.

- `artifacts/katika-bet` — Vite React frontend (Wouter, Privy, Tailwind)
- `artifacts/api-server` — Express API
- `lib/db` — Drizzle schema + Neon
- `artifacts/become-a-legend` — older BAL app; **Katika is the merged home**. Do not split repos.

Frontend `/api/*` proxies to Render (`vercel.json`).

---

## Neon columns that must exist on `legends`

Owner said these have been run. Re-run only after a branch wipe:

```sql
ALTER TABLE legends ADD COLUMN IF NOT EXISTS perk_id text;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS ruleset integer NOT NULL DEFAULT 1;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS token_id integer;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS mint jsonb;
```

Users table still uses `demo_credits` as the **KTK floor stack**. Do not surface the column name in UI. UI word is KTK.

---

## What is already built (do not redo)

- Privy email / Google auth; user row + 600 grant on first `/api/me`
- Legend create/save with 333 cap + rollover realloc gate
- Four games + bet log (`game_bets`) driving rollover
- FIFA-style card + CSS 3D avatar + WebGL-ish stage CSS (`game-motion.css`, stage height 228px)
- Perk catalog + fake Sepolia mint stamp + persist to `legends.mint`
- `setMint` writes Neon; `/api/me` hydrates perk / maxWager / tokenId
- API wager cap on dice, flip, mines start, roulette
- `WagerRow` on **mines only**
- Mint modal: pick perk, button “Pay $1 · 10 KTK”
- `chargeMintFee` debits 10 KTK
- `/api/me` also returns `feeUsd`, `feeKtk`, `feeMode` (`ktk` or `stripe`), `stripeReady`
- Deploy lockfile / Vercel output-dir / JSX template-literal issues already fixed historically

---

## What is NOT done

- `WagerRow` not yet on dice, coinflip, roulette (API still enforces cap)
- Stripe Checkout not implemented — only the switch: if Render has `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID`, `feeMode` becomes `stripe`. No session create route yet.
- Mint is **not** a real ERC-721. Contract address in code is a stamp. Tx hashes are synthetic.
- In-memory `mintStore` is a cache; source of truth is Neon `legends.mint` after ALTER.
- No custom domain. No mainnet token spend. KCHIP on-chain balance is hidden on purpose.
- Leaderboard was slimmed in a later mint-fee commit — restore volume/OVR sort if owner cares.

---

## How to run locally (ChromeOS)

Project path the owner uses: `/home/xilux/projects/Katika`
API port **5000**, Vite **5174** (5173 has been a blank-page trap).
Env file is edited by hand (sometimes named `new.env`). Do not assume `.env` exists in `artifacts/katika-bet`.

If `EADDRINUSE :::5000`, kill the old API before start.

---

## Env (Render API)

Minimum:
- `DATABASE_URL` (Neon)
- Privy app + secret (existing; app id historically `cmske7xuh00750djms91aexl3`)
- Sepolia RPC / chip address only if touching hidden KCHIP helpers

Optional $1 rails:
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID` (one-time $1)
- `PUBLIC_APP_URL`

---

## Build log (newest first)

### 2026-09-16 — persist + caps + $1 stand-in + handover
- Added `perk_id`, `ruleset`, `token_id`, `mint` on legends schema.
- `mint-store` hydrates from Neon; `setMint` write-through.
- Perk max wager on all four game **routes**.
- Stage CSS height 228px.
- `WagerRow` + `wager-cap.ts`; mines wired.
- Rollover strip shows max wager + perk.
- Mint fee 10 KTK (`charge-mint.ts`). Modal copy $1.
- `/api/me` fee mode for future Stripe.
- `SOFT_LAUNCH.md`, this `HANDOVER.md`.

### Earlier (same project, other chats)
- Left Replit → GitHub → ChromeOS + Render/Vercel.
- Demo credits killed; KTK grant 600 / cap 333 / 10×.
- BAL merged into Katika (`/play` lock, legend card as home identity).
- Sepolia chip + vault deployed; then hidden so only KTK shows.
- Visual pass: shaders/CSS felt, 3D avatar, game stages.
- Economy design freeze: 6 stats + 1 live-patch perk, $1 remint same token.

---

## Next cuts (owner said “do all”; still open)

1. Swap dice / flip / roulette inputs to `WagerRow`.
2. `POST /api/mint/checkout` when Stripe keys exist; mint only after paid session.
3. Real ERC-721 payable mint on mainnet when treasury is ready.
4. Restore full leaderboard if the slim version is a problem.
5. Custom domain when there is budget.

---

## Owner preferences (do not fight)

- Visible token name is **KTK**, never KCHIP in UI.
- Locked / playable language: card points locked; floor stack playable; rollover leftover is “to wager”, not “unlocked KTK” on the wager chip.
- Keep 6 stats.
- Cheap / zero-dollar path first; Stripe is optional.
- Another AI will continue — update **this file** at the end of every build.
