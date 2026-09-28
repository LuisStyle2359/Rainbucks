# Rainbucks – Crypto Casino Simulator

Ultra-modern casino web app in an **OLED dark × cyberpunk neon** look with four games: **Crash, Mines, Limbo and Plinko**. Provably fair system, sound design, win celebrations, VIP levels, a free bonus wheel, live chat and sign-up/login.

> **Important:** Rainbucks is a **portfolio project and a pure demo simulator**. You only ever play with virtual play money (**RBX**). There are no deposits, no withdrawals and no real-money value.

> **Current state:** everything runs **locally on your computer**. Publishing to the internet gets set up once you are ready (see [Publishing](#publishing)).

---

## Quick start (local)

**Requirements:** [Node.js (LTS)](https://nodejs.org), [Git](https://git-scm.com/downloads) and [Docker Desktop](https://www.docker.com/products/docker-desktop). Docker Desktop has to be open ("Engine running").

```bash
git clone https://github.com/luisstyle2359/rainbucks.git
cd rainbucks
npm install
npm run db:start   # database + login system in Docker, writes .env.local automatically
npm run dev        # website on http://localhost:3000
```

Then sign up on http://localhost:3000, open the confirmation email in Mailpit (http://127.0.0.1:54324) and start playing. Every account starts with **1,000 RBX**.

| Address | What is it? |
|---|---|
| http://localhost:3000 | The website |
| http://127.0.0.1:54324 | Local email inbox (Mailpit), confirmation emails land here |
| http://127.0.0.1:54323 | Supabase Studio (look at the database and users) |

| Command | Effect |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm test` | Unit tests (fairness, payouts, engines, physics, levels, bonus wheel) |
| `npm run lint` | Lint the code |
| `npm run demo:build` | Build the standalone guest demo (no login, no server) into `demo/dist` |
| `npm run db:start` / `db:stop` | Start / stop the local database |
| `npm run db:reset` | Wipe and recreate the database |

---

## Tech stack

| Area | Technology | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router), **TypeScript** (strict) | Frontend and backend in one project, Server Components |
| Styling | **Tailwind CSS 4** with a custom design system | Design tokens, glass utilities, mobile first |
| Animation | **Motion** (Framer Motion, package `motion`) | Shared layout animations, 3D flips, springs |
| State | **zustand** + `persist` | Wallet, history, seeds, settings (saved per user) |
| Rendering | **HTML5 Canvas 2D** | Crash, Plinko and win effects at 60–120 FPS, outside the DOM |
| Physics | **matter.js** | Plinko balls with real collisions |
| Cryptography | **@noble/hashes** (HMAC-SHA256) | Provably fair, works without HTTPS too |
| Sound | **Web Audio API** | Every sound synthesized live, no audio files |
| Realtime | Simulated socket (Socket.io API) | Live chat and bet feed with bots |
| Auth + DB | **Supabase** (Auth, Postgres, RLS) | Sign-up, login, hashed passwords |
| Tests | **Vitest** | 38 unit tests |

---

## 1. Folder structure

```
rainbucks/
├── supabase/migrations/…_init.sql        profile table + Row Level Security
├── scripts/setup-local-env.mjs           writes .env.local for the local Supabase
├── demo/                                 standalone guest demo (Vite), reuses the real components
└── src/
    ├── proxy.ts                          protects /casino and /dashboard (login required)
    ├── app/
    │   ├── layout.tsx                    fonts (Geist, Chakra Petch), OLED background
    │   ├── globals.css                   design system: colors, glass, neon, glow, animations
    │   ├── (site)/                       public pages
    │   │   ├── page.tsx                  landing page
    │   │   ├── login/ · register/        forms
    │   ├── (casino)/                     protected area inside the casino frame
    │   │   ├── layout.tsx                checks the login, loads the profile → CasinoShell
    │   │   ├── dashboard/page.tsx        account, VIP progress, stats, bet history
    │   │   └── casino/
    │   │       ├── page.tsx              lobby
    │   │       ├── template.tsx          page transitions
    │   │       ├── crash/ · mines/ · limbo/ · plinko/
    │   │       └── fairness/page.tsx     manage seeds + verify results
    │   └── auth/                         Server Actions (login/logout) + email confirmation
    ├── components/
    │   ├── casino/
    │   │   ├── shell/                    top bar, sidebar, live panel, chat, feed, balance
    │   │   ├── celebrations/             coins flying into the balance, BIG/MEGA/EPIC win screens
    │   │   ├── vip/                      level ring, VIP card with rank ladder
    │   │   ├── bonus/                    free bonus wheel (gift button, dialog, lobby card)
    │   │   ├── bet-panel/                standard bet panel + useAutoBet hook
    │   │   ├── lobby/ · dashboard/       lobby (animated previews, tilt cards) and dashboard
    │   │   └── ui/                       NeonButton, Segmented, icons, Coin, DecimalField
    │   ├── games/
    │   │   ├── crash/                    CrashGame, CrashCanvas, player list, history
    │   │   ├── mines/                    MinesGameView, MinesTile (3D flip), gem + bomb icons
    │   │   ├── limbo/                    LimboGame, Odometer
    │   │   └── plinko/                   PlinkoGame
    │   ├── fairness/fairness-view.tsx
    │   └── site/                         header + form building blocks of the public pages
    └── lib/
        ├── stores/                       zustand: wallet, fairness, settings, live + hydration
        ├── fairness/provably-fair.ts     HMAC-SHA256, seeds, game results, verification
        ├── games/
        │   ├── crash/                    crash-engine.ts (state machine), crash-renderer.ts (canvas)
        │   ├── mines/                    mines-game.ts (logic), mines-math.ts (multipliers)
        │   ├── limbo/limbo-math.ts
        │   └── plinko/                   payouts.ts, plinko-physics.ts (matter.js), plinko-renderer.ts
        ├── canvas/                       particle system, celebration renderer (coins, confetti)
        ├── audio/audio-engine.ts         Web Audio synthesis + vibration
        ├── realtime/                     simulated socket + bots
        ├── casino/                       money (integer cents), games, bets, levels, bonus, celebrations
        ├── hooks/use-now.ts              shared one-second clock for countdowns
        └── supabase/                     Supabase clients
```

---

## 2. Global store (zustand)

File: [`src/lib/stores/wallet-store.ts`](src/lib/stores/wallet-store.ts) (plus `fairness-store.ts`, `settings-store.ts`, `live-store.ts`)

- **Money in integer cents:** `1,000.00 RBX = 100000`. No floating point errors. Payouts are computed exactly with integer arithmetic (`BigInt` for huge numbers).
- **Wallet:** `debit()` takes the stake when betting, `settle()` credits the payout, stores the bet (including seeds) in the history and updates the stats. `grantBonus()` and `claimSpin()` book level-up rewards and free spins.
- **Saved per user:** the localStorage key contains the user id (`rainbucks:<id>:wallet`). Two accounts in the same browser never mix.
- **Safe hydration:** the stores only load after the login check (`skipHydration`), and the casino frame renders the games only after that. A default value never overwrites saved data.
- **Tabs in sync:** changes in one tab show up in the others via the `storage` event.
- **More stores:** `settings` (mute, volume, bet per game, turbo), `ui` (active game, drawers, bonus wheel), `live` (chat, feed, online counter).

## 3. Crash engine

Files: [`crash-engine.ts`](src/lib/games/crash/crash-engine.ts) (logic) and [`crash-renderer.ts`](src/lib/games/crash/crash-renderer.ts) (canvas)

- **State machine:** `betting` (6 s countdown) → `running` → `crashed` (3.5 s) → new round. Bots join during the countdown and cash out at their targets.
- **Exponential curve:** `M(t) = e^(k·t)` with `k = ln 2 / 10 s` (2× after 10 s, 10× after 33 s). Drawn from quadratic **Bezier segments** with a layered neon glow and a gradient fill.
- **Timestamps instead of frames:** cashout amounts come from `performance.now()`, so they are exact at 120 Hz or in a throttled background tab.
- **Visuals:** rocket with flame and pulsing glow, exhaust particles, a **dynamic grid** and warp stars that speed up with the multiplier. The multiplier changes color (white → green → gold → pink), **milestones** (2×, 3×, 5×, 10×, …) fire a shockwave, a chime and a vibration, and the screen edge glows hotter the higher it climbs.
- **Crash:** explosion of ~230 particles, shockwave, red flash and screen shake. With "reduce motion" in the OS everything is calmer.
- **React stays calm:** the canvas runs via `requestAnimationFrame` outside React. The cashout amount in the button is written straight into the DOM, not re-rendered 120 times per second.
- **Bet on the next round**, cancel, auto cashout, auto bet. Leaving the page settles correctly.

## 4. Mines

Files: [`mines-game.tsx`](src/components/games/mines/mines-game.tsx), [`mines-tile.tsx`](src/components/games/mines/mines-tile.tsx), [`mines-math.ts`](src/lib/games/mines/mines-math.ts)

- 5×5 board, 1–24 mines. Every tile turns with a **3D flip** (Motion, `rotateY` with `preserve-3d` and `backface-visibility`).
- Gem: a wide brilliant-cut gem with a light sweep and twinkles, sparks fly out and the reached multiplier floats up. The chime climbs with every gem in a row, and the board glows hotter (gold from 5×). Mine: bomb shards, red flash, the board shakes and all tiles flip in a wave from the hit.
- **Multiplier:** `0.99 / P(k gems in a row)` with `P = Π (25−mines−i)/(25−i)`. Example: 3 mines, 1 gem → 1.12×. The cashout button shows the win in real time.
- **Auto bet:** pick tiles, then every round plays exactly those tiles.

## 5. Provably fair

File: [`src/lib/fairness/provably-fair.ts`](src/lib/fairness/provably-fair.ts), UI at `/casino/fairness`

```
bytes = HMAC_SHA256(serverSeed, "clientSeed:nonce:cursor")
float = b0/256 + b1/256² + b2/256³ + b3/256⁴          → 0 ≤ float < 1

Crash / Limbo: max(1, floor(0.99 / (1 − float) · 100) / 100)   → P(≥ x) = 0.99 / x
Mines:         Fisher-Yates shuffle of the 25 tiles
Plinko:        per row float < 0.5 → left, otherwise right
```

1. Before a bet only the **SHA-256 hash** of the server seed is visible.
2. The **client seed** is your choice, the **nonce** counts every bet.
3. **Rotating** reveals the server seed. The fairness page recomputes any bet, and the dashboard's bet history links to it with "Verify ✓".

Note: in the demo simulator the "server" runs in the browser. In a real application the server seed would stay on the server until it is rotated.

## 6. Rewards and celebrations

Files: [`celebration-layer.tsx`](src/components/casino/celebrations/celebration-layer.tsx), [`celebration-renderer.ts`](src/lib/canvas/celebration-renderer.ts), [`bets.ts`](src/lib/casino/bets.ts)

- **One event bus:** games only settle their bets. `settleBet()` then announces wins and level-ups, and one full-screen layer turns them into feedback. Everything is `pointer-events: none`, so it never blocks playing on.
- **Coins into the balance:** every win shoots coins out of the game (the Plinko slot, the Mines board, …) that curve into the balance. The balance counter waits for them and rolls up while they land, and every coin makes it pop.
- **Win tiers:** nice (2×), big (5×), mega (25×) and epic (100×). Big and above get a win screen with rotating rays and a count-up of the profit, plus confetti cannons, fanfares and phone vibration.
- **Honest on purpose:** only real profits are celebrated. Losses are never dressed up as wins and there are no fake near misses; that would also break provably fair.
- **VIP levels:** 1 XP per RBX wagered, seven ranks from Rookie to Neon Legend, an XP ring around the avatar, and a play-money bonus of 25 RBX × level on every level-up.
- **Free bonus wheel:** one free spin per hour with prizes from 100 to 5,000 RBX. Every segment has the same 1-in-12 chance (crypto RNG), and the wheel says so.

## Limbo and Plinko

- **Limbo** ([`limbo-game.tsx`](src/components/games/limbo/limbo-game.tsx)): huge numbers roll like slot machine reels ([`odometer.tsx`](src/components/games/limbo/odometer.tsx)) with motion blur that follows the spin speed. A hit punches the number and sends out a shockwave. Target via input, logarithmic slider or win chance (2.00× ↔ 49.5%).
- **Plinko** ([`plinko-physics.ts`](src/lib/games/plinko/plinko-physics.ts)): real matter.js physics with a fixed timestep (120 Hz). To still get the fair result, every ball gets a small nudge before each row towards an aim point next to the next pin; the bounce itself is left to the physics. In tests **3,700 of 3,700 balls** landed in the right slot (8–16 rows, 30 balls at once, fluctuating frame rate). Balls glow in four neon colors, wins float up from the slot, slots go from red to green, **27 payout tables** (8–16 rows × 3 risk levels) with 98.4–99.0% RTP.

## More systems

- **Bet panel** ([`bet-panel.tsx`](src/components/casino/bet-panel/bet-panel.tsx)): amount, ½, 2×, Max, manual/auto (number of bets, stop on profit/loss). **Space** = bet / cash out. On phones a **sticky bottom bar** whose settings slide up. The main button breathes and has a light sweep.
- **Sound** ([`audio-engine.ts`](src/lib/audio/audio-engine.ts)): click, hover tick, gem, explosion, coins, Plinko pins, Limbo ticks, wheel ticks, fanfares for big wins and level-ups, and a **tension sound** that rises with the Crash multiplier. All oscillators, noise and filters, no audio files. Mute at the top right.
- **Live** ([`simulated-socket.ts`](src/lib/realtime/simulated-socket.ts)): typed `on/emit` API like Socket.io, simulated latency, bots in chat and in the bet feed. Your own chat messages reach other tabs via `BroadcastChannel`. For a real server you would only swap this class.
- **Design system** ([`globals.css`](src/app/globals.css)): true black, toxic green `#39ff14` for wins, neon red `#ff2d55` for losses, glass panels with `backdrop-filter: blur(20px)` and 1px light edges.
- **Shared layout animations:** the active marker in navigation, tabs and toggles glides from item to item via `layoutId`.

## Performance

- Canvas games draw via `requestAnimationFrame` at the display's refresh rate (60/120/144 Hz). All motion is time-based.
- Particles live in `Float32Array`s (no garbage collector), glow effects are pre-rendered sprites instead of expensive `shadowBlur`.
- Plinko draws the static pins once into an offscreen canvas and stops drawing when nothing moves. The celebration canvas only runs while coins or confetti are on screen.
- Measured in tests: Crash runs without a single long task (> 50 ms); the headless test browser is capped at 60 FPS.

## Tests

```bash
npm test
```

38 tests: HMAC against Node `crypto`, distribution (2× in ~49.5%), mine positions, all 27 Plinko tables (length, symmetry, RTP), Mines RTP for every combination, exact cent math, Crash engine (auto cashout, crash, manual cashout, refund), Plinko physics, VIP levels, the bonus wheel's equal odds and the coin/balance sync.

---

## Login and database

- **Sign-up, login, logout** via Server Actions ([`src/app/auth/actions.ts`](src/app/auth/actions.ts)), email confirmation via [`auth/confirm/route.ts`](src/app/auth/confirm/route.ts).
- Supabase stores passwords as **bcrypt hashes**. [`src/proxy.ts`](src/proxy.ts) redirects visitors who are not logged in from `/casino` and `/dashboard` to the login, and the casino layout checks again with `getUser()`.
- The `profiles` table is protected by **Row Level Security**: everyone only sees their own profile.

## Publishing

**Not set up yet.** The plan: Supabase Cloud (database + login) and Vercel (website), both free, plus real email delivery. The play money stays purely virtual online too.

## Common problems

| Problem | Solution |
|---|---|
| `npm run db:start`: *Cannot connect to the Docker daemon* | Open Docker Desktop, wait for "Engine running", start again |
| `Your project's URL and Key are required` | Run `npm run db:start`, then restart `npm run dev` |
| No confirmation email | Locally no emails are sent; they are in Mailpit: http://127.0.0.1:54324 |
| No sound | Click anywhere once (browsers only allow audio after an interaction), check the speaker icon at the top right |
| Balance used up | A "+1,000" button appears at the top right to top up, or use "Reset demo account" in the dashboard |
| Port 3000 in use | Stop the other terminal running `npm run dev` with `Ctrl + C` |
