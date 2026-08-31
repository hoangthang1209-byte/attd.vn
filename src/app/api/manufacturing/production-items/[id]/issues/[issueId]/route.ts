import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { resolveProductionIssue } from "@/features/item-production-tracking/item-production-lean-ops.service";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";

type Ctx = { params: Promise<{ id: string; issueId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  if (
    !can(auth.session, "manufacturing.production.update") &&
    !can(auth.session, "production.update")
  ) {
    return NextResponse.json({ message: "Không có quyền xử lý vấn đề" }, { status: 403 });
  }
  const { issueId } = await ctx.params;
  try {
    const body = (await req.json()) as { resolvedNote?: string };
    const issue = await resolveProductionIssue({
      issueId,
      resolvedNote: body.resolvedNote,
      adminUserId: auth.session.userId ?? null,
    });
    return NextResponse.json({ issue, message: "Đã xử lý vấn đề" });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Xử lý thất bại" },
      { status: 400 },
    );
  }
}
