# Sprint 2A report

1. Privy SDK: `@privy-io/react-auth` `^3.37.0` (already in package.json).
2. Files changed:
   - `artifacts/katika-bet/vite.config.ts`
   - `artifacts/katika-bet/src/main.tsx`
   - `artifacts/katika-bet/src/components/wallet-auth.tsx`
   - `.env.example`
   - `docs/architecture.md`
   - `docs/sprint-2a.md`
3. Environment variable: `PRIVY_APP_ID` or `VITE_PRIVY_APP_ID`.
4. Wallet connection: Connect uses Privy `login()` for first-time auth and `connectWallet()` if already authenticated without an address. Disconnect uses Privy `logout()`.
5. Build: not run in this environment. On Replit or local: `pnpm --filter @workspace/katika-bet run build`.
6. Tests performed: static review of provider boot, missing-ID guard, and login vs connectWallet paths.
7. Warnings: Vite previously required Replit `PORT` / `BASE_PATH`; those now default to `5173` and `/`.
8. Manual setup: In Replit, set Secret `PRIVY_APP_ID=cmske7xuh00750djms91aexl3`. In the Privy dashboard, allow your Replit and production origins. Do not add `PRIVY_APP_SECRET` to the frontend.

Sprint 2B is not started.
