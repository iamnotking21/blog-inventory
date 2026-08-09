import type { Metadata } from "next";
import Link from "next/link";
import { branchScope, requireSession } from "@/lib/auth";
import { listInventory, type InventoryRow } from "@/lib/queries/inventory";
import { Badge, Button, Card, CardHeader, PageHeader } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import { FadeIn } from "@/components/motion";
import { formatMoney, formatNumber } from "@/lib/utils";
import { InventoryFilters } from "./inventory-filters";

export const metadata: Metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const session = await requireSession();
  const scope = branchScope(session);
  const params = await searchParams;
  const q = params.q ?? "";
  const type = params.type ?? "";

  const items = await listInventory({
    branchId: scope,
    search: q,
    productType: type,
  });

  const canManage = session.role === "super_admin" || session.role === "branch_user";

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
        <span>
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
        title="Inventory"
        description={
          session.role === "super_admin"
            ? "Every active item across every branch."
            : `Active items at ${session.branchName}.`
        }
        action={
          canManage ? (
            <Link href="/inventory/new">
              <Button type="button">Add item</Button>
            </Link>
          ) : undefined
        }
      />

      <FadeIn>
        <Card>
          <CardHeader
            title="Items"
            description={`${items.length} item${items.length === 1 ? "" : "s"}`}
          />
          <div className="px-5 pt-4">
            <InventoryFilters initialQuery={q} initialType={type} />
          </div>
          <div className="pt-4">
            <DataTable
              columns={columns}
              rows={items}
              getKey={(row) => row.id}
              emptyTitle="No items found"
              emptyDescription="Try a different search or type filter."
            />
          </div>
        </Card>
      </FadeIn>
    </>
  );
}
