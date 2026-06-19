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

type BuildQuotePdfOptions = {
  publicToken: string;
  requestHeaders?: Headers;
};

function countDesignImages(data: QuotePdfData): number {
  return data.items.filter((item) => item.designImageUrl?.trim()).length;
}

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
  options?: BuildQuotePdfOptions,
): Promise<NextResponse> {
  const filename = quotePdfFilename(pdfData.quoteNo);
  const itemCount = pdfData.items.length;
  const imageCount = countDesignImages(pdfData);

  if (options?.publicToken) {
    try {
      const htmlBuffer = await generateQuoteHtmlPdfByToken({
        publicToken: options.publicToken,
        quoteNo: pdfData.quoteNo,
        itemCount,
        imageCount,
        requestHeaders: options.requestHeaders,
      });

      console.info("[quote-pdf] renderer=chromium", {
        quoteNo: pdfData.quoteNo,
        bytes: htmlBuffer.length,
        itemCount,
        imageCount,
      });

      return new NextResponse(new Uint8Array(htmlBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
          "X-Quote-Pdf-Renderer": "chromium",
          "X-Quote-Pdf-Bytes": String(htmlBuffer.length),
        },
      });
    } catch (htmlError) {
      console.error("[quote-pdf] renderer=fallback", {
        quoteNo: pdfData.quoteNo,
        quoteId: context.quoteId,
        token: context.token,
        reason: "chromium_failed",
      });
      console.error(
        "[quote-pdf] chromium failed:",
        htmlError instanceof Error ? htmlError.message : htmlError,
      );
    }
  }

  try {
    console.warn("[quote-pdf] renderer=pdfkit fallback starting", {
      quoteNo: pdfData.quoteNo,
      quoteId: context.quoteId,
      token: context.token,
    });

    const { buffer, usedFallback } = await generateQuotePdfWithFallback(pdfData);

    console.warn("[quote-pdf] renderer=pdfkit", {
      quoteNo: pdfData.quoteNo,
      usedMinimalFallback: usedFallback,
      bytes: buffer.length,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Quote-Pdf-Renderer": "pdfkit",
        "X-Quote-Pdf-Fallback": "1",
        "X-Quote-Pdf-Bytes": String(buffer.length),
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
