import { NextRequest, NextResponse } from "next/server";
import { createBlogDraftFromTopic } from "@/features/content/services/seo-content-handoff.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "create", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  try {
    const result = await createBlogDraftFromTopic(id);
    if (!result.supported) {
      return NextResponse.json({ message: result.message, result }, { status: 400 });
    }
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tạo bản nháp Blog" },
      { status: 400 },
    );
  }
}
