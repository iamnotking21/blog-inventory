"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const ChangePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required").max(200),
    new_password: z.string().min(8, "New password must be at least 8 characters").max(200),
    confirm_password: z.string().min(1, "Please confirm the new password").max(200),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "New passwords do not match",
    path: ["confirm_password"],
  });

export type ChangePasswordState = { error?: string; success?: boolean };

export async function changeOwnPassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await requireSession();

  const parsed = ChangePasswordSchema.safeParse({
    current_password: formData.get("current_password"),
    new_password: formData.get("new_password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;

  // Operates on session.userId only — never a form-supplied id, since that
  // would let any signed-in user change someone else's password.
  const user = await queryOne<{ password_hash: string }>(
    `select password_hash from users where id = $1`,
    [session.userId],
  );

  if (!user) {
    return { error: "Account not found." };
  }

  const valid = await bcrypt.compare(data.current_password, user.password_hash);

  if (!valid) {
    return { error: "Current password is incorrect." };
  }

  const unchanged = await bcrypt.compare(data.new_password, user.password_hash);

  if (unchanged) {
    return { error: "New password must be different from the current password." };
  }

  const passwordHash = await bcrypt.hash(data.new_password, 10);

  await query(`update users set password_hash = $1 where id = $2`, [
    passwordHash,
    session.userId,
  ]);

  return { success: true };
}
