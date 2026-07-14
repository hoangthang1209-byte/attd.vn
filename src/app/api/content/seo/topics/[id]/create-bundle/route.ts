import { NextRequest, NextResponse } from "next/server";
import { createDraftBundleFromTopic } from "@/features/content/services/seo-dashboard.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "create", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  try {
    const bundle = await createDraftBundleFromTopic(id);
    return NextResponse.json({ bundle });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tạo Bundle" },
      { status: 400 },
    );
  }
}
