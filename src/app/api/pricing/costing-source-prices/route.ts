import { NextRequest, NextResponse } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { costingSourcePriceErrorResponse } from "@/features/pricing/costing-source-price-http";
import { isCostingSourceType } from "@/features/pricing/costing-source-price";
import { listCostingSourcePricesForPicker } from "@/features/pricing/services/costing-source-price.service";
import { CostingSourcePriceValidationError } from "@/features/pricing/costing-source-price";
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
  const sourceTypeRaw = searchParams.get("sourceType") ?? "";
  const sourceId = searchParams.get("sourceId")?.trim() ?? "";
  try {
    if (!isCostingSourceType(sourceTypeRaw)) {
      throw new CostingSourcePriceValidationError("sourceType không hợp lệ.", "INVALID_SOURCE_TYPE");
    }
    if (!sourceId) {
      throw new CostingSourcePriceValidationError("sourceId là bắt buộc.", "SOURCE_REQUIRED");
    }
    const items = await listCostingSourcePricesForPicker({
      sourceType: sourceTypeRaw,
      sourceId,
    });
    return NextResponse.json({ items });
  } catch (err) {
    return costingSourcePriceErrorResponse(err, "Không thể tải giá nhà cung cấp.");
  }
}
