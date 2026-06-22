import { NextRequest, NextResponse } from "next/server";
import { MaterialValidationError } from "@/features/materials/material-decimal";
import {
  deleteMaterialSupplierLink,
  updateMaterialSupplierLink,
} from "@/features/materials/material-supplier-link.service";

type RouteContext = { params: Promise<{ id: string; linkId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id, linkId } = await ctx.params;
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
    const link = await updateMaterialSupplierLink(id, linkId, {
      ...(raw.supplierMaterialCode !== undefined
        ? {
            supplierMaterialCode:
              typeof raw.supplierMaterialCode === "string" ? raw.supplierMaterialCode : null,
          }
        : {}),
      ...(raw.supplierMaterialName !== undefined
        ? {
            supplierMaterialName:
              typeof raw.supplierMaterialName === "string" ? raw.supplierMaterialName : null,
          }
        : {}),
      ...(raw.isPreferred !== undefined ? { isPreferred: raw.isPreferred === true } : {}),
      ...(raw.note !== undefined ? { note: typeof raw.note === "string" ? raw.note : null } : {}),
    });
    return NextResponse.json({ link });
  } catch (err) {
    if (err instanceof MaterialValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/materials/[id]/suppliers/[linkId]]", err);
    return NextResponse.json({ message: "Không thể cập nhật liên kết." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id, linkId } = await ctx.params;
  try {
    await deleteMaterialSupplierLink(id, linkId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof MaterialValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[DELETE /api/materials/[id]/suppliers/[linkId]]", err);
    return NextResponse.json({ message: "Không thể xóa liên kết." }, { status: 500 });
  }
}
