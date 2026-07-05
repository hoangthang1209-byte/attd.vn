import { NextRequest, NextResponse } from "next/server";
import {
  createRevenueCategory,
  listRevenueCategories,
  RevenueCategoryError,
} from "@/features/revenue-categories/revenue-category.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search") ?? undefined;
    const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "1";
    const picker = req.nextUrl.searchParams.get("picker") === "1";
    if (picker) {
      const { listRevenueCategoryPickerOptions } = await import(
        "@/features/revenue-categories/revenue-category.service"
      );
      const options = await listRevenueCategoryPickerOptions();
      return NextResponse.json(options);
    }
    const data = await listRevenueCategories({ search, activeOnly });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/admin/revenue-categories]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Không thể tải nhóm doanh thu." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const created = await createRevenueCategory({
      code: String(body.code ?? ""),
      name: String(body.name ?? ""),
      parentId: typeof body.parentId === "string" ? body.parentId : null,
      description: typeof body.description === "string" ? body.description : null,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof RevenueCategoryError ? err.message : "Không thể tạo nhóm doanh thu.";
    console.error("[POST /api/admin/revenue-categories]", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
