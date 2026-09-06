import { NextRequest } from "next/server";
import { getQuotePdfDataById } from "@/features/quotes/quote.service";
import {
  buildQuotePdfResponse,
  parseAllowPdfFallback,
  quoteNotFoundResponse,
  quoteRouteErrorResponse,
} from "@/features/quotes/pdf/quote-pdf-route";
import { parseQuotePdfDisposition } from "@/features/quotes/pdf/quote-pdf-disposition";
import { getBrandingSettings, getCompanySettings } from "@/features/settings/services/settings.service";
import { ensureQuotePublicToken } from "@/features/quotes/quote-pdf-token";
import { resolveQuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "export",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await ctx.params;
  const route = "GET /api/quotes/[id]/pdf";

  try {
    const [company, branding] = await Promise.all([
      getCompanySettings(),
      getBrandingSettings(),
    ]);

    const pdfData = await getQuotePdfDataById(id, {
      ...resolveQuoteCompanyProfile(company),
      logoUrl: branding.headerLogoUrl ?? branding.footerLogoUrl,
    });

    if (!pdfData) {
      return quoteNotFoundResponse();
    }

    const publicToken = await ensureQuotePublicToken(id);
    const disposition = parseQuotePdfDisposition(
      req.nextUrl.searchParams.get("disposition"),
    );
    const allowFallback = parseAllowPdfFallback(
      req.nextUrl.searchParams.get("allowFallback"),
    );
    return buildQuotePdfResponse(
      pdfData,
      { route, quoteId: id },
      { publicToken, requestHeaders: req.headers, disposition, allowFallback },
    );
  } catch (err) {
    return quoteRouteErrorResponse({ route, quoteId: id }, err);
  }
}
