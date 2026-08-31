import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import {
  canStartBatches,
  createBatch,
  listBatchesForProductionItem,
} from "@/features/item-production-tracking/item-production-batch.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  if (
    !can(auth.session, "manufacturing.production.view") &&
    !can(auth.session, "production.view")
  ) {
    return NextResponse.json({ message: "Không có quyền xem tiến độ sản xuất" }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    const data = await listBatchesForProductionItem(id);
    const startCheck = await canStartBatches(id);
    return NextResponse.json({ ...data, canStartBatches: startCheck });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không tải được danh sách lô" },
      { status: 400 },
    );
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  if (
    !can(auth.session, "manufacturing.production.update") &&
    !can(auth.session, "production.update")
  ) {
    return NextResponse.json({ message: "Không có quyền tạo lô sản xuất" }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    const body = (await req.json()) as {
      plannedQuantity?: number;
      supplierId?: string | null;
      picEmployeeId?: string | null;
      plannedStartAt?: string | null;
      plannedEndAt?: string | null;
      notes?: string | null;
      name?: string | null;
    };
    const batch = await createBatch({
      productionItemId: id,
      plannedQuantity: body.plannedQuantity ?? 0,
      supplierId: body.supplierId,
      picEmployeeId: body.picEmployeeId,
      plannedStartAt: body.plannedStartAt,
      plannedEndAt: body.plannedEndAt,
      notes: body.notes,
      name: body.name,
      adminUserId: auth.session.userId ?? null,
    });
    return NextResponse.json({ batch, message: "Đã tạo lô sản xuất" });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Tạo lô thất bại" },
      { status: 400 },
    );
  }
}
