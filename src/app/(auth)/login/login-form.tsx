"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, ErrorMessage, Field, Input } from "@/components/ui";
import { login, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Username">
        <Input
          name="username"
          autoComplete="username"
          autoFocus
          required
          placeholder="admin"
        />
      </Field>

      <Field label="Password">
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </Field>

      <ErrorMessage>{state.error}</ErrorMessage>

      <SubmitButton />
    </form>
  );
}
