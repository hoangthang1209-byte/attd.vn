import { NextRequest, NextResponse } from "next/server";
import type { MaterialType } from "@prisma/client";
import {
  deleteProductMaterial,
  updateProductMaterial,
} from "@/features/products/product-material.service";
import { ProductionPackValidationError } from "@/features/orders/production-pack.service";
import { MATERIAL_TYPES } from "@/features/orders/production-pack-labels";

type RouteContext = { params: Promise<{ id: string; materialId: string }> };

function parseMaterialType(value: unknown): MaterialType {
  if (typeof value !== "string" || !MATERIAL_TYPES.includes(value as MaterialType)) {
    throw new ProductionPackValidationError("Loại nguyên phụ liệu không hợp lệ.");
  }
  return value as MaterialType;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id, materialId } = await context.params;
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
  try {
    const material = await updateProductMaterial(id, materialId, {
      variantId: raw.variantId !== undefined
        ? (typeof raw.variantId === "string" ? raw.variantId : null)
        : undefined,
      materialType: raw.materialType ? parseMaterialType(raw.materialType) : undefined,
      materialName: typeof raw.materialName === "string" ? raw.materialName : undefined,
      materialCode: typeof raw.materialCode === "string" ? raw.materialCode : undefined,
      unit: typeof raw.unit === "string" ? raw.unit : undefined,
      consumptionPerUnit: raw.consumptionPerUnit as number | string | undefined,
      wastagePercent: raw.wastagePercent as number | string | undefined,
      note: typeof raw.note === "string" ? raw.note : undefined,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
    });
    return NextResponse.json({ material });
  } catch (err) {
    if (err instanceof ProductionPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/admin/products/[id]/materials/[materialId]]", err);
    return NextResponse.json({ message: "Không thể cập nhật định mức" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id, materialId } = await context.params;
  try {
    const result = await deleteProductMaterial(id, materialId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ProductionPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[DELETE /api/admin/products/[id]/materials/[materialId]]", err);
    return NextResponse.json({ message: "Không thể xóa định mức" }, { status: 500 });
  }
}
