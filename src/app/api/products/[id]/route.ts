import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const VALID_STATUSES = ["ACTIVE", "DRAFT", "ARCHIVED"] as const;
type ProductStatus = (typeof VALID_STATUSES)[number];

function isValidStatus(v: unknown): v is ProductStatus {
  return typeof v === "string" && (VALID_STATUSES as readonly string[]).includes(v);
}

function isPrismaUniqueError(err: unknown, field?: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as Record<string, unknown>;
  if (e.code !== "P2002") return false;
  if (!field) return true;
  const target = e.meta as { target?: string[] } | undefined;
  return target?.target?.includes(field) ?? false;
}

function isPrismaNotFoundError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  return (err as Record<string, unknown>).code === "P2025";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";

  if (!name) {
    return NextResponse.json(
      { message: "Tên sản phẩm là bắt buộc" },
      { status: 400 }
    );
  }
  if (!slug) {
    return NextResponse.json(
      { message: "Slug là bắt buộc" },
      { status: 400 }
    );
  }
  if (!body.categoryId || typeof body.categoryId !== "string") {
    return NextResponse.json(
      { message: "Danh mục là bắt buộc" },
      { status: 400 }
    );
  }
  if (!isValidStatus(body.status)) {
    return NextResponse.json(
      { message: "Trạng thái không hợp lệ" },
      { status: 400 }
    );
  }

  const seoTitle =
    typeof body.seoTitle === "string" ? body.seoTitle.trim() || null : null;
  const seoDescription =
    typeof body.seoDescription === "string"
      ? body.seoDescription.trim() || null
      : null;

  if (seoTitle && seoTitle.length > 255) {
    return NextResponse.json(
      { message: "SEO Title không được vượt quá 255 ký tự" },
      { status: 400 }
    );
  }
  if (seoDescription && seoDescription.length > 500) {
    return NextResponse.json(
      { message: "SEO Description không được vượt quá 500 ký tự" },
      { status: 400 }
    );
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        slug,
        productCode:
          typeof body.productCode === "string"
            ? body.productCode.trim() || null
            : null,
        categoryId: body.categoryId,
        status: body.status,
        shortDescription:
          typeof body.shortDescription === "string"
            ? body.shortDescription.trim() || null
            : null,
        description:
          typeof body.description === "string"
            ? body.description.trim() || null
            : null,
        seoTitle,
        seoDescription,
      },
    });
    return NextResponse.json(product);
  } catch (err) {
    if (isPrismaUniqueError(err, "slug")) {
      return NextResponse.json(
        { message: "Slug đã được sử dụng bởi sản phẩm khác" },
        { status: 400 }
      );
    }
    if (isPrismaUniqueError(err, "productCode")) {
      return NextResponse.json(
        { message: "Mã sản phẩm đã được sử dụng bởi sản phẩm khác" },
        { status: 400 }
      );
    }
    if (isPrismaNotFoundError(err)) {
      return NextResponse.json(
        { message: "Sản phẩm không tồn tại" },
        { status: 404 }
      );
    }
    console.error("[api/products/[id]] PATCH failed:", err);
    return NextResponse.json(
      { message: "Lỗi cập nhật sản phẩm. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (isPrismaNotFoundError(err)) {
      return NextResponse.json({ message: "Sản phẩm không tồn tại" }, { status: 404 });
    }
    console.error("[api/products/[id]] DELETE failed:", err);
    return NextResponse.json({ message: "Xóa sản phẩm thất bại" }, { status: 500 });
  }
}
