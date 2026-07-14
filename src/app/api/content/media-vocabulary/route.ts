import { NextResponse } from "next/server";
import {
  createMediaVocabularyTerm,
  listMediaVocabularyTerms,
  validateMediaVocabularyType,
} from "@/features/media/services/media-vocabulary.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type");
  const type = typeParam ? validateMediaVocabularyType(typeParam) : null;
  if (typeParam && !type) {
    return NextResponse.json({ message: "Loại từ điển không hợp lệ" }, { status: 400 });
  }

  try {
    const terms = await listMediaVocabularyTerms({
      type: type ?? undefined,
      activeOnly: searchParams.get("activeOnly") === "1",
      search: searchParams.get("search") ?? undefined,
      includeUsage: searchParams.get("includeUsage") === "1",
    });
    return NextResponse.json({ terms });
  } catch (err) {
    console.error("[GET /api/content/media-vocabulary]", err);
    return NextResponse.json({ message: "Không thể tải từ điển metadata ảnh" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "create",
    request,
  });
  if (!permission.ok) return permission.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const type = validateMediaVocabularyType(raw.type);
  if (!type) {
    return NextResponse.json({ message: "Loại từ điển không hợp lệ" }, { status: 400 });
  }

  try {
    const term = await createMediaVocabularyTerm({
      type,
      code: typeof raw.code === "string" ? raw.code : null,
      name: typeof raw.name === "string" ? raw.name : "",
      aliases: Array.isArray(raw.aliases)
        ? raw.aliases.filter((item): item is string => typeof item === "string")
        : undefined,
      description: typeof raw.description === "string" ? raw.description : null,
      sortOrder:
        typeof raw.sortOrder === "number" ? raw.sortOrder : Number(raw.sortOrder ?? 0),
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : true,
    });
    return NextResponse.json({ term }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tạo thuật ngữ" },
      { status: 400 },
    );
  }
}
