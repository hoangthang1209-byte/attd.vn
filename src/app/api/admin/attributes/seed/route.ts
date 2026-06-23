import { NextResponse } from "next/server";
import {
  ProductAttributeValidationError,
  seedSharedAttributes,
} from "@/features/products/product-attribute.service";

export async function POST() {
  try {
    const result = await seedSharedAttributes();
    return NextResponse.json({
      ok: true,
      message: `Đã tạo ${result.createdAttributes} thuộc tính và ${result.createdValues} giá trị; bỏ qua ${result.skippedValues} giá trị đã có.`,
      ...result,
    });
  } catch (error) {
    if (error instanceof ProductAttributeValidationError) {
      return NextResponse.json(
        { message: error.message, fieldErrors: error.fieldErrors },
        { status: error.status },
      );
    }
    return NextResponse.json({ message: "Không thể tạo dữ liệu thuộc tính mặc định." }, { status: 500 });
  }
}
