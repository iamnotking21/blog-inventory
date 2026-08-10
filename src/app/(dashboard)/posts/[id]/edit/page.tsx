import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { getPost } from "@/lib/queries/content";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { FadeIn } from "@/components/motion";
import { PostForm } from "../../post-form";
import { updatePost } from "../../actions";

export const metadata: Metadata = { title: "Edit announcement" };
export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageRole("super_admin");
  const { id } = await params;
  const postId = Number(id);

  const post = Number.isFinite(postId) ? await getPost(postId) : null;

  if (!post) {
    notFound();
  }

  return (
    <>
      <PageHeader title="Edit announcement" description={post.title} />

      <FadeIn>
        <Card>
          <CardHeader title="Details" />
          <div className="p-5">
            <PostForm
              action={updatePost.bind(null, postId)}
              canSetStatus
              defaultValues={{
                title: post.title,
                description: post.description,
                status: post.status,
              }}
              submitLabel="Save changes"
              submitPendingLabel="Saving…"
            />
          </div>
        </Card>
      </FadeIn>
    </>
  );
}
