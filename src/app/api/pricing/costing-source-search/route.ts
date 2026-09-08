import { NextRequest, NextResponse } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { costingSourcePriceErrorResponse } from "@/features/pricing/costing-source-price-http";
import {
  parseCostingSourceSearchKind,
  searchCostingSources,
} from "@/features/pricing/services/costing-source-search.service";
import { COSTING_SOURCE_SEARCH_LIMIT } from "@/features/pricing/costing-source-price";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { DATA_ACCESS_DENIED_MESSAGE } from "@/features/auth/admin-session.types";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "view",
    request: req,
  });
  if (!permission.ok) return permission.response;
  if (!can(permission.session, "pricing.manage")) {
    return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  try {
    const kind = parseCostingSourceSearchKind(searchParams.get("kind") ?? searchParams.get("type"));
    const items = await searchCostingSources({
      kind,
      query: searchParams.get("q") ?? searchParams.get("search") ?? undefined,
      take: COSTING_SOURCE_SEARCH_LIMIT,
    });
    return NextResponse.json({ items, take: COSTING_SOURCE_SEARCH_LIMIT });
  } catch (err) {
    return costingSourcePriceErrorResponse(err, "Không thể tìm nguồn giá.");
  }
}
