import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listBranches } from "@/lib/queries/transactions";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { FadeIn } from "@/components/motion";
import { ItemForm } from "../item-form";
import { createItem } from "../actions";

export const metadata: Metadata = { title: "Add Inventory Item" };
export const dynamic = "force-dynamic";

export default async function NewInventoryItemPage() {
  // Page-level guard: hiding the "Add item" link from workers is not access
  // control on its own, so the route itself is role-checked too.
  const session = await requireRole("super_admin", "branch_user");
  const branches =
    session.role === "super_admin" ? await listBranches() : null;

  return (
    <>
      <PageHeader
        title="Add item"
        description="Add a new item to the active inventory."
      />

      <FadeIn>
        <Card>
          <CardHeader title="Item details" />
          <div className="p-5">
            <ItemForm
              action={createItem}
              branches={branches}
              submitLabel="Add item"
            />
          </div>
        </Card>
      </FadeIn>
    </>
  );
}
