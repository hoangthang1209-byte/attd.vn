import { NextResponse } from "next/server";
import { seedDefaultAttributeOptions } from "@/features/products/product-attribute.service";

export async function POST() {
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
