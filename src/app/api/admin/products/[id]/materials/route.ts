import { NextRequest, NextResponse } from "next/server";
import type { MaterialType } from "@prisma/client";
import {
  createProductMaterial,
  listProductMaterials,
} from "@/features/products/product-material.service";
import { ProductionPackValidationError } from "@/features/orders/production-pack.service";
import { MATERIAL_TYPES } from "@/features/orders/production-pack-labels";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

function parseMaterialType(value: unknown): MaterialType {
  if (typeof value !== "string" || !MATERIAL_TYPES.includes(value as MaterialType)) {
    throw new ProductionPackValidationError("Loại nguyên phụ liệu không hợp lệ.");
  }
  return value as MaterialType;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const materials = await listProductMaterials(id);
    return NextResponse.json({ materials });
  } catch (err) {
    if (err instanceof ProductionPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[GET /api/admin/products/[id]/materials]", err);
    return NextResponse.json({ message: "Không thể tải định mức nguyên phụ liệu" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "product",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
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
    const material = await createProductMaterial(id, {
      variantId: typeof raw.variantId === "string" ? raw.variantId : null,
      materialType: parseMaterialType(raw.materialType),
      materialName: String(raw.materialName ?? ""),
      materialCode: typeof raw.materialCode === "string" ? raw.materialCode : null,
      unit: String(raw.unit ?? ""),
      consumptionPerUnit: raw.consumptionPerUnit as number | string,
      wastagePercent: raw.wastagePercent as number | string | undefined,
      note: typeof raw.note === "string" ? raw.note : null,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
    });
    return NextResponse.json({ material }, { status: 201 });
  } catch (err) {
    if (err instanceof ProductionPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/admin/products/[id]/materials]", err);
    return NextResponse.json({ message: "Không thể thêm định mức" }, { status: 500 });
  }
}
