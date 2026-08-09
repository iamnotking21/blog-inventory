import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listBranches } from "@/lib/queries/transactions";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { FadeIn } from "@/components/motion";
import { AccountForm } from "../account-form";
import { createAccount } from "../actions";

export const metadata: Metadata = { title: "Add Account" };
export const dynamic = "force-dynamic";

export default async function NewAccountPage() {
  await requireRole("super_admin");
  const branches = await listBranches();

  return (
    <>
      <PageHeader
        title="Add account"
        description="Create a new user account."
      />

      <FadeIn>
        <Card>
          <CardHeader title="Account details" />
          <div className="p-5">
            <AccountForm action={createAccount} branches={branches} />
          </div>
        </Card>
      </FadeIn>
    </>
  );
}
