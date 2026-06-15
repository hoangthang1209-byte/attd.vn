import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  deleteKnowledgeBaseEntry,
  getKnowledgeBaseEntryById,
  updateKnowledgeBaseEntry,
} from "@/features/knowledge-base/knowledge-base-seed";
import { validateKnowledgeBaseEntry } from "@/features/knowledge-base/knowledge-base-validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const entry = await getKnowledgeBaseEntryById(id);
    if (!entry) {
      return NextResponse.json({ message: "Không tìm thấy entry" }, { status: 404 });
    }
    return NextResponse.json({ entry });
  } catch (err) {
    console.error("[GET /api/admin/knowledge-base/[id]]", err);
    return NextResponse.json({ message: "Không thể tải entry" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const existing = await getKnowledgeBaseEntryById(id);
  if (!existing) {
    return NextResponse.json({ message: "Không tìm thấy entry" }, { status: 404 });
  }

  const raw = body as Record<string, unknown>;
  const validation = validateKnowledgeBaseEntry({
    ...existing,
    ...raw,
    categoryId: typeof raw.categoryId === "string" ? raw.categoryId : existing.categoryId,
    type: typeof raw.type === "string" ? raw.type : existing.type,
  } as never);

  if (!validation.valid || !validation.data) {
    return NextResponse.json({ message: validation.errors.join(" ") }, { status: 400 });
  }

  try {
    const entry = await updateKnowledgeBaseEntry(id, {
      ...validation.data,
      structuredData: (validation.data.structuredData ?? undefined) as Prisma.InputJsonValue | undefined,
    });
    return NextResponse.json({ entry });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ message: "Slug đã tồn tại" }, { status: 409 });
    }
    console.error("[PATCH /api/admin/knowledge-base/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật entry" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    await deleteKnowledgeBaseEntry(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/knowledge-base/[id]]", err);
    return NextResponse.json({ message: "Không thể xóa entry" }, { status: 500 });
  }
}
