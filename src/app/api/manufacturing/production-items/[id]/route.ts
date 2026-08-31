import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ItemProductionSampleStatus, ItemProductionStatus } from "@prisma/client";
import { can } from "@/features/auth/admin-permissions";
import { updateSampleStatus } from "@/features/item-production-tracking/item-production-lean-ops.service";
import {
  getProductionItem,
  updateProductionItem,
} from "@/features/item-production-tracking/item-production.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const item = await getProductionItem(id);
  if (!item) return NextResponse.json({ message: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  const canAssign =
    can(auth.session, "manufacturing.production.assign") || can(auth.session, "production.update");
  const canUpdate =
    can(auth.session, "manufacturing.production.update") || can(auth.session, "production.update");
  if (!canUpdate) {
    return NextResponse.json({ message: "Không có quyền cập nhật" }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    const body = (await req.json()) as {
      supplierId?: string | null;
      assignedEmployeeId?: string | null;
      note?: string | null;
      promisedDeliveryDate?: string | null;
      productionStatus?: ItemProductionStatus;
      sampleStatus?: ItemProductionSampleStatus;
      nextAction?: string | null;
      nextActionDueDate?: string | null;
      expectedRowVersion?: number;
    };
    if ((body.supplierId !== undefined || body.assignedEmployeeId !== undefined) && !canAssign) {
      return NextResponse.json({ message: "Không có quyền phân công" }, { status: 403 });
    }
    if (body.sampleStatus !== undefined) {
      await updateSampleStatus({
        productionItemId: id,
        sampleStatus: body.sampleStatus,
        adminUserId: auth.session.userId ?? null,
      });
    }
    const { sampleStatus: _sample, ...rest } = body;
    const item = await updateProductionItem(id, rest);
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Cập nhật thất bại" },
      { status: 400 },
    );
  }
}
