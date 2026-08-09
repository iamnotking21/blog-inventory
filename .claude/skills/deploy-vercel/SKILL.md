---
name: deploy-vercel
description: Deploy this Next.js app to Vercel free tier with a Neon Postgres database. Use when asked to deploy, ship, publish, set up preview deployments, configure Vercel environment variables, or debug a failed Vercel build.
---

# Deploy to Vercel (free tier)

## Preconditions

- Repo pushed to GitHub.
- A Neon Postgres database exists (free tier) and its pooled connection string is
  in hand.
- `SESSION_SECRET` generated: `openssl rand -base64 32`.

## Route A — Vercel Dashboard (no CLI, recommended for first deploy)

1. vercel.com/new -> Import the GitHub repo.
2. Framework preset auto-detects **Next.js**. Leave build command and output
   directory at their defaults.
3. Add environment variables for **Production, Preview, and Development**:
   - `DATABASE_URL` — the Neon **pooled** string, must end with `?sslmode=require`
   - `SESSION_SECRET`
   Do **not** set `DOCKER_BUILD`. It switches the build to `standalone` output,
   which Vercel does not want.
4. Deploy. Then run the migration against Neon from a local shell:
   `DATABASE_URL="<neon-url>" npm run db:migrate && DATABASE_URL="<neon-url>" npm run db:seed`

## Route B — CLI

```bash
npm i -g vercel
vercel login
vercel link
vercel env add DATABASE_URL production
vercel env add SESSION_SECRET production
vercel --prod
```

## Neon setup

1. neon.tech -> new project, region nearest the Vercel region.
2. Copy the **Pooled connection** string (host contains `-pooler`). The direct
   string exhausts connections under serverless concurrency.
3. Free tier sleeps after inactivity; the first request after idle takes a few
   seconds. Expected, not a bug.

## Free-tier constraints that actually bite

- Serverless functions time out at 10s on Hobby. Any report query slower than that
  must be paginated or indexed, not retried.
- No persistent filesystem. Uploads must go to object storage, never `public/`.
- Hobby is non-commercial use only.

## Failure triage

| Symptom | Cause | Fix |
|---|---|---|
| `Error: DATABASE_URL is not set` at build | Env var missing for that environment | Add it to all three environments, redeploy |
| `self signed certificate in certificate chain` | Missing SSL param | Append `?sslmode=require` |
| `too many connections` | Direct (non-pooled) Neon string | Switch to the `-pooler` host |
| Build fails only on Vercel | `DOCKER_BUILD` set in project env | Remove it |
| `relation "users" does not exist` | Migration never ran against Neon | Run `db:migrate` with `DATABASE_URL` pointed at Neon |

## Verify before calling it done

Load the deployed URL, sign in with a seed account, open one list page and one
report, and confirm no 500s in the Vercel runtime logs.
