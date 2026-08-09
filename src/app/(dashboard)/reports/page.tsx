import type { Metadata } from "next";
import { branchScope, requireRole } from "@/lib/auth";
import {
  getMonthlyMovement,
  getReportSummary,
  getSupplierBreakdown,
  getTopItems,
  type MonthlyMovement,
  type SupplierBreakdown,
  type TopItem,
} from "@/lib/queries/reports";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { StatGrid, type Stat } from "@/components/stat-card";
import { FadeIn } from "@/components/motion";
import { DataTable, type Column } from "@/components/data-table";
import { formatMoney, formatNumber, toNumber } from "@/lib/utils";
import { ReportFilters } from "./report-filters";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

const MONTHS_SHOWN = 6;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from: isoDate(from), to: isoDate(to) };
}

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { month: "short" }).format(
    new Date(year, (monthNumber ?? 1) - 1, 1),
  );
}

function MovementChart({ rows }: { rows: MonthlyMovement[] }) {
  const width = 640;
  const height = 260;
  const padding = { top: 16, right: 12, bottom: 28, left: 12 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const values = rows.flatMap((row) => [
    toNumber(row.pull_in_value),
    toNumber(row.pull_out_value),
  ]);
  const max = Math.max(...values, 1);

  const groupWidth = plotWidth / Math.max(rows.length, 1);
  const barWidth = Math.min(groupWidth * 0.32, 28);
  const gap = 4;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Monthly pull-in and pull-out value by month"
      className="w-full"
    >
      <title>Monthly movement: pull-in vs pull-out value</title>
      {rows.map((row, index) => {
        const groupX = padding.left + index * groupWidth;
        const centerX = groupX + groupWidth / 2;
        const inValue = toNumber(row.pull_in_value);
        const outValue = toNumber(row.pull_out_value);
        const inHeight = (inValue / max) * plotHeight;
        const outHeight = (outValue / max) * plotHeight;

        return (
          <g key={row.month}>
            <rect
              x={centerX - barWidth - gap / 2}
              y={padding.top + plotHeight - inHeight}
              width={barWidth}
              height={Math.max(inHeight, inValue > 0 ? 1 : 0)}
              fill="var(--accent)"
              rx={2}
            >
              <title>
                {monthLabel(row.month)} pull-in: {formatMoney(inValue)}
              </title>
            </rect>
            <rect
              x={centerX + gap / 2}
              y={padding.top + plotHeight - outHeight}
              width={barWidth}
              height={Math.max(outHeight, outValue > 0 ? 1 : 0)}
              fill="var(--positive)"
              rx={2}
            >
              <title>
                {monthLabel(row.month)} pull-out: {formatMoney(outValue)}
              </title>
            </rect>
            <text
              x={centerX}
              y={height - 8}
              textAnchor="middle"
              fontSize="11"
              fill="var(--text)"
              opacity={0.7}
            >
              {monthLabel(row.month)}
            </text>
          </g>
        );
      })}
      <line
        x1={padding.left}
        y1={padding.top + plotHeight}
        x2={width - padding.right}
        y2={padding.top + plotHeight}
        stroke="var(--text)"
        strokeOpacity={0.15}
      />
    </svg>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await requireRole("super_admin", "branch_user");
  const scope = branchScope(session);
  const params = await searchParams;
  const defaults = defaultRange();
  const from = params.from || defaults.from;
  const to = params.to || defaults.to;

  const [summary, topItems, suppliers, monthly] = await Promise.all([
    getReportSummary({ branchId: scope, from, to }),
    getTopItems({ branchId: scope, from, to, limit: 10 }),
    getSupplierBreakdown({ branchId: scope, from, to }),
    getMonthlyMovement({ branchId: scope, months: MONTHS_SHOWN }),
  ]);

  const stats: Stat[] = [
    {
      label: "Pull-ins",
      value: toNumber(summary?.pull_in_count),
      format: "number",
      hint: `${formatMoney(summary?.pull_in_value)} received`,
    },
    {
      label: "Pull-outs",
      value: toNumber(summary?.pull_out_count),
      format: "number",
      hint: `${formatMoney(summary?.pull_out_value)} released`,
    },
    {
      label: "Net movement",
      value: toNumber(summary?.net_movement),
      format: "money",
      tone: toNumber(summary?.net_movement) < 0 ? "danger" : "default",
    },
    {
      label: "Items touched",
      value: toNumber(summary?.items_touched),
      format: "number",
      hint: "Distinct items in range",
    },
  ];

  const topItemColumns: Column<TopItem>[] = [
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
      header: "Quantity",
      numeric: true,
      render: (row) => formatNumber(row.quantity),
    },
    {
      key: "amount",
      header: "Value",
      numeric: true,
      render: (row) => formatMoney(row.amount),
    },
  ];

  const supplierColumns: Column<SupplierBreakdown>[] = [
    { key: "supplier_name", header: "Supplier", render: (row) => row.supplier_name },
    {
      key: "pull_in_count",
      header: "Pull-ins",
      numeric: true,
      render: (row) => formatNumber(row.pull_in_count),
    },
    {
      key: "pull_in_value",
      header: "Value",
      numeric: true,
      render: (row) => formatMoney(row.pull_in_value),
    },
  ];

  return (
    <>
      <PageHeader
        title="Reports"
        description={
          session.role === "super_admin"
            ? "Movement across every branch."
            : `Movement at ${session.branchName}.`
        }
      />

      <FadeIn>
        <Card className="p-5">
          <ReportFilters initialFrom={from} initialTo={to} />
        </Card>
      </FadeIn>

      <StatGrid stats={stats} />

      <FadeIn delay={0.1}>
        <Card>
          <CardHeader
            title="Monthly movement"
            description="Pull-in value vs pull-out value, last six months"
            action={
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                  Pull-in
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: "var(--positive)" }}
                  />
                  Pull-out
                </span>
              </div>
            }
          />
          <div className="overflow-x-auto p-5">
            <MovementChart rows={monthly} />
          </div>
        </Card>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.15}>
          <Card>
            <CardHeader title="Top items" description="Highest value in range" />
            <DataTable
              columns={topItemColumns}
              rows={topItems}
              getKey={(row) => row.name + row.branch_name}
              emptyTitle="No items in range"
            />
          </Card>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Card>
            <CardHeader title="Suppliers" description="Pull-in value by supplier" />
            <DataTable
              columns={supplierColumns}
              rows={suppliers}
              getKey={(row) => row.supplier_name}
              emptyTitle="No pull-ins in range"
            />
          </Card>
        </FadeIn>
      </div>
    </>
  );
}
