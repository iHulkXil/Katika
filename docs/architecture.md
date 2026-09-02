# Katika.Bet Architecture

## Sprint 1

Katika.Bet is currently a React + Vite + TypeScript application. The frontend owns the landing page, responsive navigation, placeholder routes, reusable presentation components, and the visual language for the product.

The app uses client-side routing for:

- `/` — landing page
- `/dashboard` — dashboard foundation
- `/games` — game lobby placeholders
- `/wallet` — wallet connection
- `/rewards` — rewards placeholder
- `/leaderboard` — leaderboard placeholder
- `/profile` — profile / wallet identity

There is no wagering, game engine, financial functionality, or persisted account data in Sprint 1–2A.

## Sprint 2A — Privy wallet connection

Client-only wallet identity via `@privy-io/react-auth`.

- Provider lives in `artifacts/katika-bet/src/main.tsx`.
- Connect / disconnect UI lives in `artifacts/katika-bet/src/components/wallet-auth.tsx`.
- App ID is injected at build time from `PRIVY_APP_ID` or `VITE_PRIVY_APP_ID`.
- App Secret is not used and must not be added to the client.
- Session state is Privy's client session only. No user table yet.

## Future integration boundary

Future backend functionality should be added behind the shared API service and typed API contracts. Database access should remain server-side.

Sprint 2B is the first server identity step (verify Privy tokens, persist users). Do not start it until Postgres and `PRIVY_APP_SECRET` are available in host env.
