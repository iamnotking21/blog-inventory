/**
 * Loads .env.local then .env into process.env for the standalone scripts.
 *
 * Next.js does this itself, but `tsx scripts/*.ts` runs outside Next, so
 * without it `npm run db:migrate` only works when the variables are already
 * exported. Existing environment variables always win, which is what lets CI
 * and `docker compose` pass DATABASE_URL directly with no file present.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadFile(file: string): void {
  const full = path.join(process.cwd(), file);

  if (!existsSync(full)) return;

  for (const rawLine of readFileSync(full, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    // Strip one layer of matching quotes, if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadFile(".env.local");
loadFile(".env");
