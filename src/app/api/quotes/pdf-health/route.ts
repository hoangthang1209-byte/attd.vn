import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { registerQuotePdfFonts } from "@/features/quotes/pdf/quote-pdf-fonts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dev-only PDF health check — not available in production. */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));

    const fonts = registerQuotePdfFonts(doc);
    await new Promise<void>((resolve, reject) => {
      doc.on("end", () => resolve());
      doc.on("error", reject);
      doc.font(fonts.boldName, 14).text("ATTD PDF health check");
      doc.font(fonts.regularName, 10).text(`Font: ${fonts.usedDejaVu ? "DejaVu" : "Helvetica"}`);
      doc.end();
    });

    const buffer = Buffer.concat(chunks);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="pdf-health-check.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "PDF health check failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
