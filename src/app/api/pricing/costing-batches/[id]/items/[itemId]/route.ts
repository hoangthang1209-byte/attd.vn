import { NextRequest, NextResponse } from "next/server";
import {
  CostingBatchValidationError,
  cloneCostingBatchRow,
  cloneCostingBatchRowToTargets,
  finalizeCostingBatchRow,
  removeCostingBatchItem,
  updateBatchRowSellingPrice,
  updateCostingBatchItem,
  updateCostingBatchRowFields,
} from "@/features/pricing/services/costing-batch.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id, itemId } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  try {
    if (raw.action === "sellingPrice") {
      const sellingPricePerUnit = Number(raw.sellingPricePerUnit);
      const batch = await updateBatchRowSellingPrice(id, itemId, sellingPricePerUnit);
      return NextResponse.json({ batch });
    }

    if (raw.action === "fields" || raw.quantity != null || raw.customProductName != null) {
      const batch = await updateCostingBatchRowFields(id, itemId, {
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
        quantity: raw.quantity != null ? Number(raw.quantity) : undefined,
        groupLabel:
          raw.groupLabel === null
            ? null
            : typeof raw.groupLabel === "string"
              ? raw.groupLabel
              : undefined,
        sellingPricePerUnit:
          raw.sellingPricePerUnit != null ? Number(raw.sellingPricePerUnit) : undefined,
      });
      return NextResponse.json({ batch });
    }

    const batch = await updateCostingBatchItem(id, itemId, {
      label: raw.label === null ? null : typeof raw.label === "string" ? raw.label : undefined,
      groupLabel:
        raw.groupLabel === null ? null : typeof raw.groupLabel === "string" ? raw.groupLabel : undefined,
    });
    return NextResponse.json({ batch });
  } catch (err) {
    if (err instanceof CostingBatchValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/pricing/costing-batches/[id]/items/[itemId]]", err);
    return NextResponse.json({ message: "Không thể cập nhật dòng batch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id, itemId } = await context.params;
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty ok
  }

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  try {
    if (raw.action === "finalize") {
      const batch = await finalizeCostingBatchRow(id, itemId);
      return NextResponse.json({ batch });
    }

    if (raw.action === "clone") {
      const targets = Array.isArray(raw.targets)
        ? raw.targets
            .filter((t): t is Record<string, unknown> => Boolean(t) && typeof t === "object")
            .map((t) => ({
              label: typeof t.label === "string" ? t.label : "",
              groupLabel: typeof t.groupLabel === "string" ? t.groupLabel : undefined,
            }))
            .filter((t) => t.label.trim())
        : [];

      if (targets.length > 1) {
        const batch = await cloneCostingBatchRowToTargets(id, itemId, targets);
        return NextResponse.json({ batch }, { status: 201 });
      }

      const result = await cloneCostingBatchRow(id, itemId, {
        label: typeof raw.label === "string" ? raw.label : undefined,
        groupLabel: typeof raw.groupLabel === "string" ? raw.groupLabel : undefined,
      });
      return NextResponse.json(result, { status: 201 });
    }

    return NextResponse.json({ message: "Hành động không hợp lệ" }, { status: 400 });
  } catch (err) {
    if (err instanceof CostingBatchValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/pricing/costing-batches/[id]/items/[itemId]]", err);
    return NextResponse.json({ message: "Không thể xử lý dòng batch" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id, itemId } = await context.params;
  try {
    const batch = await removeCostingBatchItem(id, itemId);
    return NextResponse.json({ batch });
  } catch (err) {
    if (err instanceof CostingBatchValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[DELETE /api/pricing/costing-batches/[id]/items/[itemId]]", err);
    return NextResponse.json({ message: "Không thể xóa dòng batch" }, { status: 500 });
  }
}
