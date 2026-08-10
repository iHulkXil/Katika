# Katika.Bet Architecture

## Sprint 1

Katika.Bet is currently a single React + Vite + TypeScript application. The frontend owns the landing page, responsive navigation, placeholder routes, reusable presentation components, and the visual language for the product.

The app uses client-side routing for:

- `/` — landing page
- `/dashboard` — dashboard foundation
- `/games` — game lobby placeholders
- `/wallet` — wallet placeholder
- `/rewards` — rewards placeholder
- `/leaderboard` — leaderboard placeholder
- `/profile` — profile placeholder

There is no authentication, wallet connection, wagering, game engine, financial functionality, or real account data in Sprint 1.

## Future integration boundary

Future backend functionality should be added behind the shared API service and typed API contracts. Database access should remain server-side, with the frontend consuming validated responses rather than connecting directly to PostgreSQL or a wallet provider.

Planned future services include authentication, demo-credit accounting, provably fair game outcomes, rewards, referrals, leaderboards, and administration. These are deliberately not implemented yet.
