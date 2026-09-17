# Katika economy + Clash — implementation spec

Read `HANDOVER.md` first. This file is the design freeze for **cashier**, **two-ledger KTK**, **how the six stats work**, and **P2P Legend Clash**. Do not invent extra tokens, extra stats, or house-game RTP modifiers.

Owner: iHulkXil. Repo: iHulkXil/Katika.
API: Render `https://katika-w8bs.onrender.com`
Web: Vercel frontend. DB: Neon. Auth: Privy.
Visible unit: **KTK**. Hidden unit: KCHIP (do not show).

---

## 0. Invariants (do not break)

1. UI shows **one** KTK number to the player.
2. Engine tracks **two** piles: `granted` and `bought`.
3. House tables (dice, coinflip, mines, roulette) **never** read PAC/SHO/PAS/DRI/DEF/PHY for odds, payout, or mine density. Those games only read `maxWager` from perk.
4. Stats only resolve inside **Clash**.
5. Card points are **allocated KTK**, not spendable on tables. Games debit **playable** only.
6. First-save cap remains **333**. Grant remains **600**. Rollover remains **10× on unallocated grant only**.
7. Mint / remint is **$1** when Stripe exists. Until then keep the 10 KTK stand-in. When cashier ships, stop taking 10 KTK as “$1” — use Stripe.
8. Perk catalog stays three ids: `kit_prime`, `table_skin`, `stake_plus`. Only `stake_plus` changes a number: max wager 50 → 75. No perk changes RTP.
9. Clash rake is **4% of the combined pot**. Not 4% of one stake.
10. No withdrawals in this cut.

---

## 1. Balances — exact definitions

Let:

- `G` = remaining **granted** KTK (starts 600 on first `/api/me`).
- `B` = **bought** KTK (starts 0).
- `A` = **allocated** = sum of the six legend stats (0 if no card).
- `V` = lifetime **wager volume** that counts for rollover (sum of `game_bets.stake` for this user, including Clash stakes).
- `U0` = grant leftover at first card save = `max(0, 600 - A_first)`.
  If they never saved a card, treat `U0 = 600` for display only; realloc/remint still gated.
- Rollover target `R = 10 * U0`.
  After first save with `A = 333`, `U0 = 267`, `R = 2670`.
  If they save with `A = 200`, `U0 = 400`, `R = 4000`.
  Store `U0` and `R` on the user or legend row at **first successful save**. Do not recompute from current `A` later or realloc will move the goalposts.

### Playable (what tables and Clash may debit)

```
playable = max(0, G + B - A)
```

Allocated points sit in the card. They are not cash.

### Display (one number)

```
ktk = playable          // label: KTK
lockedCard = A          // label: on card
maxWager = perk == stake_plus ? 75 : 50
```

Rollover strip:

```
rolloverLeft = max(0, R - V)
lockedGrant = leftover grant still under rollover
```

Language already chosen by owner: the wager chip on /play is **Locked KTK** meaning “still to wager for rollover”, not “unlocked”. Keep that. Do not show two KCHIP rows.

### Spend order

When a debit `S` happens (table bet, Clash stake, mint stand-in if still on):

1. Debit `min(S, spendable_bought)` from `B` first, where
   `spendable_bought = B` (bought is never allocated; allocation always burns grant first — see §2).
2. Rest from `G`.
3. Reject if `S > playable`.

When a credit `C` happens (win, Clash payout):

- Credit **bought** (`B += C`) always.
- Wins are treated as purchased-equivalent so they are not trapped by grant rollover.

Rationale: grant is the tutorial leash. Cash and winnings should feel free.

### Volume `V`

Add `S` (the stake, not the payout) to `V` for:

- every resolved house bet
- every Clash stake that actually locks (both players committed)

Do not add rake. Do not add payout. Cancelled Clash adds 0.

---

## 2. Allocation (legend save)

Six ints: `pac, sho, pas, dri, def, phy`.
Each in **1..99**. Sum `A`.

### First save

- Require `A <= 333`.
- Persist `U0 = 600 - A`, `R = 10 * U0`, `grant_rollover_frozen = true`.
- Allocation spends **grant first**:
  - `from_grant = min(A, G)`
  - if `A > G` reject (should not happen on first save if G is 600).
- `G` does not decrease by `A` in the cash column. `A` is a reservation.
  Implementation: keep `G` as the grant wallet including reserved points
  **or** store `G_cash = G - A_from_grant`. Pick one and use it everywhere.

