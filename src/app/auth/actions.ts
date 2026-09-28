"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = {
  error?: string;
  success?: string;
  // Eingaben zurückgeben, damit das Formular nach einem Fehler nicht leer ist.
  fields?: { name?: string; email?: string };
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fields = { name, email };

  if (name.length < 2) {
    return { error: "Bitte gib deinen Namen ein (mind. 2 Zeichen).", fields };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { error: "Bitte gib eine gültige E-Mail-Adresse ein.", fields };
  }
  if (password.length < 8) {
    return { error: "Das Passwort muss mindestens 8 Zeichen lang sein.", fields };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  // Supabase speichert das Passwort NICHT im Klartext, sondern als bcrypt-Hash.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    return { error: translateAuthError(error.code, error.message), fields };
  }

  // Ist "Confirm email" in Supabase ausgeschaltet, ist man sofort eingeloggt.
  if (data.session) {
    redirect("/casino");
  }

  return {
    success:
      "Fast geschafft! Wir haben dir eine E-Mail geschickt. Klicke auf den Link darin, um dein Konto zu bestätigen.",
  };
}

export async function login(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fields = { email };

  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort eingeben.", fields };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: translateAuthError(error.code, error.message), fields };
  }

  redirect("/casino");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function translateAuthError(code: string | undefined, fallback: string) {
  switch (code) {
    case "invalid_credentials":
      return "E-Mail oder Passwort ist falsch.";
    case "email_not_confirmed":
      return "Bitte bestätige zuerst deine E-Mail-Adresse (siehe Posteingang).";
    case "user_already_exists":
    case "email_exists":
      return "Für diese E-Mail-Adresse gibt es bereits ein Konto.";
    case "weak_password":
      return "Das Passwort ist zu schwach. Bitte wähle ein längeres Passwort.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Zu viele Versuche. Bitte warte kurz und versuche es erneut.";
    default:
      return `Etwas ist schiefgelaufen: ${fallback}`;
  }
}
