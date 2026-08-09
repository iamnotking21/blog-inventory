"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";
import { cancelPullIn, receivePullIn } from "./actions";

function SubmitButton({
  label,
  pendingLabel,
  variant,
}: {
  label: string;
  pendingLabel: string;
  variant: "primary" | "danger";
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} size="sm" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function PullInStatusButtons({ id }: { id: number }) {
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <form
          action={async () => {
            setError(null);
            const result = await receivePullIn(id);
            if (result.error) setError(result.error);
          }}
        >
          <SubmitButton
            label="Receive"
            pendingLabel="Receiving…"
            variant="primary"
          />
        </form>
        <form
          action={async () => {
            setError(null);
            const result = await cancelPullIn(id);
            if (result.error) setError(result.error);
          }}
        >
          <SubmitButton
            label="Cancel"
            pendingLabel="Cancelling…"
            variant="danger"
          />
        </form>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-[color:var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