Recommended implementation (clearer):

```
users.ktk_granted_wallet   // cash grant, not on card
users.ktk_bought_wallet
legends.allocated_total    // A
legends.allocated_from_grant
legends.allocated_from_bought   // 0 on first save under this spec
legends.rollover_base_u0
legends.rollover_target_r
```

On first save:

```
assert A <= 333
assert A <= ktk_granted_wallet
ktk_granted_wallet -= A
allocated_from_grant = A
allocated_from_bought = 0
rollover_base_u0 = ktk_granted_wallet   // what remains after lock
rollover_target_r = 10 * rollover_base_u0
```

Then `playable = ktk_granted_wallet + ktk_bought_wallet`.

### Later realloc (respec)

Allowed only if `V >= rollover_target_r`.

```
refund allocated_from_grant into ktk_granted_wallet
refund allocated_from_bought into ktk_bought_wallet
then apply new A with same spend order: grant first, then bought
first-save cap 333 does NOT apply on realloc
still each stat 1..99
optional house cap: A <= playable + old A (you cannot lock more than you own)
```

Do not reset `rollover_target_r`.

### Mint / remint

- Requires a saved card.
- Remint requires `V >= rollover_target_r`.
- Does **not** change stats.
- Sets `perk_id`, `ruleset`, `token_id` (same token on remint), `mint` jsonb.
- Fee: Stripe $1 when `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID` set; else 10 playable KTK stand-in (current code).
- After cashier is live, refuse the KTK stand-in in production.

---

## 3. Cashier

### Packs (fixed)

| id | usd_cents | ktk |
| --- | --- | --- |
| mini | 500 | 500 |
| standard | 1000 | 1000 |
| stack | 2000 | 2000 |

Rate: **100 KTK per $1**. Do not make it configurable in v1.

### Flow

`POST /api/cashier/checkout { packId }`

- Auth required.
- Create Stripe Checkout session, mode payment, success_url / cancel_url from `PUBLIC_APP_URL`.
- Metadata: `userId`, `packId`, `ktk`.
- Webhook `checkout.session.completed`:
  - idempotent on `session.id`
  - `ktk_bought_wallet += pack.ktk`
  - write `cashier_orders` row: user, pack, usd, ktk, stripe_id, status

If Stripe keys missing: return 501 with `{ error: "cashier_not_live" }`. Do not fake-credit bought KTK in production.

Bought KTK:

- no rollover
- can be staked immediately
- can be allocated on **realloc** (not needed on first save if grant covers 333)

### Display

One KTK figure. Optional tooltip: “Includes purchased”. Never show “granted vs bought” as two big balances (owner already rejected dual KCHIP rows).

---

## 4. House tables vs card

Files today: dice / coinflip / mines / roulette routes + pages.

On every wager:

```
S = requested stake
assert 1 <= S <= maxWager(perk)
assert S <= playable
debit spend order (§1)
V += S
resolve game with EXISTING odds
credit wins into ktk_bought_wallet
```

**Forbidden:** multiply payout by SHO, fewer mines by DRI, extra wheel slots by PAC, etc.

`WagerRow` should be on all four pages (mines already). Cap from `/api/me.maxWager`.

---

## 5. The six stats — design logic

Stats are a **loadout for Clash**, not a hidden EV slider.

Each stat is an integer 1–99. Average first card ≈ 333/6 = 55.5. A 99 costs the rest of the card. That is the puzzle.

### PAC — tempo

Higher PAC ⇒ shorter decision clock for the **opponent** when picking lane + confirming stake.

```
opp_clock_ms = clamp(12000 - 80 * (my_pac - 50), 4000, 15000)
```

At PAC 50 → 12s. At PAC 99 → 8.08s. At PAC 1 → 15s cap.
If opponent’s clock hits 0 without a lock: they **default lane PHY** and keep the stake they already offered; they do not auto-forfeit. (Forfeit-on-timeout is too harsh for mobile.)

### SHO — strike lane power

Only used if the resolved lane is SHO (see §6).

```
if lane == SHO:
  if my_sho > their_sho: I win
  if my_sho < their_sho: I lose
  if equal: fair coin, no rake on the coin (rake already taken)
```

### PAS — reroute

Once per clash, after **both lanes are revealed**, the player with the **higher PAS** may swap their own lane to a neighbour:

```
neighbours: SHO—PAS—DRI
PAC, DEF, PHY have no PAS neighbours (cannot reroute onto/from them with PAS)
```

