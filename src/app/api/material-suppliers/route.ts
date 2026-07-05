import { NextRequest, NextResponse } from "next/server";
import { MaterialValidationError } from "@/features/materials/material-decimal";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  createMaterialSupplier,
  listMaterialSuppliers,
} from "@/features/materials/material-supplier.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    const result = await listMaterialSuppliers({
      search: searchParams.get("search") ?? undefined,
      activeOnly: searchParams.get("active") === "1",
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/material-suppliers]", err);
    return NextResponse.json({ message: "Không thể tải danh sách nhà cung cấp." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;


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
    const supplier = await createMaterialSupplier({
      name: typeof raw.name === "string" ? raw.name : "",
      shortName: typeof raw.shortName === "string" ? raw.shortName : null,
      contactName: typeof raw.contactName === "string" ? raw.contactName : null,
      phone: typeof raw.phone === "string" ? raw.phone : null,
      email: typeof raw.email === "string" ? raw.email : null,
      address: typeof raw.address === "string" ? raw.address : null,
      taxCode: typeof raw.taxCode === "string" ? raw.taxCode : null,
      note: typeof raw.note === "string" ? raw.note : null,
      isActive: raw.isActive !== false,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : 0,
    });
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (err) {
    if (err instanceof MaterialValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/material-suppliers]", err);
    return NextResponse.json({ message: "Không thể tạo nhà cung cấp." }, { status: 500 });
  }
}
