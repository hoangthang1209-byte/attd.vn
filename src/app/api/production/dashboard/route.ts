import { NextRequest, NextResponse } from "next/server";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";
import { getProductionDashboard } from "@/features/production-planning/production-plan.service";

export async function GET(req: NextRequest) {
  const { session, error } = requireProductionView(req);
  if (error) return error;

  try {
    const result = await getProductionDashboard(session);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/production/dashboard]", err);
    return NextResponse.json({ message: "Không thể tải tổng quan sản xuất" }, { status: 500 });
  }
}
