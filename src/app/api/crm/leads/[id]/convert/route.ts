import { NextRequest, NextResponse } from "next/server";
import { convertLeadToCustomer } from "@/features/crm/services/crm-lead.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const lead = await convertLeadToCustomer(id);

  if (!lead) {
    return NextResponse.json(
      { message: "Không thể chuyển lead. Lead có thể đã được chuyển hoặc không tồn tại." },
      { status: 400 }
    );
  }

  return NextResponse.json({ lead });
}
