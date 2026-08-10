import type { Metadata } from "next";
import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { listUsers, type UserRow } from "@/lib/queries/content";
import { Badge, Button, Card, CardHeader, PageHeader, statusTone } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import { FadeIn } from "@/components/motion";
import { formatDate } from "@/lib/utils";
import { AccountActions } from "./account-actions";

export const metadata: Metadata = { title: "Accounts" };
export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const session = await requirePageRole("super_admin");
  const users = await listUsers(null);

  const columns: Column<UserRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">
            {row.first_name} {row.last_name}
          </p>
          <p className="text-muted truncate text-xs">@{row.username}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row) => <Badge tone="accent">{ROLE_LABELS[row.role as Role]}</Badge>,
    },
    {
      key: "branch",
      header: "Branch",
      render: (row) => row.branch_name,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      secondary: true,
      render: (row) => formatDate(row.created_at),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <AccountActions
          id={Number(row.id)}
          status={row.status}
          isSelf={Number(row.id) === session.userId}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Manage user accounts across every branch."
        action={
          <Link href="/accounts/new">
            <Button type="button">Add account</Button>
          </Link>
        }
      />

      <FadeIn>
        <Card>
          <CardHeader
            title="Users"
            description={`${users.length} account${users.length === 1 ? "" : "s"}`}
          />
          <div className="pt-4">
            <DataTable
              columns={columns}
              rows={users}
              getKey={(row) => row.id}
              emptyTitle="No accounts found"
            />
          </div>
        </Card>
      </FadeIn>
    </>
  );
}
