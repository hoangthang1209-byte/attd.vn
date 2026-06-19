import { NextRequest } from "next/server";
import { getQuotePdfDataById } from "@/features/quotes/quote.service";
import {
  buildQuotePdfResponse,
  quoteNotFoundResponse,
  quoteRouteErrorResponse,
} from "@/features/quotes/pdf/quote-pdf-route";
import { getBrandingSettings, getCompanySettings } from "@/features/settings/services/settings.service";
import { ensureQuotePublicToken } from "@/features/quotes/quote-pdf-token";
import { resolveQuoteCompanyProfile } from "@/features/quotes/quote-company-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
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
    return buildQuotePdfResponse(pdfData, { route, quoteId: id }, { publicToken });
  } catch (err) {
    return quoteRouteErrorResponse({ route, quoteId: id }, err);
  }
}
