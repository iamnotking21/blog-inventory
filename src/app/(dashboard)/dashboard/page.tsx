import type { Metadata } from "next";
import Link from "next/link";
import { branchScope, requireSession } from "@/lib/auth";
import {
  getBranchBreakdown,
  getInventorySummary,
  listInventory,
} from "@/lib/queries/inventory";
import { getMovementSummary } from "@/lib/queries/transactions";
import { listPosts } from "@/lib/queries/content";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { StatGrid, type Stat } from "@/components/stat-card";
import { FadeIn } from "@/components/motion";
import { DataTable, type Column } from "@/components/data-table";
import {
  formatDate,
  formatMoney,
  formatNumber,
  toNumber,
} from "@/lib/utils";
import type { InventoryRow } from "@/lib/queries/inventory";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  const scope = branchScope(session);

  const [summary, movement, breakdown, lowStock, posts] = await Promise.all([
    getInventorySummary(scope),
    getMovementSummary(scope),
    getBranchBreakdown(scope),
    listInventory({ branchId: scope, lowStockOnly: true, limit: 6 }),
    listPosts({ limit: 3 }),
  ]);

  const stats: Stat[] = [
    {
      label: "Items in stock",
      value: toNumber(summary?.item_count),
      format: "number",
      hint: `${formatNumber(summary?.total_quantity)} units total`,
    },
    {
      label: "Stock value",
      value: toNumber(summary?.stock_value),
      format: "money",
      hint: `${formatMoney(summary?.retail_value)} at retail`,
    },
    {
      label: "Pending pull-ins",
      value: toNumber(movement?.pending_in),
      format: "number",
      hint: "Awaiting receipt",
      tone: toNumber(movement?.pending_in) > 0 ? "warning" : "default",
    },
    {
      label: "Low stock",
      value: toNumber(summary?.low_stock_count),
      format: "number",
      hint: "Below 10 units",
      tone: toNumber(summary?.low_stock_count) > 0 ? "danger" : "default",
    },
  ];

  const lowStockColumns: Column<InventoryRow>[] = [
    {
      key: "name",
      header: "Item",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.name}</p>
          <p className="text-muted truncate text-xs">
            {row.brand || "—"} · {row.branch_name}
          </p>
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Remaining",
      numeric: true,
      render: (row) => (
        <span className="font-medium text-[color:var(--danger)]">
          {formatNumber(row.quantity)} {row.unit}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={`Good to see you, ${session.fullName.split(" ")[0]}`}
        description={
          session.role === "super_admin"
            ? "Consolidated view across every branch."
            : `Scoped to ${session.branchName}.`
        }
      />

      <StatGrid stats={stats} />

      <div className="grid gap-6 lg:grid-cols-5">
        <FadeIn delay={0.1} className="lg:col-span-3">
          <Card>
            <CardHeader
              title="Low stock"
              description="Items below the ten-unit threshold"
              action={
                <Link
                  href="/inventory/low-stock"
                  className="text-sm font-medium text-[color:var(--accent)] hover:underline"
                >
                  View all
                </Link>
              }
            />
            <DataTable
              columns={lowStockColumns}
              rows={lowStock}
              getKey={(row) => row.id}
              emptyTitle="Everything is well stocked"
              emptyDescription="No item has fallen below ten units."
            />
          </Card>
        </FadeIn>

        <FadeIn delay={0.15} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader
              title={
                session.role === "super_admin" ? "By branch" : "Your branch"
              }
              description="Stock value distribution"
            />
            <div className="space-y-4 p-5">
              {breakdown.length === 0 ? (
                <EmptyState title="No branches yet" />
              ) : (
                breakdown.map((branch) => {
                  const max = Math.max(
                    ...breakdown.map((b) => toNumber(b.stock_value)),
                    1,
                  );
                  const share = (toNumber(branch.stock_value) / max) * 100;

                  return (
                    <div key={branch.branch_id} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate font-medium">
                          {branch.branch_name}
                        </span>
                        <span className="tabular text-muted shrink-0 text-xs">
                          {formatMoney(branch.stock_value)}
                        </span>
                      </div>
                      <div className="surface-sunken h-2 overflow-hidden rounded-full">
                        {/* Width is inline because the value is data-driven;
                            the bar is decorative next to the figure above. */}
                        <div
                          className="h-full rounded-full bg-[color:var(--accent)] transition-[width] duration-500"
                          style={{ width: `${Math.max(share, 2)}%` }}
                        />
                      </div>
                      <p className="text-muted text-xs">
                        {formatNumber(branch.item_count)} items
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </FadeIn>
      </div>

      <FadeIn delay={0.2}>
        <Card>
          <CardHeader
            title="Latest announcements"
            action={
              <Link
                href="/posts"
                className="text-sm font-medium text-[color:var(--accent)] hover:underline"
              >
                View all
              </Link>
            }
          />
          {posts.length === 0 ? (
            <EmptyState title="No announcements yet" />
          ) : (
            <ul className="divide-y">
              {posts.map((post) => (
                <li key={post.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{post.title}</h3>
                    <Badge tone="neutral">{formatDate(post.created_at)}</Badge>
                  </div>
                  <p className="text-muted mt-1 line-clamp-2 text-sm">
                    {post.description}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </FadeIn>
    </>
  );
}
