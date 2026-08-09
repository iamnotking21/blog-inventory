/**
 * Applies every pending file in db/migrations, in filename order.
 *
 * Applied filenames are recorded in `schema_migrations`, so re-running is a
 * no-op. Each file runs inside its own transaction: a file either applies
 * completely or not at all.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const needsSsl =
    /sslmode=require/.test(connectionString) ||
    /neon\.tech/.test(connectionString);

  const client = new Client({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  await client.query(`
    create table if not exists schema_migrations (
      filename    text        primary key,
      applied_at  timestamptz not null default now()
    )
  `);

  const applied = new Set(
    (
      await client.query<{ filename: string }>(
        "select filename from schema_migrations",
      )
    ).rows.map((row) => row.filename),
  );

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  let count = 0;

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");

    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into schema_migrations (filename) values ($1)",
        [file],
      );
      await client.query("commit");
      console.log(`applied ${file}`);
      count += 1;
    } catch (error) {
      await client.query("rollback");
      console.error(`failed ${file}:`, (error as Error).message);
      await client.end();
      process.exit(1);
    }
  }

  console.log(
    count === 0 ? "no pending migrations" : `${count} migration(s) applied`,
  );

  await client.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
