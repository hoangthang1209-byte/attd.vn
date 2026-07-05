import { NextRequest, NextResponse } from "next/server";
import { MaterialValidationError } from "@/features/materials/material-decimal";
import { createPurchaseRequestFromOrderShortages } from "@/features/materials/purchase-request.service";
import { linkOrderMaterialToCatalog } from "@/features/materials/allocation.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id: orderId } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const raw = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  try {
    if (raw.action === "link-material") {
      const rows = await linkOrderMaterialToCatalog({
        orderId,
        orderMaterialRequirementId:
          typeof raw.orderMaterialRequirementId === "string"
            ? raw.orderMaterialRequirementId
            : "",
        materialId: typeof raw.materialId === "string" ? raw.materialId : "",
      });
      return NextResponse.json({ rows });
    }

    const request = await createPurchaseRequestFromOrderShortages({
      orderId,
      requestedByEmployeeId:
        typeof raw.requestedByEmployeeId === "string" ? raw.requestedByEmployeeId : null,
      note: typeof raw.note === "string" ? raw.note : null,
    });
    return NextResponse.json({ request }, { status: 201 });
  } catch (err) {
    if (err instanceof MaterialValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/[id]/purchase-request]", err);
    return NextResponse.json({ message: "Không thể tạo yêu cầu mua hàng." }, { status: 500 });
  }
}
