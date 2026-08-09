"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Field, Input } from "@/components/ui";

export function ReportFilters({
  initialFrom,
  initialTo,
}: {
  initialFrom: string;
  initialTo: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pushParams = React.useCallback(
    (next: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(next)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Field label="From">
        <Input
          type="date"
          defaultValue={initialFrom}
          max={initialTo}
          onChange={(event) => pushParams({ from: event.target.value })}
          aria-label="From date"
        />
      </Field>
      <Field label="To">
        <Input
          type="date"
          defaultValue={initialTo}
          min={initialFrom}
          onChange={(event) => pushParams({ to: event.target.value })}
          aria-label="To date"
        />
      </Field>
    </div>
  );
}
