import { NextResponse } from "next/server";
import { createTechPackPdfToken } from "@/features/tech-pack/pdf/tech-pack-pdf-token";
import { generateTechPackHtmlPdfForDocument } from "@/features/tech-pack/pdf/tech-pack-html-pdf.service";
import { techPackPdfFilename } from "@/features/tech-pack/pdf/tech-pack-pdf-filename";
import {
  parseTechPackPdfDisposition,
  techPackPdfContentDisposition,
  type TechPackPdfDisposition,
} from "@/features/tech-pack/pdf/tech-pack-pdf-disposition";
import { mergePdfNoindexHeaders } from "@/lib/seo/indexation-policy";

type PdfRouteContext = {
  route: string;
  techPackId: string;
};

export type BuildTechPackPdfOptions = {
  code: string;
  version: number;
  requestHeaders?: Headers;
  disposition?: TechPackPdfDisposition;
};

function pdfResponseHeaders(
  buffer: Buffer,
  filename: string,
  disposition: TechPackPdfDisposition,
): Record<string, string> {
  return mergePdfNoindexHeaders({
    "Content-Type": "application/pdf",
    "Content-Disposition": techPackPdfContentDisposition(filename, disposition),
    "Cache-Control": "no-store",
    "X-Tech-Pack-Pdf-Renderer": "chromium",
    "X-Tech-Pack-Pdf-Bytes": String(buffer.length),
  });
}

export async function buildTechPackPdfResponse(
  context: PdfRouteContext,
  options: BuildTechPackPdfOptions,
): Promise<NextResponse> {
  const filename = techPackPdfFilename(options.code, options.version);
  const disposition = options.disposition ?? "inline";
  const pdfToken = createTechPackPdfToken(context.techPackId);

  if (!pdfToken) {
    return NextResponse.json(
      { message: "Không thể tạo PDF Tech Pack. Vui lòng thử lại." },
      { status: 503 },
    );
  }

  try {
    const buffer = await generateTechPackHtmlPdfForDocument({
      techPackId: context.techPackId,
      pdfToken,
      requestHeaders: options.requestHeaders,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: pdfResponseHeaders(buffer, filename, disposition),
    });
  } catch (err) {
    const traceId = `tp-pdf-${Date.now()}`;
    console.error(`[${context.route}] PDF generation failed`, {
      techPackId: context.techPackId,
      code: options.code,
      traceId,
      err,
    });

    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        message: "Không thể tạo PDF Tech Pack. Vui lòng thử lại.",
        ...(isDev
          ? {
              traceId,
              detail: err instanceof Error ? err.message : String(err),
            }
          : {}),
      },
      {
        status: 500,
        headers: { "X-Tech-Pack-Pdf-Trace-Id": traceId },
      },
    );
  }
}

export { parseTechPackPdfDisposition };
