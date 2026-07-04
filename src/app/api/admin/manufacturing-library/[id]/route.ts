import { NextResponse } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { getAdminSessionFromCookies } from "@/lib/admin-auth/get-admin-session";
import {
  archiveManufacturingAssetAdmin,
  deleteManufacturingAssetAdmin,
  getManufacturingAssetAdmin,
  saveManufacturingAssetAdmin,
  ManufacturingAdminValidationError,
  type ManufacturingAssetAdminInput,
} from "@/features/manufacturing-library/manufacturing-admin.service";

function forbidden() {
  return NextResponse.json({ message: "Không có quyền truy cập" }, { status: 403 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSessionFromCookies();
  if (!can(session, "manufacturingAsset.view")) return forbidden();

  const { id } = await params;
  const asset = await getManufacturingAssetAdmin(id);
  if (!asset) return NextResponse.json({ message: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json({ asset });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSessionFromCookies();
  if (!can(session, "manufacturingAsset.update")) return forbidden();

  const { id } = await params;
  try {
    const body = (await request.json()) as ManufacturingAssetAdminInput;
    const asset = await saveManufacturingAssetAdmin(body, id);
    return NextResponse.json({ asset });
  } catch (error) {
    const status = error instanceof ManufacturingAdminValidationError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Không thể lưu tài sản";
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSessionFromCookies();
  if (!can(session, "manufacturingAsset.delete")) return forbidden();

  const { id } = await params;
  const url = new URL(request.url);
  try {
    if (url.searchParams.get("hard") === "1") {
      await deleteManufacturingAssetAdmin(id);
      return NextResponse.json({ ok: true });
    }
    const asset = await archiveManufacturingAssetAdmin(id);
    return NextResponse.json({ asset });
  } catch {
    return NextResponse.json({ message: "Không thể lưu trữ/xóa tài sản" }, { status: 500 });
  }
}
