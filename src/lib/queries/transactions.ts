import "server-only";

import { query, queryOne } from "@/lib/db";

export type PullInRow = {
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

export function listPullIn(options: {
  branchId: number | null;
  status?: string;
  limit?: number;
}): Promise<PullInRow[]> {
  const { branchId, status, limit = 200 } = options;

  return query<PullInRow>(
    `select p.*, b.name as branch_name
       from pull_in_transactions p
       join branches b on b.id = p.branch_id
      where ($1::bigint is null or p.branch_id = $1)
        and ($2::text is null or p.status = $2)
      order by p.created_at desc
      limit $3`,
    [branchId, status || null, limit],
  );
}

export function getPullIn(
  id: number,
  branchId: number | null,
): Promise<PullInRow | null> {
  return queryOne<PullInRow>(
    `select p.*, b.name as branch_name
       from pull_in_transactions p
       join branches b on b.id = p.branch_id
      where p.id = $1 and ($2::bigint is null or p.branch_id = $2)`,
    [id, branchId],
  );
}

export type PullOutRow = {
  id: string;
  brand: string;
  color: string;
  unit: string;
  product_type: string;
  quantity: string;
  selling_price: string;
  amount: string;
  delivery_receipt_num: string;
  status: string;
  created_at: string;
  branch_id: string;
  branch_name: string;
  from_branch_name: string | null;
  item_name: string | null;
};

export function listPullOut(options: {
  branchId: number | null;
  status?: string;
  limit?: number;
}): Promise<PullOutRow[]> {
  const { branchId, status, limit = 200 } = options;

  return query<PullOutRow>(
    `select p.*,
            b.name  as branch_name,
            fb.name as from_branch_name,
            i.name  as item_name
       from pull_out_transactions p
       join branches b       on b.id = p.branch_id
       left join branches fb on fb.id = p.from_branch_id
       left join inventory_items i on i.id = p.inventory_item_id
      where ($1::bigint is null or p.branch_id = $1 or p.from_branch_id = $1)
        and ($2::text is null or p.status = $2)
      order by p.created_at desc
      limit $3`,
    [branchId, status || null, limit],
  );
}

export function getPullOut(
  id: number,
  branchId: number | null,
): Promise<PullOutRow | null> {
  return queryOne<PullOutRow>(
    `select p.*,
            b.name  as branch_name,
            fb.name as from_branch_name,
            i.name  as item_name
       from pull_out_transactions p
       join branches b       on b.id = p.branch_id
       left join branches fb on fb.id = p.from_branch_id
       left join inventory_items i on i.id = p.inventory_item_id
      where p.id = $1
        and ($2::bigint is null or p.branch_id = $2 or p.from_branch_id = $2)`,
    [id, branchId],
  );
}

export type MovementSummary = {
  pending_in: string;
  pending_out: string;
  received_30d: string;
  released_30d: string;
};

export function getMovementSummary(
  branchId: number | null,
): Promise<MovementSummary | null> {
  return queryOne<MovementSummary>(
    `select
       (select count(*) from pull_in_transactions
         where status = 'pending' and ($1::bigint is null or branch_id = $1))  as pending_in,
       (select count(*) from pull_out_transactions
         where status = 'pending' and ($1::bigint is null or branch_id = $1))  as pending_out,
       (select coalesce(sum(amount), 0) from pull_in_transactions
         where status = 'received' and created_at > now() - interval '30 days'
           and ($1::bigint is null or branch_id = $1))                          as received_30d,
       (select coalesce(sum(amount), 0) from pull_out_transactions
         where status = 'released' and created_at > now() - interval '30 days'
           and ($1::bigint is null or branch_id = $1))                          as released_30d`,
    [branchId],
  );
}

export type Branch = { id: string; name: string; is_main: boolean };

export function listBranches(): Promise<Branch[]> {
  return query<Branch>(
    "select id, name, is_main from branches order by is_main desc, name",
  );
}
