import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listPosts } from "@/lib/queries/content";
import { Badge, Button, Card, EmptyState, PageHeader, statusTone } from "@/components/ui";
import { Stagger, StaggerItem } from "@/components/motion";
import { formatDate } from "@/lib/utils";
import { PostActions } from "./post-actions";

export const metadata: Metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const session = await requireSession();
  const isAdmin = session.role === "super_admin";

  const posts = await listPosts({ includeInactive: isAdmin });

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Company-wide updates and notices."
        action={
          isAdmin ? (
            <Link href="/posts/new">
              <Button type="button">New announcement</Button>
            </Link>
          ) : undefined
        }
      />

      {posts.length === 0 ? (
        <Card>
          <EmptyState
            title="No announcements yet"
            description="Check back later for updates."
          />
        </Card>
      ) : (
        <Stagger className="space-y-4">
          {posts.map((post, index) => (
            <StaggerItem key={post.id} index={index}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{post.title}</h2>
                      {isAdmin ? (
                        <Badge tone={statusTone(post.status)}>{post.status}</Badge>
                      ) : null}
                    </div>
                    <p className="text-muted mt-0.5 text-xs">
                      {post.author_name ?? "Unknown"} · {formatDate(post.created_at)}
                    </p>
                  </div>
                  {isAdmin ? (
                    <PostActions id={Number(post.id)} status={post.status} />
                  ) : null}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm">{post.description}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}
