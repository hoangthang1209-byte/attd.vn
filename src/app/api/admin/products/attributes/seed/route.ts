import { NextResponse } from "next/server";
import { seedDefaultAttributeOptions } from "@/features/products/product-attribute.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function POST() {
  const permission = await requireAdminPermission({
    platform: "product",
    action: "admin",
  });
  if (!permission.ok) return permission.response;

  try {
    const result = await seedDefaultAttributeOptions();
    return NextResponse.json({
      ok: true,
      message: `Tạo ${result.created} thuộc tính mặc định — bỏ qua ${result.skipped} đã tồn tại (tổng ${result.total}).`,
      ...result,
    });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : "Lỗi seed" }, { status: 500 });
  }
}
