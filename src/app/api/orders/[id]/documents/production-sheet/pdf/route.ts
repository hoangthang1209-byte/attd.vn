import { NextRequest } from "next/server";
import { getProductionSheetAvailability } from "@/features/orders/production-sheet/production-sheet-availability";
import {
  buildProductionSheetPdfResponse,
  parseOrderPdfDisposition,
} from "@/features/orders/production-sheet/production-sheet-pdf-route";
import { getOrderDetail } from "@/features/orders/order.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const route = "GET /api/orders/[id]/documents/production-sheet/pdf";

  const order = await getOrderDetail(id);
  if (!order) {
    return Response.json({ message: "Không tìm thấy đơn hàng." }, { status: 404 });
  }

  const availability = getProductionSheetAvailability(order);
  if (!availability.available) {
    return Response.json(
      { message: availability.reason ?? "Không thể tạo lệnh sản xuất cho đơn hàng này." },
      { status: 403 },
    );
  }

  const disposition = parseOrderPdfDisposition(req.nextUrl.searchParams.get("disposition"));

  return buildProductionSheetPdfResponse(
    { route, orderId: id },
    {
      orderNo: order.orderNo,
      requestHeaders: req.headers,
      disposition,
    },
  );
}
