import { NextRequest, NextResponse } from "next/server";
import { MaterialValidationError } from "@/features/materials/material-decimal";
import { releaseMaterialAllocation } from "@/features/materials/allocation.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; allocationId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id: orderId, allocationId } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const raw = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  try {
    if (raw.action === "release") {
      const result = await releaseMaterialAllocation({ orderId, allocationId });
      return NextResponse.json(result);
    }
    return NextResponse.json({ message: "Hành động không hợp lệ." }, { status: 400 });
  } catch (err) {
    if (err instanceof MaterialValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/orders/[id]/material-allocations/[allocationId]]", err);
    return NextResponse.json({ message: "Không thể cập nhật phân bổ." }, { status: 500 });
  }
}
