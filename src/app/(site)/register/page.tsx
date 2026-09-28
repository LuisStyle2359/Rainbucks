import Link from "next/link";
import { AuthCard } from "@/components/site/auth-card";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <AuthCard title="Create account" subtitle="Free and done in a few seconds.">
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-zinc-400">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-toxic hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
