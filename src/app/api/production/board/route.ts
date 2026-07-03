import { NextRequest, NextResponse } from "next/server";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";
import { getProductionBoard } from "@/features/production-planning/production-plan.service";

export async function GET(req: NextRequest) {
  const { session, error } = requireProductionView(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  try {
    const result = await getProductionBoard(session, {
      mine: searchParams.get("mine") === "1",
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/production/board]", err);
    return NextResponse.json({ message: "Không thể tải bảng tiến độ sản xuất" }, { status: 500 });
  }
}
