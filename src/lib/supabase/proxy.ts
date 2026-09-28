import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Seiten, die nur eingeloggte Nutzer sehen dürfen.
const PROTECTED_ROUTES = ["/dashboard", "/casino"];
// Seiten, die eingeloggte Nutzer nicht mehr brauchen.
const AUTH_ROUTES = ["/login", "/register"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Prüft das Login-Token und erneuert es bei Bedarf.
  // Wichtig: Zwischen createServerClient und getClaims keinen weiteren Code einfügen.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);

  const path = request.nextUrl.pathname;

  // Weiterleitung, die erneuerte Session-Cookies mitnimmt.
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!isLoggedIn && PROTECTED_ROUTES.some((route) => path.startsWith(route))) {
    return redirectTo("/login");
  }

  if (isLoggedIn && AUTH_ROUTES.some((route) => path.startsWith(route))) {
    return redirectTo("/casino");
  }

  return response;
}
