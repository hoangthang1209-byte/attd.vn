import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createProductCategory } from "@/features/products/product-admin.service";
import { categoryMutationErrorResponse } from "@/features/products/product-mutation-api";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";
import { revalidatePublicCategoryCache } from "@/features/categories/revalidate-public-category-cache";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "product",
    action: "create",
    request,
  });
  if (!permission.ok) return permission.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("name" in body) ||
    !("slug" in body) ||
    typeof (body as Record<string, unknown>).name !== "string" ||
    typeof (body as Record<string, unknown>).slug !== "string"
  ) {
    return NextResponse.json({ message: "Tên danh mục và slug là bắt buộc." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const trimmedName = String(record.name).trim();
  const trimmedSlug = String(record.slug).trim();

  if (!trimmedName || !trimmedSlug) {
    return NextResponse.json({ message: "Tên danh mục và slug không được để trống." }, { status: 400 });
  }

  try {
    const category = await createProductCategory({
      name: trimmedName,
      slug: trimmedSlug,
      description: typeof record.description === "string" ? record.description.trim() || null : null,
      imageUrl: typeof record.imageUrl === "string" ? record.imageUrl.trim() || null : null,
      seoTitle: typeof record.seoTitle === "string" ? record.seoTitle.trim().slice(0, 255) || null : null,
      seoDescription:
        typeof record.seoDescription === "string"
          ? record.seoDescription.trim().slice(0, 500) || null
          : null,
    });
    revalidatePublicCategoryCache();
    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    if (err instanceof ProductAdminValidationError) {
      const message =
        err.fieldErrors.slug ??
        err.fieldErrors.skuCode ??
        err.message;
      if (message.includes("Slug") || err.fieldErrors.slug) {
        return NextResponse.json({ message, fieldErrors: err.fieldErrors }, { status: 409 });
      }
      return categoryMutationErrorResponse(err, "Không thể tạo danh mục.");
    }
    return categoryMutationErrorResponse(err, "Không thể tạo danh mục.");
  }
}
