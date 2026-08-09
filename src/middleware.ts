import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap redirect for signed-out visitors so they never see a dashboard shell
 * flash before the server rejects them.
 *
 * This is a convenience only. It checks for the presence of a cookie, not its
 * validity — real authorization happens in `requireSession` / `requireRole`
 * inside every page and server action.
 */
export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get("session")?.value);
  const { pathname } = request.nextUrl;

  if (!hasSession && pathname !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next internals, static assets, and the health endpoint.
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
