import { NextRequest, NextResponse } from "next/server";
import { checkTopicMediaCoverage } from "@/features/content/services/seo-dashboard.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  try {
    const plan = await checkTopicMediaCoverage(id);
    return NextResponse.json({ plan });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể kiểm tra độ phủ hình ảnh" },
      { status: 400 },
    );
  }
}
