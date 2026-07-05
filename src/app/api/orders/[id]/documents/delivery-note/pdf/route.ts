import { NextRequest, NextResponse } from "next/server";
import { getDeliveryExecution } from "@/features/orders/delivery-execution.service";
import { deliveryNotePdfFilename } from "@/features/orders/delivery-note/delivery-note-pdf-token";
import { generateDeliveryNotePdf } from "@/features/orders/delivery-note/delivery-note-pdf.service";
import {
  orderPdfContentDisposition,
  parseOrderPdfDisposition,
} from "@/features/orders/pdf/order-pdf-disposition";
import { mergePdfNoindexHeaders } from "@/lib/seo/indexation-policy";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "export",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await ctx.params;
  const executionId = req.nextUrl.searchParams.get("executionId");
  if (!executionId) {
    return NextResponse.json({ message: "Vui lòng chọn chuyến giao hàng." }, { status: 400 });
  }

  const execution = await getDeliveryExecution(id, executionId);
  if (!execution) {
    return NextResponse.json({ message: "Không tìm thấy chuyến giao hàng." }, { status: 404 });
  }

  const disposition = parseOrderPdfDisposition(req.nextUrl.searchParams.get("disposition"));
  const filename = deliveryNotePdfFilename(execution.executionCode);

  try {
    const buffer = await generateDeliveryNotePdf({
      orderId: id,
      executionId,
      requestHeaders: req.headers,
    });
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: mergePdfNoindexHeaders({
        "Content-Type": "application/pdf",
        "Content-Disposition": orderPdfContentDisposition(filename, disposition),
        "Cache-Control": "no-store",
        "X-Order-Pdf-Renderer": "chromium",
      }),
    });
  } catch (err) {
    console.error("[GET delivery-note/pdf]", err);
    return NextResponse.json(
      { message: "Không thể tạo file PDF phiếu giao hàng. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
