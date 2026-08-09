"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const PostSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(10000),
  status: z.enum(["active", "inactive"]),
});

export type PostFormState = { error?: string };

function readForm(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status") || "active",
  };
}

function revalidatePosts() {
  revalidatePath("/posts");
  revalidatePath("/dashboard");
}

export async function createPost(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const session = await requireRole("super_admin");

  const parsed = PostSchema.safeParse(readForm(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;

  try {
    await query(
      `insert into posts (title, description, status, author_id)
       values ($1, $2, $3, $4)`,
      [data.title, data.description, data.status, session.userId],
    );
  } catch {
    return { error: "Could not create the announcement. Please try again." };
  }

  revalidatePosts();
  redirect("/posts");
}

export async function updatePost(
  id: number,
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  await requireRole("super_admin");

  const parsed = PostSchema.safeParse(readForm(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  let updated: { id: string } | null = null;

  try {
    updated = await queryOne<{ id: string }>(
      `update posts
          set title = $1, description = $2, status = $3, updated_at = now()
        where id = $4
        returning id`,
      [data.title, data.description, data.status, id],
    );
  } catch {
    return { error: "Could not update the announcement. Please try again." };
  }

  if (!updated) {
    return { error: "Announcement not found." };
  }

  revalidatePosts();
  redirect("/posts");
}

export async function togglePostStatus(id: number): Promise<void> {
  await requireRole("super_admin");

  await query(
    `update posts
        set status = case when status = 'active' then 'inactive' else 'active' end,
            updated_at = now()
      where id = $1`,
    [id],
  );

  revalidatePosts();
}

export async function deletePost(id: number): Promise<void> {
  await requireRole("super_admin");

  await query(`delete from posts where id = $1`, [id]);

  revalidatePosts();
}
