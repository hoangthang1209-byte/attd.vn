import { NextRequest, NextResponse } from "next/server";
import {
  CostingBatchValidationError,
  persistCostingBatchRow,
  persistCostingBatchRows,
} from "@/features/pricing/services/costing-batch.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

function parsePersistRow(raw: Record<string, unknown>) {
  const quantity = Number(raw.quantity);
  const sellingPricePerUnit =
    raw.sellingPricePerUnit != null ? Number(raw.sellingPricePerUnit) : undefined;
  return {
    productId:
      raw.productId === null
        ? null
        : typeof raw.productId === "string"
          ? raw.productId
          : undefined,
    variantId:
      raw.variantId === null
        ? null
        : typeof raw.variantId === "string"
          ? raw.variantId
          : undefined,
    customProductName:
      raw.customProductName === null
        ? null
        : typeof raw.customProductName === "string"
          ? raw.customProductName
          : undefined,
    quantity,
    groupLabel:
      raw.groupLabel === null
        ? null
        : typeof raw.groupLabel === "string"
          ? raw.groupLabel
          : undefined,
    sellingPricePerUnit:
      sellingPricePerUnit != null && Number.isFinite(sellingPricePerUnit)
        ? sellingPricePerUnit
        : undefined,
  };
}

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty body ok for legacy — client should not send empty POST anymore
  }

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  try {
    if (raw.action === "persistBulk" && Array.isArray(raw.rows)) {
      const rows = raw.rows
        .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
        .map((row) => parsePersistRow(row));
      const batch = await persistCostingBatchRows(id, rows);
      return NextResponse.json({ batch }, { status: 201 });
    }

    if (raw.action === "persist" || raw.quantity != null) {
      const existingItemId =
        typeof raw.itemId === "string" ? raw.itemId : undefined;
      const batch = await persistCostingBatchRow(id, parsePersistRow(raw), existingItemId);
      return NextResponse.json({ batch }, { status: 201 });
    }

    return NextResponse.json(
      { message: "Thêm style từ spreadsheet UI — không tạo dòng trống qua API." },
      { status: 400 },
    );
  } catch (err) {
    if (err instanceof CostingBatchValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/pricing/costing-batches/[id]/items]", err);
    return NextResponse.json({ message: "Không thể thêm dòng batch" }, { status: 500 });
  }
}
