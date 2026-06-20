import { NextResponse } from "next/server";
import type { QuotePdfData } from "@/features/quotes/quote-document";
import {
  generateQuotePdfWithFallback,
  quotePdfFilename,
} from "@/features/quotes/pdf/quote-pdf.service";
import { generateQuoteHtmlPdfByToken } from "@/features/quotes/pdf/quote-html-pdf.service";
import { getQuotePdfTraceId } from "@/features/quotes/pdf/quote-pdf-chromium-error";
import {
  quotePdfContentDisposition,
  type QuotePdfDisposition,
} from "@/features/quotes/pdf/quote-pdf-disposition";

type PdfRouteContext = {
  route: string;
  quoteId?: string;
  token?: string;
};

export type BuildQuotePdfOptions = {
  publicToken: string;
  requestHeaders?: Headers;
  disposition?: QuotePdfDisposition;
  /** Internal debug only — ?allowFallback=1 */
  allowFallback?: boolean;
};

function pdfResponseHeaders(
  buffer: Buffer,
  filename: string,
  disposition: QuotePdfDisposition,
  renderer: "chromium" | "pdfkit",
  usedFallback?: boolean,
): Record<string, string> {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": quotePdfContentDisposition(filename, disposition),
    "Cache-Control": "no-store",
    "X-Quote-Pdf-Renderer": renderer,
    "X-Quote-Pdf-Bytes": String(buffer.length),
    ...(usedFallback ? { "X-Quote-Pdf-Fallback": "1" } : {}),
  };
}

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

function chromiumFailureResponse(
  err: unknown,
  context: PdfRouteContext,
  quoteNo: string,
): NextResponse {
  const traceId = getQuotePdfTraceId(err);

  console.error(`[quote-pdf] quoteNo=${quoteNo}`);
  console.error(
    `[quote-pdf] chromium failed=${err instanceof Error ? err.stack ?? err.message : String(err)}`,
  );
  if (traceId) {
    console.error(`[quote-pdf] traceId=${traceId}`);
  }
  logPdfError(context, err, quoteNo);

  const isDev = process.env.NODE_ENV === "development";

  return NextResponse.json(
    {
      error: "Không thể tạo file PDF giao diện báo giá. Vui lòng thử lại.",
      ...(isDev
        ? {
            traceId,
            detail: err instanceof Error ? err.message : String(err),
          }
        : {}),
    },
    {
      status: 500,
      headers: traceId ? { "X-Quote-Pdf-Trace-Id": traceId } : undefined,
    },
  );
}

export async function buildQuotePdfResponse(
  pdfData: QuotePdfData,
  context: PdfRouteContext,
  options?: BuildQuotePdfOptions,
): Promise<NextResponse> {
  const filename = quotePdfFilename(pdfData.quoteNo);
  const itemCount = pdfData.items.length;
  const imageCount = countDesignImages(pdfData);
  const disposition = options?.disposition ?? "attachment";
  const allowFallback = options?.allowFallback ?? false;

  console.info(`[quote-pdf] quoteNo=${pdfData.quoteNo}`);
  console.info(`[quote-pdf] fallback allowed=${allowFallback}`);

  if (!options?.publicToken) {
    console.error("[quote-pdf] missing publicToken — cannot render visual PDF");
    if (!allowFallback) {
      return NextResponse.json(
        { error: "Không thể tạo file PDF giao diện báo giá. Vui lòng thử lại." },
        { status: 500 },
      );
    }
  } else {
    try {
      const htmlBuffer = await generateQuoteHtmlPdfByToken({
        publicToken: options.publicToken,
        quoteNo: pdfData.quoteNo,
        itemCount,
        imageCount,
        requestHeaders: options.requestHeaders,
      });

      console.info(
        `[quote-pdf] renderer=chromium success bytes=${htmlBuffer.length}`,
      );

      return new NextResponse(new Uint8Array(htmlBuffer), {
        status: 200,
        headers: pdfResponseHeaders(htmlBuffer, filename, disposition, "chromium"),
      });
    } catch (htmlError) {
      console.error(`[quote-pdf] quoteNo=${pdfData.quoteNo}`);
      console.error(
        `[quote-pdf] chromium failed=${htmlError instanceof Error ? htmlError.stack ?? htmlError.message : String(htmlError)}`,
      );

      if (!allowFallback) {
        return chromiumFailureResponse(htmlError, context, pdfData.quoteNo);
      }

      console.warn("[quote-pdf] renderer=pdfkit fallback starting (allowFallback=1)", {
        quoteNo: pdfData.quoteNo,
        quoteId: context.quoteId,
        token: context.token,
      });
    }
  }

  if (!allowFallback) {
    return NextResponse.json(
      { error: "Không thể tạo file PDF giao diện báo giá. Vui lòng thử lại." },
      { status: 500 },
    );
  }

  try {
    const { buffer, usedFallback } = await generateQuotePdfWithFallback(pdfData);

    console.warn(`[quote-pdf] renderer=pdfkit bytes=${buffer.length}`, {
      quoteNo: pdfData.quoteNo,
      usedMinimalFallback: usedFallback,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: pdfResponseHeaders(buffer, filename, disposition, "pdfkit", true),
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

export function parseAllowPdfFallback(
  value: string | null | undefined,
): boolean {
  return value === "1";
}
