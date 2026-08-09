"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, ErrorMessage, Field, Input, Select, Textarea } from "@/components/ui";
import type { PostFormState } from "./actions";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function PostForm({
  action,
  canSetStatus,
  defaultValues,
  submitLabel,
  submitPendingLabel,
}: {
  action: (prev: PostFormState, formData: FormData) => Promise<PostFormState>;
  canSetStatus: boolean;
  defaultValues?: { title: string; description: string; status: string };
  submitLabel: string;
  submitPendingLabel: string;
}) {
  const [state, formAction] = useActionState<PostFormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Title">
        <Input
          name="title"
          required
          maxLength={200}
          defaultValue={defaultValues?.title}
          placeholder="Announcement title"
        />
      </Field>

      <Field label="Description">
        <Textarea
          name="description"
          required
          maxLength={10000}
          defaultValue={defaultValues?.description}
          placeholder="What do branches need to know?"
        />
      </Field>

      {canSetStatus ? (
        <Field label="Status">
          <Select name="status" defaultValue={defaultValues?.status ?? "active"}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="status" value={defaultValues?.status ?? "active"} />
      )}

      <ErrorMessage>{state.error}</ErrorMessage>

      <SubmitButton label={submitLabel} pendingLabel={submitPendingLabel} />
    </form>
  );
}
