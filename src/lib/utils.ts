export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const PESO = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

const NUMBER = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 });

/** Postgres `numeric` arrives as a string; parse before formatting. */
export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoney(value: unknown): string {
  return PESO.format(toNumber(value));
}

export function formatNumber(value: unknown): string {
  return NUMBER.format(toNumber(value));
}

/**
 * The business timezone, pinned deliberately.
 *
 * Without it these formatters follow whatever timezone the runtime happens to
 * be in — UTC on the server, the visitor's local zone in the browser — which
 * both breaks hydration and shows two different dates for the same row. Stock
 * movements are recorded against one set of branch working hours, so that is
 * the zone every user should see.
 */
const TIME_ZONE = "Asia/Manila";

const DATE = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: TIME_ZONE,
});

const DATE_TIME = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: TIME_ZONE,
});

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? DATE.format(date) : "—";
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? DATE_TIME.format(date) : "—";
}

export const LOW_STOCK_THRESHOLD = 10;
