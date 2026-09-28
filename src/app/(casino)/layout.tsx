import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { CasinoShell } from "@/components/casino/shell/casino-shell";
import { createClient } from "@/lib/supabase/server";

// Geschützter Bereich: Lobby, Spiele, Fairness und Dashboard.
export default async function CasinoLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const name = profile?.full_name?.trim() || user.email?.split("@")[0] || "Spieler";

  return (
    <CasinoShell key={user.id} user={{ id: user.id, name }}>
      {children}
    </CasinoShell>
  );
}
