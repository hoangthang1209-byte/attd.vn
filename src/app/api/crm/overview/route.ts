import { NextResponse } from "next/server";
import { getCrmOverview } from "@/features/crm/services/crm-overview.service";

export async function GET() {
  try {
    const overview = await getCrmOverview();
    return NextResponse.json(overview);
  } catch (err) {
    console.error("[GET /api/crm/overview]", err);
    return NextResponse.json({ message: "Không thể tải tổng quan CRM" }, { status: 500 });
  }
}
