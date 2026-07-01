import { auth } from "@/auth";

/**
 * Route protection (Next 16 renamed `middleware` → `proxy`).
 *
 * Wraps the request with the Auth.js session. Anyone without a valid session is
 * redirected to /login; the login page and the Auth.js endpoints stay public.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Always allow the login page itself.
  if (pathname === "/login") return;

  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  // Run on everything except the Auth.js routes and static assets.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
