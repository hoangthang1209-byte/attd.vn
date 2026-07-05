import { NextRequest, NextResponse } from "next/server";
import {
  getProductionSupplier,
  updateProductionSupplier,
  ProductionMasterValidationError,
} from "@/features/production-master/production-supplier.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";
import { archiveOrDeleteProductionSupplier } from "@/features/production-master/production-master-archive.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  const item = await getProductionSupplier(id);
  if (!item) return NextResponse.json({ message: "Không tìm thấy nhà cung cấp." }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const updated = await updateProductionSupplier(id, {
      name: typeof body.name === "string" ? body.name : undefined,
      contact: body.contact === null ? null : typeof body.contact === "string" ? body.contact : undefined,
      email: body.email === null ? null : typeof body.email === "string" ? body.email : undefined,
      phone: body.phone === null ? null : typeof body.phone === "string" ? body.phone : undefined,
      address: body.address === null ? null : typeof body.address === "string" ? body.address : undefined,
      notes: body.notes === null ? null : typeof body.notes === "string" ? body.notes : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ProductionMasterValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Không thể lưu nhà cung cấp." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "delete",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  try {
    const result = await archiveOrDeleteProductionSupplier(id);
    return NextResponse.json({
      ...result,
      message: result.action === "archived" ? "Đã lưu trữ (đang dùng trong Tech Pack)." : "Đã xóa.",
    });
  } catch (err) {
    if (err instanceof ProductionMasterValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Không thể lưu trữ nhà cung cấp." }, { status: 500 });
  }
}
