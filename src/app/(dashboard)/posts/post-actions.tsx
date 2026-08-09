"use client";

import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui";
import { deletePost, togglePostStatus } from "./actions";

function ToggleButton({ status }: { status: string }) {
  const { pending } = useFormStatus();
  const label = status === "active" ? "Deactivate" : "Activate";

  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      {pending ? "Working…" : label}
    </Button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="danger" size="sm" disabled={pending}>
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}

export function PostActions({ id, status }: { id: number; status: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/posts/${id}/edit`}
        className="text-sm font-medium text-[color:var(--accent)] hover:underline"
      >
        Edit
      </Link>

      <form action={togglePostStatus.bind(null, id)}>
        <ToggleButton status={status} />
      </form>

      <form
        action={deletePost.bind(null, id)}
        onSubmit={(event) => {
          if (!confirm("Delete this announcement? This cannot be undone.")) {
            event.preventDefault();
          }
        }}
      >
        <DeleteButton />
      </form>
    </div>
  );
}
