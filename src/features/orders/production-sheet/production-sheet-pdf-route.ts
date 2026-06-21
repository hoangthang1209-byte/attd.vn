import { NextResponse } from "next/server";
import { productionSheetPdfFilename } from "@/features/orders/production-sheet/production-sheet-availability";
import { createProductionSheetPdfToken } from "@/features/orders/production-sheet/production-sheet-pdf-token";
import { generateProductionSheetPdf } from "@/features/orders/production-sheet/production-sheet-pdf.service";
import { getOrderPdfTraceId } from "@/features/orders/pdf/order-pdf-chromium-error";
import {
  orderPdfContentDisposition,
  parseOrderPdfDisposition,
  type OrderPdfDisposition,
} from "@/features/orders/pdf/order-pdf-disposition";

type PdfRouteContext = {
  route: string;
  orderId: string;
};

export type BuildProductionSheetPdfOptions = {
  orderNo: string;
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

export async function buildProductionSheetPdfResponse(
  context: PdfRouteContext,
  options: BuildProductionSheetPdfOptions,
): Promise<NextResponse> {
  const filename = productionSheetPdfFilename(options.orderNo);
  const disposition = options.disposition ?? "attachment";
  const pdfToken = createProductionSheetPdfToken(context.orderId);

  if (!pdfToken) {
    return NextResponse.json(
      { message: "Không thể tạo file PDF lệnh sản xuất. Vui lòng thử lại." },
      { status: 500 },
    );
  }

  try {
    const htmlBuffer = await generateProductionSheetPdf({
      orderId: context.orderId,
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
      traceId,
      err,
    });

    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        message: "Không thể tạo file PDF lệnh sản xuất. Vui lòng thử lại.",
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

export { parseOrderPdfDisposition };
