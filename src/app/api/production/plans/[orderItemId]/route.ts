import { NextRequest, NextResponse } from "next/server";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";
import {
  getProductionPlanDetail,
  upsertProductionPlan,
} from "@/features/production-planning/production-plan.service";

type RouteContext = { params: Promise<{ orderItemId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { session, error } = requireProductionView(req);
  if (error) return error;

  const { orderItemId } = await context.params;
  try {
    const plan = await getProductionPlanDetail(session, orderItemId);
    if (!plan) {
      return NextResponse.json({ message: "Không tìm thấy công việc sản xuất" }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (err) {
    console.error("[GET /api/production/plans/[orderItemId]]", err);
    return NextResponse.json({ message: "Không thể tải kế hoạch sản xuất. Vui lòng thử lại." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { session, error } = requireProductionView(req);
  if (error) return error;

  const { orderItemId } = await context.params;
  try {
    const body = await req.json();
    const plan = await upsertProductionPlan(session, orderItemId, body);
    return NextResponse.json({ plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "FORBIDDEN") {
      return NextResponse.json({ message: "Không có quyền chỉnh sửa kế hoạch" }, { status: 403 });
    }
    if (message === "NOT_FOUND") {
      return NextResponse.json({ message: "Không tìm thấy công việc sản xuất" }, { status: 404 });
    }
    if (message === "INVALID_DATES") {
      return NextResponse.json({ message: "Ngày kết thúc phải sau ngày bắt đầu" }, { status: 400 });
    }
    console.error("[PATCH /api/production/plans/[orderItemId]]", err);
    return NextResponse.json({ message: "Không thể lưu kế hoạch sản xuất" }, { status: 500 });
  }
}
