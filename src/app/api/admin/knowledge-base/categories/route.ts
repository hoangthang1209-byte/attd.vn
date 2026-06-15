import { NextRequest, NextResponse } from "next/server";
import {
  createKnowledgeBaseCategory,
  deleteKnowledgeBaseCategory,
  ensureDefaultKnowledgeCategories,
  listKnowledgeBaseCategories,
  updateKnowledgeBaseCategory,
} from "@/features/knowledge-base/knowledge-base-seed";
import { toSlug } from "@/lib/slug";

export async function GET() {
  try {
    await ensureDefaultKnowledgeCategories();
    const categories = await listKnowledgeBaseCategories();
    return NextResponse.json({ categories });
  } catch (err) {
    console.error("[GET /api/admin/knowledge-base/categories]", err);
    return NextResponse.json({ message: "Không thể tải danh mục", categories: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const slug =
    typeof raw.slug === "string" && raw.slug.trim() ? raw.slug.trim() : toSlug(name);

  if (!name || !slug) {
    return NextResponse.json({ message: "Tên danh mục là bắt buộc" }, { status: 400 });
  }

  try {
    const category = await createKnowledgeBaseCategory({
      name,
      slug,
      description: typeof raw.description === "string" ? raw.description : null,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : 0,
      isActive: raw.isActive !== false,
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ message: "Slug danh mục đã tồn tại" }, { status: 409 });
    }
    console.error("[POST /api/admin/knowledge-base/categories]", err);
    return NextResponse.json({ message: "Không thể tạo danh mục" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  return NextResponse.json({ message: "Use /categories/[id]" }, { status: 400 });
}
