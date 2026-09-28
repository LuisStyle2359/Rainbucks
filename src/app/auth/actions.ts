"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = {
  error?: string;
  success?: string;
  // Return the inputs so the form is not empty after an error.
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
    return { error: "Please enter your name (at least 2 characters).", fields };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { error: "Please enter a valid email address.", fields };
  }
  if (password.length < 8) {
    return { error: "The password must be at least 8 characters long.", fields };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  // Supabase does NOT store the password in plain text, only as a bcrypt hash.
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

  // If "Confirm email" is switched off in Supabase, the user is signed in right away.
  if (data.session) {
    redirect("/casino");
  }

  return {
    success:
      "Almost done! We sent you an email. Click the link in it to confirm your account.",
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
    return { error: "Please enter your email and password.", fields };
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
      return "Email or password is incorrect.";
    case "email_not_confirmed":
      return "Please confirm your email address first (check your inbox).";
    case "user_already_exists":
    case "email_exists":
      return "An account with this email address already exists.";
    case "weak_password":
      return "The password is too weak. Please choose a longer one.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return `Something went wrong: ${fallback}`;
  }
}
