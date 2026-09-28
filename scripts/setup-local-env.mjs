// Writes the URL and key of the local Supabase into .env.local.
// Called automatically by "npm run db:start".
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ENV_FILE = ".env.local";

if (existsSync(ENV_FILE) && !readFileSync(ENV_FILE, "utf8").includes("127.0.0.1")) {
  console.log(
    `ℹ️  ${ENV_FILE} has no local values (probably your cloud keys) and stays unchanged.`,
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
  `# Generated automatically by "npm run db:start" (local Supabase)
NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}
`,
);

console.log(`
✅ Local Supabase is running, ${ENV_FILE} is set up.

   Start now:       npm run dev
   Website:         http://localhost:3000
   Email inbox:     ${status.MAILPIT_URL ?? status.INBUCKET_URL}   (confirmation emails land here)
   Database UI:     ${status.STUDIO_URL}
`);
