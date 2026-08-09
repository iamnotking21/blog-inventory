"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, ErrorMessage, Field, Input, Select } from "@/components/ui";
import { formatNumber } from "@/lib/utils";
import { createPullOut, type PullOutFormState } from "./actions";
import type { InventoryRow } from "@/lib/queries/inventory";
import type { Branch } from "@/lib/queries/transactions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Submitting…" : "Create pull-out request"}
    </Button>
  );
}

export function PullOutForm({
  items,
  branches,
}: {
  items: InventoryRow[];
  branches: Branch[];
}) {
  const [state, formAction] = useActionState<PullOutFormState, FormData>(
    createPullOut,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Source item" hint="From your branch's current stock">
          <Select name="inventory_item_id" required defaultValue="">
            <option value="" disabled>
              Select an item
            </option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} {item.brand ? `(${item.brand})` : ""} —{" "}
                {formatNumber(item.quantity)} {item.unit} available
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Destination branch">
          <Select name="to_branch_id" required defaultValue="">
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
        <Field label="Quantity">
          <Input
            name="quantity"
            type="number"
            step="0.01"
            min="0.01"
            required
          />
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
