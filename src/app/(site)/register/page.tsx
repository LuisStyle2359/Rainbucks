import Link from "next/link";
import { AuthCard } from "@/components/site/auth-card";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <AuthCard title="Konto erstellen" subtitle="Kostenlos und in wenigen Sekunden.">
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-zinc-400">
        Schon registriert?{" "}
        <Link href="/login" className="font-semibold text-toxic hover:underline">
          Zum Login
        </Link>
      </p>
    </AuthCard>
  );
}
