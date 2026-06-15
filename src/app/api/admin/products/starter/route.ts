import { NextResponse } from "next/server";
import { importProductStarterData } from "@/features/products/product-starter-data";

export async function POST() {
  try {
    const result = await importProductStarterData();
    return NextResponse.json({
      ok: true,
      message: `Tạo ${result.created} sản phẩm mẫu, ${result.createdVariants} SKU — bỏ qua ${result.skipped} sản phẩm đã tồn tại (tổng ${result.total} sản phẩm mẫu có sẵn).`,
      ...result,
    });
  } catch (err) {
    console.error("[POST /api/admin/products/starter]", err);
    return NextResponse.json({ message: "Không thể import sản phẩm mẫu." }, { status: 500 });
  }
}
