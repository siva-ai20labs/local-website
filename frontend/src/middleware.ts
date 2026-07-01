import { auth } from "@/auth";

/**
 * Route protection.
 *
 * Wraps the request with the Auth.js session. Anyone without a valid session is
 * redirected to /login; the login page and the Auth.js endpoints stay public.
 *
 * NOTE: this uses the (deprecated) `middleware` convention, NOT Next 16's
 * `proxy`, on purpose. A `proxy.ts` file is forced to the Node.js runtime, which
 * OpenNext-on-Cloudflare does not support; `middleware.ts` compiles to the Edge
 * runtime, which it does. Auth.js v5 with JWT sessions + Google is edge-safe.
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
