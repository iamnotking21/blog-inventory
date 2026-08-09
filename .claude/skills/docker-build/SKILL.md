---
name: docker-build
description: Build, run, and debug this app's Docker image and the docker-compose stack with Postgres. Use when asked to containerize, build the image, run compose, or fix a Docker build or startup failure.
---

# Docker

## Commands

```bash
docker compose up --build
```

App on http://localhost:3000, Postgres on 5432. Compose runs migrations and seeds
automatically via the `migrate` service before the app starts.

Image only:

```bash
docker build --build-arg DOCKER_BUILD=1 -t blog-inventory .
docker run --rm -p 3000:3000 -e DATABASE_URL=... -e SESSION_SECRET=... blog-inventory
```

## Why the build args exist

`next.config.ts` only sets `output: "standalone"` when `DOCKER_BUILD=1`. Standalone
emits a self-contained `server.js` plus a pruned `node_modules`, which is what makes
the runner stage small. Vercel must not get that flag.

## Structure

Three stages on `node:20-alpine`:

1. `deps` — `npm ci` only. Cached until `package-lock.json` changes.
2. `builder` — source plus `next build`.
3. `runner` — copies `.next/standalone`, `.next/static`, `public`. Runs as the
   non-root `nextjs` user. No source, no dev dependencies.

## Failure triage

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot find module '.next/standalone/server.js'` | Built without `DOCKER_BUILD=1` | Pass the build arg |
| `ECONNREFUSED 127.0.0.1:5432` | App resolving `localhost` inside its own container | Host must be the compose service name `db`, not `localhost` |
| App starts before Postgres accepts connections | No dependency gate | `depends_on` with `condition: service_healthy` plus the `pg_isready` healthcheck |
| Image over ~400MB | Copying the whole `node_modules` or the source tree | Copy only the three standalone artifacts |
| `npm ci` fails: lockfile out of sync | `package.json` edited without reinstalling | Run `npm install` locally, commit the lockfile |

## Rules

- `.dockerignore` must exclude `node_modules`, `.next`, `.git`, and `legacy/`.
  Without it the build context is tens of thousands of files.
- Never bake secrets into the image. `DATABASE_URL` and `SESSION_SECRET` are
  runtime environment, not build args.
- The runner stage must not run as root.
