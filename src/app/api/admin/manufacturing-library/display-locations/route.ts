import { NextResponse } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { getAdminSessionFromCookies } from "@/lib/admin-auth/get-admin-session";
import { prisma } from "@/lib/prisma";
import {
  saveManufacturingDisplayLocationAdmin,
  ManufacturingAdminValidationError,
  type ManufacturingDisplayLocationAdminInput,
} from "@/features/manufacturing-library/manufacturing-admin.service";

function forbidden() {
  return NextResponse.json({ message: "Không có quyền truy cập" }, { status: 403 });
}

export async function GET() {
  const session = await getAdminSessionFromCookies();
  if (!can(session, "manufacturingDisplayLocation.manage")) return forbidden();
  const displayLocations = await prisma.manufacturingDisplayLocation.findMany({
    include: { _count: { select: { assets: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ displayLocations });
}

export async function POST(request: Request) {
  const session = await getAdminSessionFromCookies();
  if (!can(session, "manufacturingDisplayLocation.manage")) return forbidden();
  try {
    const displayLocation = await saveManufacturingDisplayLocationAdmin(
      (await request.json()) as ManufacturingDisplayLocationAdminInput,
    );
    return NextResponse.json({ displayLocation }, { status: 201 });
  } catch (error) {
    const status = error instanceof ManufacturingAdminValidationError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Không thể lưu vị trí";
    return NextResponse.json({ message }, { status });
  }
}
