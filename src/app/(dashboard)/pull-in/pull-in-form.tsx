"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, ErrorMessage, Field, Input, Select } from "@/components/ui";
import { createPullIn, type PullInFormState } from "./actions";
import type { Branch } from "@/lib/queries/transactions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Submitting…" : "Create pull-in request"}
    </Button>
  );
}

export function PullInForm({
  branches,
  isSuperAdmin,
  currentBranchName,
}: {
  branches: Branch[];
  isSuperAdmin: boolean;
  currentBranchName: string;
}) {
  const [state, formAction] = useActionState<PullInFormState, FormData>(
    createPullIn,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Item name">
          <Input name="name" required maxLength={200} />
        </Field>
        <Field label="Brand">
          <Input name="brand" maxLength={200} />
        </Field>
        <Field label="Color">
          <Input name="color" maxLength={100} />
        </Field>
        <Field label="Supplier">
          <Input name="supplier_name" maxLength={200} />
        </Field>
        <Field label="Articles">
          <Input name="articles" maxLength={200} />
        </Field>
        <Field label="Unit">
          <Input name="unit" required maxLength={50} defaultValue="pc" />
        </Field>
        <Field label="Product type">
          <Select name="product_type" required defaultValue="general">
            <option value="general">General</option>
            <option value="equipment">Equipment</option>
          </Select>
        </Field>
        {isSuperAdmin ? (
          <Field label="Branch">
            <Select name="branch_id" required defaultValue="">
              <option value="" disabled>
                Select a branch
              </option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Branch" hint="Pinned to your assigned branch">
            <Input value={currentBranchName} disabled readOnly />
          </Field>
        )}
        <Field label="Quantity">
          <Input
            name="quantity"
            type="number"
            step="0.01"
            min="0.01"
            required
          />
        </Field>
        <Field label="Unit price">
          <Input name="unit_price" type="number" step="0.01" min="0" required />
        </Field>
        <Field label="Selling price">
          <Input
            name="selling_price"
            type="number"
            step="0.01"
            min="0"
            required
          />
        </Field>
        <Field label="Delivery receipt number">
          <Input name="delivery_receipt_num" maxLength={100} />
        </Field>
      </div>

      <ErrorMessage>{state.error}</ErrorMessage>

      <SubmitButton />
    </form>
  );
}
