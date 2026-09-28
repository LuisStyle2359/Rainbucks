# Rainbucks – Webanwendung mit Registrierung, Login und Dashboard

Eine moderne Web-App mit Startseite, Registrierung, Login/Logout und einem geschützten Dashboard. Aufgebaut mit **Next.js** und **Supabase** (Datenbank + Login-System).

> **Aktueller Stand:** Die App läuft **komplett lokal auf deinem Computer**. Du brauchst noch kein Cloud-Konto. Die Veröffentlichung im Internet (Phase 4) wird eingerichtet, sobald du so weit bist.

---

## Phase 1: Technologie-Stack

| Baustein | Technologie | Aufgabe |
|---|---|---|
| Frontend | **Next.js 16** (React) + **Tailwind CSS** | Seiten, Formulare, responsives Design |
| Backend | **Next.js Server Actions, Route Handler & Proxy** | Formulare verarbeiten, Login prüfen, Dashboard schützen |
| Datenbank | **Supabase** (PostgreSQL) | Nutzerdaten und Profile speichern |
| Authentifizierung | **Supabase Auth** | Konto anlegen, Login, Logout, E-Mail-Bestätigung |
| Lokal | **Supabase CLI** in **Docker** | Datenbank, Login und E-Mail-Postfach auf deinem Computer |
| Hosting (später) | **Vercel** (App) + **Supabase Cloud** (Datenbank) | Beides kostenlos |

**Warum diese Kombination?**

- **Ein Projekt statt zwei:** Frontend und Backend stecken im selben Next.js-Projekt. Du musst nur **eine** App hochladen, nicht getrennt einen Server und eine Website.
- **Sicherheit ist eingebaut:** Du programmierst die Passwort-Verschlüsselung nicht selbst (dabei passieren Anfängern die meisten Fehler). Supabase speichert Passwörter automatisch als **bcrypt-Hash**, niemals im Klartext.
- **Kostenlos und ohne Kreditkarte:** Vercel (Hobby-Plan) und Supabase (Free-Plan).
- **Echte URL in Minuten:** Vercel veröffentlicht automatisch bei jedem `git push`.

---

## Phase 2: Projekt-Setup (lokal)

### 2.1 Programme installieren

1. **Node.js (LTS-Version)**: https://nodejs.org → „LTS“ herunterladen und installieren.
2. **Git**: https://git-scm.com/downloads
3. **Docker Desktop**: https://www.docker.com/products/docker-desktop
   Darin läuft die lokale Datenbank samt Login-System. Nach der Installation Docker Desktop **einmal öffnen** und warten, bis „Engine running“ angezeigt wird.
4. **VS Code** (Code-Editor, empfohlen): https://code.visualstudio.com

Prüfen im Terminal:

```bash
node -v      # sollte v20 oder höher anzeigen
git --version
docker -v
```

> **Terminal öffnen:** Windows: „PowerShell“ im Startmenü suchen. Mac: „Terminal“ über Spotlight (⌘ + Leertaste). In VS Code: Menü *Terminal → New Terminal*.

### 2.2 Projekt herunterladen und starten (3 Befehle)

```bash
git clone https://github.com/luisstyle2359/rainbucks.git
cd rainbucks
npm install
```

(Alternativ: das ZIP entpacken und im Terminal mit `cd` in den Ordner `rainbucks` wechseln.)

Dann:

```bash
npm run db:start   # startet Datenbank + Login-System (Docker muss laufen)
npm run dev        # startet die Website
```

Der **erste** `npm run db:start` lädt einige Docker-Images herunter und dauert ein paar Minuten, danach geht es in Sekunden. Er legt automatisch die Datenbank-Tabellen an und schreibt die Datei `.env.local` mit den passenden Schlüsseln. Du musst **nichts kopieren**.

### 2.3 Das läuft jetzt auf deinem Computer

| Adresse | Was ist das? |
|---|---|
| http://localhost:3000 | **Deine Website** |
| http://127.0.0.1:54324 | **Lokales E-Mail-Postfach (Mailpit).** Hier landen alle Bestätigungs-Mails. Es werden keine echten E-Mails verschickt. |
| http://127.0.0.1:54323 | **Supabase Studio.** Hier siehst du deine Datenbank (Tabellen `profiles` und unter *Authentication* die Nutzer). |

