import { NextRequest, NextResponse } from "next/server";
import {
  createSharedAttribute,
  listSharedAttributes,
  ProductAttributeValidationError,
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

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const attributes = await listSharedAttributes({
    activeOnly: sp.get("activeOnly") === "1",
    variantOnly: sp.get("variantOnly") === "1",
    includeInactiveValues: sp.get("includeInactiveValues") === "1",
  });
  return NextResponse.json(attributes);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const attribute = await createSharedAttribute(body);
    return NextResponse.json(attribute, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
