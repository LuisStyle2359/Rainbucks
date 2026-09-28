# Rainbucks – Crypto-Casino-Simulator

Ultra-moderne Casino-Webanwendung im **OLED-Dark × Cyberpunk-Neon**-Look mit vier Spielen: **Crash, Mines, Limbo und Plinko**. Mit Provably-Fair-System, Sound-Design, Live-Chat und Registrierung/Login.

> **Wichtig:** Rainbucks ist ein **Portfolio-Projekt und reiner Demo-Simulator**. Gespielt wird ausschließlich mit virtuellem Spielgeld (**RBX**). Es gibt keine Einzahlungen, keine Auszahlungen und keinen Gegenwert in echtem Geld.

> **Aktueller Stand:** Alles läuft **lokal auf deinem Computer**. Die Veröffentlichung im Internet wird eingerichtet, sobald du so weit bist (siehe [Veröffentlichen](#veröffentlichen)).

---

## Schnellstart (lokal)

**Voraussetzungen:** [Node.js (LTS)](https://nodejs.org), [Git](https://git-scm.com/downloads) und [Docker Desktop](https://www.docker.com/products/docker-desktop). Docker Desktop muss geöffnet sein („Engine running“).

```bash
git clone https://github.com/luisstyle2359/rainbucks.git
cd rainbucks
npm install
npm run db:start   # Datenbank + Login-System in Docker, schreibt .env.local automatisch
npm run dev        # Website auf http://localhost:3000
```

Dann auf http://localhost:3000 registrieren, die Bestätigungs-Mail in Mailpit öffnen (http://127.0.0.1:54324) und losspielen. Jedes Konto startet mit **1.000 RBX**.

| Adresse | Was ist das? |
|---|---|
| http://localhost:3000 | Die Website |
| http://127.0.0.1:54324 | Lokales E-Mail-Postfach (Mailpit), hier landen die Bestätigungs-Mails |
| http://127.0.0.1:54323 | Supabase Studio (Datenbank und Nutzer ansehen) |

| Befehl | Wirkung |
|---|---|
| `npm run dev` | Entwicklungsserver starten |
| `npm run build` | Produktions-Build erstellen |
| `npm test` | Unit-Tests (Fairness, Auszahlungen, Engines, Physik) |
| `npm run lint` | Code prüfen |
| `npm run db:start` / `db:stop` | Lokale Datenbank starten / stoppen |
| `npm run db:reset` | Datenbank leeren und neu anlegen |

---

## Tech-Stack

| Bereich | Technologie | Warum |
|---|---|---|
| Framework | **Next.js 16** (App Router), **TypeScript** (strict) | Frontend und Backend in einem Projekt, Server Components |
| Styling | **Tailwind CSS 4** mit eigenem Design-System | Design-Tokens, Glas-Utilities, Mobile First |
| Animation | **Motion** (Framer Motion, Paket `motion`) | Shared Layout Animations, 3D-Flips, Springs |
| State | **zustand** + `persist` | Wallet, Historie, Seeds, Einstellungen (pro Nutzer gespeichert) |
| Rendering | **HTML5 Canvas 2D** | Crash und Plinko mit 60–120 FPS, außerhalb des DOM |
| Physik | **matter.js** | Plinko-Kugeln mit echter Kollision |
| Kryptografie | **@noble/hashes** (HMAC-SHA256) | Provably Fair, funktioniert auch ohne HTTPS |
| Sound | **Web Audio API** | Alle Sounds live synthetisiert, keine Audiodateien |
| Realtime | Simulierter Socket (Socket.io-API) | Live-Chat und Wett-Feed mit Bots |
| Auth + DB | **Supabase** (Auth, Postgres, RLS) | Registrierung, Login, gehashte Passwörter |
| Tests | **Vitest** | 27 Unit-Tests |

---

## 1. Ordnerstruktur

```
rainbucks/
├── supabase/migrations/…_init.sql        Profil-Tabelle + Row Level Security
├── scripts/setup-local-env.mjs           schreibt .env.local für die lokale Supabase
└── src/
    ├── proxy.ts                          schützt /casino und /dashboard (Login nötig)
    ├── app/
    │   ├── layout.tsx                    Fonts (Geist, Chakra Petch), OLED-Hintergrund
    │   ├── globals.css                   Design-System: Farben, Glas, Neon, Glow
    │   ├── (site)/                       öffentliche Seiten
    │   │   ├── page.tsx                  Landingpage
    │   │   ├── login/ · register/        Formulare
    │   ├── (casino)/                     geschützter Bereich mit Casino-Rahmen
    │   │   ├── layout.tsx                prüft Login, lädt Profil → CasinoShell
    │   │   ├── dashboard/page.tsx        Konto, Statistik, Wett-Historie
    │   │   └── casino/
    │   │       ├── page.tsx              Lobby
    │   │       ├── template.tsx          Seitenübergänge
    │   │       ├── crash/ · mines/ · limbo/ · plinko/
    │   │       └── fairness/page.tsx     Seeds verwalten + Ergebnisse prüfen
    │   └── auth/                         Server Actions (Login/Logout) + E-Mail-Bestätigung
    ├── components/
    │   ├── casino/
    │   │   ├── shell/                    Top-Bar, Seitenleiste, Live-Panel, Chat, Feed, Kontostand
    │   │   ├── bet-panel/                Standard-Wettpanel + useAutoBet-Hook
    │   │   ├── lobby/ · dashboard/       Lobby und Dashboard
    │   │   └── ui/                       NeonButton, Segmented, Icons, Coin, DecimalField
    │   ├── games/
    │   │   ├── crash/                    CrashGame, CrashCanvas, Spielerliste, Verlauf
    │   │   ├── mines/                    MinesGameView, MinesTile (3D-Flip), Icons
    │   │   ├── limbo/                    LimboGame, Odometer
    │   │   └── plinko/                   PlinkoGame
    │   ├── fairness/fairness-view.tsx
    │   └── site/                         Header + Formular-Bausteine der öffentlichen Seiten
    └── lib/
        ├── stores/                       zustand: wallet, fairness, settings, live + Hydration
        ├── fairness/provably-fair.ts     HMAC-SHA256, Seeds, Spielergebnisse, Verifizierung
        ├── games/
        │   ├── crash/                    crash-engine.ts (Zustandsautomat), crash-renderer.ts (Canvas)
        │   ├── mines/                    mines-game.ts (Logik), mines-math.ts (Multiplikatoren)
        │   ├── limbo/limbo-math.ts
        │   └── plinko/                   payouts.ts, plinko-physics.ts (matter.js), plinko-renderer.ts
        ├── canvas/particles.ts           Partikelsystem (Typed Arrays + Glow-Sprites)
        ├── audio/audio-engine.ts         Web-Audio-Synthese
        ├── realtime/                     simulierter Socket + Bots
        ├── casino/                       Geld (Integer-Cent), Spiel-Infos, Wett-Abrechnung
        └── supabase/                     Supabase-Clients
```

---

## 2. Globaler Store (zustand)

Datei: [`src/lib/stores/wallet-store.ts`](src/lib/stores/wallet-store.ts) (plus `fairness-store.ts`, `settings-store.ts`, `live-store.ts`)

- **Geld in Integer-Cent:** `1.000,00 RBX = 100000`. Keine Gleitkomma-Fehler. Auszahlungen werden exakt mit Integer-Arithmetik berechnet (bei riesigen Zahlen per `BigInt`).
- **Wallet:** `debit()` bucht den Einsatz beim Setzen ab, `settle()` schreibt die Auszahlung gut, speichert die Wette (inkl. Seeds) in der Historie und aktualisiert die Statistik.
- **Pro Nutzer gespeichert:** Der localStorage-Schlüssel enthält die Nutzer-ID (`rainbucks:<id>:wallet`). Zwei Konten im selben Browser mischen sich nicht.
- **Sichere Hydration:** Die Stores laden erst nach dem Login-Check (`skipHydration`), der Casino-Rahmen rendert die Spiele erst danach. So überschreibt nie ein Standardwert gespeicherte Daten.
- **Tabs synchron:** Änderungen in einem Tab erscheinen per `storage`-Event auch in anderen.
- **Weitere Stores:** `settings` (Mute, Lautstärke, Einsätze pro Spiel, Turbo), `ui` (aktives Spiel), `live` (Chat, Feed, Online-Zähler).

## 3. Crash-Engine

Dateien: [`crash-engine.ts`](src/lib/games/crash/crash-engine.ts) (Logik) und [`crash-renderer.ts`](src/lib/games/crash/crash-renderer.ts) (Canvas)

- **Zustandsautomat:** `betting` (6 s Countdown) → `running` → `crashed` (3,5 s) → neue Runde. Bots steigen während des Countdowns ein und cashen bei ihren Zielen aus.
- **Exponentielle Kurve:** `M(t) = e^(k·t)` mit `k = ln 2 / 10 s` (2× nach 10 s, 10× nach 33 s). Gezeichnet als Kurve aus quadratischen **Bezier-Segmenten** mit mehrlagigem Neon-Glow und Verlaufsfläche.
- **Zeitstempel statt Frames:** Cashout-Beträge werden aus `performance.now()` berechnet. Sie stimmen also exakt, auch bei 120 Hz oder gedrosseltem Hintergrund-Tab.
- **Visuals:** Rakete mit Flamme und pulsierendem Glow, Abgas-Partikel, **dynamisches Raster** und Warp-Sterne, die mit dem Multiplikator schneller werden. Die Achsen skalieren automatisch mit.
- **Crash:** Explosion aus ~230 Partikeln, Schockwelle, roter Blitz und Screen-Shake. Bei „Bewegung reduzieren“ im Betriebssystem fällt alles dezenter aus.
- **React bleibt ruhig:** Der Canvas läuft per `requestAnimationFrame` außerhalb von React. Der Cashout-Betrag im Button wird direkt im DOM aktualisiert, ohne 120 Re-Renders pro Sekunde.
- **Wetten für die nächste Runde**, Abbrechen, Auto-Cashout, Auto-Bet. Verlässt man die Seite, wird korrekt abgerechnet.

## 4. Mines

Dateien: [`mines-game.tsx`](src/components/games/mines/mines-game.tsx), [`mines-tile.tsx`](src/components/games/mines/mines-tile.tsx), [`mines-math.ts`](src/lib/games/mines/mines-math.ts)

- 5×5-Brett, 1–24 Minen. Jede Kachel dreht sich per **3D-Flip** (Motion, `rotateY` mit `preserve-3d` und `backface-visibility`).
- Diamant: leuchtender Edelstein, Klang wird mit jedem Treffer höher. Mine: roter Blitz, Brett wackelt, alle Felder decken sich wellenförmig vom Treffer aus auf.
- **Multiplikator:** `0,99 / P(k Diamanten hintereinander)` mit `P = Π (25−Minen−i)/(25−i)`. Beispiel: 3 Minen, 1 Diamant → 1,12×. Der Cashout-Button zeigt den Gewinn in Echtzeit.
- **Auto-Bet:** Felder auswählen, danach spielt jede Runde genau diese Felder.

## 5. Provably Fair

Datei: [`src/lib/fairness/provably-fair.ts`](src/lib/fairness/provably-fair.ts), Oberfläche unter `/casino/fairness`

```
bytes = HMAC_SHA256(serverSeed, "clientSeed:nonce:cursor")
float = b0/256 + b1/256² + b2/256³ + b3/256⁴          → 0 ≤ float < 1

Crash / Limbo: max(1, floor(0,99 / (1 − float) · 100) / 100)   → P(≥ x) = 0,99 / x
Mines:         Fisher-Yates-Mischung der 25 Felder
Plinko:        pro Reihe float < 0,5 → links, sonst rechts
```

1. Vor der Wette ist nur der **SHA-256-Hash** des Server-Seeds sichtbar.
2. Der **Client-Seed** ist frei wählbar, die **Nonce** zählt jede Wette hoch.
3. **Rotieren** legt den Server-Seed offen. Auf der Fairness-Seite lässt sich jede Wette nachrechnen, in der Wett-Historie des Dashboards gibt es dafür „Prüfen ✓“-Links.

Hinweis: Im Demo-Simulator läuft der „Server“ im Browser. In einer echten Anwendung bliebe der Server-Seed bis zur Rotation auf dem Server.

## Limbo und Plinko

- **Limbo** ([`limbo-game.tsx`](src/components/games/limbo/limbo-game.tsx)): Riesige Zahlen rollen wie Walzen einer Slot-Maschine ([`odometer.tsx`](src/components/games/limbo/odometer.tsx)), mit Bewegungsunschärfe abhängig von der Drehgeschwindigkeit. Ziel per Eingabe, logarithmischem Slider oder Gewinnchance (2,00× ↔ 49,5 %).
- **Plinko** ([`plinko-physics.ts`](src/lib/games/plinko/plinko-physics.ts)): Echte matter.js-Physik mit fester Schrittweite (120 Hz). Damit das faire Ergebnis trotzdem feststeht, bekommt jede Kugel vor jeder Reihe einen kleinen Impuls in Richtung eines Zielpunkts neben dem nächsten Pin. Den Abprall übernimmt die Physik. In Tests landeten **3.700 von 3.700 Kugeln** im richtigen Fach (8–16 Reihen, 30 Kugeln gleichzeitig, schwankende Bildrate). Fächer von Rot bis Grün, **27 Auszahlungstabellen** (8–16 Reihen × 3 Risikostufen) mit 98,4–99,0 % RTP.

## Weitere Systeme

- **Wettpanel** ([`bet-panel.tsx`](src/components/casino/bet-panel/bet-panel.tsx)): Einsatz, ½, 2×, Max, Manuell/Auto (mit Anzahl, Stopp bei Gewinn/Verlust). **Leertaste** = Wetten/Cashout. Auf dem Handy eine **Sticky-Bottom-Bar**, deren Einstellungen sich hochschieben lassen.
- **Sound** ([`audio-engine.ts`](src/lib/audio/audio-engine.ts)): Klick, Hover-Tick, Diamant, Explosion, Münzen, Plinko-Pins, Limbo-Ticken und ein **Spannungs-Sound**, der bei Crash mit dem Multiplikator steigt. Alles per Oszillator, Rauschen und Filter, ohne Audiodateien. Stumm schalten oben rechts.
- **Live** ([`simulated-socket.ts`](src/lib/realtime/simulated-socket.ts)): Typisierte `on/emit`-API wie Socket.io, simulierte Latenz, Bots im Chat und im Wett-Feed. Eigene Chat-Nachrichten erreichen per `BroadcastChannel` auch andere Tabs. Für einen echten Server würde man nur diese Klasse ersetzen.
- **Design-System** ([`globals.css`](src/app/globals.css)): echtes Schwarz, Toxic-Grün `#39ff14` für Gewinne, Neon-Rot `#ff2d55` für Verluste, Glas-Panels mit `backdrop-filter: blur(20px)` und 1px-Lichtkanten.
- **Shared Layout Animations:** Die aktive Markierung in Navigation, Tabs und Umschaltern gleitet per `layoutId` von Eintrag zu Eintrag.

## Performance

- Canvas-Spiele zeichnen per `requestAnimationFrame` mit der Bildrate des Displays (60/120/144 Hz). Alle Bewegungen sind zeitbasiert.
- Partikel liegen in `Float32Array`s (kein Garbage Collector), Glow-Effekte sind vorgerenderte Sprites statt teurem `shadowBlur`.
- Plinko zeichnet statische Pins einmal in einen Offscreen-Canvas und pausiert das Zeichnen, wenn sich nichts bewegt.
- Gemessen im Test: Crash läuft ohne einen einzigen Long Task (> 50 ms), die headless-Testumgebung ist auf 60 FPS begrenzt.

## Tests

```bash
npm test
```

27 Tests: HMAC gegen Node-`crypto`, Verteilung (2× in ~49,5 %), Minen-Positionen, alle 27 Plinko-Tabellen (Länge, Symmetrie, RTP), Mines-RTP für jede Kombination, exakte Cent-Rechnung, Crash-Engine (Auto-Cashout, Crash, manueller Cashout, Rückerstattung) und Plinko-Physik.

---

## Login und Datenbank

- **Registrierung, Login, Logout** per Server Actions ([`src/app/auth/actions.ts`](src/app/auth/actions.ts)), E-Mail-Bestätigung über [`auth/confirm/route.ts`](src/app/auth/confirm/route.ts).
- Supabase speichert Passwörter als **bcrypt-Hash**. [`src/proxy.ts`](src/proxy.ts) leitet nicht eingeloggte Besucher von `/casino` und `/dashboard` zum Login um, das Casino-Layout prüft zusätzlich mit `getUser()`.
- Die Tabelle `profiles` ist per **Row Level Security** geschützt: Jeder sieht nur sein eigenes Profil.

## Veröffentlichen

**Noch nicht eingerichtet.** Geplant ist: Supabase Cloud (Datenbank + Login) und Vercel (Website), beides kostenlos, plus ein echter E-Mail-Versand. Das Spielgeld bleibt auch online rein virtuell.

## Häufige Probleme

| Problem | Lösung |
|---|---|
| `npm run db:start`: *Cannot connect to the Docker daemon* | Docker Desktop öffnen, warten bis „Engine running“, erneut starten |
| `Your project's URL and Key are required` | `npm run db:start` ausführen, dann `npm run dev` neu starten |
| Keine Bestätigungs-Mail | Lokal werden Mails nicht verschickt, sie liegen in Mailpit: http://127.0.0.1:54324 |
| Kein Ton | Einmal irgendwo klicken (Browser erlauben Audio erst nach einer Interaktion), Lautsprecher-Symbol oben rechts prüfen |
| Guthaben aufgebraucht | Oben rechts erscheint „+1.000“ zum Auffüllen, oder im Dashboard „Demo-Konto zurücksetzen“ |
| Port 3000 belegt | Anderes Terminal mit `npm run dev` mit `Strg + C` beenden |
