---
name: ci-cd-pipeline
description: Author and debug the GitHub Actions CI/CD workflows for this repo. Use when adding a pipeline stage, changing triggers, wiring repository secrets, or diagnosing a red build on GitHub.
---

# CI/CD

## Workflows

`.github/workflows/ci.yml` — runs on every push and pull request:

1. `quality` — lint, typecheck, unit tests. A real Postgres service container backs
   the tests so query code is exercised, not mocked.
2. `build` — `next build`. Needs `quality` to pass.
3. `docker` — buildx with GitHub Actions layer cache. Needs `build`.
4. `security` — `npm audit --audit-level=high` and a grep for committed secrets.
   Runs in parallel with `quality`; does not gate the others.

`.github/workflows/deploy.yml` — runs on push to `main` after CI succeeds, and
deploys to Vercel production.

## Required repository secrets

| Secret | Where to get it |
|---|---|
| `VERCEL_TOKEN` | vercel.com/account/tokens |
| `VERCEL_ORG_ID` | `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | same file |

Add via `gh secret set NAME` or Settings -> Secrets and variables -> Actions.
Without them the deploy job fails at the pull step with a 403 — that is a missing
secret, not a code problem.

## Rules

- Order stages cheapest-first. Never run the Docker build behind a failing lint.
- Pin actions to a major tag. Never `@master`.
- `cache: npm` on `actions/setup-node`, keyed by `package-lock.json`.
- CI installs with `npm ci`, never `npm install` — the lockfile is the contract.
- The test job's `DATABASE_URL` points at the service container on `localhost:5432`.
  Migrations run before tests.

## Failure triage

| Symptom | Cause | Fix |
|---|---|---|
| `npm ci` fails, lockfile out of sync | `package.json` changed without reinstall | `npm install`, commit `package-lock.json` |
| Tests pass locally, fail in CI | Migrations not run against the service container | Add the migrate step before tests |
| `Error: No existing credentials found` | `VERCEL_TOKEN` missing or expired | Re-add the secret |
| Docker job slow every run | Cache not configured | `cache-from`/`cache-to: type=gha,mode=max` |
| Deploy runs on a failed CI | Missing `workflow_run` conclusion check | Gate on `github.event.workflow_run.conclusion == 'success'` |
