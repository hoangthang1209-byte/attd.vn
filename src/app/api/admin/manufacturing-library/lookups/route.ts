import { NextResponse } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { getAdminSessionFromCookies } from "@/lib/admin-auth/get-admin-session";
import { listManufacturingLookupsAdmin } from "@/features/manufacturing-library/manufacturing-admin.service";

export async function GET(request: Request) {
  const session = await getAdminSessionFromCookies();
  if (!can(session, "manufacturingAsset.view")) {
    return NextResponse.json({ message: "Không có quyền truy cập" }, { status: 403 });
  }

  const url = new URL(request.url);
  const lookups = await listManufacturingLookupsAdmin(url.searchParams.get("mediaSearch") ?? undefined);
  return NextResponse.json(lookups);
}
