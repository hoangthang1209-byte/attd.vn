import { NextRequest } from "next/server";
import { getQuotePdfDataByToken } from "@/features/quotes/quote.service";
import {
  buildQuotePdfResponse,
  quoteNotFoundResponse,
  quoteRouteErrorResponse,
} from "@/features/quotes/pdf/quote-pdf-route";
import { getBrandingSettings, getCompanySettings } from "@/features/settings/services/settings.service";
import { resolveQuoteCompanyProfile } from "@/features/quotes/quote-company-profile";

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

    return buildQuotePdfResponse(
      pdfData,
      { route, token },
      { publicToken: token, requestHeaders: req.headers },
    );
  } catch (err) {
    return quoteRouteErrorResponse({ route, token }, err);
  }
}
