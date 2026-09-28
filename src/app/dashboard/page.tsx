import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Zweite Sicherheitsprüfung direkt auf der Seite (zusätzlich zu src/proxy.ts).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Profil aus der Datenbank laden. Dank Row Level Security sieht
  // jeder Nutzer nur seine eigene Zeile.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, created_at")
    .eq("id", user.id)
    .single();

  const name = profile?.full_name ?? user.email;
  const memberSince = new Date(profile?.created_at ?? user.created_at);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">Dashboard</p>
          <h1 className="text-3xl font-bold tracking-tight">Hallo, {name}! 👋</h1>
          <p className="mt-1 text-slate-600">
            Dies ist dein geschützter Bereich. Nur du kannst ihn sehen.
          </p>
        </div>
        <form action={logout}>
          <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-100">
            Ausloggen
          </button>
        </form>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        <InfoCard label="E-Mail" value={user.email ?? "–"} />
        <InfoCard
          label="Mitglied seit"
          value={memberSince.toLocaleDateString("de-DE")}
        />
        <InfoCard
          label="Letzter Login"
          value={
            user.last_sign_in_at
              ? new Date(user.last_sign_in_at).toLocaleString("de-DE")
              : "–"
          }
        />
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold">{value}</p>
    </div>
  );
}
