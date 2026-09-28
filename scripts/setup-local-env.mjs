// Schreibt die Adresse und den Schlüssel der lokalen Supabase in .env.local.
// Wird automatisch von "npm run db:start" aufgerufen.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ENV_FILE = ".env.local";

if (existsSync(ENV_FILE) && !readFileSync(ENV_FILE, "utf8").includes("127.0.0.1")) {
  console.log(
    `ℹ️  ${ENV_FILE} enthält keine lokalen Werte (vermutlich deine Cloud-Schlüssel) und bleibt unverändert.`,
  );
  process.exit(0);
}

const status = JSON.parse(
  execSync("npx supabase status -o json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }),
);

writeFileSync(
  ENV_FILE,
  `# Automatisch erzeugt von "npm run db:start" (lokale Supabase)
NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}
`,
);

console.log(`
✅ Lokale Supabase läuft, ${ENV_FILE} ist eingerichtet.

   Jetzt starten:   npm run dev
   Website:         http://localhost:3000
   E-Mail-Postfach: ${status.MAILPIT_URL ?? status.INBUCKET_URL}   (Bestätigungs-Mails landen hier)
   Datenbank-UI:    ${status.STUDIO_URL}
`);