**Ausprobieren:** Auf http://localhost:3000 registrieren. Dann in Mailpit die Mail öffnen und auf den Bestätigungslink klicken. Du landest im Dashboard. Danach ausloggen und wieder einloggen. 🎉

### 2.4 Täglicher Ablauf

| Befehl | Wirkung |
|---|---|
| `npm run db:start` | Datenbank starten (Docker Desktop muss offen sein) |
| `npm run dev` | Website starten, beenden mit `Strg + C` |
| `npm run db:stop` | Datenbank stoppen (Daten bleiben erhalten) |
| `npm run db:reset` | Datenbank **leeren** und Tabellen neu anlegen |
| `npm run db:status` | Adressen und Schlüssel der lokalen Datenbank anzeigen |
| `npm run build` | Produktions-Build testen (so wie später beim Veröffentlichen) |
| `npm run lint` | Code auf Fehler prüfen |

### 2.5 Ordnerstruktur

```
rainbucks/
├── .env.example                  ← Vorlage für die Schlüssel
├── .env.local                    ← wird von "npm run db:start" erzeugt (NICHT hochladen!)
├── package.json                  ← Abhängigkeiten + npm-Befehle
├── scripts/
│   └── setup-local-env.mjs       ← schreibt .env.local automatisch
├── supabase/
│   ├── config.toml               ← Einstellungen der lokalen Supabase
│   └── migrations/
│       └── 20260928000000_init.sql ← Datenbank-Tabelle + Sicherheitsregeln
└── src/
    ├── proxy.ts                  ← läuft vor jeder Anfrage: schützt /dashboard
    ├── lib/supabase/
    │   ├── server.ts             ← Supabase-Verbindung für den Server
    │   └── proxy.ts              ← Session erneuern + Weiterleitungen
    ├── components/
    │   ├── header.tsx            ← Navigation (Login/Registrieren bzw. Logout)
    │   └── auth-card.tsx         ← Formular-Bausteine (Karte, Feld, Button)
    └── app/
        ├── layout.tsx            ← Grundgerüst jeder Seite
        ├── globals.css           ← Tailwind-Styles
        ├── page.tsx              ← Startseite  (/)
        ├── login/
        │   ├── page.tsx          ← Login-Seite (/login)
        │   └── login-form.tsx
        ├── register/
        │   ├── page.tsx          ← Registrierung (/register)
        │   └── register-form.tsx
        ├── dashboard/
        │   └── page.tsx          ← geschützter Bereich (/dashboard)
        └── auth/
            ├── actions.ts        ← BACKEND: register, login, logout
            └── confirm/route.ts  ← BACKEND: Link aus Bestätigungs-E-Mail
```

---

## Phase 3: Der Code

Alle Dateien liegen vollständig in diesem Repository. Hier die wichtigsten mit Erklärung. **Du kannst sie 1:1 kopieren.**

### So funktioniert der Ablauf

```
Browser ──(Formular)──► Server Action (src/app/auth/actions.ts)
                              │
                              ▼
                        Supabase Auth ──► Passwort als bcrypt-Hash speichern
                              │            Session-Cookie zurückgeben
                              ▼
Browser ──(/dashboard)──► src/proxy.ts prüft Cookie ──► kein Login? → /login
                              │
                              ▼
                        dashboard/page.tsx lädt Profil aus der Datenbank
                        (Row Level Security: jeder sieht nur sich selbst)
```

### 3.1 Datenbank: `supabase/migrations/20260928000000_init.sql`

