import type { Metadata } from "next";
import { branchScope, requirePageRole } from "@/lib/auth";
import { listInventory } from "@/lib/queries/inventory";
import { listBranches } from "@/lib/queries/transactions";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { FadeIn } from "@/components/motion";
import { PullOutForm } from "../pull-out-form";

export const metadata: Metadata = { title: "New Pull-Out" };
export const dynamic = "force-dynamic";

export default async function NewPullOutPage() {
  // Must match createPullOut's guard — a worker should never reach the form.
  const session = await requirePageRole("super_admin", "branch_user");
  const scope = branchScope(session);

  // The source item picker is always scoped to the caller's own branch stock,
  // even for super_admin — a pull-out originates from one branch's shelf.
  const sourceBranchId = scope ?? session.branchId;

  const [items, branches] = await Promise.all([
    listInventory({ branchId: sourceBranchId, limit: 500 }),
    listBranches(),
  ]);

  return (
    <>
      <PageHeader
        title="New pull-out"
        description="Record stock leaving your branch, pending release."
      />

      <FadeIn>
        <Card>
          <CardHeader title="Pull-out details" />
          <div className="p-5">
            <PullOutForm items={items} branches={branches} />
          </div>
        </Card>
      </FadeIn>
    </>
  );
}
