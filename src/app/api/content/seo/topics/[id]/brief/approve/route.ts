import { NextRequest, NextResponse } from "next/server";
import { approveSeoContentBrief } from "@/features/content/services/seo-brief.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  try {
    const approvedBy =
      permission.user.username ?? permission.user.userId ?? permission.user.roleCode ?? "admin";
    const brief = await approveSeoContentBrief(id, approvedBy);
    return NextResponse.json({ brief });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể duyệt brief" },
      { status: 400 },
    );
  }
}
