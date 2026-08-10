import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { branchScope, requirePageRole } from "@/lib/auth";
import { getInventoryItem } from "@/lib/queries/inventory";
import { listBranches } from "@/lib/queries/transactions";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { FadeIn } from "@/components/motion";
import { ItemForm } from "../../item-form";
import { updateItem } from "../../actions";

export const metadata: Metadata = { title: "Edit Inventory Item" };
export const dynamic = "force-dynamic";

export default async function EditInventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Page-level guard: hiding the "Add item" link from workers is not access
  // control on its own, so the route itself is role-checked too.
  const session = await requirePageRole("super_admin", "branch_user");
  const { id } = await params;
  const itemId = Number(id);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    notFound();
  }

  const scope = branchScope(session);
  // Branch-scoped lookup: a null result also covers another branch's item,
  // so this 404s the same way for "doesn't exist" and "not yours".
  const item = await getInventoryItem(itemId, scope);

  if (!item) {
    notFound();
  }

  const branches =
    session.role === "super_admin" ? await listBranches() : null;

  const action = updateItem.bind(null, itemId);

  return (
    <>
      <PageHeader title="Edit item" description={item.name} />

      <FadeIn>
        <Card>
          <CardHeader title="Item details" />
          <div className="p-5">
            <ItemForm
              action={action}
              item={item}
              branches={branches}
              submitLabel="Save changes"
            />
          </div>
        </Card>
      </FadeIn>
    </>
  );
}
