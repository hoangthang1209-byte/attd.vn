import { NextRequest, NextResponse } from "next/server";
import { runAdminSearch } from "@/features/admin-search/admin-search.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(request: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  try {
    const response = await runAdminSearch(q);
    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/admin/search]", error);
    return NextResponse.json(
      { message: "Không thể tìm kiếm dữ liệu admin" },
      { status: 500 },
    );
  }
}
