"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { requireRole, ROLES } from "@/lib/auth";

type PgError = { code?: string };

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as PgError).code === "23505"
  );
}

const CreateAccountSchema = z
  .object({
    first_name: z.string().trim().min(1, "First name is required").max(100),
    last_name: z.string().trim().min(1, "Last name is required").max(100),
    middle_name: z.string().trim().max(100).optional().default(""),
    username: z.string().trim().min(1, "Username is required").max(50),
    password: z.string().min(8, "Password must be at least 8 characters").max(200),
    confirm_password: z.string().min(1, "Please confirm the password").max(200),
    role: z.enum(ROLES),
    branch_id: z.coerce.number().int().positive("Branch is required"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type AccountFormState = { error?: string };

export async function createAccount(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  await requireRole("super_admin");

  const parsed = CreateAccountSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    middle_name: formData.get("middle_name"),
    username: formData.get("username"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
    role: formData.get("role"),
    branch_id: formData.get("branch_id"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  const passwordHash = await bcrypt.hash(data.password, 10);

  try {
    await query(
      `insert into users
         (first_name, last_name, middle_name, username, password_hash, branch_id, role)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.first_name,
        data.last_name,
        data.middle_name,
        data.username,
        passwordHash,
        data.branch_id,
        data.role,
      ],
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { error: "That username is already taken" };
    }
    return { error: "Could not create the account. Please try again." };
  }

  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function toggleAccountStatus(id: number): Promise<void> {
  const session = await requireRole("super_admin");

  if (session.userId === id) {
    throw new Error("You cannot deactivate your own account.");
  }

  await query(
    `update users
        set status = case when status = 'active' then 'inactive' else 'active' end
      where id = $1`,
    [id],
  );

  revalidatePath("/accounts");
}

const ResetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(200),
    confirm_password: z.string().min(1, "Please confirm the password").max(200),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type ResetPasswordState = { error?: string; success?: boolean };

export async function resetAccountPassword(
  id: number,
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  await requireRole("super_admin");

  const parsed = ResetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const updated = await queryOne<{ id: string }>(
    `update users set password_hash = $1 where id = $2 returning id`,
    [passwordHash, id],
  );

  if (!updated) {
    return { error: "Account not found." };
  }

  revalidatePath("/accounts");
  return { success: true };
}
