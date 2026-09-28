import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function Header() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-black/60 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-toxic/10 ring-1 ring-toxic/40 shadow-[0_0_20px_-4px_rgb(57_255_20/0.7)]">
            <span className="font-display text-sm font-bold text-toxic">R</span>
          </span>
          <span className="font-display text-lg font-bold uppercase tracking-[0.18em] text-white">
            Rain<span className="neon-text-toxic">bucks</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 text-sm font-medium">
          {isLoggedIn ? (
            <Link
              href="/casino"
              className="rounded-xl bg-toxic px-4 py-2 font-display font-bold uppercase tracking-wider text-black shadow-glow-toxic transition hover:-translate-y-0.5"
            >
              Zum Casino
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-xl px-3 py-2 text-zinc-300 transition hover:text-white">
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-toxic px-4 py-2 font-display font-bold uppercase tracking-wider text-black shadow-glow-toxic transition hover:-translate-y-0.5"
              >
                Registrieren
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
