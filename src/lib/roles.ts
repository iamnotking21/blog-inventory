/**
 * Role constants, safe to import from client components.
 *
 * These live apart from `src/lib/auth.ts` deliberately: that module is
 * "server-only" because it touches cookies and the database, so a client form
 * importing a role label from it would pull the whole session layer into the
 * browser bundle and fail the build.
 */
export const ROLES = ["super_admin", "branch_user", "worker"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Administrator",
  branch_user: "Branch manager",
  worker: "Staff",
};
