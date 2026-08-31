import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { applyQuickStageUpdate } from "@/features/item-production-tracking/item-production-lean-ops.service";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  if (
    !can(auth.session, "manufacturing.production.update") &&
    !can(auth.session, "production.update")
  ) {
    return NextResponse.json({ message: "Không có quyền cập nhật tiến độ" }, { status: 403 });
  }
  const { id: stageId } = await ctx.params;
  try {
    const body = (await req.json()) as {
      completedQuantity?: number;
      rejectedOrReworkQuantity?: number;
      markComplete?: boolean;
      note?: string;
      expectedRowVersion?: number;
    };
    if (body.completedQuantity === undefined) {
      return NextResponse.json({ message: "Thiếu số lượng hoàn thành" }, { status: 400 });
    }
    const item = await applyQuickStageUpdate({
      stageId,
      completedQuantity: body.completedQuantity,
      rejectedOrReworkQuantity: body.rejectedOrReworkQuantity,
      markComplete: body.markComplete,
      note: body.note,
      expectedRowVersion: body.expectedRowVersion,
      adminUserId: auth.session.userId ?? null,
    });
    return NextResponse.json({ item, message: "Đã cập nhật tiến độ" });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Cập nhật thất bại" },
      { status: 400 },
    );
  }
}
