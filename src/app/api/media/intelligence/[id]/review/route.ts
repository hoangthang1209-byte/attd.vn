import { NextResponse } from "next/server";
import { reviewMediaAssetMetadata } from "@/features/media/intelligence/review.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const overrides =
    body.overrides && typeof body.overrides === "object"
      ? (body.overrides as {
          title?: string | null;
          altText?: string | null;
          caption?: string | null;
          keywords?: string[];
        })
      : undefined;

  try {
    const result = await reviewMediaAssetMetadata({
      mediaAssetId: id,
      reviewedBy: permission.user.userId ?? permission.user.username ?? null,
      applySuggestions: body.applySuggestions !== false,
      overrides,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Review thất bại";
    return NextResponse.json({ message }, { status: 400 });
  }
}
