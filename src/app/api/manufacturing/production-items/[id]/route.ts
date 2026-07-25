import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ItemProductionStatus } from "@prisma/client";
import { can } from "@/features/auth/admin-permissions";
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
      expectedRowVersion?: number;
    };
    if ((body.supplierId !== undefined || body.assignedEmployeeId !== undefined) && !canAssign) {
      return NextResponse.json({ message: "Không có quyền phân công" }, { status: 403 });
    }
    const item = await updateProductionItem(id, body);
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Cập nhật thất bại" },
      { status: 400 },
    );
  }
}
