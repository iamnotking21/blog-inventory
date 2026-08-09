"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { branchScope, requireRole } from "@/lib/auth";

const ItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  brand: z.string().trim().max(200).optional().default(""),
  color: z.string().trim().max(100).optional().default(""),
  supplier_name: z.string().trim().max(200).optional().default(""),
  articles: z.string().trim().max(200).optional().default(""),
  unit: z.string().trim().min(1, "Unit is required").max(50),
  product_type: z.enum(["general", "equipment"]),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
  unit_price: z.coerce.number().min(0, "Unit price cannot be negative"),
  selling_price: z.coerce.number().min(0, "Selling price cannot be negative"),
  delivery_receipt_num: z.string().trim().max(100).optional().default(""),
  branch_id: z.coerce.number().int().positive().optional(),
});

export type ItemFormState = { error?: string };

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

function revalidateInventory() {
  revalidatePath("/inventory");
  revalidatePath("/inventory/low-stock");
  revalidatePath("/dashboard");
}

export async function createItem(
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const session = await requireRole("super_admin", "branch_user");

  const parsed = ItemSchema.safeParse(readForm(formData));

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
      `insert into inventory_items
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
    return { error: "Could not create the item. Please try again." };
  }

  if (created) {
    revalidateInventory();
    redirect("/inventory");
  }

  return {};
}

export async function updateItem(
  id: number,
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const session = await requireRole("super_admin", "branch_user");

  const parsed = ItemSchema.safeParse(readForm(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  const scope = branchScope(session);
  const branchId =
    session.role === "super_admin" && data.branch_id
      ? data.branch_id
      : session.branchId;

  let updated: { id: string } | null = null;

  try {
    updated = await queryOne<{ id: string }>(
      `update inventory_items
          set branch_id = $1, name = $2, brand = $3, color = $4,
              supplier_name = $5, articles = $6, unit = $7, product_type = $8,
              quantity = $9, unit_price = $10, selling_price = $11,
              delivery_receipt_num = $12
        where id = $13
          and ($14::bigint is null or branch_id = $14)
        returning id`,
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
        id,
        scope,
      ],
    );
  } catch {
    return { error: "Could not update the item. Please try again." };
  }

  if (!updated) {
    return { error: "Item not found." };
  }

  revalidateInventory();
  redirect("/inventory");
}

export async function deleteItem(id: number): Promise<void> {
  const session = await requireRole("super_admin", "branch_user");
  const scope = branchScope(session);

  await query(
    `update inventory_items
        set status = 'inactive'
      where id = $1
        and ($2::bigint is null or branch_id = $2)`,
    [id, scope],
  );

  revalidateInventory();
}
