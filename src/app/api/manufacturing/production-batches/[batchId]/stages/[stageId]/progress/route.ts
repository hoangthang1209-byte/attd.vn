import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import {
  applyBatchStageProgress,
  type BatchStageAction,
} from "@/features/item-production-tracking/item-production-batch.service";
import { ProductionApprovalGateError } from "@/features/item-production-tracking/production-approval.service";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";

type Ctx = { params: Promise<{ batchId: string; stageId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  if (
    !can(auth.session, "manufacturing.production.update") &&
    !can(auth.session, "production.update")
  ) {
    return NextResponse.json({ message: "Không có quyền cập nhật tiến độ" }, { status: 403 });
  }
  const { stageId } = await ctx.params;
  try {
    const body = (await req.json()) as {
      action?: BatchStageAction;
      quantityDelta?: number;
      acceptedQuantityDelta?: number;
      rejectedQuantityDelta?: number;
      reworkQuantityDelta?: number;
      wasteQuantityDelta?: number;
      note?: string;
      expectedEnd?: string;
      bypassReason?: string;
    };
    if (!body.action) {
      return NextResponse.json({ message: "Thiếu action" }, { status: 400 });
    }
    const batch = await applyBatchStageProgress({
      batchStageId: stageId,
      action: body.action,
      quantityDelta: body.quantityDelta,
      acceptedQuantityDelta: body.acceptedQuantityDelta,
      rejectedQuantityDelta: body.rejectedQuantityDelta,
      reworkQuantityDelta: body.reworkQuantityDelta,
      wasteQuantityDelta: body.wasteQuantityDelta,
      note: body.note,
      expectedEnd: body.expectedEnd,
      adminUserId: auth.session.userId ?? null,
      adminUsername: auth.session.username ?? null,
      bypassReason: body.bypassReason,
    });
    return NextResponse.json({ batch, message: "Đã cập nhật tiến độ lô" });
  } catch (err) {
    if (err instanceof ProductionApprovalGateError) {
      return NextResponse.json(
        {
          message: err.message,
          code: err.code,
          orderItemId: err.orderItemId,
          productionJobHref: err.productionJobHref,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Cập nhật thất bại" },
      { status: 400 },
    );
  }
}
