import { NextRequest, NextResponse } from "next/server";
import {
  activateMaterial,
  deactivateMaterial,
  getMaterial,
  updateMaterial,
} from "@/features/materials/material.service";
import { MaterialValidationError } from "@/features/materials/material-decimal";
import { isMaterialType } from "@/features/materials/material-type";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const material = await getMaterial(id);
  if (!material) {
    return NextResponse.json({ message: "Không tìm thấy vật tư." }, { status: 404 });
  }
  return NextResponse.json({ material });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "update",
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

  try {
    if (raw.action === "deactivate") {
      const material = await deactivateMaterial(id);
      return NextResponse.json({ material });
    }
    if (raw.action === "activate") {
      const material = await activateMaterial(id);
      return NextResponse.json({ material });
    }

    const materialType =
      typeof raw.materialType === "string" && isMaterialType(raw.materialType)
        ? raw.materialType
        : undefined;

    const material = await updateMaterial(id, {
      name: typeof raw.name === "string" ? raw.name : undefined,
      materialType,
      unit: typeof raw.unit === "string" ? raw.unit : undefined,
      description: typeof raw.description === "string" ? raw.description : undefined,
      specification: typeof raw.specification === "string" ? raw.specification : undefined,
      defaultSupplierName:
        typeof raw.defaultSupplierName === "string" ? raw.defaultSupplierName : undefined,
      reorderPoint: raw.reorderPoint !== undefined ? String(raw.reorderPoint) : undefined,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
    });
    return NextResponse.json({ material });
  } catch (err) {
    if (err instanceof MaterialValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/materials/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật vật tư." }, { status: 500 });
  }
}
