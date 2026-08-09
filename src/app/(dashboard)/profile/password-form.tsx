"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, ErrorMessage, Field, Input } from "@/components/ui";
import { changeOwnPassword, type ChangePasswordState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Change password"}
    </Button>
  );
}

export function PasswordForm() {
  const [state, formAction] = useActionState<ChangePasswordState, FormData>(
    changeOwnPassword,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Current password">
        <Input
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field label="New password" hint="At least 8 characters">
        <Input
          name="new_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>

      <Field label="Confirm new password">
        <Input
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>

      <ErrorMessage>{state.error}</ErrorMessage>

      {state.success ? (
        <p className="text-sm text-[color:var(--positive)]">
          Password changed successfully.
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
