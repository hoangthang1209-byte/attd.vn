import { NextRequest, NextResponse } from "next/server";
import {
  generateSku,
  isSkuTaken,
  isProductCodeTaken,
  buildVariantSkuExplanation,
  generateNextProductCode,
  requireCategorySkuCode,
  ProductSkuError,
  CATEGORY_SKU_CODE_MISSING_ERROR,
} from "@/features/products/product-sku-utils";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;

  const categoryId = typeof raw.categoryId === "string" ? raw.categoryId : "";
  const category = categoryId
    ? await prisma.category.findUnique({
        where: { id: categoryId },
        select: { name: true, skuCode: true },
      })
    : null;

  if (categoryId && !category?.skuCode?.trim()) {
    return NextResponse.json(
      {
        message: CATEGORY_SKU_CODE_MISSING_ERROR,
        categorySkuCode: null,
        productCodePreview: null,
        variantSkuPreview: null,
      },
      { status: 400 }
    );
  }

  let categorySkuCode: string | null = null;
  let productCodePreview: string | null = null;

  try {
    if (categoryId && category) {
      categorySkuCode = requireCategorySkuCode(category.skuCode);
      productCodePreview =
        typeof raw.productCode === "string" && raw.productCode.trim()
          ? await generateNextProductCode(categoryId, { explicitCode: raw.productCode as string })
          : await generateNextProductCode(categoryId);
    } else if (typeof raw.productCode === "string" && raw.productCode.trim()) {
      productCodePreview = raw.productCode.trim().toUpperCase();
    }
  } catch (err) {
    const message =
      err instanceof ProductSkuError ? err.message : "Không thể xem ID dự kiến.";
    return NextResponse.json(
      {
        message,
        categorySkuCode,
        productCodePreview: null,
        variantSkuPreview: null,
      },
      { status: 400 }
    );
  }

  const variantSkuPreview = productCodePreview
    ? generateSku({
        productCode: productCodePreview,
        colorName: raw.colorName as string | undefined,
        colorCode: raw.colorCode as string | undefined,
        sizeName: raw.sizeName as string | undefined,
        dimensions: raw.dimensions as string | undefined,
        capacity: raw.capacity as string | undefined,
      })
    : null;

  const taken = variantSkuPreview
    ? await isSkuTaken(variantSkuPreview, raw.excludeVariantId as string | undefined)
    : false;

  const productCodeTaken = productCodePreview
    ? await isProductCodeTaken(productCodePreview, raw.excludeProductId as string | undefined)
    : false;

  const explanation = productCodePreview
    ? buildVariantSkuExplanation({
        productCode: productCodePreview,
        colorName: raw.colorName as string | undefined,
        colorCode: raw.colorCode as string | undefined,
        sizeName: raw.sizeName as string | undefined,
        dimensions: raw.dimensions as string | undefined,
        capacity: raw.capacity as string | undefined,
      })
    : null;

  return NextResponse.json({
    sku: variantSkuPreview,
    variantSkuPreview,
    productCodePreview,
    productCode: productCodePreview,
    categorySkuCode,
    isTaken: taken,
    productCodeTaken,
    explanation,
  });
}
