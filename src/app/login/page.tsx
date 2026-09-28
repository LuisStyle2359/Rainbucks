import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const initialError =
    error === "confirm"
      ? "Der Bestätigungslink ist ungültig oder abgelaufen. Bitte versuche es erneut."
      : undefined;

  return (
    <AuthCard title="Willkommen zurück" subtitle="Logge dich in dein Konto ein.">
      <LoginForm initialError={initialError} />
      <p className="mt-6 text-center text-sm text-slate-600">
        Noch kein Konto?{" "}
        <Link href="/register" className="font-semibold text-indigo-600 hover:underline">
          Jetzt registrieren
        </Link>
      </p>
    </AuthCard>
  );
}
