import { NextRequest, NextResponse } from "next/server";
import { MaterialValidationError } from "@/features/materials/material-decimal";
import {
  getPurchaseRequest,
  updatePurchaseRequest,
} from "@/features/materials/purchase-request.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const request = await getPurchaseRequest(id);
  if (!request) {
    return NextResponse.json({ message: "Không tìm thấy yêu cầu mua hàng." }, { status: 404 });
  }
  return NextResponse.json({ request });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;
  const items = Array.isArray(raw.items) ? raw.items : undefined;

  try {
    const request = await updatePurchaseRequest(id, {
      supplierName: typeof raw.supplierName === "string" ? raw.supplierName : undefined,
      expectedArrivalAt:
        typeof raw.expectedArrivalAt === "string" ? raw.expectedArrivalAt : undefined,
      note: typeof raw.note === "string" ? raw.note : undefined,
      items: items?.map((item, index) => {
        const row = item as Record<string, unknown>;
        return {
          materialId: typeof row.materialId === "string" ? row.materialId : null,
          materialCodeSnapshot:
            typeof row.materialCodeSnapshot === "string" ? row.materialCodeSnapshot : null,
          materialNameSnapshot:
            typeof row.materialNameSnapshot === "string" ? row.materialNameSnapshot : "",
          unitSnapshot: typeof row.unitSnapshot === "string" ? row.unitSnapshot : "",
          requestedQuantity: row.requestedQuantity != null ? String(row.requestedQuantity) : "0",
          orderedQuantity: row.orderedQuantity != null ? String(row.orderedQuantity) : null,
          linkedOrderId: typeof row.linkedOrderId === "string" ? row.linkedOrderId : null,
          note: typeof row.note === "string" ? row.note : null,
          sortOrder: index,
        };
      }),
    });
    return NextResponse.json({ request });
  } catch (err) {
    if (err instanceof MaterialValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/purchase-requests/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật yêu cầu mua hàng." }, { status: 500 });
  }
}