If PAS tied, neither reroutes.
Reroute is optional. 8 second window. If unused, lanes stand.

### DRI — feint

The player with **higher DRI** may feint:

1. They submit a **fake** lane first.
2. Opponent must lock a real lane (sees the fake).
3. Feinter then locks a real lane.

If DRI tied, no feint; simultaneous lock.
Feint does not change stats. It is information war.

### DEF — soak

Once per clash, if this player **loses**, and they have the higher DEF (strict), their loss stake is halved **before** pot math.

```
if loser.def > winner.def:
  loser_pays = floor(stake / 2)
  remainder of loser stake returns to loser
else:
  loser_pays = stake
```

Winner still receives `loser_pays + winner.stake - rake` with rake = 4% of `(loser_pays + winner.stake)`.
If DEF tied, no soak.

### PHY — stamina (daily match slots)

```
base_slots = 5
bonus = clamp(floor((phy - 40) / 20), 0, 3)
daily_slots = base_slots + bonus
```

PHY 40 → 5. PHY 60 → 6. PHY 80 → 7. PHY 99 → 8.
A “slot” is a Clash that reached **both-committed**. Declines / expiry do not burn a slot.
Reset at 00:00 UTC. Store `clash_slots_used`, `clash_slots_date`.

If `slots_used >= daily_slots`, queue and challenge are rejected with `no_stamina`.

---

## 6. Clash state machine

### Create

`POST /api/clash` `{ stake, mode: "challenge" | "queue" }`

Preconditions:

- profileComplete (has legend)
- `1 <= stake <= maxWager`
- `stake <= playable`
- stamina remaining
- freeze `stake` immediately on creator (`escrow` row, debit now)

Challenge: returns `id` + share path `/clash/:id`.
Queue: matchmaker pairs two open rows with **equal stake**. First-in first-out.

Expiry: 10 minutes unmatched → refund escrow, no volume, no slot.

### Accept (challenge)

`POST /api/clash/:id/accept`

Same preconditions for acceptor. Debit acceptor stake into escrow.
Both committed → state `lanes`.

### Lane phase

State `lanes`:

- If one player has higher DRI: feint protocol (§5).
- Else both submit `lane` in `{ pac, sho, pas, dri, def, phy }` within their clock.
- PAC sets **opponent** clock only.
- Timeout: default lane `phy`.

Then state `reroute`:

- If one player has higher PAS and their current lane is SHO, PAS, or DRI: 8s optional neighbour swap.
- Then state `resolve`.

### Resolve (pure function — write tests)

Inputs: two players with stats, stakes, final lanes, who has soak eligibility.

```
L1, L2 = final lanes

if L1 == L2 == sho:  winner = higher SHO; tie = coin
elif L1 == L2 == pac: winner = higher PAC; tie = coin
elif L1 == L2 == pas: winner = higher PAS; tie = coin
elif L1 == L2 == dri: winner = higher DRI; tie = coin
elif L1 == L2 == def: winner = higher DEF; tie = coin
elif L1 == L2 == phy: winner = higher PHY; tie = coin
else:
  // different lanes: use lane triangle, then stat check
  winner = resolve_cross(L1, L2, stats)
```

Cross-lane table (fixed, publish in UI):

```
SHO beats PHY
PHY beats DRI
DRI beats SHO
PAC beats PAS
PAS beats DEF
DEF beats PAC
```

Those six are the only advantages. Other mixed pairs (e.g. SHO vs PAC): **no type advantage** — compare the stat of **your own lane** vs their own lane? That is apples-to-oranges.

Use this instead for non-advantage mixed pairs:

```
score(player) = stat[player.lane]
winner = higher score; tie = coin
```

When type advantage applies:

```
winner = the player whose lane beats the other lane
Do NOT also compare stats. Type wins outright.
```

This keeps “which stat to max” coupled to “which lane I can credibly threaten.”

### Money

```
pot = winner.stake + loser_pays          // loser_pays from DEF soak
rake = floor(pot * 0.04)
prize = pot - rake
refund_loser = loser.stake - loser_pays  // 0 if no soak
```

Credit `prize` to winner `ktk_bought_wallet`.
Credit `refund_loser` to loser same wallet they were debited from (track per-escrow source; if mixed, refund bought first then grant — reverse of debit).
House rake: write `house_rake` ledger row. Do not put rake in a user wallet.

Volume: both players `V += their original stake` (the amount frozen, not loser_pays).
Slots: both `slots_used += 1`.

### Spectator

