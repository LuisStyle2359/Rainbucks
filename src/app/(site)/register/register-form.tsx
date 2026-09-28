"use client";

import { useActionState } from "react";
import { register, type FormState } from "@/app/auth/actions";
import { Alert, Field, SubmitButton } from "@/components/site/auth-card";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    register,
    {},
  );

  if (state.success) {
    return <Alert type="success">{state.success}</Alert>;
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert type="error">{state.error}</Alert>}
      <Field
        label="Name"
        name="name"
        type="text"
        autoComplete="name"
        required
        minLength={2}
        defaultValue={state.fields?.name}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.fields?.email}
      />
      <Field
        label="Password (at least 8 characters)"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <SubmitButton pending={pending}>Sign up</SubmitButton>
    </form>
  );
}
