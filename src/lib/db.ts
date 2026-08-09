import { Pool, type QueryResultRow } from "pg";

declare global {
  // Reused across hot reloads in dev so we do not leak a pool per recompile.
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }

  // Neon and most hosted Postgres require TLS; a local docker container does not.
  const needsSsl =
    /sslmode=require/.test(connectionString) ||
    /neon\.tech/.test(connectionString);

  return new Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    // Serverless invocations are short-lived and numerous; a small pool per
    // instance keeps us under Neon's connection ceiling.
    max: process.env.VERCEL ? 1 : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function getPool(): Pool {
  if (!global.__pgPool) {
    global.__pgPool = createPool();
  }
  return global.__pgPool;
}

/**
 * Run a parameterized query. Values are always bound, never interpolated —
 * the legacy PHP app concatenated user input into SQL and this replaces it.
 */
export async function query<T extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params as unknown[]);
  return result.rows;
}

/** Same as `query`, for statements expected to match at most one row. */
export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Runs `fn` inside a transaction, rolling back if it throws. */
export async function transaction<T>(
  fn: (run: typeof query) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("begin");

    const scoped = (async <R extends QueryResultRow>(
      text: string,
      params: readonly unknown[] = [],
    ) => {
      const result = await client.query<R>(text, params as unknown[]);
      return result.rows;
    }) as typeof query;

    const value = await fn(scoped);
    await client.query("commit");
    return value;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
