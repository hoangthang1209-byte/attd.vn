import { NextRequest, NextResponse } from "next/server";
import { listMaterialsForSupplier } from "@/features/materials/material-supplier-link.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  try {
    const materials = await listMaterialsForSupplier(id);
    return NextResponse.json({ materials });
  } catch (err) {
    console.error("[GET /api/material-suppliers/[id]/materials]", err);
    return NextResponse.json({ message: "Không thể tải vật tư của nhà cung cấp." }, { status: 500 });
  }
}
