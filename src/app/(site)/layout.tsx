import type { ReactNode } from "react";
import { Header } from "@/components/site/header";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-oled">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="absolute -top-48 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-toxic/[0.09] blur-[140px]" />
      </div>
      <Header />
      <main className="relative flex flex-1 flex-col">{children}</main>
      <footer className="relative border-t border-white/[0.06] py-6 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} Rainbucks · Portfolio project · Virtual play money only, no real money
      </footer>
    </div>
  );
}
