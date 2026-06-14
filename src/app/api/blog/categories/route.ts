import { NextRequest, NextResponse } from "next/server";
import {
  createBlogCategory,
  listBlogCategoriesAdmin,
} from "@/features/blog/services/blog-admin.service";

export async function GET() {
  try {
    const categories = await listBlogCategoriesAdmin();
    return NextResponse.json({ categories });
  } catch (err) {
    console.error("[GET /api/blog/categories]", err);
    return NextResponse.json(
      { message: "Không thể tải danh mục", categories: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const slug = typeof raw.slug === "string" ? raw.slug.trim() : "";

  if (!name) {
    return NextResponse.json({ message: "Tên danh mục là bắt buộc" }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ message: "Slug là bắt buộc" }, { status: 400 });
  }

  try {
    const category = await createBlogCategory({
      name,
      slug,
      description: typeof raw.description === "string" ? raw.description : null,
      isVisible: raw.isVisible !== false,
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ message: "Slug đã tồn tại" }, { status: 409 });
    }
    console.error("[POST /api/blog/categories]", err);
    return NextResponse.json({ message: "Không thể tạo danh mục" }, { status: 500 });
  }
}
