import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { Sidebar } from "@/components/nav";
import { Button } from "@/components/ui";
import { logout } from "@/app/(auth)/login/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar
        role={session.role}
        fullName={session.fullName}
        branchName={session.branchName}
        roleLabel={ROLE_LABELS[session.role]}
        logout={
          <form action={logout}>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="w-full"
            >
              Sign out
            </Button>
          </form>
        }
      />

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
