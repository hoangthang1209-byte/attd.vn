import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ItemProductionIssueType } from "@prisma/client";
import { can } from "@/features/auth/admin-permissions";
import {
  listProductionIssues,
  reportProductionIssue,
} from "@/features/item-production-tracking/item-production-lean-ops.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const issues = await listProductionIssues(id);
  return NextResponse.json({ issues });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  if (
    !can(auth.session, "manufacturing.production.update") &&
    !can(auth.session, "production.update")
  ) {
    return NextResponse.json({ message: "Không có quyền báo vấn đề" }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    const body = (await req.json()) as { issueType?: ItemProductionIssueType; note?: string };
    if (!body.issueType) {
      return NextResponse.json({ message: "Thiếu loại vấn đề" }, { status: 400 });
    }
    const issue = await reportProductionIssue({
      productionItemId: id,
      issueType: body.issueType,
      note: body.note,
      adminUserId: auth.session.userId ?? null,
    });
    return NextResponse.json({ issue, message: "Đã ghi nhận vấn đề" });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Ghi nhận thất bại" },
      { status: 400 },
    );
  }
}
