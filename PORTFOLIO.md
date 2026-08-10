# Blog Inventory — Project Summary

**Live:** https://blog-inventory.vercel.app · **Source:** https://github.com/iamnotking21/blog-inventory

Demo accounts (password `demo1234`): `admin` (administrator), `branch` (branch manager),
`worker` (staff).

---

## Summary

Rewrote a legacy PHP 7 / MySQL inventory system as a Next.js 15 + Postgres
application, closing six classes of security defect and shipping it on a fully
automated CI/CD pipeline.

Modernized a multi-branch inventory management system originally built on PHP 7,
MySQL, and AdminLTE. Rebuilt it as a Next.js 15 application using the App Router,
React Server Components, and server actions, with TypeScript in strict mode and a
normalized Postgres schema. The rewrite eliminated SQL injection, plaintext
password storage, and credentials committed to source control, and replaced
navigation-based access control with server-side authorization enforced on every
page and mutation. Deployed to Vercel with Neon Postgres, behind a GitHub Actions
pipeline that lints, typechecks, runs tests against a real database, builds and
boots the Docker image, then deploys and health-checks production.

## Stack

Next.js 15 (App Router, React Server Components, server actions) · TypeScript
(strict) · Postgres (Neon) · Tailwind CSS v4 · Framer Motion · Vitest · Docker ·
GitHub Actions · Vercel

---

## What the system does

Three roles operate on a shared stock ledger across multiple branches:

| Role | Scope |
|---|---|
| `super_admin` | Every branch. Manages accounts and publishes announcements. |
| `branch_user` | Their own branch. Records stock, approves transfers, reads reports. |
| `worker` | Their own branch, read-only. |

Stock moves through two deliberate two-step flows. A **pull-in** records goods
arriving at a branch; receiving it is what commits them to inventory. A
**pull-out** records goods leaving, optionally transferring to another branch;
releasing it is what decrements the source. The pending state exists so a mistake
is still cheap to undo.

---

## Architecture

- Ported roughly 85 PHP files — each interleaving markup, SQL, and business logic
  — into 20 typed Next.js routes with a clear separation between data access
  (`src/lib/queries`), authorization (`src/lib/auth`), and presentation.
- Replaced ad-hoc `mysqli` calls scattered across the codebase with a single
  pooled Postgres layer exposing parameterized queries and transactions.
- Built a shared component library and a responsive data table that renders as a
  table on desktop and as stacked cards on mobile, so no column becomes
  unreachable on a phone.

## Database design

- Normalized branches into a real table with foreign keys, replacing a
  `varchar(50)` branch name that had been duplicated on every row and joined on
  throughout the application — the single largest source of its data bugs.
- Collapsed duplicated `*_equipment` tables, which mirrored their counterparts
  column for column, into a single `product_type` column.
- Converted free-text status columns into check constraints, and made `amount` a
  generated column so totals cannot drift from quantity × price.
- Wrote a numbered, append-only migration runner with application state tracked
  in `schema_migrations` and each file applied inside its own transaction.

## Security

The original application had six defects worth naming, because the structure of
the rewrite exists to prevent them:

| Defect | Resolution |
|---|---|
| SQL built by string concatenation | Every query binds `$1` parameters through one access layer |
| Passwords stored as plaintext `varchar(50)` | bcrypt at cost 10 |
| Live production credentials in ~20 committed files | Environment-only config, plus a CI check that fails the build if a credentialed connection string is committed |
| Admin pages "protected" by not linking to them | Role verified independently on every page and every server action |
| Cross-branch data reachable by guessing an id | Branch scoping enforced in the SQL `WHERE` clause, not the view |
| Totals recomputed inconsistently per page | Generated column in the schema |

Sessions use signed, `httpOnly`, `sameSite` cookies carrying verified JWTs.

## CI/CD and infrastructure

- GitHub Actions pipeline ordered cheapest-first: lint → typecheck → migrations
  and tests against a Postgres service container → Next build → Docker buildx
  with layer caching → container boot smoke test.
- A separate deployment workflow gated on a green CI run deploys to Vercel and
  polls the production health endpoint before reporting success.
- Multi-stage Dockerfile producing a standalone image that runs as a non-root
  user with a health check, plus a Compose stack that migrates and seeds
  automatically.

## Testing and quality

- Vitest suite running against a real Postgres rather than mocks, asserting
  schema invariants: check constraints reject unknown roles and negative
  quantities, the generated column computes correctly, passwords are bcrypt-only,
  and branch scoping holds.
- A guard prevents the destructive schema suite from running against a managed
  database unless explicitly opted into, so `npm test` cannot write to
  production.
- Accessibility and responsive work: 44px minimum tap targets, full
  `prefers-reduced-motion` support, WCAG AA contrast, and light/dark theming
  through CSS custom properties.

---

## By the numbers

- 3 roles · 20 routes · 8 tables · 16 tests
- ~85 PHP pages consolidated into 20 typed routes
- 6 classes of security defect closed
- Repository trimmed from 13,610 files to ~90 tracked — the original bundled an
  entire AdminLTE distribution

## Notable problems solved

- **Counter froze at zero in background tabs.** Dashboard figures animated via
  `requestAnimationFrame`, which browsers throttle to a single frame in
  non-compositing tabs, leaving every headline number reading `0`. Added a
  settle timer so the true value always lands.
- **Hydration mismatch from timezones.** Date formatters inherited the runtime's
  timezone — UTC on the server, local in the browser — breaking hydration and
  displaying two different dates for the same row. Pinned to the business
  timezone.
- **Denied users saw a 500, not a 403.** Production React strips server-component
  error messages, so an error boundary could not distinguish an authorization
  refusal from a crash. Moved page-level checks to redirect rather than throw.
- **Health endpoint leaked database topology.** An unauthenticated endpoint
  returned the raw driver error, which embeds host, port, database, and user.
- **CI deploy reported failure on a successful deploy.** The health check
  targeted the immutable deployment URL, which sits behind Vercel Deployment
  Protection and answers `302`. Repointed at the public production alias.

---

*Built with AI-assisted development — every change reviewed, run, and verified
against a live database and deployment before merge.*
