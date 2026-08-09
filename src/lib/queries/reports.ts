import "server-only";

import { query, queryOne } from "@/lib/db";

export type ReportSummary = {
  pull_in_count: string;
  pull_in_value: string;
  pull_out_count: string;
  pull_out_value: string;
  net_movement: string;
  items_touched: string;
};

/**
 * `branchId` of null means "every branch" — only ever passed for a
 * super_admin, matching the scoping convention in queries/inventory.ts.
 */
export function getReportSummary(options: {
  branchId: number | null;
  from: string;
  to: string;
}): Promise<ReportSummary | null> {
  const { branchId, from, to } = options;

  return queryOne<ReportSummary>(
    `select
       (select count(*) from pull_in_transactions
         where created_at >= $2 and created_at < $3::date + interval '1 day'
           and ($1::bigint is null or branch_id = $1))                          as pull_in_count,
       (select coalesce(sum(amount), 0) from pull_in_transactions
         where created_at >= $2 and created_at < $3::date + interval '1 day'
           and ($1::bigint is null or branch_id = $1))                          as pull_in_value,
       (select count(*) from pull_out_transactions
         where created_at >= $2 and created_at < $3::date + interval '1 day'
           and ($1::bigint is null or branch_id = $1
                or from_branch_id = $1))                                        as pull_out_count,
       (select coalesce(sum(amount), 0) from pull_out_transactions
         where created_at >= $2 and created_at < $3::date + interval '1 day'
           and ($1::bigint is null or branch_id = $1
                or from_branch_id = $1))                                        as pull_out_value,
       (select coalesce(sum(amount), 0) from pull_in_transactions
         where created_at >= $2 and created_at < $3::date + interval '1 day'
           and ($1::bigint is null or branch_id = $1))
       -
       (select coalesce(sum(amount), 0) from pull_out_transactions
         where created_at >= $2 and created_at < $3::date + interval '1 day'
           and ($1::bigint is null or branch_id = $1
                or from_branch_id = $1))                                        as net_movement,
       (select count(distinct name) from (
          select name from pull_in_transactions
           where created_at >= $2 and created_at < $3::date + interval '1 day'
             and ($1::bigint is null or branch_id = $1)
          union
          select i.name from pull_out_transactions p
           join inventory_items i on i.id = p.inventory_item_id
           where p.created_at >= $2 and p.created_at < $3::date + interval '1 day'
             and ($1::bigint is null or p.branch_id = $1 or p.from_branch_id = $1)
        ) touched)                                                              as items_touched`,
    [branchId, from, to],
  );
}

export type TopItem = {
  name: string;
  brand: string;
  branch_name: string;
  quantity: string;
  amount: string;
};

export function getTopItems(options: {
  branchId: number | null;
  from: string;
  to: string;
  limit?: number;
}): Promise<TopItem[]> {
  const { branchId, from, to, limit = 10 } = options;

  return query<TopItem>(
    `select i.name, i.brand, b.name as branch_name, i.quantity, i.amount
       from inventory_items i
       join branches b on b.id = i.branch_id
      where i.status = 'active'
        and i.created_at >= $2 and i.created_at < $3::date + interval '1 day'
        and ($1::bigint is null or i.branch_id = $1)
      order by i.amount desc
      limit $4`,
    [branchId, from, to, limit],
  );
}

export type SupplierBreakdown = {
  supplier_name: string;
  pull_in_count: string;
  pull_in_value: string;
};

export function getSupplierBreakdown(options: {
  branchId: number | null;
  from: string;
  to: string;
}): Promise<SupplierBreakdown[]> {
  const { branchId, from, to } = options;

  return query<SupplierBreakdown>(
    `select coalesce(nullif(trim(supplier_name), ''), 'Unspecified') as supplier_name,
            count(*)                  as pull_in_count,
            coalesce(sum(amount), 0)  as pull_in_value
       from pull_in_transactions
      where created_at >= $2 and created_at < $3::date + interval '1 day'
        and ($1::bigint is null or branch_id = $1)
      group by 1
      order by pull_in_value desc`,
    [branchId, from, to],
  );
}

export type MonthlyMovement = {
  month: string;
  pull_in_value: string;
  pull_out_value: string;
};

/**
 * Always returns exactly `months` rows, oldest first, one per calendar month —
 * `generate_series` seeds the months so a quiet month still shows a zero bar
 * instead of vanishing from the chart.
 */
export function getMonthlyMovement(options: {
  branchId: number | null;
  months: number;
}): Promise<MonthlyMovement[]> {
  const { branchId, months } = options;

  return query<MonthlyMovement>(
    `select to_char(m.month, 'YYYY-MM')       as month,
            coalesce(pin.pull_in_value, 0)    as pull_in_value,
            coalesce(pout.pull_out_value, 0)  as pull_out_value
       from generate_series(
              date_trunc('month', now()) - ($2::int - 1) * interval '1 month',
              date_trunc('month', now()),
              interval '1 month'
            ) as m(month)
       left join (
              select date_trunc('month', created_at) as month,
                     sum(amount) as pull_in_value
                from pull_in_transactions
               where ($1::bigint is null or branch_id = $1)
               group by 1
            ) pin on pin.month = m.month
       left join (
              select date_trunc('month', created_at) as month,
                     sum(amount) as pull_out_value
                from pull_out_transactions
               where ($1::bigint is null or branch_id = $1 or from_branch_id = $1)
               group by 1
            ) pout on pout.month = m.month
      order by m.month`,
    [branchId, months],
  );
}
