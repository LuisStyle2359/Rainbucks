import Link from "next/link";
import { AuthCard } from "@/components/site/auth-card";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const initialError =
    error === "confirm"
      ? "The confirmation link is invalid or has expired. Please try again."
      : undefined;

  return (
    <AuthCard title="Welcome back" subtitle="Log in to your account.">
      <LoginForm initialError={initialError} />
      <p className="mt-6 text-center text-sm text-zinc-400">
        No account yet?{" "}
        <Link href="/register" className="font-semibold text-toxic hover:underline">
          Sign up now
        </Link>
      </p>
    </AuthCard>
  );
}
