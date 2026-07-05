import { NextRequest, NextResponse } from "next/server";
import {
  deleteRevenueCategory,
  RevenueCategoryError,
  updateRevenueCategory,
} from "@/features/revenue-categories/revenue-category.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const updated = await updateRevenueCategory(id, {
      ...(body.code !== undefined ? { code: String(body.code) } : {}),
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(body.parentId !== undefined
        ? { parentId: typeof body.parentId === "string" ? body.parentId : null }
        : {}),
      ...(body.description !== undefined
        ? { description: typeof body.description === "string" ? body.description : null }
        : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) } : {}),
      ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
    });
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof RevenueCategoryError ? err.message : "Không thể cập nhật nhóm doanh thu.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "delete",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  try {
    await deleteRevenueCategory(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof RevenueCategoryError ? err.message : "Không thể xóa nhóm doanh thu.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
