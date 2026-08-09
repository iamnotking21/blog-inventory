"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSession, destroySession, findUserForLogin } from "@/lib/auth";

const LoginSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(50),
  password: z.string().min(1, "Password is required").max(200),
});

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await findUserForLogin(parsed.data.username);

  // One message for every failure mode. Distinguishing "no such user" from
  // "wrong password" hands an attacker a username oracle.
  const GENERIC = "Incorrect username or password";

  if (!user) {
    // Constant-ish work even when the user does not exist, so response time
    // does not leak whether the username is real.
    await bcrypt.compare(parsed.data.password, "$2a$10$" + "x".repeat(53));
    return { error: GENERIC };
  }

  const valid = await bcrypt.compare(parsed.data.password, user.password_hash);

  if (!valid) return { error: GENERIC };

  if (user.status !== "active") {
    return { error: "This account is inactive. Contact an administrator." };
  }

  await createSession({
    userId: Number(user.id),
    username: user.username,
    fullName: `${user.first_name} ${user.last_name}`.trim(),
    role: user.role,
    branchId: Number(user.branch_id),
    branchName: user.branch_name,
  });

  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
