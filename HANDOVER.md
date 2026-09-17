# Katika / Become A Legend — handover for the next AI

Repo: `iHulkXil/Katika`.
- API: Render `https://katika-w8bs.onrender.com`
- Web: Vercel (frontend only). Do not deploy API on the `katika-api-server` Vercel project.
- DB: Neon. Auth: Privy. Visible token: **KTK**. Hide KCHIP.

Read order: this file → `ECONOMY_SPEC.md` → `SOFT_LAUNCH.md` → code.

## Product

Sign up → 600 grant → first card ≤333 → 10× rollover on leftover grant → house tables + P2P Clash. Six FIFA stats. One perk. Licence approved.

## Economy freeze

See **`ECONOMY_SPEC.md`** (2026-09-17). That file is the build spec for cashier, two-ledger KTK, attribute logic, and Clash resolve. Do not invent extra tokens or house RTP modifiers.

Short version:
- Playable = granted_wallet + bought_wallet (allocated already removed from wallets).
- Debit bought first; wins credit bought.
- House games ignore stats. Clash is the only stat resolver.
- Cashier packs $5/10/20 = 500/1000/2000 KTK.
- Clash rake 4% of pot. Type triangle + same-lane higher stat.

## Neon reminders (owner must run after a wipe)

```sql
ALTER TABLE legends ADD COLUMN IF NOT EXISTS perk_id text;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS ruleset integer NOT NULL DEFAULT 1;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS token_id integer;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS mint jsonb;
```

New columns for the economy spec are listed in `ECONOMY_SPEC.md` §8.

## Vercel (working as of 2026-09-17)

- Node 20.x
- Install: `npx --yes pnpm@9.15.9 install --filter @workspace/katika-bet... --no-frozen-lockfile`
- Build: `npx --yes pnpm@9.15.9 --filter @workspace/katika-bet run build`
- Output: `artifacts/katika-bet/dist/public`
- `pnpm-workspace.yaml` required. `workspace:*` for local packages.
- Dashboard Install Command must match vercel.json or overrides win.

## Owner preferences

KTK not KCHIP in UI. Keep 6 stats. Update this file and `ECONOMY_SPEC.md` after every design cut.
