import { NextRequest, NextResponse } from "next/server";
import {
  deleteMediaBundle,
  getMediaBundleById,
  updateMediaBundle,
} from "@/features/media/services/media-bundle.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

function parseStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const bundle = await getMediaBundleById(id);
  if (!bundle) {
    return NextResponse.json({ message: "Không tìm thấy bộ media" }, { status: 404 });
  }
  return NextResponse.json({ bundle });
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
    const bundle = await updateMediaBundle(id, {
      name: typeof raw.name === "string" ? raw.name : undefined,
      code: raw.code === null ? null : typeof raw.code === "string" ? raw.code : undefined,
      description:
        raw.description === null
          ? null
          : typeof raw.description === "string"
            ? raw.description
            : undefined,
      contentType: typeof raw.contentType === "string" ? raw.contentType : undefined,
      status: typeof raw.status === "string" ? raw.status : undefined,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
      query: raw.query === null ? null : typeof raw.query === "string" ? raw.query : undefined,
      subjectTerms: parseStringArray(raw.subjectTerms),
      industryTerms: parseStringArray(raw.industryTerms),
      useCaseTerms: parseStringArray(raw.useCaseTerms),
      techniqueTerms: parseStringArray(raw.techniqueTerms),
    });
    return NextResponse.json({ bundle });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể cập nhật bộ media";
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
    await deleteMediaBundle(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể xóa bộ media";
    return NextResponse.json(
      { message },
      { status: message.includes("Không tìm thấy") ? 404 : 400 },
    );
  }
}
