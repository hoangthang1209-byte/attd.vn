import { NextResponse } from "next/server";
import {
  createMediaBundle,
  listMediaBundles,
} from "@/features/media/services/media-bundle.service";
import { validateMediaBundleContentType } from "@/features/media/media-bundle-presets";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import type { MediaBundleStatus } from "@prisma/client";

const MEDIA_BUNDLE_STATUSES: MediaBundleStatus[] = ["DRAFT", "READY", "ARCHIVED"];

function validateStatus(value: string | null): MediaBundleStatus | null {
  if (!value) return null;
  return MEDIA_BUNDLE_STATUSES.includes(value as MediaBundleStatus)
    ? (value as MediaBundleStatus)
    : null;
}

export async function GET(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

  const { searchParams } = new URL(request.url);
  const contentTypeParam = searchParams.get("contentType");
  const contentType = contentTypeParam ? validateMediaBundleContentType(contentTypeParam) : null;
  if (contentTypeParam && !contentType) {
    return NextResponse.json({ message: "Loại nội dung không hợp lệ" }, { status: 400 });
  }

  const statusParam = searchParams.get("status");
  const status = validateStatus(statusParam);
  if (statusParam && !status) {
    return NextResponse.json({ message: "Trạng thái bộ media không hợp lệ" }, { status: 400 });
  }

  const activeOnlyParam = searchParams.get("activeOnly");
  const isActiveParam = searchParams.get("isActive");
  let isActive: boolean | undefined;
  if (activeOnlyParam === "1" || activeOnlyParam === "true") isActive = true;
  if (isActiveParam === "true") isActive = true;
  if (isActiveParam === "false") isActive = false;

  const includeHealth = searchParams.get("includeHealth") !== "0";

  try {
    const bundles = await listMediaBundles({
      search: searchParams.get("search") ?? undefined,
      contentType: contentType ?? undefined,
      status: status ?? undefined,
      isActive,
    });

    if (!includeHealth) {
      return NextResponse.json({
        bundles: bundles.map(({ health, ...rest }) => {
          void health;
          return rest;
        }),
      });
    }

    return NextResponse.json({ bundles });
  } catch (err) {
    console.error("[GET /api/content/media-bundles]", err);
    return NextResponse.json({ message: "Không thể tải danh sách bộ media" }, { status: 500 });
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

  function parseStringArray(value: unknown): string[] | undefined {
    if (value === undefined) return undefined;
    if (!Array.isArray(value)) return undefined;
    return value.filter((item): item is string => typeof item === "string");
  }

  try {
    const bundle = await createMediaBundle({
      name: typeof raw.name === "string" ? raw.name : "",
      code: typeof raw.code === "string" ? raw.code : null,
      description: typeof raw.description === "string" ? raw.description : null,
      contentType: typeof raw.contentType === "string" ? raw.contentType : "",
      query: typeof raw.query === "string" ? raw.query : null,
      subjectTerms: parseStringArray(raw.subjectTerms),
      industryTerms: parseStringArray(raw.industryTerms),
      useCaseTerms: parseStringArray(raw.useCaseTerms),
      techniqueTerms: parseStringArray(raw.techniqueTerms),
      applyPreset: typeof raw.applyPreset === "boolean" ? raw.applyPreset : undefined,
    });
    return NextResponse.json({ bundle }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tạo bộ media" },
      { status: 400 },
    );
  }
}
