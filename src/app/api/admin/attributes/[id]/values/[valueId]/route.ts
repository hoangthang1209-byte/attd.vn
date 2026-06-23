import { NextRequest, NextResponse } from "next/server";
import {
  deleteSharedAttributeValue,
  getAttributeValueDependencyCounts,
  ProductAttributeValidationError,
  updateSharedAttributeValue,
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

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ valueId: string }> },
) {
  const { valueId } = await ctx.params;
  const usage = await getAttributeValueDependencyCounts(valueId);
  return NextResponse.json({ usage });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ valueId: string }> },
) {
  try {
    const { valueId } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;
    const value = await updateSharedAttributeValue(valueId, body);
    return NextResponse.json(value);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ valueId: string }> },
) {
  try {
    const { valueId } = await ctx.params;
    await deleteSharedAttributeValue(valueId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
