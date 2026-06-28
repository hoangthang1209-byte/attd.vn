import { NextRequest, NextResponse } from "next/server";
import { listTechPackSourceItems } from "@/features/tech-pack/tech-pack.service";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

export async function GET(req: NextRequest) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const typeParam = searchParams.get("type");
  const type =
    typeParam === "order-item" || typeParam === "quote-item" || typeParam === "all"
      ? typeParam
      : "all";

  try {
    const result = await listTechPackSourceItems({
      q: searchParams.get("q") ?? undefined,
      type,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 30,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/tech-packs/source-items]", err);
    return NextResponse.json({ message: "Không thể tải danh sách hạng mục." }, { status: 500 });
  }
}
