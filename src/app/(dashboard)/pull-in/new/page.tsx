import type { Metadata } from "next";
import { requirePageRole } from "@/lib/auth";
import { listBranches } from "@/lib/queries/transactions";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { FadeIn } from "@/components/motion";
import { PullInForm } from "../pull-in-form";

export const metadata: Metadata = { title: "New Pull-In" };
export const dynamic = "force-dynamic";

export default async function NewPullInPage() {
  // Must match createPullIn's guard — a worker should never reach the form.
  const session = await requirePageRole("super_admin", "branch_user");
  const isSuperAdmin = session.role === "super_admin";
  const branches = isSuperAdmin ? await listBranches() : [];

  return (
    <>
      <PageHeader
        title="New pull-in"
        description="Record stock arriving at a branch, pending receipt."
      />

      <FadeIn>
        <Card>
          <CardHeader title="Pull-in details" />
          <div className="p-5">
            <PullInForm
              branches={branches}
              isSuperAdmin={isSuperAdmin}
              currentBranchName={session.branchName}
            />
          </div>
        </Card>
      </FadeIn>
    </>
  );
}
