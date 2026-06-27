import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageRolesPermissions } from "@/features/auth/admin-permissions";
import { getAdminSessionFromCookies } from "@/lib/admin-auth/get-admin-session";
import { FINANCIAL_ROUTE_DENIED_MESSAGE } from "@/features/auth/admin-session.types";

export async function GET() {
  const session = await getAdminSessionFromCookies();
  if (!canManageRolesPermissions(session)) {
    return NextResponse.json({ message: FINANCIAL_ROUTE_DENIED_MESSAGE }, { status: 403 });
  }

  const permissions = await prisma.adminPermission.findMany({
    orderBy: [{ module: "asc" }, { sortOrder: "asc" }],
  });
  return NextResponse.json({ permissions });
}
