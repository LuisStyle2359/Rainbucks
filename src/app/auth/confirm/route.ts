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
    if (!error) return NextResponse.redirect(`${origin}/casino`);
  } else if (code) {
    // Variante 2: Standard-Link von Supabase mit ?code=...
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/casino`);
  }

  return NextResponse.redirect(`${origin}/login?error=confirm`);
}
