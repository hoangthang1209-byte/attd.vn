import { NextRequest, NextResponse } from "next/server";
import type { MaterialType } from "@prisma/client";
import {
  createOrderMaterial,
  listOrderMaterials,
  ProductionPackValidationError,
  updateOrderMaterial,
} from "@/features/orders/production-pack.service";
import { MATERIAL_TYPES } from "@/features/orders/production-pack-labels";
import { evaluateProductionReadiness } from "@/features/orders/production-readiness.service";
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
    const [materials, readiness] = await Promise.all([
      listOrderMaterials(id),
      evaluateProductionReadiness(id),
    ]);
    return NextResponse.json({ ...materials, readiness });
  } catch (err) {
    if (err instanceof ProductionPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[GET /api/orders/[id]/materials]", err);
    return NextResponse.json({ message: "Không thể tải nguyên phụ liệu" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
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
    if (typeof raw.orderItemId !== "string" || !raw.orderItemId.trim()) {
      throw new ProductionPackValidationError("Dòng sản phẩm là bắt buộc.");
    }
    const material = await createOrderMaterial(id, {
      orderItemId: raw.orderItemId.trim(),
      materialType: parseMaterialType(raw.materialType),
      materialName: String(raw.materialName ?? ""),
      materialCode: typeof raw.materialCode === "string" ? raw.materialCode : null,
      unit: String(raw.unit ?? ""),
      consumptionPerUnit: raw.consumptionPerUnit as number | string,
      wastagePercent: raw.wastagePercent as number | string | undefined,
      requiredQuantity: raw.requiredQuantity as number | string | null | undefined,
      note: typeof raw.note === "string" ? raw.note : null,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
    });
    const data = await listOrderMaterials(id);
    return NextResponse.json({ material, ...data }, { status: 201 });
  } catch (err) {
    if (err instanceof ProductionPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/[id]/materials]", err);
    return NextResponse.json({ message: "Không thể thêm nguyên phụ liệu" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
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
  const materialId = typeof raw.materialId === "string" ? raw.materialId : null;
  if (!materialId) {
    return NextResponse.json({ message: "materialId là bắt buộc." }, { status: 400 });
  }

  try {
    const material = await updateOrderMaterial(id, materialId, {
      materialType: raw.materialType ? parseMaterialType(raw.materialType) : undefined,
      materialName: typeof raw.materialName === "string" ? raw.materialName : undefined,
      materialCode: typeof raw.materialCode === "string" ? raw.materialCode : undefined,
      unit: typeof raw.unit === "string" ? raw.unit : undefined,
      consumptionPerUnit: raw.consumptionPerUnit as number | string | undefined,
      wastagePercent: raw.wastagePercent as number | string | undefined,
      requiredQuantity: raw.requiredQuantity as number | string | null | undefined,
      requiredQuantityOverridden:
        typeof raw.requiredQuantityOverridden === "boolean"
          ? raw.requiredQuantityOverridden
          : undefined,
      note: typeof raw.note === "string" ? raw.note : undefined,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
    });
    const data = await listOrderMaterials(id);
    return NextResponse.json({ material, ...data });
  } catch (err) {
    if (err instanceof ProductionPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/orders/[id]/materials]", err);
    return NextResponse.json({ message: "Không thể cập nhật nguyên phụ liệu" }, { status: 500 });
  }
}
