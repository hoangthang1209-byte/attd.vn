import type { NextRequest } from "next/server";
import {
  ADMIN_LOGIN_API_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_LOGOUT_API_PATH,
} from "@/lib/admin-auth/constants";
import { isRequestAdminAuthenticatedEdge } from "@/lib/admin-auth/session-edge";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const PROTECTED_MUTATION_PREFIXES = [
  "/api/admin/",
  "/api/blog/",
  "/api/crm/",
  "/api/landing-pages/",
  "/api/media/",
  "/api/settings/",
  "/api/client-logos/",
  "/api/case-studies/",
  "/api/products/",
  "/api/images/",
  "/api/categories/",
  "/api/posts/",
  "/api/variants/",
  "/api/dealer-leads/",
  "/api/orders/",
  "/api/materials",
  "/api/materials/",
  "/api/purchase-requests",
  "/api/purchase-requests/",
] as const;

const PROTECTED_READ_PREFIXES = [
  "/api/admin/",
  "/api/blog/",
  "/api/crm/",
  "/api/landing-pages/",
  "/api/media/",
  "/api/settings/",
  "/api/client-logos/",
  "/api/case-studies/",
  "/api/products/",
  "/api/leads",
  "/api/dealer-leads/",
  "/api/variants/",
  "/api/orders",
  "/api/orders/",
  "/api/materials",
  "/api/materials/",
  "/api/purchase-requests",
  "/api/purchase-requests/",
] as const;

function isMediaApiPath(pathname: string): boolean {
  return pathname === "/api/media" || pathname.startsWith("/api/media/");
}

function isProtectedApiPrefix(pathname: string, prefixes: readonly string[]): boolean {
  if (isMediaApiPath(pathname)) return true;
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

function isPublicMutationRoute(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  const method = request.method;

  if (method !== "POST") return false;

  return (
    pathname === "/api/leads" ||
    pathname === "/api/dealer-leads" ||
    pathname === "/api/dealers"
  );
}

function isPublicReadRoute(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  if (request.method !== "GET") return false;

  if (pathname === "/api/blog/posts") {
    return request.nextUrl.searchParams.get("published") === "1";
  }

  return false;
}

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === ADMIN_LOGIN_PATH ||
    pathname === ADMIN_LOGIN_API_PATH ||
    pathname === ADMIN_LOGOUT_API_PATH
  );
}

export function shouldProtectAdminPage(pathname: string): boolean {
  if (!pathname.startsWith("/admin")) return false;
  if (pathname === ADMIN_LOGIN_PATH || pathname.startsWith(`${ADMIN_LOGIN_PATH}/`)) {
    return false;
  }
  return true;
}

export function shouldProtectOrderDocumentPage(
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  if (!pathname.startsWith("/o/")) return false;
  if (searchParams.get("mode") === "pdf" && searchParams.get("pdfToken")) {
    return false;
  }
  return true;
}

const PRODUCTION_SHEET_DOCUMENT_PATH =
  /^\/admin\/orders\/[^/]+\/production-sheet\/document$/;

export function shouldBypassAdminPageForProductionSheetPdf(
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  if (!PRODUCTION_SHEET_DOCUMENT_PATH.test(pathname)) return false;
  return searchParams.get("mode") === "pdf" && Boolean(searchParams.get("pdfToken"));
}

export function shouldProtectApiRoute(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  const method = request.method;

  if (isAuthRoute(pathname)) return false;
  if (isPublicMutationRoute(request)) return false;
  if (isPublicReadRoute(request)) return false;

  if (pathname.startsWith("/api/admin/")) {
    return !pathname.startsWith(ADMIN_LOGIN_API_PATH);
  }

  if (MUTATION_METHODS.has(method)) {
    return isProtectedApiPrefix(pathname, PROTECTED_MUTATION_PREFIXES);
  }

  if (method === "GET") {
    return isProtectedApiPrefix(pathname, PROTECTED_READ_PREFIXES);
  }

  return false;
}

export { isRequestAdminAuthenticatedEdge } from "@/lib/admin-auth/session-edge";
