---
name: db-migrate
description: Write and run Postgres migrations and seed data for this project. Use when adding or altering a table, creating a migration file, resetting the local database, or seeding demo accounts.
---

# Migrations

## Commands

```bash
npm run db:migrate   # applies every pending file in db/migrations, in order
npm run db:seed      # idempotent demo data
```

Both read `DATABASE_URL`. Point it at Neon to migrate production.

Reset local:

```bash
docker compose down -v && docker compose up --build
```

## Writing a migration

Create `db/migrations/NNN_short_name.sql` with the next zero-padded number.
The runner records applied filenames in a `schema_migrations` table and skips them
on subsequent runs, inside a transaction per file.

Rules:

1. **Append-only.** Never edit a file that has run anywhere. Fix forward with a new
   migration.
2. **Idempotent where cheap** — `create table if not exists`, `create index if not
   exists`.
3. **Safe against existing data.** Adding `not null` requires a default, or three
   steps: add nullable, backfill, then set not null.
4. Never `drop column` in the same release that stops writing to it. Ship the code
   first, drop a release later.

## This schema

Eight tables carried over from the legacy MySQL app, normalized:
`users`, `branches`, `inventory_items`, `pull_in_transactions`,
`pull_out_transactions`, `transactions`, `posts`, `schema_migrations`.

Conventions enforced by `database-architect`: `bigserial` ids, `timestamptz`
`created_at`, `numeric(12,2)` for money and quantity, real foreign keys to
`branches` (the legacy app joined on branch *name*, which is the root of most of
its data bugs), and `check` constraints instead of free-text status columns.

## Seeding

`scripts/seed.ts` inserts demo branches, users, and inventory. It is idempotent —
`on conflict do nothing` — so it is safe to re-run.

Passwords are bcrypt-hashed at seed time, cost 10. The demo admin password comes
from `SEED_ADMIN_PASSWORD`, defaulting to `demo1234`. Never seed a plaintext
password column; the legacy dump did, and it leaked real client credentials.

## Failure triage

| Symptom | Cause | Fix |
|---|---|---|
| `relation "schema_migrations" does not exist` | First run interrupted | Re-run `db:migrate`; the runner creates it |
| `password authentication failed` | Wrong `DATABASE_URL` | Check the env file actually loaded |
| Migration applied but table missing | Transaction rolled back on a later statement | Read the error, fix the file, re-run |
| Hangs against Neon | Cold start on free tier | Wait; it resumes in a few seconds |
