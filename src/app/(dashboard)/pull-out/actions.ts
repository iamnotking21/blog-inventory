"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { queryOne, transaction } from "@/lib/db";
import { branchScope, requireRole } from "@/lib/auth";

const PullOutSchema = z.object({
  inventory_item_id: z.coerce.number().int().positive("Select an item"),
  to_branch_id: z.coerce.number().int().positive("Select a destination branch"),
  quantity: z.coerce.number().gt(0, "Quantity must be greater than zero"),
  selling_price: z.coerce.number().min(0, "Selling price cannot be negative"),
  delivery_receipt_num: z.string().trim().max(100).optional().default(""),
});

export type PullOutFormState = { error?: string };

function readForm(formData: FormData) {
  return {
    inventory_item_id: formData.get("inventory_item_id"),
    to_branch_id: formData.get("to_branch_id"),
    quantity: formData.get("quantity"),
    selling_price: formData.get("selling_price"),
    delivery_receipt_num: formData.get("delivery_receipt_num"),
  };
}

function revalidatePullOut() {
  revalidatePath("/pull-out");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
}

type SourceItemRow = {
  id: string;
  branch_id: string;
  name: string;
  brand: string;
  color: string;
  unit: string;
  product_type: string;
  quantity: string;
};

/**
 * Creates a pending pull-out request. This only records the request — the
 * source item's quantity is not touched until release, since the quantity
 * may still change (other pull-outs, corrections) before this one is acted on.
 */
export async function createPullOut(
  _prev: PullOutFormState,
  formData: FormData,
): Promise<PullOutFormState> {
  const session = await requireRole("super_admin", "branch_user");

  const parsed = PullOutSchema.safeParse(readForm(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  const scope = branchScope(session);

  try {
    await transaction(async (run) => {
      const items = await run<SourceItemRow>(
        `select id, branch_id, name, brand, color, unit, product_type, quantity
           from inventory_items
          where id = $1
            and status = 'active'
            and ($2::bigint is null or branch_id = $2)
          for update`,
        [data.inventory_item_id, scope],
      );

      const item = items[0];

      if (!item) {
        throw new Error("Source item not found in your branch.");
      }

      if (Number(item.quantity) < data.quantity) {
        throw new Error(
          `Only ${item.quantity} ${item.unit} available for this item.`,
        );
      }

      await run(
        `insert into pull_out_transactions
           (branch_id, from_branch_id, inventory_item_id, brand, color, unit,
            product_type, quantity, selling_price, delivery_receipt_num)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          data.to_branch_id,
          item.branch_id,
          item.id,
          item.brand,
          item.color,
          item.unit,
          item.product_type,
          data.quantity,
          data.selling_price,
          data.delivery_receipt_num,
        ],
      );
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not create the pull-out request. Please try again.",
    };
  }

  revalidatePullOut();
  redirect("/pull-out");
}

type PullOutLockedRow = {
  id: string;
  branch_id: string;
  from_branch_id: string | null;
  inventory_item_id: string | null;
  quantity: string;
  status: string;
};

export async function releasePullOut(id: number): Promise<{ error?: string }> {
  const session = await requireRole("super_admin", "branch_user");
  const scope = branchScope(session);

  try {
    await transaction(async (run) => {
      const rows = await run<PullOutLockedRow>(
        `select id, branch_id, from_branch_id, inventory_item_id, quantity, status
           from pull_out_transactions
          where id = $1
            and ($2::bigint is null or branch_id = $2 or from_branch_id = $2)
          for update`,
        [id, scope],
      );

      const row = rows[0];

      if (!row) {
        throw new Error("Pull-out request not found.");
      }

      if (row.status !== "pending") {
        throw new Error("Only pending requests can be released.");
      }

      if (!row.inventory_item_id) {
        throw new Error("Source item is no longer available.");
      }

      const items = await run<{ id: string; quantity: string }>(
        `select id, quantity from inventory_items where id = $1 for update`,
        [row.inventory_item_id],
      );

      const item = items[0];

      if (!item) {
        throw new Error("Source item is no longer available.");
      }

      // Re-check availability — it may have changed since the request was made.
      if (Number(item.quantity) < Number(row.quantity)) {
        throw new Error(
          `Only ${item.quantity} available now; cannot release ${row.quantity}.`,
        );
      }

      const decremented = await run<{ id: string }>(
        `update inventory_items
            set quantity = quantity - $1
          where id = $2 and quantity >= $1
          returning id`,
        [row.quantity, item.id],
      );

      if (!decremented[0]) {
        throw new Error("Not enough stock remaining to release this pull-out.");
      }

      await run(
        `update pull_out_transactions set status = 'released' where id = $1`,
        [row.id],
      );

      await run(
        `insert into transactions (branch_id, from_branch_id, description, status)
         values ($1, $2, $3, 'completed')`,
        [
          row.branch_id,
          row.from_branch_id,
          `Released pull-out #${row.id}: ${row.quantity} units`,
        ],
      );
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not release the pull-out.",
    };
  }

  revalidatePullOut();
  return {};
}

export async function cancelPullOut(id: number): Promise<{ error?: string }> {
  const session = await requireRole("super_admin", "branch_user");
  const scope = branchScope(session);

  const updated = await queryOne<{ id: string }>(
    `update pull_out_transactions
        set status = 'cancelled'
      where id = $1
        and status = 'pending'
        and ($2::bigint is null or branch_id = $2 or from_branch_id = $2)
      returning id`,
    [id, scope],
  );

  if (!updated) {
    return { error: "Only pending requests can be cancelled." };
  }

  revalidatePullOut();
  return {};
}
