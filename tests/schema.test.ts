/**
 * Exercises the real schema against a real Postgres.
 *
 * These assertions encode the invariants the legacy MySQL app did not have:
 * check constraints instead of free-text status columns, a generated `amount`
 * that cannot drift from quantity times price, and bcrypt-only passwords.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPool, query, queryOne } from "@/lib/db";

// Resolved at run time rather than hardcoded: ids depend on how many times the
// database has been reseeded, so assuming `1` makes the suite order-dependent.
let branchId: string;

/**
 * This suite writes probe rows. Running it against a managed database would
 * mean testing against production data, so it refuses unless the target is
 * local or the operator opts in explicitly.
 */
const target = process.env.DATABASE_URL ?? "";
const isLocal = /@(localhost|127\.0\.0\.1|db)[:/]/.test(target);
const allowed = isLocal || process.env.ALLOW_REMOTE_DB_TESTS === "1";

beforeAll(async () => {
  if (!allowed) return;

  const branch = await queryOne<{ id: string }>(
    "select id from branches order by id limit 1",
  );

  if (!branch) throw new Error("No branches found. Run db:seed first.");

  branchId = branch.id;
});

afterAll(async () => {
  if (!allowed) return;
  await getPool().end();
});

describe.skipIf(!allowed)("schema", () => {
  it("has every expected table", async () => {
    const rows = await query<{ table_name: string }>(
      `select table_name from information_schema.tables
        where table_schema = 'public'`,
    );

    const tables = rows.map((row) => row.table_name);

    for (const expected of [
      "branches",
      "users",
      "inventory_items",
      "pull_in_transactions",
      "pull_out_transactions",
      "transactions",
      "posts",
    ]) {
      expect(tables).toContain(expected);
    }
  });

  it("rejects an unknown role", async () => {
    await expect(
      query(
        `insert into users
           (first_name, last_name, username, password_hash, branch_id, role)
         values ('T', 'T', 'role-check-probe', 'x', $1, 'root')`,
        [branchId],
      ),
    ).rejects.toThrow();
  });

  it("rejects a negative quantity", async () => {
    await expect(
      query(
        `insert into inventory_items (branch_id, name, quantity)
         values ($1, 'negative-probe', -5)`,
        [branchId],
      ),
    ).rejects.toThrow();
  });

  it("computes amount from quantity and unit price", async () => {
    const inserted = await queryOne<{ id: string; amount: string }>(
      `insert into inventory_items (branch_id, name, quantity, unit_price)
       values ($1, 'generated-amount-probe', 4, 25)
       returning id, amount`,
      [branchId],
    );

    // Generated column, so it cannot be written out of sync by a page that
    // forgets to recompute it — which is how the legacy totals drifted.
    expect(Number(inserted?.amount)).toBe(100);

    await query("delete from inventory_items where id = $1", [inserted?.id]);
  });

  it("enforces unique usernames", async () => {
    await expect(
      query(
        `insert into users
           (first_name, last_name, username, password_hash, branch_id, role)
         values ('Dup', 'Dup', 'admin', 'x', $1, 'worker')`,
        [branchId],
      ),
    ).rejects.toThrow();
  });
});

describe.skipIf(!allowed)("seeded data", () => {
  it("stores bcrypt hashes, never plaintext", async () => {
    const rows = await query<{ username: string; password_hash: string }>(
      "select username, password_hash from users",
    );

    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      expect(row.password_hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    }
  });

  it("scopes an inventory query to a single branch", async () => {
    const branch = await queryOne<{ id: string }>(
      "select id from branches order by id limit 1",
    );

    const scoped = await query<{ branch_id: string }>(
      `select branch_id from inventory_items
        where ($1::bigint is null or branch_id = $1)`,
      [branch?.id],
    );

    // The null-or-equal pattern is what enforces tenant isolation everywhere.
    for (const row of scoped) {
      expect(row.branch_id).toBe(branch?.id);
    }

    const unscoped = await query(
      `select branch_id from inventory_items
        where ($1::bigint is null or branch_id = $1)`,
      [null],
    );

    expect(unscoped.length).toBeGreaterThanOrEqual(scoped.length);
  });
});
