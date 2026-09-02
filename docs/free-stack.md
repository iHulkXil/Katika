# Zero-dollar path off Replit

Build locally or in this chat. Host the site on free tiers. Pay only when traffic or Sprint 2B outgrows them.

## Now ($0)

| Need | Free option |
|---|---|
| Source | GitHub (already) |
| Editor | VS Code / Cursor on your machine, or GitHub Codespaces free quota |
| Public site | Vercel Hobby or Cloudflare Pages |
| Wallet login | Privy App ID (already have). Keep App Secret off the client |
| API / database | Skip until Sprint 2B. Health-check API is not required for the current UI |

Do not use another credit-based builder.

## Later (still start free, then pay)

| Need | Start free | Paid when |
|---|---|---|
| Postgres | Neon free | Sprint 2B user table + demo credits |
| API process | Vercel serverless or Render/Railway free/low | When Express must stay up 24/7 |
| Custom domain | Cloudflare / Namecheap later | When you want katika.bet live |

## Vercel (frontend) — do this once

1. Sign in at https://vercel.com with GitHub `iHulkXil`.
2. Import `iHulkXil/Katika`.
3. Leave Root Directory as the repo root.
4. `vercel.json` already sets install / build / output.
5. Env: `PRIVY_APP_ID` = `cmske7xuh00750djms91aexl3` (and optionally `VITE_PRIVY_APP_ID` same value).
6. Deploy.
7. In Privy dashboard, add `https://<your-app>.vercel.app` to allowed origins.

## Local ($0)

```bash
git clone https://github.com/iHulkXil/Katika.git
cd Katika
cp .env.example .env
pnpm install
pnpm --filter @workspace/katika-bet run dev
```

Note: this workspace currently pins esbuild to Replit's linux-x64. Local install on Mac/Windows may need that override relaxed later. Vercel builds on Linux, so hosting should still work.

## Not in this step

- Deleting `.replit` files (harmless if unused)
- Sprint 2B server auth
- Demo credits, games, Stripe
