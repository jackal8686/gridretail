import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { parseSubdomain, getRootOrigin } from "@/lib/urls";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // 1. Hostname & Local Subdomain Detection
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const { isSubdomain, subdomain, isReserved, isValid } = parseSubdomain(host);

  // 2. Subdomain Routing Flow
  if (isSubdomain && subdomain) {
    const rootOrigin = getRootOrigin();

    // If reserved or invalid hostname label (e.g. admin.localhost:3000, api.localhost:3000), redirect to primary app
    if (isReserved || !isValid) {
      return NextResponse.redirect(new URL(pathname + req.nextUrl.search, rootOrigin));
    }

    // Static assets & Next.js internal paths pass through directly
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon.ico") ||
      pathname.startsWith("/images") ||
      pathname.startsWith("/uploads") ||
      pathname.startsWith("/public")
    ) {
      return NextResponse.next();
    }

    // Public API endpoints and auth pass through (prevents cross-origin redirect CORS failure on session queries)
    if (
      pathname === "/api/health" ||
      pathname.startsWith("/api/public/") ||
      pathname.startsWith("/api/preview/") ||
      pathname.startsWith("/api/auth/")
    ) {
      const response = NextResponse.next();
      if (pathname.startsWith("/api/public/appointments/")) {
        response.headers.set("Referrer-Policy", "no-referrer");
      }
      return response;
    }

    // Internal management/auth routes on a subdomain -> redirect to primary host to preserve security boundaries
    const isInternalRoute =
      pathname === "/login" ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/stores") ||
      pathname.startsWith("/clients") ||
      pathname.startsWith("/templates") ||
      pathname.startsWith("/products") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/analytics") ||
      pathname.startsWith("/api/");

    if (isInternalRoute) {
      return NextResponse.redirect(new URL(pathname + req.nextUrl.search, rootOrigin));
    }

    // Prevent redirect loop if already at /store/{subdomain}
    if (pathname.startsWith(`/store/${subdomain}`)) {
      return NextResponse.next();
    }

    // Rewrite root or store subpaths to the storefront renderer
    // e.g. http://aura-minimalist.localhost:3000/ -> /store/aura-minimalist
    const rewriteUrl = req.nextUrl.clone();
    rewriteUrl.pathname = `/store/${subdomain}${pathname === "/" ? "" : pathname}`;

    const response = NextResponse.rewrite(rewriteUrl);
    response.headers.set("x-store-subdomain", subdomain);
    return response;
  }

  // 3. Primary Host Routing (Standard App)
  // Public paths that do not require authentication
  const isPublicPath =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/public/") || // Public appointment & store endpoints
    pathname.startsWith("/api/preview/") || // Public tokenized preview feedback APIs
    pathname.startsWith("/store/") || // Storefronts rendered for preview
    pathname.startsWith("/preview/") || // Secure tokenized client previews
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/public");

  if (!isLoggedIn && !isPublicPath) {
    const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, req.nextUrl.origin));
  }

  // If already logged in and visiting /login, redirect to /dashboard
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  const response = NextResponse.next();
  if (
    pathname.includes("/appointments/") ||
    pathname.startsWith("/api/public/appointments/")
  ) {
    response.headers.set("Referrer-Policy", "no-referrer");
  }
  return response;
});

export const config = {
  matcher: [
    /*
     * Match application routes while excluding:
     * - _next/static, _next/image (Next.js assets)
     * - favicon.ico, sitemap.xml, robots.txt
     * - static media files (.svg, .png, .jpg, .jpeg, .gif, .webp, .ico)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
