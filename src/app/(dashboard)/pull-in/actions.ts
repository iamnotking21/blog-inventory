"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { query, queryOne, transaction } from "@/lib/db";
import { branchScope, requireRole } from "@/lib/auth";

const PullInSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  brand: z.string().trim().max(200).optional().default(""),
  color: z.string().trim().max(100).optional().default(""),
  supplier_name: z.string().trim().max(200).optional().default(""),
  articles: z.string().trim().max(200).optional().default(""),
  unit: z.string().trim().min(1, "Unit is required").max(50),
  product_type: z.enum(["general", "equipment"]),
  quantity: z.coerce.number().gt(0, "Quantity must be greater than zero"),
  unit_price: z.coerce.number().min(0, "Unit price cannot be negative"),
  selling_price: z.coerce.number().min(0, "Selling price cannot be negative"),
  delivery_receipt_num: z.string().trim().max(100).optional().default(""),
  branch_id: z.coerce.number().int().positive().optional(),
});

export type PullInFormState = { error?: string };

function readForm(formData: FormData) {
  return {
    name: formData.get("name"),
    brand: formData.get("brand"),
    color: formData.get("color"),
    supplier_name: formData.get("supplier_name"),
    articles: formData.get("articles"),
    unit: formData.get("unit"),
    product_type: formData.get("product_type"),
    quantity: formData.get("quantity"),
    unit_price: formData.get("unit_price"),
    selling_price: formData.get("selling_price"),
    delivery_receipt_num: formData.get("delivery_receipt_num"),
    branch_id: formData.get("branch_id") || undefined,
  };
}

function revalidatePullIn() {
  revalidatePath("/pull-in");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
}

export async function createPullIn(
  _prev: PullInFormState,
  formData: FormData,
): Promise<PullInFormState> {
  const session = await requireRole("super_admin", "branch_user");

  const parsed = PullInSchema.safeParse(readForm(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  // Never trust a submitted branch_id for a non-super_admin — pin to session.
  const branchId =
    session.role === "super_admin" && data.branch_id
      ? data.branch_id
      : session.branchId;

  let created = false;

  try {
    await query(
      `insert into pull_in_transactions
         (branch_id, name, brand, color, supplier_name, articles, unit,
          product_type, quantity, unit_price, selling_price, delivery_receipt_num)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        branchId,
        data.name,
        data.brand,
        data.color,
        data.supplier_name,
        data.articles,
        data.unit,
        data.product_type,
        data.quantity,
        data.unit_price,
        data.selling_price,
        data.delivery_receipt_num,
      ],
    );
    created = true;
  } catch {
    return { error: "Could not create the pull-in request. Please try again." };
  }

  if (created) {
    revalidatePullIn();
    redirect("/pull-in");
  }

  return {};
}

type PullInLockedRow = {
  id: string;
  branch_id: string;
  name: string;
  brand: string;
  color: string;
  supplier_name: string;
  articles: string;
  unit: string;
  product_type: string;
  quantity: string;
  unit_price: string;
  selling_price: string;
  delivery_receipt_num: string;
  status: string;
};

/**
 * Marks a pending pull-in as received and folds the stock into inventory.
 *
 * Merge choice: if an active inventory_items row already exists for the same
 * branch + name + brand + color, we add this quantity onto it (and refresh
 * unit_price/selling_price to the latest delivery) instead of inserting a
 * duplicate row. This mirrors the legacy PHP behavior, where receiving stock
 * for an item the branch already carries was expected to top up the existing
 * card rather than fragment it into lookalike rows on the inventory screen.
 * A genuinely new item (new name/brand/color combo) still gets its own row.
 */
export async function receivePullIn(id: number): Promise<{ error?: string }> {
  const session = await requireRole("super_admin", "branch_user");
  const scope = branchScope(session);

  try {
    await transaction(async (run) => {
      const rows = await run<PullInLockedRow>(
        `select id, branch_id, name, brand, color, supplier_name, articles, unit,
                product_type, quantity, unit_price, selling_price, delivery_receipt_num, status
           from pull_in_transactions
          where id = $1
            and ($2::bigint is null or branch_id = $2)
          for update`,
        [id, scope],
      );

      const row = rows[0];

      if (!row) {
        throw new Error("Pull-in request not found.");
      }

      if (row.status !== "pending") {
        throw new Error("Only pending requests can be received.");
      }

      const existing = await run<{ id: string }>(
        `select id
           from inventory_items
          where branch_id = $1
            and status = 'active'
            and lower(name) = lower($2)
            and lower(brand) = lower($3)
            and lower(color) = lower($4)
          for update`,
        [row.branch_id, row.name, row.brand, row.color],
      );

      if (existing[0]) {
        await run(
          `update inventory_items
              set quantity = quantity + $1,
                  unit_price = $2,
                  selling_price = $3,
                  supplier_name = $4,
                  articles = $5,
                  unit = $6,
                  product_type = $7,
                  delivery_receipt_num = $8
            where id = $9`,
          [
            row.quantity,
            row.unit_price,
            row.selling_price,
            row.supplier_name,
            row.articles,
            row.unit,
            row.product_type,
            row.delivery_receipt_num,
            existing[0].id,
          ],
        );
      } else {
        await run(
          `insert into inventory_items
             (branch_id, name, brand, color, supplier_name, articles, unit,
              product_type, quantity, unit_price, selling_price, delivery_receipt_num)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            row.branch_id,
            row.name,
            row.brand,
            row.color,
            row.supplier_name,
            row.articles,
            row.unit,
            row.product_type,
            row.quantity,
            row.unit_price,
            row.selling_price,
            row.delivery_receipt_num,
          ],
        );
      }

      await run(
        `update pull_in_transactions set status = 'received' where id = $1`,
        [row.id],
      );

      await run(
        `insert into transactions (branch_id, description, status)
         values ($1, $2, 'completed')`,
        [
          row.branch_id,
          `Received pull-in #${row.id}: ${row.quantity} ${row.unit} of ${row.name}`,
        ],
      );
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not receive the pull-in.",
    };
  }

  revalidatePullIn();
  return {};
}

export async function cancelPullIn(id: number): Promise<{ error?: string }> {
  const session = await requireRole("super_admin", "branch_user");
  const scope = branchScope(session);

  const updated = await queryOne<{ id: string }>(
    `update pull_in_transactions
        set status = 'cancelled'
      where id = $1
        and status = 'pending'
        and ($2::bigint is null or branch_id = $2)
      returning id`,
    [id, scope],
  );

  if (!updated) {
    return { error: "Only pending requests can be cancelled." };
  }

  revalidatePullIn();
  return {};
}
