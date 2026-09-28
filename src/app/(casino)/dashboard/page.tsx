import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/casino/dashboard/dashboard-view";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();

  // Second security check right on the page (in addition to src/proxy.ts).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Profile from the database. Thanks to Row Level Security everyone only sees their own row.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, created_at")
    .eq("id", user.id)
    .single();

  return (
    <DashboardView
      account={{
        name: profile?.full_name ?? user.email ?? "Player",
        email: user.email ?? "–",
        memberSince: new Date(profile?.created_at ?? user.created_at).toLocaleDateString("en-US", { dateStyle: "medium" }),
        lastSignIn: user.last_sign_in_at
          ? new Date(user.last_sign_in_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
          : "–",
      }}
    />
  );
}
