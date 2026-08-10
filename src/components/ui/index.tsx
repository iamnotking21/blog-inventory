import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium " +
  "transition-[background-color,color,box-shadow,transform] duration-150 " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 " +
  "whitespace-nowrap";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "accent-bg shadow-sm hover:brightness-110",
  secondary:
    "surface-raised border text-[color:var(--text)] hover:bg-[color:var(--surface-sunken)]",
  ghost: "text-muted hover:bg-[color:var(--surface-sunken)]",
  danger: "bg-[color:var(--danger)] text-white hover:brightness-110",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  // `sm` is compact on pointer devices but grows to the 44px minimum tap target
  // below the sm breakpoint, where these are row actions reached with a thumb.
  sm: "h-9 max-sm:h-11 px-3 text-sm",
  md: "h-11 px-4 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(
        BUTTON_BASE,
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "surface-raised rounded-xl border shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold">{title}</h2>
        {description ? (
          <p className="text-muted mt-0.5 text-sm">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                      */
/* -------------------------------------------------------------------------- */

type BadgeTone = "neutral" | "positive" | "warning" | "danger" | "accent";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "surface-sunken text-muted border",
  positive:
    "border border-[color:var(--positive)]/30 bg-[color:var(--positive)]/12 text-[color:var(--positive)]",
  warning:
    "border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/12 text-[color:var(--warning)]",
  danger:
    "border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/12 text-[color:var(--danger)]",
  accent:
    "border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/12 text-[color:var(--accent)]",
};

/** Maps the domain's status strings onto a visual tone. */
export function statusTone(status: string): BadgeTone {
  switch (status) {
    case "active":
    case "received":
    case "released":
    case "completed":
      return "positive";
    case "pending":
      return "warning";
    case "cancelled":
    case "inactive":
      return "danger";
    default:
      return "neutral";
  }
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        BADGE_TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Form fields                                                                */
/* -------------------------------------------------------------------------- */

const FIELD_BASE =
  "surface-sunken h-11 w-full rounded-lg border px-3 text-sm " +
  "transition-[border-color,box-shadow] duration-150 " +
  "placeholder:text-[color:var(--text-muted)] " +
  "focus:border-[color:var(--accent)] focus:outline-none " +
  "focus:ring-2 focus:ring-[color:var(--accent)]/25";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_BASE, className)} {...props} />;
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(FIELD_BASE, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(FIELD_BASE, "h-auto min-h-28 py-2.5", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="text-muted block text-xs">{hint}</span> : null}
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Page scaffolding                                                           */
/* -------------------------------------------------------------------------- */

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="text-muted mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-16 text-center">
      <p className="font-medium">{title}</p>
      {description ? (
        <p className="text-muted max-w-sm text-sm">{description}</p>
      ) : null}
    </div>
  );
}

export function ErrorMessage({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-3 py-2 text-sm text-[color:var(--danger)]"
    >
      {children}
    </p>
  );
}
