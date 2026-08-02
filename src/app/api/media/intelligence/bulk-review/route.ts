import { NextResponse } from "next/server";
import { bulkReviewMediaMetadata } from "@/features/media/intelligence/review.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

/**
 * Bulk approve/confirm metadata suggestions.
 * Never bulk-publishes / never forces PUBLIC visibility.
 */
export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request,
  });
  if (!permission.ok) return permission.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  if (raw.publish === true || raw.visibility === "PUBLIC") {
    return NextResponse.json(
      { message: "Bulk publish / force PUBLIC không được phép" },
      { status: 400 },
    );
  }

  const ids = raw.mediaAssetIds;
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string" && id.trim())) {
    return NextResponse.json({ message: "mediaAssetIds không hợp lệ" }, { status: 400 });
  }

  const result = await bulkReviewMediaMetadata({
    mediaAssetIds: ids.map((id) => (id as string).trim()),
    reviewedBy: permission.user.userId ?? permission.user.username ?? null,
    applySuggestions: raw.applySuggestions !== false,
  });

  return NextResponse.json(result);
}
