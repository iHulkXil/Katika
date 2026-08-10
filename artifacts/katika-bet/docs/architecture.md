# Katika.Bet frontend architecture

## Sprint 1

Katika.Bet is a client-side React + Vite single-page foundation. Wouter owns route matching and navigation; the shared `Shell` provides the responsive desktop header and mobile bottom navigation for product routes. The landing route intentionally has a focused marketing shell.

The current app is presentation-only. There are no API calls, authentication flows, wallet providers, game engines, wagering paths, balances, credits, or player records. Shared visual primitives live in `src/App.tsx` because the initial surface is small: `Brand`, `ButtonLink`, `GameCard`, `PageIntro`, `StatCard`, and `Placeholder`. They should be split into files when behavior or reuse grows.

## Visual system

The visual direction is **quiet frontier**: charcoal surfaces, emerald primary, warm gold secondary, Space Grotesk display/body type, and DM Mono for system labels. Motion is limited to hover transforms, opacity reveal, and focus states. Responsive behavior is mobile-first with a fixed bottom nav under the desktop breakpoint.

## Future boundary

Future API integration should be introduced behind resource hooks, with explicit loading, error, empty, and permission states. Wallet connection should be isolated behind a provider adapter so the UI remains testable without a provider.