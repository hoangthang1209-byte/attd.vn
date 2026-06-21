import { NextRequest, NextResponse } from "next/server";
import {
  listProductCategories,
  createProductCategory,
  type CategoryAdminInput,
} from "@/features/products/product-admin.service";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";
import { revalidatePublicCategoryCache } from "@/features/categories/revalidate-public-category-cache";

export async function GET() {
  try {
    const categories = await listProductCategories();
    return NextResponse.json(categories);
  } catch (err) {
    console.error("[GET /api/admin/products/categories]", err);
    return NextResponse.json({ message: "Lỗi tải danh mục." }, { status: 500 });
  }
}

function parseBody(raw: Record<string, unknown>): CategoryAdminInput | null {
  if (!raw.name || !raw.slug) return null;
  const name = String(raw.name).trim();
  const slug = String(raw.slug).trim();
  if (!name || !slug) return null;
  return {
    name,
    slug,
    skuCode: raw.skuCode != null ? String(raw.skuCode).trim() || null : null,
    description: raw.description != null ? String(raw.description).trim() || null : null,
    seoTitle: raw.seoTitle != null ? String(raw.seoTitle).trim().slice(0, 255) || null : null,
    seoDescription:
      raw.seoDescription != null
        ? String(raw.seoDescription).trim().slice(0, 500) || null
        : null,
    imageUrl: raw.imageUrl != null ? String(raw.imageUrl).trim() || null : null,
    sortOrder: raw.sortOrder != null ? Number(raw.sortOrder) || 0 : 0,
    parentId: raw.parentId != null ? String(raw.parentId).trim() || null : null,
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const data = parseBody(body as Record<string, unknown>);
  if (!data) {
    return NextResponse.json({ message: "Tên danh mục và slug là bắt buộc." }, { status: 400 });
  }
  try {
    const cat = await createProductCategory(data);
    revalidatePublicCategoryCache();
    return NextResponse.json(cat, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/products/categories]", err);
    if (err instanceof ProductAdminValidationError) {
      const message =
        err.fieldErrors.slug ??
        err.fieldErrors.skuCode ??
        err.fieldErrors.parentId ??
        err.message;
      return NextResponse.json({ message, fieldErrors: err.fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: "Không thể tạo danh mục." }, { status: 500 });
  }
}
