"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input, Select } from "@/components/ui";

export function InventoryFilters({
  initialQuery,
  initialType,
}: {
  initialQuery: string;
  initialType: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState(initialQuery);

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

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (query !== (searchParams.get("q") ?? "")) {
        pushParams({ q: query });
      }
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name, brand, or supplier…"
        className="sm:max-w-xs"
        aria-label="Search inventory"
      />
      <Select
        defaultValue={initialType}
        onChange={(event) => pushParams({ type: event.target.value })}
        className="sm:max-w-[10rem]"
        aria-label="Filter by type"
      >
        <option value="">All types</option>
        <option value="general">General</option>
        <option value="equipment">Equipment</option>
      </Select>
    </div>
  );
}
