import { NextResponse } from "next/server";
import type {
  ManufacturingAssetStatus,
  ManufacturingVisibility,
} from "@prisma/client";
import { can } from "@/features/auth/admin-permissions";
import { getAdminSessionFromCookies } from "@/lib/admin-auth/get-admin-session";
import {
  listManufacturingAssetsAdmin,
  saveManufacturingAssetAdmin,
  ManufacturingAdminValidationError,
  type ManufacturingAssetAdminInput,
} from "@/features/manufacturing-library/manufacturing-admin.service";

function forbidden() {
  return NextResponse.json({ message: "Không có quyền truy cập" }, { status: 403 });
}

export async function GET(request: Request) {
  const session = await getAdminSessionFromCookies();
  if (!can(session, "manufacturingAsset.view")) return forbidden();

  const url = new URL(request.url);
  const data = await listManufacturingAssetsAdmin({
    search: url.searchParams.get("search") ?? undefined,
    categoryId: url.searchParams.get("categoryId") ?? undefined,
    status: (url.searchParams.get("status") ?? "") as ManufacturingAssetStatus | "",
    visibility: (url.searchParams.get("visibility") ?? "") as ManufacturingVisibility | "",
    featured: (url.searchParams.get("featured") ?? "") as "true" | "false" | "",
    displayLocationId: url.searchParams.get("displayLocationId") ?? undefined,
    page: Number(url.searchParams.get("page") ?? 1),
    pageSize: Number(url.searchParams.get("pageSize") ?? 25),
  });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await getAdminSessionFromCookies();
  if (!can(session, "manufacturingAsset.create")) return forbidden();

  try {
    const body = (await request.json()) as ManufacturingAssetAdminInput;
    const asset = await saveManufacturingAssetAdmin(body);
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    const status = error instanceof ManufacturingAdminValidationError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Không thể tạo tài sản";
    return NextResponse.json({ message }, { status });
  }
}
