"use client";

import { Card } from "@/components/ui";
import { CountUp, HoverLift, StaggerItem } from "@/components/motion";
import { formatMoney, formatNumber } from "@/lib/utils";

export type Stat = {
  label: string;
  value: number;
  format: "number" | "money";
  hint?: string;
  tone?: "default" | "warning" | "danger";
};

const TONE_COLOR: Record<NonNullable<Stat["tone"]>, string> = {
  default: "var(--text)",
  warning: "var(--warning)",
  danger: "var(--danger)",
};

export function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const format = stat.format === "money" ? formatMoney : formatNumber;

  return (
    <StaggerItem index={index}>
      <HoverLift>
        <Card className="p-5">
          <p className="text-muted text-xs font-semibold tracking-wide uppercase">
            {stat.label}
          </p>
          <p
            className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
            style={{ color: TONE_COLOR[stat.tone ?? "default"] }}
          >
            <CountUp value={stat.value} format={format} />
          </p>
          {stat.hint ? (
            <p className="text-muted mt-1 text-xs">{stat.hint}</p>
          ) : null}
        </Card>
      </HoverLift>
    </StaggerItem>
  );
}

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard key={stat.label} stat={stat} index={index} />
      ))}
    </div>
  );
}
