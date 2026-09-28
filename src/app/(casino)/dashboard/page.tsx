import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/casino/dashboard/dashboard-view";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();

  // Zweite Sicherheitsprüfung direkt auf der Seite (zusätzlich zu src/proxy.ts).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Profil aus der Datenbank. Dank Row Level Security sieht jeder nur seine eigene Zeile.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, created_at")
    .eq("id", user.id)
    .single();

  return (
    <DashboardView
      account={{
        name: profile?.full_name ?? user.email ?? "Spieler",
        email: user.email ?? "–",
        memberSince: new Date(profile?.created_at ?? user.created_at).toLocaleDateString("de-DE"),
        lastSignIn: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("de-DE") : "–",
      }}
    />
  );
}
