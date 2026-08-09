"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, Card } from "@/components/ui";
import { FadeIn } from "@/components/motion";

/**
 * Catches anything thrown while rendering a dashboard route.
 *
 * `requireSession` and `requireRole` refuse by throwing, so without this an
 * unauthorized visitor got a bare 500 with an empty body. The message shown is
 * deliberately generic — the thrown text is developer-facing.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const denied =
    error.message === "Not authorized" || error.message === "Not authenticated";

  useEffect(() => {
    if (!denied) console.error(error);
  }, [error, denied]);

  return (
    <FadeIn className="mx-auto max-w-md py-12">
      <Card className="p-8 text-center">
        <p className="text-muted text-xs font-semibold tracking-wide uppercase">
          {denied ? "403" : "500"}
        </p>

        <h1 className="mt-2 text-xl font-semibold">
          {denied ? "You do not have access to this page" : "Something broke"}
        </h1>

        <p className="text-muted mt-2 text-sm">
          {denied
            ? "Your role does not permit this screen. If you believe that is wrong, ask an administrator to check your account."
            : "The page could not be rendered. Trying again may be enough; if it keeps happening the error has been logged."}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard">
            <Button variant="secondary">Back to dashboard</Button>
          </Link>
          {denied ? null : <Button onClick={reset}>Try again</Button>}
        </div>

        {error.digest ? (
          <p className="text-muted mt-4 text-xs">Reference: {error.digest}</p>
        ) : null}
      </Card>
    </FadeIn>
  );
}
