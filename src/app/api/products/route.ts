import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createProductAdmin } from "@/features/products/product-admin.service";
import { productMutationErrorResponse } from "@/features/products/product-mutation-api";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";
import type { ProductStatus } from "@prisma/client";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      variants: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "product",
    action: "create",
    request,
  });
  if (!permission.ok) return permission.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  if (!body.productCode || typeof body.productCode !== "string" || !body.productCode.trim()) {
    return NextResponse.json({ message: "Mã sản phẩm là bắt buộc" }, { status: 400 });
  }
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ message: "Tên sản phẩm là bắt buộc" }, { status: 400 });
  }
  if (!body.categoryId || typeof body.categoryId !== "string") {
    return NextResponse.json({ message: "Danh mục là bắt buộc" }, { status: 400 });
  }

  const status =
    typeof body.status === "string" ? (body.status as ProductStatus) : undefined;

  try {
    const product = await createProductAdmin({
      name: body.name.trim(),
      productCode: body.productCode.trim(),
      categoryId: body.categoryId,
      slug: typeof body.slug === "string" ? body.slug.trim() : undefined,
      description: typeof body.description === "string" ? body.description.trim() : undefined,
      seoTitle: typeof body.seoTitle === "string" ? body.seoTitle.trim() : undefined,
      seoDescription:
        typeof body.seoDescription === "string" ? body.seoDescription.trim() : undefined,
      featuredImage:
        typeof body.featuredImage === "string" ? body.featuredImage.trim() : undefined,
      gallery: Array.isArray(body.gallery)
        ? body.gallery.map((item) => String(item).trim()).filter(Boolean)
        : undefined,
      status,
    });
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    if (err instanceof ProductAdminValidationError) {
      return productMutationErrorResponse(err, "Không thể tạo sản phẩm.");
    }
    return productMutationErrorResponse(err, "Không thể tạo sản phẩm.");
  }
}
