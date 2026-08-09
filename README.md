# Blog Inventory

Multi-branch inventory management with stock transfers, reporting, and an
internal announcements board.

Originally a PHP 7 / MySQL application built on AdminLTE. This repository is a
full rewrite on Next.js 15 and Postgres — the domain and the screens are carried
over, the implementation is not.

[![CI](https://github.com/iamnotking21/blog-inventory/actions/workflows/ci.yml/badge.svg)](https://github.com/iamnotking21/blog-inventory/actions/workflows/ci.yml)

## What it does

Three roles operate on the same stock ledger:

| Role | Scope |
|---|---|
| `super_admin` | Every branch. Manages user accounts and publishes announcements. |
| `branch_user` | Their own branch. Records stock, approves transfers, reads reports. |
| `worker` | Their own branch, read-only. |

Stock moves through two flows. A **pull-in** records goods arriving at a branch;
receiving it is what commits them to inventory. A **pull-out** records goods
leaving, optionally transferring to another branch; releasing it is what
decrements the source. Both are two-step on purpose — the pending state is where
a mistake is still cheap to undo.

## Stack

- **Next.js 15** (App Router, React Server Components, server actions)
- **TypeScript**, strict
- **Postgres** — Neon in production, `postgres:16-alpine` locally
- **Tailwind CSS v4** with CSS custom properties for theming
- **Framer Motion** for interaction feedback
- **Vitest** for tests, run against a real database rather than mocks

## Running it

### Docker (everything, one command)

```bash
docker compose up --build
```

Postgres starts, migrations and seeds run, then the app comes up on
http://localhost:3000.

### Locally

```bash
cp .env.example .env.local   # then fill in DATABASE_URL and SESSION_SECRET
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Generate a session secret with `openssl rand -base64 32`.

### Demo accounts

| Username | Role | Branch |
|---|---|---|
| `admin` | Administrator | Main Branch |
| `branch` | Branch manager | North Branch |
| `worker` | Staff | Main Branch |

Password for all three: `demo1234`, overridable via `SEED_ADMIN_PASSWORD`.

## Layout

```
src/
  app/
    (auth)/login/        sign-in
    (dashboard)/         everything behind a session
      dashboard/  inventory/  pull-in/  pull-out/
      reports/    posts/      accounts/  profile/
    api/health/          liveness plus database reachability
  components/            ui primitives, data table, motion, nav
  lib/
    auth.ts              session, roles, branch scoping
    db.ts                pooled Postgres access, parameterized only
    queries/             all SQL lives here
db/migrations/           numbered, append-only
scripts/                 migrate and seed runners
.claude/                 project agents and skills
legacy/                  the original PHP app, for reference (gitignored)
```

## What the rewrite fixed

The original application had defects worth naming, because the structure here
exists to prevent them:

- **SQL injection.** Queries were built by string concatenation. Every query now
  goes through `src/lib/db.ts` with bound parameters.
- **Plaintext passwords.** `users.password` was a `varchar(50)` holding the
  password as typed. It is now a bcrypt hash at cost 10.
- **Committed production credentials.** A live database username and password
  sat in commented-out code across ~20 files. Configuration is now environment
  only, and CI fails the build if a credentialed connection string is committed.
- **Authorization by hidden link.** Admin pages were protected by not linking to
  them. Every page and every server action now re-checks the role itself.
- **Branch matching by name.** Rows carried a `branch_name varchar(50)` and were
  joined on it, so a rename orphaned data. Branches are a table with foreign
  keys.
- **Duplicated equipment tables.** Parallel `*_equipment` tables duplicated their
  counterparts column for column. They collapsed into a `product_type` column.
- **Recomputed totals.** `amount` was written by each page independently and
  drifted. It is now a generated column.

## Tests

```bash
npm test
```

The suite runs against a real Postgres — in CI, a service container that has had
the actual migrations applied.

## CI/CD

`ci.yml` runs lint, typecheck, migrations, and tests against Postgres, then the
Next.js build, then builds the Docker image and boots it to confirm it serves
`/api/health`. A parallel job audits dependencies and greps for committed
secrets.

`deploy.yml` deploys to Vercel on a green run against `main`, then polls the
deployed health endpoint before declaring success.

Required repository secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
`VERCEL_PROJECT_ID`.

## Deploying

See [`.claude/skills/deploy-vercel/SKILL.md`](.claude/skills/deploy-vercel/SKILL.md)
for the full walkthrough. In short: import the repo on Vercel, add `DATABASE_URL`
(the Neon **pooled** string, with `?sslmode=require`) and `SESSION_SECRET`, then
run the migrations against Neon once.

Do not set `DOCKER_BUILD` on Vercel — it switches the build to standalone output,
which is only for the container image.

## License

MIT
