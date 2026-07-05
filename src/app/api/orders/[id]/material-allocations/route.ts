import { NextRequest, NextResponse } from "next/server";
import { MaterialValidationError } from "@/features/materials/material-decimal";
import {
  issueMaterialForOrder,
  reserveMaterialForOrder,
} from "@/features/materials/allocation.service";
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
  const materialId = typeof raw.materialId === "string" ? raw.materialId : "";
  const action = typeof raw.action === "string" ? raw.action : "reserve";

  if (!materialId) {
    return NextResponse.json({ message: "Thiếu mã vật tư." }, { status: 400 });
  }

  try {
    const result =
      action === "issue"
        ? await issueMaterialForOrder({
            orderId,
            materialId,
            quantity: raw.quantity != null ? String(raw.quantity) : undefined,
            note: typeof raw.note === "string" ? raw.note : null,
            createdByEmployeeId:
              typeof raw.createdByEmployeeId === "string" ? raw.createdByEmployeeId : null,
          })
        : await reserveMaterialForOrder({
            orderId,
            materialId,
            quantity: raw.quantity != null ? String(raw.quantity) : undefined,
          });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof MaterialValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/[id]/material-allocations]", err);
    return NextResponse.json({ message: "Không thể cập nhật phân bổ vật tư." }, { status: 500 });
  }
}
