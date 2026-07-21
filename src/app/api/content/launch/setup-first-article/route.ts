import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { setupFirstLaunchArticle } from "@/features/content/services/content-launch-setup.service";

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  try {
    const result = await setupFirstLaunchArticle();
    return NextResponse.json({
      ...result,
      message: result.reused
        ? "Đã tái sử dụng Topic hiện có (idempotent)."
        : "Đã tạo Topic launch (DRAFT path — chưa publish).",
    });
  } catch (err) {
    console.error("[POST /api/content/launch/setup-first-article]", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Setup thất bại" },
      { status: 400 },
    );
  }
}
