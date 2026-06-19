import { NextRequest, NextResponse } from "next/server";
import { setDefaultSalesRepresentative } from "@/features/sales/services/sales-representative.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const salesRep = await setDefaultSalesRepresentative(id);
  if (!salesRep) {
    return NextResponse.json({ message: "Không tìm thấy nhân viên tư vấn" }, { status: 404 });
  }
  return NextResponse.json({ salesRep });
}
