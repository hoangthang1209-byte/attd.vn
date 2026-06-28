import { NextRequest } from "next/server";
import { getTechPackDetail } from "@/features/tech-pack/tech-pack.service";
import { createTechPackPdfToken } from "@/features/tech-pack/pdf/tech-pack-pdf-token";
import { generateTechPackHtmlPdfForDocument } from "@/features/tech-pack/pdf/tech-pack-html-pdf.service";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const pack = await getTechPackDetail(id);
  if (!pack) {
    return Response.json({ message: "Không tìm thấy Tech Pack." }, { status: 404 });
  }

  const pdfToken = createTechPackPdfToken(id);
  if (!pdfToken) {
    return Response.json({ message: "Không thể tạo token xuất PDF." }, { status: 503 });
  }

  try {
    const buffer = await generateTechPackHtmlPdfForDocument({
      techPackId: id,
      pdfToken,
      requestHeaders: req.headers,
    });

    const disposition = req.nextUrl.searchParams.get("disposition") === "inline" ? "inline" : "attachment";
    const filename = `${pack.code}-v${pack.version}.pdf`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/tech-packs/[id]/pdf]", err);
    return Response.json({ message: "Không thể xuất PDF Tech Pack." }, { status: 500 });
  }
}
