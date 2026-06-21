import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-auth/constants";
import {
  shouldProtectAdminPage,
  shouldProtectApiRoute,
  shouldProtectOrderDocumentPage,
  shouldBypassAdminPageForProductionSheetPdf,
} from "@/lib/admin-auth/middleware-utils";
import { isRequestAdminAuthenticatedEdge } from "@/lib/admin-auth/session-edge";
import { parseQuotePublicLinkSegment } from "@/features/quotes/quote-public-link.shared";

function tryQuotePublicLinkRewrite(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/") || pathname.includes("/", 1)) return null;

  const segment = pathname.slice(1);
  if (!segment) return null;

  const parsed = parseQuotePublicLinkSegment(segment);
  if (!parsed) return null;

  const url = request.nextUrl.clone();
  url.pathname = `/quote-link/${parsed.quoteNo}-${parsed.publicShortCode}`;
  return NextResponse.rewrite(url);
}

export async function middleware(request: NextRequest) {
  const quoteRewrite = tryQuotePublicLinkRewrite(request);
  if (quoteRewrite) return quoteRewrite;

  const { pathname } = request.nextUrl;
  const authenticated = await isRequestAdminAuthenticatedEdge(request);

  if (shouldBypassAdminPageForProductionSheetPdf(pathname, request.nextUrl.searchParams)) {
    return NextResponse.next();
  }

  if (shouldProtectAdminPage(pathname)) {
    if (!authenticated) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = ADMIN_LOGIN_PATH;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (shouldProtectOrderDocumentPage(pathname, request.nextUrl.searchParams)) {
    if (!authenticated) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = ADMIN_LOGIN_PATH;
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
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
    "/:segment",
    "/o/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/blog/:path*",
    "/api/crm/:path*",
    "/api/landing-pages/:path*",
    "/api/media",
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
    "/api/orders",
    "/api/orders/:path*",
    "/api/materials",
    "/api/materials/:path*",
    "/api/purchase-requests",
    "/api/purchase-requests/:path*",
  ],
};
