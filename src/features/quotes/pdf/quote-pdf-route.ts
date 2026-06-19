import { NextResponse } from "next/server";
import type { QuotePdfData } from "@/features/quotes/quote-document";
import {
  generateQuotePdfWithFallback,
  quotePdfFilename,
} from "@/features/quotes/pdf/quote-pdf.service";
import { generateQuoteHtmlPdfByToken } from "@/features/quotes/pdf/quote-html-pdf.service";

type PdfRouteContext = {
  route: string;
  quoteId?: string;
  token?: string;
};

function logPdfError(context: PdfRouteContext, err: unknown, quoteNo?: string) {
  console.error(`[${context.route}] PDF generation failed`, {
    route: context.route,
    quoteId: context.quoteId,
    token: context.token,
    quoteNo,
    errorName: err instanceof Error ? err.name : "UnknownError",
    errorMessage: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
}

export async function buildQuotePdfResponse(
  pdfData: QuotePdfData,
  context: PdfRouteContext,
  options?: { publicToken: string },
): Promise<NextResponse> {
  const filename = quotePdfFilename(pdfData.quoteNo);

  if (options?.publicToken) {
    try {
      const htmlBuffer = await generateQuoteHtmlPdfByToken(options.publicToken);
      if (htmlBuffer && htmlBuffer.length > 100) {
        return new NextResponse(new Uint8Array(htmlBuffer), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
            "X-Quote-Pdf-Renderer": "chromium",
          },
        });
      }
    } catch (htmlError) {
      console.error(`[${context.route}] HTML-to-PDF failed, using PDFKit fallback`, {
        quoteNo: pdfData.quoteNo,
        quoteId: context.quoteId,
        token: context.token,
        errorMessage: htmlError instanceof Error ? htmlError.message : String(htmlError),
      });
    }
  }

  try {
    const { buffer, usedFallback } = await generateQuotePdfWithFallback(pdfData);
    if (usedFallback) {
      console.warn(`[${context.route}] Returned PDFKit fallback PDF`, {
        quoteNo: pdfData.quoteNo,
        quoteId: context.quoteId,
        token: context.token,
      });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        ...(usedFallback ? { "X-Quote-Pdf-Fallback": "1" } : {}),
        "X-Quote-Pdf-Renderer": "pdfkit",
      },
    });
  } catch (err) {
    logPdfError(context, err, pdfData.quoteNo);
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        error: "Không thể tạo PDF báo giá",
        ...(isDev
          ? {
              detail: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : undefined,
            }
          : {}),
      },
      { status: 500 },
    );
  }
}

export function quoteNotFoundResponse(): NextResponse {
  return NextResponse.json({ error: "Không tìm thấy báo giá." }, { status: 404 });
}

export function quoteRouteErrorResponse(
  context: PdfRouteContext,
  err: unknown,
  quoteNo?: string,
): NextResponse {
  logPdfError(context, err, quoteNo);
  const isDev = process.env.NODE_ENV === "development";
  return NextResponse.json(
    {
      error: "Không thể tạo PDF báo giá",
      ...(isDev
        ? {
            detail: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          }
        : {}),
    },
    { status: 500 },
  );
}
