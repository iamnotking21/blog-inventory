import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { queryOne } from "@/lib/db";

// Re-exported so server modules can keep importing roles from one place, while
// client components import them from "@/lib/roles" directly.
export { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";

import { ROLES, type Role } from "@/lib/roles";

export type Session = {
  userId: number;
  username: string;
  fullName: string;
  role: Role;
  branchId: number;
  branchName: string;
};

const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;

  if (!value || value.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Generate one with: openssl rand -base64 32",
    );
  }

  return new TextEncoder().encode(value);
}

export async function createSession(session: Session): Promise<void> {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

/** Returns the verified session, or null when signed out or the token is bad. */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());

    if (!ROLES.includes(payload.role as Role)) return null;

    return {
      userId: Number(payload.userId),
      username: String(payload.username),
      fullName: String(payload.fullName),
      role: payload.role as Role,
      branchId: Number(payload.branchId),
      branchName: String(payload.branchName),
    };
  } catch {
    // Expired or tampered token. Treat as signed out.
    return null;
  }
}

/**
 * Session or throw. Every server action and route handler calls this directly —
 * relying on a layout or on middleware alone leaves the action reachable.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    throw new Error("Not authenticated");
  }

  return session;
}

/**
 * Session or throw, additionally asserting the role is one of `allowed`.
 *
 * Use this in **server actions**, where throwing surfaces as a rejected action.
 * Pages should use `requirePageRole`, which redirects instead — React strips
 * error messages in production builds, so a page that throws here renders the
 * generic "something broke" boundary rather than a readable refusal.
 */
export async function requireRole(...allowed: Role[]): Promise<Session> {
  const session = await requireSession();

  if (!allowed.includes(session.role)) {
    throw new Error("Not authorized");
  }

  return session;
}

/**
 * Page-level counterpart to `requireRole`: redirects to /forbidden rather than
 * throwing, so the visitor gets an explanation instead of a 500.
 *
 * This is still real enforcement — the redirect happens on the server before
 * any data is queried or rendered.
 */
export async function requirePageRole(...allowed: Role[]): Promise<Session> {
  const session = await getSession();

  if (!session) redirect("/login");

  if (!allowed.includes(session.role)) {
    redirect("/forbidden");
  }

  return session;
}

/**
 * The branch a request may touch. `super_admin` sees every branch (null means
 * "no branch filter"); everyone else is pinned to their own, enforced in SQL.
 */
export function branchScope(session: Session): number | null {
  return session.role === "super_admin" ? null : session.branchId;
}

export async function findUserForLogin(username: string) {
  return queryOne<{
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    password_hash: string;
    role: Role;
    status: string;
    branch_id: string;
    branch_name: string;
  }>(
    `select u.id, u.username, u.first_name, u.last_name, u.password_hash,
            u.role, u.status, u.branch_id, b.name as branch_name
       from users u
       join branches b on b.id = u.branch_id
      where lower(u.username) = lower($1)`,
    [username],
  );
}
