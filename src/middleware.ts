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
import { getAdminSessionFromRequestEdge } from "@/lib/admin-auth/get-admin-session-edge";
import { assertFinancialRouteAccess, logFinancialAccessDenied } from "@/lib/admin-auth/financial-access";
import { can } from "@/features/auth/admin-permissions";
import { FINANCIAL_ROUTE_DENIED_MESSAGE } from "@/features/auth/admin-session.types";
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

    const session = await getAdminSessionFromRequestEdge(request);
    if (!assertFinancialRouteAccess(session, pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin/orders";
      redirectUrl.search = `?forbidden=${encodeURIComponent(FINANCIAL_ROUTE_DENIED_MESSAGE)}`;
      return NextResponse.redirect(redirectUrl);
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

  if (shouldProtectApiRoute(request) && authenticated && isFinancialApiRoute(pathname)) {
    const session = await getAdminSessionFromRequestEdge(request);
    const required = requiredPermissionForFinancialApi(pathname);
    if (required && !can(session, required)) {
      logFinancialAccessDenied({ user: session, route: pathname, action: "api_forbidden" });
      return NextResponse.json({ message: FINANCIAL_ROUTE_DENIED_MESSAGE }, { status: 403 });
    }
  }

  return NextResponse.next();
}

function isFinancialApiRoute(pathname: string): boolean {
  if (pathname.startsWith("/api/quotes/public/")) return false;
  if (pathname === "/api/quotes" || pathname.startsWith("/api/quotes/")) return true;
  if (pathname === "/api/pricing" || pathname.startsWith("/api/pricing/")) return true;
  if (/\/api\/orders\/[^/]+\/payments(?:\/|$)/.test(pathname)) return true;
  return false;
}

function requiredPermissionForFinancialApi(pathname: string): string | null {
  if (pathname.startsWith("/api/quotes")) return "quotes.view";
  if (pathname.startsWith("/api/pricing")) return "pricing.manage";
  if (pathname.includes("/payments")) return "payments.manage";
  return null;
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
    "/api/quotes",
    "/api/quotes/:path*",
    "/api/pricing",
    "/api/pricing/:path*",
    "/api/materials",
    "/api/materials/:path*",
    "/api/purchase-requests",
    "/api/purchase-requests/:path*",
    "/api/production-files",
    "/api/production-files/:path*",
  ],
};
