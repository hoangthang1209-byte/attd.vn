import { NextRequest, NextResponse } from "next/server";
import { getOrderDocumentAvailability } from "@/features/orders/order-document-availability";
import { canAccessOrderFinancialPdf } from "@/features/auth/order-financial-permissions";
import { getOrderDetail } from "@/features/orders/order.service";
import {
  buildOrderPdfResponse,
  orderDocumentNotFoundResponse,
  orderDocumentUnavailableResponse,
  parseOrderPdfDisposition,
} from "@/features/orders/pdf/order-pdf-route";
import { parseOrderDocumentType } from "@/features/orders/pdf/order-pdf-url";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { financialApiForbiddenResponse } from "@/lib/admin-auth/financial-access";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; docType: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "export",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id, docType: rawDocType } = await ctx.params;
  const docType = parseOrderDocumentType(rawDocType);
  const route = `GET /api/orders/[id]/documents/${rawDocType}/pdf`;
  const session = getAdminSessionFromRequest(req);

  if (!docType) {
    return orderDocumentNotFoundResponse();
  }

  if (!canAccessOrderFinancialPdf(session, docType)) {
    return financialApiForbiddenResponse(route, session);
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
