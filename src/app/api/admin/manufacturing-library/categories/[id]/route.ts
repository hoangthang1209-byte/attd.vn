import { NextResponse } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { getAdminSessionFromCookies } from "@/lib/admin-auth/get-admin-session";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  deleteManufacturingCategoryAdmin,
  saveManufacturingCategoryAdmin,
  ManufacturingAdminValidationError,
  type ManufacturingCategoryAdminInput,
} from "@/features/manufacturing-library/manufacturing-admin.service";

function forbidden() {
  return NextResponse.json({ message: "Không có quyền truy cập" }, { status: 403 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "update",
    request: request,
  });
  if (!permission.ok) return permission.response;


  const session = await getAdminSessionFromCookies();
  if (!can(session, "manufacturingCategory.manage")) return forbidden();
  const { id } = await params;
  try {
    const category = await saveManufacturingCategoryAdmin(
      (await request.json()) as ManufacturingCategoryAdminInput,
      id,
    );
    return NextResponse.json({ category });
  } catch (error) {
    const status = error instanceof ManufacturingAdminValidationError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Không thể lưu danh mục";
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "delete",
    request: request,
  });
  if (!permission.ok) return permission.response;


  const session = await getAdminSessionFromCookies();
  if (!can(session, "manufacturingCategory.manage")) return forbidden();
  const { id } = await params;
  const category = await deleteManufacturingCategoryAdmin(id);
  return NextResponse.json({ category });
}
