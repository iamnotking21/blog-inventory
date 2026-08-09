"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, ErrorMessage, Field, Input } from "@/components/ui";
import {
  resetAccountPassword,
  toggleAccountStatus,
  type ResetPasswordState,
} from "./actions";

function ToggleButton({ status }: { status: string }) {
  const { pending } = useFormStatus();
  const activating = status !== "active";

  return (
    <Button
      type="submit"
      variant={activating ? "secondary" : "danger"}
      size="sm"
      disabled={pending}
    >
      {pending ? "Saving…" : activating ? "Activate" : "Deactivate"}
    </Button>
  );
}

function ResetSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Set password"}
    </Button>
  );
}

export function AccountActions({
  id,
  status,
  isSelf,
}: {
  id: number;
  status: string;
  isSelf: boolean;
}) {
  const [showReset, setShowReset] = React.useState(false);
  const [toggleError, setToggleError] = React.useState<string | null>(null);
  const resetAction = resetAccountPassword.bind(null, id);
  const [resetState, resetFormAction] = useActionState<
    ResetPasswordState,
    FormData
  >(resetAction, {});

  async function handleToggle() {
    setToggleError(null);
    try {
      await toggleAccountStatus(id);
    } catch (error) {
      setToggleError(
        error instanceof Error ? error.message : "Could not update status.",
      );
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {isSelf ? (
          <span className="text-muted text-xs">This is your account</span>
        ) : (
          <form action={handleToggle}>
            <ToggleButton status={status} />
          </form>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowReset((value) => !value)}
        >
          {showReset ? "Cancel" : "Reset password"}
        </Button>
      </div>

      <ErrorMessage>{toggleError}</ErrorMessage>

      {showReset ? (
        <form
          action={resetFormAction}
          className="surface-sunken space-y-3 rounded-lg border p-3"
        >
          <Field label="New password">
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </Field>
          <Field label="Confirm password">
            <Input
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </Field>
          <ErrorMessage>{resetState.error}</ErrorMessage>
          {resetState.success ? (
            <p className="text-sm text-[color:var(--positive)]">
              Password updated.
            </p>
          ) : null}
          <ResetSubmitButton />
        </form>
      ) : null}
    </div>
  );
}
