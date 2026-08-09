import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { FadeIn } from "@/components/motion";
import { PostForm } from "../post-form";
import { createPost } from "../actions";

export const metadata: Metadata = { title: "New announcement" };
export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  await requireRole("super_admin");

  return (
    <>
      <PageHeader
        title="New announcement"
        description="Publish an update visible to every branch."
      />

      <FadeIn>
        <Card>
          <CardHeader title="Details" />
          <div className="p-5">
            <PostForm
              action={createPost}
              canSetStatus
              submitLabel="Publish"
              submitPendingLabel="Publishing…"
            />
          </div>
        </Card>
      </FadeIn>
    </>
  );
}
