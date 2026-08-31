import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import {
  activateBatch,
  cancelBatch,
  completeBatch,
  getBatch,
  updateBatch,
} from "@/features/item-production-tracking/item-production-batch.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";

type Ctx = { params: Promise<{ batchId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { batchId } = await ctx.params;
  const batch = await getBatch(batchId);
  if (!batch) return NextResponse.json({ message: "Không tìm thấy lô" }, { status: 404 });
  return NextResponse.json({ batch });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  const canUpdate =
    can(auth.session, "manufacturing.production.update") || can(auth.session, "production.update");
  const canAssign =
    can(auth.session, "manufacturing.production.assign") || can(auth.session, "production.update");
  if (!canUpdate) {
    return NextResponse.json({ message: "Không có quyền cập nhật lô" }, { status: 403 });
  }
  const { batchId } = await ctx.params;
  try {
    const body = (await req.json()) as {
      action?: "activate" | "complete" | "cancel";
      plannedQuantity?: number;
      supplierId?: string | null;
      picEmployeeId?: string | null;
      plannedStartAt?: string | null;
      plannedEndAt?: string | null;
      notes?: string | null;
      name?: string | null;
      cancelNote?: string;
    };

    if (body.action === "activate") {
      const batch = await activateBatch(batchId, auth.session.userId ?? null);
      return NextResponse.json({ batch, message: "Đã kích hoạt lô" });
    }
    if (body.action === "complete") {
      const batch = await completeBatch(batchId, auth.session.userId ?? null);
      return NextResponse.json({ batch, message: "Đã hoàn tất lô" });
    }
    if (body.action === "cancel") {
      const batch = await cancelBatch(batchId, body.cancelNote, auth.session.userId ?? null);
      return NextResponse.json({ batch, message: "Đã hủy lô" });
    }

    if ((body.supplierId !== undefined || body.picEmployeeId !== undefined) && !canAssign) {
      return NextResponse.json({ message: "Không có quyền phân công" }, { status: 403 });
    }

    const batch = await updateBatch(batchId, {
      plannedQuantity: body.plannedQuantity,
      supplierId: body.supplierId,
      picEmployeeId: body.picEmployeeId,
      plannedStartAt: body.plannedStartAt,
      plannedEndAt: body.plannedEndAt,
      notes: body.notes,
      name: body.name,
      adminUserId: auth.session.userId ?? null,
    });
    return NextResponse.json({ batch, message: "Đã cập nhật lô" });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Cập nhật thất bại" },
      { status: 400 },
    );
  }
}
