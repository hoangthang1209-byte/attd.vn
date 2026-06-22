import { NextRequest, NextResponse } from "next/server";
import { MaterialValidationError } from "@/features/materials/material-decimal";
import {
  createMaterialSupplierLink,
  listMaterialSupplierLinks,
} from "@/features/materials/material-supplier-link.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  try {
    const links = await listMaterialSupplierLinks(id);
    return NextResponse.json({ links });
  } catch (err) {
    console.error("[GET /api/materials/[id]/suppliers]", err);
    return NextResponse.json({ message: "Không thể tải nhà cung cấp vật tư." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
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
    const link = await createMaterialSupplierLink(id, {
      supplierId: typeof raw.supplierId === "string" ? raw.supplierId : "",
      supplierMaterialCode:
        typeof raw.supplierMaterialCode === "string" ? raw.supplierMaterialCode : null,
      supplierMaterialName:
        typeof raw.supplierMaterialName === "string" ? raw.supplierMaterialName : null,
      isPreferred: raw.isPreferred === true,
      note: typeof raw.note === "string" ? raw.note : null,
    });
    return NextResponse.json({ link }, { status: 201 });
  } catch (err) {
    if (err instanceof MaterialValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/materials/[id]/suppliers]", err);
    return NextResponse.json({ message: "Không thể liên kết nhà cung cấp." }, { status: 500 });
  }
}
