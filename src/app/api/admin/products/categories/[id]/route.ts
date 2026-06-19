import { NextRequest, NextResponse } from "next/server";
import {
  getProductCategoryById,
  updateProductCategory,
  deleteProductCategory,
  type CategoryAdminInput,
} from "@/features/products/product-admin.service";

type RouteContext = { params: Promise<{ id: string }> };

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

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  try {
    const category = await getProductCategoryById(id);
    if (!category) {
      return NextResponse.json({ message: "Không tìm thấy danh mục." }, { status: 404 });
    }
    return NextResponse.json(category);
  } catch (err) {
    console.error("[GET /api/admin/products/categories/[id]]", err);
    return NextResponse.json({ message: "Lỗi tải danh mục." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const data = parseBody(body as Record<string, unknown>);
  if (!data) {
    return NextResponse.json({ message: "Tên và slug là bắt buộc." }, { status: 400 });
  }
  try {
    const category = await updateProductCategory(id, data);
    return NextResponse.json(category);
  } catch (err) {
    console.error("[PUT /api/admin/products/categories/[id]]", err);
    if (err instanceof Error && "fieldErrors" in err) {
      const fe = (err as { fieldErrors?: Record<string, string> }).fieldErrors;
      const message = fe?.skuCode ?? err.message;
      return NextResponse.json({ message }, { status: 400 });
    }
    return NextResponse.json({ message: "Không thể cập nhật danh mục." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  try {
    const result = await deleteProductCategory(id);
    if (!result.ok) {
      if (result.reason === "has_products") {
        return NextResponse.json(
          {
            message: `Không thể xóa danh mục đang có ${result.count} sản phẩm.`,
          },
          { status: 409 },
        );
      }
      if (result.reason === "has_children") {
        return NextResponse.json(
          { message: "Không thể xóa danh mục đang có danh mục con." },
          { status: 409 },
        );
      }
      return NextResponse.json({ message: "Không tìm thấy danh mục." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/products/categories/[id]]", err);
    return NextResponse.json({ message: "Không thể xóa danh mục." }, { status: 500 });
  }
}
