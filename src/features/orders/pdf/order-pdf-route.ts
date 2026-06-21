import { NextResponse } from "next/server";
import type { OrderDocumentType } from "@/features/orders/order-document-types";
import { orderDocumentPdfFilename } from "@/features/orders/order-document";
import { createOrderDocumentPdfToken } from "@/features/orders/pdf/order-document-pdf-token";
import { generateOrderHtmlPdfForDocument } from "@/features/orders/pdf/order-html-pdf.service";
import { getOrderPdfTraceId } from "@/features/orders/pdf/order-pdf-chromium-error";
import {
  orderPdfContentDisposition,
  parseOrderPdfDisposition,
  type OrderPdfDisposition,
} from "@/features/orders/pdf/order-pdf-disposition";

type PdfRouteContext = {
  route: string;
  orderId: string;
  docType: OrderDocumentType;
};

export type BuildOrderPdfOptions = {
  orderNo: string;
  docType: OrderDocumentType;
  requestHeaders?: Headers;
  disposition?: OrderPdfDisposition;
};

function pdfResponseHeaders(
  buffer: Buffer,
  filename: string,
  disposition: OrderPdfDisposition,
): Record<string, string> {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": orderPdfContentDisposition(filename, disposition),
    "Cache-Control": "no-store",
    "X-Order-Pdf-Renderer": "chromium",
    "X-Order-Pdf-Bytes": String(buffer.length),
  };
}

export async function buildOrderPdfResponse(
  context: PdfRouteContext,
  options: BuildOrderPdfOptions,
): Promise<NextResponse> {
  const filename = orderDocumentPdfFilename(options.docType, options.orderNo);
  const disposition = options.disposition ?? "attachment";
  const pdfToken = createOrderDocumentPdfToken(options.orderNo, options.docType);

  if (!pdfToken) {
    return NextResponse.json(
      { message: "Không thể tạo file PDF chứng từ đơn hàng. Vui lòng thử lại." },
      { status: 500 },
    );
  }

  try {
    const htmlBuffer = await generateOrderHtmlPdfForDocument({
      orderNo: options.orderNo,
      docType: options.docType,
      pdfToken,
      requestHeaders: options.requestHeaders,
    });

    return new NextResponse(new Uint8Array(htmlBuffer), {
      status: 200,
      headers: pdfResponseHeaders(htmlBuffer, filename, disposition),
    });
  } catch (err) {
    const traceId = getOrderPdfTraceId(err);
    console.error(`[${context.route}] PDF generation failed`, {
      orderId: context.orderId,
      orderNo: options.orderNo,
      docType: options.docType,
      traceId,
      err,
    });

    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        message: "Không thể tạo file PDF chứng từ đơn hàng. Vui lòng thử lại.",
        ...(isDev
          ? {
              traceId,
              detail: err instanceof Error ? err.message : String(err),
            }
          : {}),
      },
      {
        status: 500,
        headers: traceId ? { "X-Order-Pdf-Trace-Id": traceId } : undefined,
      },
    );
  }
}

export function orderDocumentNotFoundResponse(): NextResponse {
  return NextResponse.json({ message: "Không tìm thấy đơn hàng." }, { status: 404 });
}

export function orderDocumentUnavailableResponse(message: string): NextResponse {
  return NextResponse.json({ message }, { status: 409 });
}

export { parseOrderPdfDisposition };
