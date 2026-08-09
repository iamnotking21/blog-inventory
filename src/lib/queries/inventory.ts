import "server-only";

import { query, queryOne } from "@/lib/db";
import { LOW_STOCK_THRESHOLD } from "@/lib/utils";

export type InventoryRow = {
  id: string;
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
  amount: string;
  delivery_receipt_num: string;
  status: string;
  created_at: string;
  branch_id: string;
  branch_name: string;
};

/**
 * `branchId` of null means "every branch" and is only ever passed for a
 * super_admin. For any other role the caller passes their own branch, so the
 * scoping is enforced here in SQL rather than by hiding rows in the view.
 */
export function listInventory(options: {
  branchId: number | null;
  search?: string;
  productType?: string;
  lowStockOnly?: boolean;
  limit?: number;
}): Promise<InventoryRow[]> {
  const { branchId, search, productType, lowStockOnly, limit = 200 } = options;

  return query<InventoryRow>(
    `select i.*, b.name as branch_name
       from inventory_items i
       join branches b on b.id = i.branch_id
      where i.status = 'active'
        and ($1::bigint is null or i.branch_id = $1)
        and ($2::text is null or i.name ilike '%' || $2 || '%'
                              or i.brand ilike '%' || $2 || '%'
                              or i.supplier_name ilike '%' || $2 || '%')
        and ($3::text is null or i.product_type = $3)
        and ($4::boolean is false or i.quantity < $5)
      order by i.created_at desc
      limit $6`,
    [
      branchId,
      search?.trim() || null,
      productType || null,
      Boolean(lowStockOnly),
      LOW_STOCK_THRESHOLD,
      limit,
    ],
  );
}

export function getInventoryItem(
  id: number,
  branchId: number | null,
): Promise<InventoryRow | null> {
  return queryOne<InventoryRow>(
    `select i.*, b.name as branch_name
       from inventory_items i
       join branches b on b.id = i.branch_id
      where i.id = $1
        and ($2::bigint is null or i.branch_id = $2)`,
    [id, branchId],
  );
}

export type InventorySummary = {
  item_count: string;
  total_quantity: string;
  stock_value: string;
  retail_value: string;
  low_stock_count: string;
};

export function getInventorySummary(
  branchId: number | null,
): Promise<InventorySummary | null> {
  return queryOne<InventorySummary>(
    `select count(*)                                   as item_count,
            coalesce(sum(quantity), 0)                 as total_quantity,
            coalesce(sum(amount), 0)                   as stock_value,
            coalesce(sum(quantity * selling_price), 0) as retail_value,
            count(*) filter (where quantity < $2)     as low_stock_count
       from inventory_items
      where status = 'active'
        and ($1::bigint is null or branch_id = $1)`,
    [branchId, LOW_STOCK_THRESHOLD],
  );
}

export type BranchBreakdown = {
  branch_id: string;
  branch_name: string;
  item_count: string;
  stock_value: string;
};

export function getBranchBreakdown(
  branchId: number | null,
): Promise<BranchBreakdown[]> {
  return query<BranchBreakdown>(
    `select b.id                        as branch_id,
            b.name                      as branch_name,
            count(i.id)                 as item_count,
            coalesce(sum(i.amount), 0)  as stock_value
       from branches b
       left join inventory_items i
         on i.branch_id = b.id and i.status = 'active'
      where ($1::bigint is null or b.id = $1)
      group by b.id, b.name
      order by stock_value desc`,
    [branchId],
  );
}
