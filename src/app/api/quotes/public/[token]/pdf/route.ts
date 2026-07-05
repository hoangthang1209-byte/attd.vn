import { NextRequest } from "next/server";
import { getQuotePdfDataByToken } from "@/features/quotes/quote.service";
import {
  buildQuotePdfResponse,
  parseAllowPdfFallback,
  quoteNotFoundResponse,
  quoteRouteErrorResponse,
} from "@/features/quotes/pdf/quote-pdf-route";
import { parseQuotePdfDisposition } from "@/features/quotes/pdf/quote-pdf-disposition";
import { getBrandingSettings, getCompanySettings } from "@/features/settings/services/settings.service";
import { resolveQuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import {
  assertPublicTokenSafePayload,
  createPublicTokenForbiddenFieldResponse,
} from "@/lib/permissions/public-token-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params;
  const route = "GET /api/quotes/public/[token]/pdf";

  try {
    const [company, branding] = await Promise.all([
      getCompanySettings(),
      getBrandingSettings(),
    ]);

    const pdfData = await getQuotePdfDataByToken(token, {
      ...resolveQuoteCompanyProfile(company),
      logoUrl: branding.headerLogoUrl ?? branding.footerLogoUrl,
    });

    if (!pdfData) {
      return quoteNotFoundResponse();
    }

    const safety = assertPublicTokenSafePayload(pdfData);
    if (!safety.ok) {
      console.error("[GET /api/quotes/public/[token]/pdf] unsafe public quote PDF data", {
        token,
        forbiddenFields: safety.forbiddenFields,
      });
      return createPublicTokenForbiddenFieldResponse(safety.forbiddenFields);
    }

    const disposition = parseQuotePdfDisposition(
      req.nextUrl.searchParams.get("disposition"),
    );
    const allowFallback = parseAllowPdfFallback(
      req.nextUrl.searchParams.get("allowFallback"),
    );

    return buildQuotePdfResponse(
      pdfData,
      { route, token },
      { publicToken: token, requestHeaders: req.headers, disposition, allowFallback },
    );
  } catch (err) {
    return quoteRouteErrorResponse({ route, token }, err);
  }
}
