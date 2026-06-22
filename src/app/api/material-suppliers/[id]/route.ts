import { NextRequest, NextResponse } from "next/server";
import { MaterialValidationError } from "@/features/materials/material-decimal";
import {
  getMaterialSupplierById,
  updateMaterialSupplier,
} from "@/features/materials/material-supplier.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  try {
    const supplier = await getMaterialSupplierById(id);
    if (!supplier) {
      return NextResponse.json({ message: "Không tìm thấy nhà cung cấp." }, { status: 404 });
    }
    return NextResponse.json({ supplier });
  } catch (err) {
    console.error("[GET /api/material-suppliers/[id]]", err);
    return NextResponse.json({ message: "Không thể tải nhà cung cấp." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
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
    const supplier = await updateMaterialSupplier(id, {
      ...(raw.name !== undefined ? { name: typeof raw.name === "string" ? raw.name : "" } : {}),
      ...(raw.shortName !== undefined
        ? { shortName: typeof raw.shortName === "string" ? raw.shortName : null }
        : {}),
      ...(raw.contactName !== undefined
        ? { contactName: typeof raw.contactName === "string" ? raw.contactName : null }
        : {}),
      ...(raw.phone !== undefined ? { phone: typeof raw.phone === "string" ? raw.phone : null } : {}),
      ...(raw.email !== undefined ? { email: typeof raw.email === "string" ? raw.email : null } : {}),
      ...(raw.address !== undefined
        ? { address: typeof raw.address === "string" ? raw.address : null }
        : {}),
      ...(raw.taxCode !== undefined
        ? { taxCode: typeof raw.taxCode === "string" ? raw.taxCode : null }
        : {}),
      ...(raw.note !== undefined ? { note: typeof raw.note === "string" ? raw.note : null } : {}),
      ...(raw.isActive !== undefined ? { isActive: raw.isActive === true } : {}),
      ...(raw.sortOrder !== undefined
        ? { sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : 0 }
        : {}),
    });
    return NextResponse.json({ supplier });
  } catch (err) {
    if (err instanceof MaterialValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/material-suppliers/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật nhà cung cấp." }, { status: 500 });
  }
}
