"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, ErrorMessage, Field, Input, Select } from "@/components/ui";
import type { ItemFormState } from "./actions";
import type { InventoryRow } from "@/lib/queries/inventory";
import type { Branch } from "@/lib/queries/transactions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function ItemForm({
  action,
  item,
  branches,
  submitLabel = "Save item",
}: {
  action: (state: ItemFormState, formData: FormData) => Promise<ItemFormState>;
  item?: InventoryRow | null;
  branches?: Branch[] | null;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState<ItemFormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Item name">
          <Input
            name="name"
            required
            maxLength={200}
            defaultValue={item?.name}
            placeholder="Portland cement"
          />
        </Field>

        <Field label="Brand">
          <Input name="brand" maxLength={200} defaultValue={item?.brand} />
        </Field>

        <Field label="Color">
          <Input name="color" maxLength={100} defaultValue={item?.color} />
        </Field>

        <Field label="Supplier">
          <Input
            name="supplier_name"
            maxLength={200}
            defaultValue={item?.supplier_name}
          />
        </Field>

        <Field label="Articles">
          <Input
            name="articles"
            maxLength={200}
            defaultValue={item?.articles}
          />
        </Field>

        <Field label="Unit">
          <Input
            name="unit"
            required
            maxLength={50}
            defaultValue={item?.unit ?? "pc"}
            placeholder="pc, box, sack…"
          />
        </Field>

        <Field label="Type">
          <Select name="product_type" defaultValue={item?.product_type ?? "general"}>
            <option value="general">General</option>
            <option value="equipment">Equipment</option>
          </Select>
        </Field>

        {branches && branches.length > 0 ? (
          <Field label="Branch">
            <Select name="branch_id" defaultValue={item?.branch_id}>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field label="Quantity">
          <Input
            name="quantity"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={item?.quantity}
          />
        </Field>

        <Field label="Unit price">
          <Input
            name="unit_price"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={item?.unit_price}
          />
        </Field>

        <Field label="Selling price">
          <Input
            name="selling_price"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={item?.selling_price}
          />
        </Field>

        <Field label="Delivery receipt #">
          <Input
            name="delivery_receipt_num"
            maxLength={100}
            defaultValue={item?.delivery_receipt_num}
          />
        </Field>
      </div>

      <ErrorMessage>{state.error}</ErrorMessage>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
