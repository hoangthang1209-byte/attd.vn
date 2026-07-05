import { NextRequest, NextResponse } from "next/server";
import {
  getPrintMethod,
  updatePrintMethod,
  ProductionMasterValidationError,
} from "@/features/production-master/print-method.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";
import { archiveOrDeletePrintMethod } from "@/features/production-master/production-master-archive.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  const item = await getPrintMethod(id);
  if (!item) return NextResponse.json({ message: "Không tìm thấy công nghệ in." }, { status: 404 });
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
    const updated = await updatePrintMethod(id, {
      name: typeof body.name === "string" ? body.name : undefined,
      category: typeof body.category === "string" ? body.category : undefined,
      description: body.description === null ? null : typeof body.description === "string" ? body.description : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ProductionMasterValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Không thể lưu công nghệ in." }, { status: 500 });
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
    const result = await archiveOrDeletePrintMethod(id);
    return NextResponse.json({
      ...result,
      message: result.action === "archived" ? "Đã lưu trữ (đang dùng trong Tech Pack)." : "Đã xóa.",
    });
  } catch (err) {
    if (err instanceof ProductionMasterValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Không thể lưu trữ công nghệ in." }, { status: 500 });
  }
}
