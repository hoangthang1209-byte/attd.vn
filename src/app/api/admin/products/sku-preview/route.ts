import { NextRequest, NextResponse } from "next/server";
import {
  generateSku,
  isSkuTaken,
  getCategorySkuCode,
  generateProductCode,
} from "@/features/products/product-sku-utils";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  const raw = body as Record<string, unknown>;

  const categoryId = typeof raw.categoryId === "string" ? raw.categoryId : "";
  const category = categoryId
    ? await prisma.category.findUnique({ where: { id: categoryId }, select: { name: true, skuCode: true } })
    : null;

  const catSkuCode = getCategorySkuCode(
    (raw.categoryName as string) ?? category?.name ?? "",
    category?.skuCode ?? (raw.categorySkuCode as string | undefined)
  );
  const productCode = (raw.productCode as string) ?? generateProductCode(
    (raw.productName as string) ?? "",
    (raw.material as string) ?? undefined
  );

  const sku = generateSku({
    categorySkuCode: catSkuCode,
    productCode,
    colorName: raw.colorName as string | undefined,
    colorCode: raw.colorCode as string | undefined,
    sizeName: raw.sizeName as string | undefined,
    dimensions: raw.dimensions as string | undefined,
    capacity: raw.capacity as string | undefined,
  });

  const taken = await isSkuTaken(sku, raw.excludeVariantId as string | undefined);

  return NextResponse.json({ sku, isTaken: taken, categorySkuCode: catSkuCode, productCode });
}
