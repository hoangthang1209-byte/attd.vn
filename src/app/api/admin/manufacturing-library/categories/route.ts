import { NextResponse } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { getAdminSessionFromCookies } from "@/lib/admin-auth/get-admin-session";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  saveManufacturingCategoryAdmin,
  ManufacturingAdminValidationError,
  type ManufacturingCategoryAdminInput,
} from "@/features/manufacturing-library/manufacturing-admin.service";

function forbidden() {
  return NextResponse.json({ message: "Không có quyền truy cập" }, { status: 403 });
}

export async function GET() {
  const session = await getAdminSessionFromCookies();
  if (!can(session, "manufacturingCategory.manage")) return forbidden();
  const categories = await prisma.manufacturingCategory.findMany({
    include: { parent: true, _count: { select: { assets: true, children: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "create",
    request: request,
  });
  if (!permission.ok) return permission.response;


  const session = await getAdminSessionFromCookies();
  if (!can(session, "manufacturingCategory.manage")) return forbidden();
  try {
    const category = await saveManufacturingCategoryAdmin(
      (await request.json()) as ManufacturingCategoryAdminInput,
    );
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    const status = error instanceof ManufacturingAdminValidationError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Không thể lưu danh mục";
    return NextResponse.json({ message }, { status });
  }
}
