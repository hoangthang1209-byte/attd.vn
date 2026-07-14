import { NextRequest, NextResponse } from "next/server";
import {
  deleteMediaVocabularyTerm,
  getMediaVocabularyTermById,
  updateMediaVocabularyTerm,
} from "@/features/media/services/media-vocabulary.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const term = await getMediaVocabularyTermById(id, { includeUsage: true });
  if (!term) {
    return NextResponse.json({ message: "Không tìm thấy thuật ngữ" }, { status: 404 });
  }
  return NextResponse.json({ term });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

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
    const term = await updateMediaVocabularyTerm(id, {
      name: typeof raw.name === "string" ? raw.name : undefined,
      aliases: Array.isArray(raw.aliases)
        ? raw.aliases.filter((item): item is string => typeof item === "string")
        : undefined,
      description:
        raw.description === null
          ? null
          : typeof raw.description === "string"
            ? raw.description
            : undefined,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
      code: raw.code === null ? null : typeof raw.code === "string" ? raw.code : undefined,
    });
    return NextResponse.json({ term });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể cập nhật thuật ngữ";
    return NextResponse.json(
      { message },
      { status: message.includes("Không tìm thấy") ? 404 : 400 },
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "delete",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  try {
    await deleteMediaVocabularyTerm(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể xóa thuật ngữ";
    return NextResponse.json(
      { message },
      { status: message.includes("Không tìm thấy") ? 404 : 400 },
    );
  }
}
