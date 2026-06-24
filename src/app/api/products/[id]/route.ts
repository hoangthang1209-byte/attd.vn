import { NextResponse } from "next/server";
import type { ProductStatus } from "@prisma/client";
import {
  deleteProductAdmin,
  updateProductAdmin,
} from "@/features/products/product-admin.service";
import { productMutationErrorResponse } from "@/features/products/product-mutation-api";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";

const VALID_STATUSES = ["ACTIVE", "DRAFT", "INACTIVE", "ARCHIVED"] as const;

function isValidStatus(v: unknown): v is ProductStatus {
  return typeof v === "string" && (VALID_STATUSES as readonly string[]).includes(v);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";

  if (!name) {
    return NextResponse.json({ message: "Tên sản phẩm là bắt buộc" }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ message: "Slug là bắt buộc" }, { status: 400 });
  }
  if (!body.categoryId || typeof body.categoryId !== "string") {
    return NextResponse.json({ message: "Danh mục là bắt buộc" }, { status: 400 });
  }
  if (!isValidStatus(body.status)) {
    return NextResponse.json({ message: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  const seoTitle = typeof body.seoTitle === "string" ? body.seoTitle.trim() || null : null;
  const seoDescription =
    typeof body.seoDescription === "string" ? body.seoDescription.trim() || null : null;

  if (seoTitle && seoTitle.length > 255) {
    return NextResponse.json(
      { message: "SEO Title không được vượt quá 255 ký tự" },
      { status: 400 },
    );
  }
  if (seoDescription && seoDescription.length > 500) {
    return NextResponse.json(
      { message: "SEO Description không được vượt quá 500 ký tự" },
      { status: 400 },
    );
  }

  try {
    const product = await updateProductAdmin(id, {
      name,
      slug,
      productCode: typeof body.productCode === "string" ? body.productCode.trim() || undefined : undefined,
      categoryId: body.categoryId,
      status: body.status,
      shortDescription:
        typeof body.shortDescription === "string" ? body.shortDescription.trim() || undefined : undefined,
      description:
        typeof body.description === "string" ? body.description.trim() || undefined : undefined,
      seoTitle: seoTitle ?? undefined,
      seoDescription: seoDescription ?? undefined,
    });
    return NextResponse.json(product);
  } catch (err) {
    if (err instanceof ProductAdminValidationError && err.message.includes("Không tìm thấy")) {
      return NextResponse.json({ message: "Sản phẩm không tồn tại" }, { status: 404 });
    }
    return productMutationErrorResponse(err, "Lỗi cập nhật sản phẩm. Vui lòng thử lại.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    await deleteProductAdmin(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2025") {
      return NextResponse.json({ message: "Sản phẩm không tồn tại" }, { status: 404 });
    }
    console.error("[api/products/[id]] DELETE failed:", err);
    return NextResponse.json({ message: "Xóa sản phẩm thất bại" }, { status: 500 });
  }
}
