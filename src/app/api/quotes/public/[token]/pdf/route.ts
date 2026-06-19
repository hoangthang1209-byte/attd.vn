import { NextRequest, NextResponse } from "next/server";
import { getQuotePdfDataByToken } from "@/features/quotes/quote.service";
import { generateQuotePdf, quotePdfFilename } from "@/features/quotes/pdf/quote-pdf.service";
import { getBrandingSettings, getCompanySettings } from "@/features/settings/services/settings.service";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params;
  try {
    const [company, branding] = await Promise.all([getCompanySettings(), getBrandingSettings()]);
    const pdfData = await getQuotePdfDataByToken(token, {
      brandName: company.name,
      address: company.address,
      hotline: company.hotline.display,
      email: company.email,
      logoUrl: branding.headerLogoUrl ?? branding.footerLogoUrl,
    });
    if (!pdfData) {
      return NextResponse.json({ message: "Không tìm thấy báo giá." }, { status: 404 });
    }
    const buffer = await generateQuotePdf(pdfData);
    const filename = quotePdfFilename(pdfData.quoteNo);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/quotes/public/[token]/pdf]", err);
    return NextResponse.json({ message: "Không thể tạo PDF. Vui lòng thử lại." }, { status: 500 });
  }
}
