import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { Button, Card } from "@/components/ui";
import { FadeIn } from "@/components/motion";

export const metadata: Metadata = { title: "No access" };
export const dynamic = "force-dynamic";

/**
 * Where `requirePageRole` sends a signed-in visitor whose role does not cover
 * the page they asked for.
 *
 * A redirect rather than a thrown error, because React strips error messages in
 * production builds — a page that throws shows the generic error boundary, which
 * reads as a bug rather than a permission decision.
 */
export default async function ForbiddenPage() {
  const session = await requireSession();

  return (
    <FadeIn className="mx-auto max-w-md py-12">
      <Card className="p-8 text-center">
        <p className="text-muted text-xs font-semibold tracking-wide uppercase">
          403
        </p>

        <h1 className="mt-2 text-xl font-semibold">
          You do not have access to that page
        </h1>

        <p className="text-muted mt-2 text-sm">
          You are signed in as{" "}
          <span className="text-[color:var(--text)] font-medium">
            {session.fullName}
          </span>{" "}
          ({ROLE_LABELS[session.role]}). That screen is restricted to other
          roles. If you need it, ask an administrator to change your account.
        </p>

        <div className="mt-6 flex justify-center">
          <Link href="/dashboard">
            <Button>Back to dashboard</Button>
          </Link>
        </div>
      </Card>
    </FadeIn>
  );
}
