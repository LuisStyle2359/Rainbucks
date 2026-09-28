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
