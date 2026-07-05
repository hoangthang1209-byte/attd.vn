import { NextRequest, NextResponse } from "next/server";
import type { ProductAttributeStatus } from "@prisma/client";
import {
  updateAttributeOption,
  deleteAttributeOption,
} from "@/features/products/product-attribute.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const permission = await requireAdminPermission({
    platform: "product",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  const raw = body as Record<string, unknown>;
  try {
    const updated = await updateAttributeOption(id, {
      name: raw.name ? String(raw.name) : undefined,
      code: raw.code !== undefined ? String(raw.code) : undefined,
      value: raw.value !== undefined ? String(raw.value) : undefined,
      sortOrder: raw.sortOrder !== undefined ? Number(raw.sortOrder) : undefined,
      status: raw.status ? String(raw.status) as ProductAttributeStatus : undefined,
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Lỗi cập nhật" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const permission = await requireAdminPermission({
    platform: "product",
    action: "delete",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  try {
    await deleteAttributeOption(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Lỗi xóa" }, { status: 500 });
  }
}
