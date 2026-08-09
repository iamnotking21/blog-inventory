import type { Metadata } from "next";
import Link from "next/link";
import { branchScope, requireSession } from "@/lib/auth";
import { listInventory, type InventoryRow } from "@/lib/queries/inventory";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import { FadeIn } from "@/components/motion";
import { formatMoney, formatNumber, LOW_STOCK_THRESHOLD } from "@/lib/utils";

export const metadata: Metadata = { title: "Low Stock" };
export const dynamic = "force-dynamic";

export default async function LowStockPage() {
  const session = await requireSession();
  const scope = branchScope(session);

  const items = await listInventory({ branchId: scope, lowStockOnly: true });

  const columns: Column<InventoryRow>[] = [
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
      key: "product_type",
      header: "Type",
      render: (row) => (
        <Badge tone={row.product_type === "equipment" ? "accent" : "neutral"}>
          {row.product_type}
        </Badge>
      ),
    },
    {
      key: "quantity",
      header: "Quantity",
      numeric: true,
      render: (row) => (
        <span className="font-medium text-[color:var(--danger)]">
          {formatNumber(row.quantity)} {row.unit}
        </span>
      ),
    },
    {
      key: "unit_price",
      header: "Unit price",
      numeric: true,
      render: (row) => formatMoney(row.unit_price),
    },
    {
      key: "selling_price",
      header: "Selling price",
      numeric: true,
      render: (row) => formatMoney(row.selling_price),
    },
    {
      key: "amount",
      header: "Value",
      numeric: true,
      render: (row) => formatMoney(row.amount),
    },
    {
      key: "edit",
      header: "",
      render: (row) => (
        <Link
          href={`/inventory/${row.id}/edit`}
          className="text-sm font-medium text-[color:var(--accent)] hover:underline"
        >
          Edit
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Low stock"
        description={
          session.role === "super_admin"
            ? "Items below threshold across every branch."
            : `Items below threshold at ${session.branchName}.`
        }
      />

      <FadeIn>
        <Card>
          <CardHeader
            title="Items"
            description={`Below ${LOW_STOCK_THRESHOLD} units · ${items.length} item${
              items.length === 1 ? "" : "s"
            }`}
          />
          <div className="pt-4">
            <DataTable
              columns={columns}
              rows={items}
              getKey={(row) => row.id}
              emptyTitle="Everything is well stocked"
              emptyDescription={`No item has fallen below ${LOW_STOCK_THRESHOLD} units.`}
            />
          </div>
        </Card>
      </FadeIn>
    </>
  );
}
