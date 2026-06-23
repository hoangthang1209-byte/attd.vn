import { NextRequest, NextResponse } from "next/server";
import {
  deleteSharedAttribute,
  getAttributeDependencyCounts,
  ProductAttributeValidationError,
  updateSharedAttribute,
} from "@/features/products/product-attribute.service";

function jsonError(error: unknown) {
  if (error instanceof ProductAttributeValidationError) {
    return NextResponse.json(
      { message: error.message, fieldErrors: error.fieldErrors },
      { status: error.status },
    );
  }
  return NextResponse.json({ message: "Không thể xử lý thuộc tính sản phẩm." }, { status: 500 });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const usage = await getAttributeDependencyCounts(id);
  return NextResponse.json({ usage });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;
    const attribute = await updateSharedAttribute(id, body);
    return NextResponse.json(attribute);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await deleteSharedAttribute(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