`GET /api/clash/recent` last 10 resolved: names, lanes, pot, winner. No wallet addresses.
Home card can mount this list.

---

## 7. API surface (minimal)

```
GET  /api/me                  // already; add bought/granted only in server math
                              // response may include rolloverLeft, maxWager, feeMode
                              // do NOT add kchip fields

POST /api/cashier/checkout    { packId }
POST /api/stripe/webhook      raw body

POST /api/clash               { stake, mode, opponentId? }
POST /api/clash/:id/accept
POST /api/clash/:id/feint     { fakeLane }
POST /api/clash/:id/lane      { lane }
POST /api/clash/:id/reroute   { lane } | { skip: true }
GET  /api/clash/:id
GET  /api/clash/recent
```

Auth: existing Privy session.

---

## 8. Neon (run these; keep reminding owner)

```sql
-- already expected on legends:
ALTER TABLE legends ADD COLUMN IF NOT EXISTS perk_id text;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS ruleset integer NOT NULL DEFAULT 1;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS token_id integer;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS mint jsonb;

ALTER TABLE users ADD COLUMN IF NOT EXISTS ktk_granted_wallet integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ktk_bought_wallet integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS clash_slots_used integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS clash_slots_date date;

ALTER TABLE legends ADD COLUMN IF NOT EXISTS allocated_from_grant integer NOT NULL DEFAULT 0;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS allocated_from_bought integer NOT NULL DEFAULT 0;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS rollover_base_u0 integer;
ALTER TABLE legends ADD COLUMN IF NOT EXISTS rollover_target_r integer;

CREATE TABLE IF NOT EXISTS cashier_orders (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  pack_id text NOT NULL,
  usd_cents integer NOT NULL,
  ktk integer NOT NULL,
  stripe_session text UNIQUE,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clashes (
  id text PRIMARY KEY,
  creator_id text NOT NULL,
  opponent_id text,
  stake integer NOT NULL,
  mode text NOT NULL,
  state text NOT NULL,
  creator_lane text,
  opponent_lane text,
  feint_lane text,
  winner_id text,
  loser_pays integer,
  rake integer,
  prize integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS house_rake (
  id text PRIMARY KEY,
  clash_id text,
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Migration note: existing users store grant in `demo_credits`. On first read after migrate:

```
if ktk_granted_wallet == 0 and ktk_bought_wallet == 0 and demo_credits > 0:
  ktk_granted_wallet = demo_credits
  // then keep demo_credits in sync OR stop writing it
```

Do not show `demo_credits` in UI.

---

## 9. Build order for the implementing AI

1. Schema + migrate + map `demo_credits` → `ktk_granted_wallet`.
2. Rewrite `getKtkEconomy` to the formulas in §1. Keep response shape the UI already uses (`ktk`, `rolloverLeft`, `maxWager`, `feeMode`).
3. Freeze `rollover_base_u0` / `rollover_target_r` on first legend save.
4. Cashier webhook + three packs. Hide button if Stripe missing.
5. Clash tables + create/accept/expire refund.
6. Lane + DRI feint + PAS reroute + resolve function with unit tests for every same-lane and every type-advantage pair.
7. Recent clashes on home.
8. Only then wire Clash UI.

Do not start with UI. Do not touch house RTP. Do not add a seventh stat.

---

## 10. Worked examples

### New user, first card 333, no cash

- Grant wallet 600 → save A=333 → grant wallet 267, U0=267, R=2670, playable=267.
- Bets 50 on dice: grant 217, V=50, playable=217.
- Wins 90: bought 90, playable=307. Next debit spends bought first.

### Same user buys $10

- bought 1000, playable=1307.
- Rollover still 2670 − V. Buying does not finish rollover.
- They can Clash at stake 50 immediately.

### Clash SHO vs PHY

- Type advantage: SHO beats PHY → SHO player wins even if PHY is 99 and SHO is 40.
- That is intentional. A PHY max is a stamina build, not a dueling build.

### Clash SHO vs PAC

- No type advantage. Compare SHO vs PAC raw ints. 80 SHO beats 55 PAC. Tie coins.

### DEF soak

- Stake 50 each. Loser DEF 80, winner DEF 40. loser_pays=25. pot=75. rake=3. prize=72 to winner. loser refunded 25.

---

## 11. Out of scope

Withdrawals, on-chain escrow, team PAS, more P2P games, selling extra attribute points, changing house RTP, showing KCHIP, custom domain, Node 24 on Vercel.
