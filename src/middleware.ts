import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-auth/constants";
import {
  shouldProtectAdminPage,
  shouldProtectApiRoute,
} from "@/lib/admin-auth/middleware-utils";
import { isRequestAdminAuthenticatedEdge } from "@/lib/admin-auth/session-edge";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = await isRequestAdminAuthenticatedEdge(request);

  if (shouldProtectAdminPage(pathname)) {
    if (!authenticated) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = ADMIN_LOGIN_PATH;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (pathname === ADMIN_LOGIN_PATH && authenticated) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/admin/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  if (shouldProtectApiRoute(request) && !authenticated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/blog/:path*",
    "/api/crm/:path*",
    "/api/landing-pages/:path*",
    "/api/media/:path*",
    "/api/settings/:path*",
    "/api/client-logos/:path*",
    "/api/case-studies/:path*",
    "/api/products/:path*",
    "/api/images/:path*",
    "/api/categories/:path*",
    "/api/posts/:path*",
    "/api/leads",
    "/api/leads/:path*",
    "/api/dealer-leads/:path*",
    "/api/dealers/:path*",
    "/api/variants/:path*",
  ],
};
