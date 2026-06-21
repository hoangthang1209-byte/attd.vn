import { NextRequest } from "next/server";
import { getOrderDocumentAvailability } from "@/features/orders/order-document-availability";
import { getOrderDetail } from "@/features/orders/order.service";
import {
  buildOrderPdfResponse,
  orderDocumentNotFoundResponse,
  orderDocumentUnavailableResponse,
  parseOrderPdfDisposition,
} from "@/features/orders/pdf/order-pdf-route";
import { parseOrderDocumentType } from "@/features/orders/pdf/order-pdf-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; docType: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id, docType: rawDocType } = await ctx.params;
  const docType = parseOrderDocumentType(rawDocType);
  const route = `GET /api/orders/[id]/documents/${rawDocType}/pdf`;

  if (!docType) {
    return orderDocumentNotFoundResponse();
  }

  const order = await getOrderDetail(id);
  if (!order) {
    return orderDocumentNotFoundResponse();
  }

  const availability = getOrderDocumentAvailability(docType, order);
  if (!availability.available) {
    return orderDocumentUnavailableResponse(
      availability.reason ?? "Không thể tạo chứng từ cho đơn hàng này.",
    );
  }

  const disposition = parseOrderPdfDisposition(req.nextUrl.searchParams.get("disposition"));

  return buildOrderPdfResponse(
    { route, orderId: id, docType },
    {
      orderNo: order.orderNo,
      docType,
      requestHeaders: req.headers,
      disposition,
    },
  );
}
