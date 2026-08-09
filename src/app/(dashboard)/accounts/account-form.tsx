"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, ErrorMessage, Field, Input, Select } from "@/components/ui";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";
import type { AccountFormState } from "./actions";
import type { Branch } from "@/lib/queries/transactions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create account"}
    </Button>
  );
}

export function AccountForm({
  action,
  branches,
}: {
  action: (
    state: AccountFormState,
    formData: FormData,
  ) => Promise<AccountFormState>;
  branches: Branch[];
}) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name">
          <Input name="first_name" required maxLength={100} />
        </Field>

        <Field label="Last name">
          <Input name="last_name" required maxLength={100} />
        </Field>

        <Field label="Middle name" hint="Optional">
          <Input name="middle_name" maxLength={100} />
        </Field>

        <Field label="Username">
          <Input name="username" required maxLength={50} autoComplete="off" />
        </Field>

        <Field label="Password" hint="At least 8 characters">
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

        <Field label="Role">
          <Select name="role" required defaultValue="worker">
            {ROLES.map((role: Role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Branch">
          <Select name="branch_id" required>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <ErrorMessage>{state.error}</ErrorMessage>

      <SubmitButton />
    </form>
  );
}
