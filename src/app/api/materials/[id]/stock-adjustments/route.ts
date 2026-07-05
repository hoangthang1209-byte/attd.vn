import { NextRequest, NextResponse } from "next/server";
import { applyStockAdjustment } from "@/features/materials/warehouse.service";
import { MaterialValidationError } from "@/features/materials/material-decimal";
import type { MaterialStockAdjustmentType } from "@prisma/client";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

const ADJUSTMENT_TYPES: MaterialStockAdjustmentType[] = [
  "OPENING_BALANCE",
  "RECEIVE",
  "CORRECTION",
  "ISSUE_TO_PRODUCTION",
  "RETURN_FROM_PRODUCTION",
];

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;


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
  const adjustmentType =
    typeof raw.adjustmentType === "string" &&
    ADJUSTMENT_TYPES.includes(raw.adjustmentType as MaterialStockAdjustmentType)
      ? (raw.adjustmentType as MaterialStockAdjustmentType)
      : null;

  if (!adjustmentType) {
    return NextResponse.json({ message: "Loại điều chỉnh không hợp lệ." }, { status: 400 });
  }

  try {
    const result = await applyStockAdjustment({
      materialId: id,
      adjustmentType,
      quantity: raw.quantity != null ? String(raw.quantity) : "0",
      note: typeof raw.note === "string" ? raw.note : null,
      referenceOrderId: typeof raw.referenceOrderId === "string" ? raw.referenceOrderId : null,
      createdByEmployeeId:
        typeof raw.createdByEmployeeId === "string" ? raw.createdByEmployeeId : null,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof MaterialValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/materials/[id]/stock-adjustments]", err);
    return NextResponse.json({ message: "Không thể cập nhật tồn kho." }, { status: 500 });
  }
}
