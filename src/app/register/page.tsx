import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <AuthCard title="Konto erstellen" subtitle="Kostenlos und in wenigen Sekunden.">
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-slate-600">
        Schon registriert?{" "}
        <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
          Zum Login
        </Link>
      </p>
    </AuthCard>
  );
}
