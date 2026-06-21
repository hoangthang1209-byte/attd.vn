import { NextRequest, NextResponse } from "next/server";
import {
  createMaterial,
  listMaterials,
} from "@/features/materials/material.service";
import { MaterialValidationError } from "@/features/materials/material-decimal";
import { listWarehouseOverview } from "@/features/materials/warehouse.service";
import { isMaterialType } from "@/features/materials/material-type";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("view") === "warehouse") {
    const rows = await listWarehouseOverview();
    return NextResponse.json({ rows });
  }

  try {
    const typeParam = searchParams.get("materialType");
    const result = await listMaterials({
      search: searchParams.get("search") ?? undefined,
      materialType: typeParam && isMaterialType(typeParam) ? typeParam : undefined,
      activeOnly: searchParams.get("active") === "1",
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 100,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/materials]", err);
    return NextResponse.json({ message: "Không thể tải danh sách vật tư." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
    const materialType = typeof raw.materialType === "string" ? raw.materialType : "";
    if (!isMaterialType(materialType)) {
      return NextResponse.json({ message: "Loại vật tư không hợp lệ." }, { status: 400 });
    }
    const material = await createMaterial({
      name: typeof raw.name === "string" ? raw.name : "",
      materialType,
      unit: typeof raw.unit === "string" ? raw.unit : "",
      description: typeof raw.description === "string" ? raw.description : null,
      specification: typeof raw.specification === "string" ? raw.specification : null,
      defaultSupplierName:
        typeof raw.defaultSupplierName === "string" ? raw.defaultSupplierName : null,
      reorderPoint: raw.reorderPoint != null ? String(raw.reorderPoint) : null,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : 0,
      isActive: raw.isActive !== false,
    });
    return NextResponse.json({ material }, { status: 201 });
  } catch (err) {
    if (err instanceof MaterialValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/materials]", err);
    return NextResponse.json({ message: "Không thể tạo vật tư." }, { status: 500 });
  }
}
