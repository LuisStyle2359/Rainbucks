"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/app/auth/actions";
import { Alert, Field, SubmitButton } from "@/components/site/auth-card";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    login,
    { error: initialError },
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert type="error">{state.error}</Alert>}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.fields?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <SubmitButton pending={pending}>Log in</SubmitButton>
    </form>
  );
}
