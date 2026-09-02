# Sprint 2B report

Code/configuration validated. Live Privy server authentication was not validated (no PRIVY_APP_SECRET in this environment). Typecheck/build were not run here (no workspace install).

## What shipped

- Server utility `artifacts/api-server/src/lib/privy-auth.ts` verifies Bearer or `privy-token` cookies with `@privy-io/node` `privy.utils().auth().verifyAuthToken`.
- `GET /api/me` returns 401 without a token, 503 if Privy secret or database is missing when invoked, otherwise upserts `users` by verified `privy_user_id`.
- Table `users` (`id serial`, unique `privy_user_id`, timestamps).
- Client `ServerSessionSync` calls `/api/me` only when Privy reports authenticated.

## Manual setup

1. Set server env `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `DATABASE_URL`.
2. `pnpm --filter @workspace/db run push`
3. Run API on port 5000 (`PORT=5000 pnpm --filter @workspace/api-server run dev`).
4. Frontend proxies `/api` to that origin in Vite.

Sprint 3 is not started.
