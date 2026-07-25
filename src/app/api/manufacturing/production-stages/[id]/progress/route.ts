import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import {
  applyStageProgress,
  type StageAction,
} from "@/features/item-production-tracking/item-production.service";
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
  const { id } = await ctx.params;
  try {
    const body = (await req.json()) as {
      action?: StageAction;
      quantityDelta?: number;
      acceptedQuantityDelta?: number;
      rejectedQuantityDelta?: number;
      reworkQuantityDelta?: number;
      wasteQuantityDelta?: number;
      note?: string;
      expectedEnd?: string;
      expectedRowVersion?: number;
    };
    if (!body.action) {
      return NextResponse.json({ message: "Thiếu action" }, { status: 400 });
    }
    const item = await applyStageProgress({
      stageId: id,
      action: body.action,
      quantityDelta: body.quantityDelta,
      acceptedQuantityDelta: body.acceptedQuantityDelta,
      rejectedQuantityDelta: body.rejectedQuantityDelta,
      reworkQuantityDelta: body.reworkQuantityDelta,
      wasteQuantityDelta: body.wasteQuantityDelta,
      note: body.note,
      expectedEnd: body.expectedEnd,
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