Wird von `npm run db:start` automatisch ausgeführt. Legt die Tabelle `profiles` an, erlaubt jedem Nutzer nur den Zugriff auf **seine eigene** Zeile (Row Level Security) und legt bei jeder Registrierung automatisch ein Profil an.

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Eigenes Profil lesen" on public.profiles;
create policy "Eigenes Profil lesen"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Eigenes Profil ändern" on public.profiles;
create policy "Eigenes Profil ändern"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 3.2 Supabase-Verbindung: `src/lib/supabase/server.ts`

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase-Client für Server Components, Server Actions und Route Handler.
// Er liest und schreibt die Login-Session über Cookies.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // In Server Components dürfen keine Cookies gesetzt werden.
            // Das ist ok: src/proxy.ts erneuert die Session bei jeder Anfrage.
          }
        },
      },
    },
  );
}
```

### 3.3 Schutz des Dashboards: `src/lib/supabase/proxy.ts` und `src/proxy.ts`

```ts
// src/lib/supabase/proxy.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Seiten, die nur eingeloggte Nutzer sehen dürfen.
const PROTECTED_ROUTES = ["/dashboard"];
// Seiten, die eingeloggte Nutzer nicht mehr brauchen.
const AUTH_ROUTES = ["/login", "/register"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Prüft das Login-Token und erneuert es bei Bedarf.
  // Wichtig: Zwischen createServerClient und getClaims keinen weiteren Code einfügen.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);

  const path = request.nextUrl.pathname;

  // Weiterleitung, die erneuerte Session-Cookies mitnimmt.
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!isLoggedIn && PROTECTED_ROUTES.some((route) => path.startsWith(route))) {
    return redirectTo("/login");
  }

  if (isLoggedIn && AUTH_ROUTES.some((route) => path.startsWith(route))) {
    return redirectTo("/dashboard");
  }

  return response;
}
```

```ts
// src/proxy.ts
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Läuft vor jeder Anfrage: erneuert die Session und schützt das Dashboard.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Alle Pfade außer statischen Dateien und Bildern.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

> Ab Next.js 16 heißt die frühere `middleware.ts` jetzt `proxy.ts`.

### 3.4 Backend-Logik: `src/app/auth/actions.ts`

Die drei „Routen“ des Servers: **register**, **login**, **logout**. Das sind *Server Actions*: Der Code läuft nur auf dem Server, nie im Browser.

```ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = {
  error?: string;
  success?: string;
  // Eingaben zurückgeben, damit das Formular nach einem Fehler nicht leer ist.
  fields?: { name?: string; email?: string };
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fields = { name, email };

  if (name.length < 2) {
    return { error: "Bitte gib deinen Namen ein (mind. 2 Zeichen).", fields };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { error: "Bitte gib eine gültige E-Mail-Adresse ein.", fields };
  }
  if (password.length < 8) {
    return { error: "Das Passwort muss mindestens 8 Zeichen lang sein.", fields };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  // Supabase speichert das Passwort NICHT im Klartext, sondern als bcrypt-Hash.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    return { error: translateAuthError(error.code, error.message), fields };
  }

  // Ist "Confirm email" in Supabase ausgeschaltet, ist man sofort eingeloggt.
  if (data.session) {
    redirect("/dashboard");
  }

  return {
    success:
      "Fast geschafft! Wir haben dir eine E-Mail geschickt. Klicke auf den Link darin, um dein Konto zu bestätigen.",
  };
}

export async function login(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fields = { email };

  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort eingeben.", fields };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: translateAuthError(error.code, error.message), fields };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function translateAuthError(code: string | undefined, fallback: string) {
  switch (code) {
    case "invalid_credentials":
      return "E-Mail oder Passwort ist falsch.";
    case "email_not_confirmed":
      return "Bitte bestätige zuerst deine E-Mail-Adresse (siehe Posteingang).";
    case "user_already_exists":
    case "email_exists":
      return "Für diese E-Mail-Adresse gibt es bereits ein Konto.";
    case "weak_password":
      return "Das Passwort ist zu schwach. Bitte wähle ein längeres Passwort.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Zu viele Versuche. Bitte warte kurz und versuche es erneut.";
    default:
      return `Etwas ist schiefgelaufen: ${fallback}`;
  }
}
```

### 3.5 E-Mail-Bestätigung: `src/app/auth/confirm/route.ts`

```ts
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Hierhin führt der Link aus der Bestätigungs-E-Mail von Supabase.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();

  if (tokenHash && type) {
    // Variante 1: Link mit token_hash (funktioniert in jedem Browser).
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);
  } else if (code) {
    // Variante 2: Standard-Link von Supabase mit ?code=...
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);
  }

  return NextResponse.redirect(`${origin}/login?error=confirm`);
}
```

