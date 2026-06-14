import { NextRequest, NextResponse } from "next/server";
import {
  deleteBlogCategory,
  updateBlogCategory,
} from "@/features/blog/services/blog-admin.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  try {
    const category = await updateBlogCategory(id, {
      ...(typeof raw.name === "string" ? { name: raw.name } : {}),
      ...(typeof raw.slug === "string" ? { slug: raw.slug } : {}),
      ...(raw.description !== undefined
        ? { description: typeof raw.description === "string" ? raw.description : null }
        : {}),
      ...(raw.isVisible !== undefined ? { isVisible: Boolean(raw.isVisible) } : {}),
    });

    if (!category) {
      return NextResponse.json({ message: "Không tìm thấy danh mục" }, { status: 404 });
    }

    return NextResponse.json({ category });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ message: "Slug đã tồn tại" }, { status: 409 });
    }
    console.error("[PATCH /api/blog/categories/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật danh mục" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const deleted = await deleteBlogCategory(id);
  if (!deleted) {
    return NextResponse.json({ message: "Không tìm thấy danh mục" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
