import { NextRequest, NextResponse } from "next/server";
import {
  createProductionSupplier,
  listProductionSuppliers,
  ProductionMasterValidationError,
} from "@/features/production-master/production-supplier.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  try {
    const result = await listProductionSuppliers({
      search: searchParams.get("search") ?? undefined,
      activeOnly: searchParams.get("activeOnly") === "true",
      inactiveOnly: searchParams.get("inactiveOnly") === "true",
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ message: "Không thể tải danh sách NCC." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const created = await createProductionSupplier({
      name: String(body.name ?? ""),
      contact: body.contact === null ? null : typeof body.contact === "string" ? body.contact : undefined,
      email: body.email === null ? null : typeof body.email === "string" ? body.email : undefined,
      phone: body.phone === null ? null : typeof body.phone === "string" ? body.phone : undefined,
      address: body.address === null ? null : typeof body.address === "string" ? body.address : undefined,
      notes: body.notes === null ? null : typeof body.notes === "string" ? body.notes : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof ProductionMasterValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Không thể tạo nhà cung cấp." }, { status: 500 });
  }
}
