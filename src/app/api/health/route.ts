import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Liveness plus database reachability. Used by the Docker healthcheck. */
export async function GET() {
  try {
    await query("select 1");
    return NextResponse.json({ status: "ok", database: "up" });
  } catch (error) {
    // This endpoint is deliberately unauthenticated and outside the middleware
    // matcher, so the driver message must not travel back to the caller — pg
    // failures embed the host, port, database, and user.
    console.error("Health check failed:", error);

    return NextResponse.json(
      { status: "degraded", database: "down" },
      { status: 503 },
    );
  }
}
