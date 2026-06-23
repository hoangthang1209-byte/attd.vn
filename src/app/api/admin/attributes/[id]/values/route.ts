import { NextRequest, NextResponse } from "next/server";
import {
  createSharedAttributeValue,
  ProductAttributeValidationError,
} from "@/features/products/product-attribute.service";

function jsonError(error: unknown) {
  if (error instanceof ProductAttributeValidationError) {
    return NextResponse.json(
      { message: error.message, fieldErrors: error.fieldErrors },
      { status: error.status },
    );
  }
  return NextResponse.json({ message: "Không thể xử lý giá trị thuộc tính." }, { status: 500 });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;
    const value = await createSharedAttributeValue(id, body);
    return NextResponse.json(value, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