### 3.6 Frontend-Seiten

Die restlichen Dateien (Startseite, Login, Registrierung, Dashboard, Header, Formular-Bausteine) findest du vollständig hier:

- Startseite: [`src/app/page.tsx`](src/app/page.tsx)
- Login: [`src/app/login/page.tsx`](src/app/login/page.tsx) + [`login-form.tsx`](src/app/login/login-form.tsx)
- Registrierung: [`src/app/register/page.tsx`](src/app/register/page.tsx) + [`register-form.tsx`](src/app/register/register-form.tsx)
- Dashboard: [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx)
- Layout & Navigation: [`src/app/layout.tsx`](src/app/layout.tsx), [`src/components/header.tsx`](src/components/header.tsx)
- Formular-Bausteine: [`src/components/auth-card.tsx`](src/components/auth-card.tsx)

Beispiel, das Login-Formular (`src/app/login/login-form.tsx`):

```tsx
"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/app/auth/actions";
import { Alert, Field, SubmitButton } from "@/components/auth-card";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    login,
    { error: initialError },
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert type="error">{state.error}</Alert>}
      <Field
        label="E-Mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.fields?.email}
      />
      <Field
        label="Passwort"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <SubmitButton pending={pending}>Einloggen</SubmitButton>
    </form>
  );
}
```

### 3.7 Sicherheit auf einen Blick

- **Passwörter:** werden von Supabase mit **bcrypt** gehasht (in `auth.users.encrypted_password`, z. B. `$2a$10$…`). Nicht einmal du als Admin kannst sie lesen.
- **Sessions:** liegen in **Cookies**, die nur der Server auswertet. Der Proxy erneuert abgelaufene Tokens automatisch.
- **Doppelter Schutz fürs Dashboard:** `src/proxy.ts` leitet nicht eingeloggte Besucher um, und `dashboard/page.tsx` prüft mit `getUser()` noch einmal direkt beim Supabase-Server.
- **Row Level Security:** Selbst mit dem öffentlichen Schlüssel kann niemand fremde Profile lesen.
- **`.env.local` wird nie hochgeladen** (steht in `.gitignore`). Der *Publishable Key* darf öffentlich sein. Den **Secret / service_role Key** darfst du dagegen **niemals** in den Code oder in `NEXT_PUBLIC_…`-Variablen schreiben.

---
## Phase 4: Live-Schaltung (Deployment)

**Noch nicht eingerichtet.** Sobald du veröffentlichen willst, wird das Projekt dafür angepasst. Geplant ist:

1. **Supabase Cloud** (kostenlos): ein Online-Projekt anlegen und dieselbe Datenbank-Migration dort einspielen.
2. **Vercel** (kostenlos): die Website mit deinem GitHub-Repo verbinden und die Cloud-Schlüssel eintragen.
3. **Supabase die Vercel-URL mitteilen**, damit die Bestätigungslinks auf deine echte Seite zeigen.
4. Einen echten E-Mail-Versand einrichten (lokal fängt Mailpit alle Mails ab).

Danach hat die Seite eine öffentliche URL wie `https://rainbucks.vercel.app`.

---

## Häufige Probleme (lokal)

| Problem | Lösung |
|---|---|
| `npm run db:start` meldet *Cannot connect to the Docker daemon* | Docker Desktop öffnen und warten, bis „Engine running“ angezeigt wird. Dann erneut starten. |
| `Your project's URL and Key are required` | `.env.local` fehlt. `npm run db:start` ausführen und `npm run dev` neu starten. |
| Port 3000 ist belegt | Das andere Terminal, in dem `npm run dev` noch läuft, mit `Strg + C` beenden. Die App sollte auf Port 3000 laufen, weil die Bestätigungslinks dorthin zeigen. |
| Port 54321/54322 ist belegt | Ein anderes Supabase-Projekt läuft noch: `npx supabase stop --all`. |
| Keine Bestätigungs-Mail | Mails werden lokal **nicht** verschickt. Sie liegen in Mailpit: http://127.0.0.1:54324 |
| Dashboard zeigt E-Mail statt Namen | `npm run db:reset` ausführen (legt die Tabellen neu an) und neu registrieren. |
