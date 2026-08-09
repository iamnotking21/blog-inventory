import type { Metadata } from "next";
import Link from "next/link";
import { branchScope, requireSession } from "@/lib/auth";
import { listPullOut, type PullOutRow } from "@/lib/queries/transactions";
import { Badge, Card, PageHeader, statusTone } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import { FadeIn } from "@/components/motion";
import { cn, formatDateTime, formatMoney, formatNumber } from "@/lib/utils";
import { PullOutStatusButtons } from "./status-buttons";

export const metadata: Metadata = { title: "Pull-Out" };
export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "released", label: "Released" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default async function PullOutPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const session = await requireSession();
  const scope = branchScope(session);

  const rows = await listPullOut({ branchId: scope, status });

  const columns: Column<PullOutRow>[] = [
    {
      key: "item",
      header: "Item",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.item_name ?? "—"}</p>
          <p className="text-muted truncate text-xs">{row.brand || "—"}</p>
        </div>
      ),
    },
    {
      key: "branch",
      header: "Destination",
      render: (row) => row.branch_name,
    },
    {
      key: "from_branch",
      header: "Source",
      secondary: true,
      render: (row) => row.from_branch_name ?? "—",
    },
    {
      key: "quantity",
      header: "Quantity",
      numeric: true,
      render: (row) => `${formatNumber(row.quantity)} ${row.unit}`,
    },
    {
      key: "amount",
      header: "Amount",
      numeric: true,
      render: (row) => formatMoney(row.amount),
    },
    {
      key: "dr",
      header: "DR #",
      secondary: true,
      render: (row) => row.delivery_receipt_num || "—",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>,
    },
    {
      key: "created_at",
      header: "Created",
      secondary: true,
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) =>
        row.status === "pending" ? (
          <PullOutStatusButtons id={Number(row.id)} />
        ) : (
          <span className="text-muted text-xs">—</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Pull-Out"
        description="Stock leaving a branch, pending release from inventory."
        action={
          <Link
            href="/pull-out/new"
            className="accent-bg inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium shadow-sm transition-[filter] duration-150 hover:brightness-110"
          >
            New pull-out
          </Link>
        }
      />

      <nav className="flex flex-wrap gap-2" aria-label="Filter by status">
        {STATUS_FILTERS.map((filter) => {
          const active = (status ?? "") === filter.value;
          return (
            <Link
              key={filter.value || "all"}
              href={filter.value ? `/pull-out?status=${filter.value}` : "/pull-out"}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                active
                  ? "accent-bg border-transparent"
                  : "surface-raised text-muted hover:bg-[color:var(--surface-sunken)]",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      <FadeIn>
        <Card>
          <DataTable
            columns={columns}
            rows={rows}
            getKey={(row) => row.id}
            emptyTitle="No pull-out requests"
            emptyDescription="Stock releases will show up here once created."
          />
        </Card>
      </FadeIn>
    </>
  );
}
