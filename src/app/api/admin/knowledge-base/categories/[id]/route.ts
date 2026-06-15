import { NextRequest, NextResponse } from "next/server";
import {
  deleteKnowledgeBaseCategory,
  updateKnowledgeBaseCategory,
} from "@/features/knowledge-base/knowledge-base-seed";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  try {
    const category = await updateKnowledgeBaseCategory(id, {
      name: typeof raw.name === "string" ? raw.name.trim() : undefined,
      slug: typeof raw.slug === "string" ? raw.slug.trim() : undefined,
      description: typeof raw.description === "string" ? raw.description : undefined,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
    });
    return NextResponse.json({ category });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ message: "Slug danh mục đã tồn tại" }, { status: 409 });
    }
    console.error("[PATCH /api/admin/knowledge-base/categories/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật danh mục" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    await deleteKnowledgeBaseCategory(id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "CATEGORY_HAS_ENTRIES") {
      return NextResponse.json(
        { message: "Không thể xóa danh mục đang có entry" },
        { status: 409 }
      );
    }
    console.error("[DELETE /api/admin/knowledge-base/categories/[id]]", err);
    return NextResponse.json({ message: "Không thể xóa danh mục" }, { status: 500 });
  }
}
