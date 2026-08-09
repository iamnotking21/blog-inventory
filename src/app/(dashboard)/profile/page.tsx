import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { getUser } from "@/lib/queries/content";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { FadeIn } from "@/components/motion";
import { formatDate } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/roles";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireSession();
  const user = await getUser(session.userId);

  return (
    <>
      <PageHeader title="Profile" description="Your account details." />

      <FadeIn>
        <Card>
          <CardHeader title="Account summary" />
          <dl className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <dt className="text-muted text-xs font-medium tracking-wide uppercase">
                Full name
              </dt>
              <dd className="mt-1 text-sm">
                {user
                  ? `${user.first_name} ${user.middle_name ? user.middle_name + " " : ""}${user.last_name}`.trim()
                  : session.fullName}
              </dd>
            </div>
            <div>
              <dt className="text-muted text-xs font-medium tracking-wide uppercase">
                Username
              </dt>
              <dd className="mt-1 text-sm">@{session.username}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs font-medium tracking-wide uppercase">
                Role
              </dt>
              <dd className="mt-1 text-sm">{ROLE_LABELS[session.role]}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs font-medium tracking-wide uppercase">
                Branch
              </dt>
              <dd className="mt-1 text-sm">{session.branchName}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs font-medium tracking-wide uppercase">
                Member since
              </dt>
              <dd className="mt-1 text-sm">
                {user ? formatDate(user.created_at) : "—"}
              </dd>
            </div>
          </dl>
        </Card>
      </FadeIn>

      <FadeIn delay={0.05}>
        <Card>
          <CardHeader
            title="Change password"
            description="Update the password used to sign in."
          />
          <div className="p-5">
            <PasswordForm />
          </div>
        </Card>
      </FadeIn>
    </>
  );
}
