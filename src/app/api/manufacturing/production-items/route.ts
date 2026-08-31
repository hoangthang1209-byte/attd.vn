import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ItemProductionDeliveryStatus, ItemProductionRiskStatus, ItemProductionStageKey, ItemProductionStatus } from "@prisma/client";
import { can } from "@/features/auth/admin-permissions";
import { listProductionItems } from "@/features/item-production-tracking/item-production.service";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

export async function GET(req: NextRequest) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  if (
    !can(auth.session, "manufacturing.production.view") &&
    !can(auth.session, "production.view")
  ) {
    return NextResponse.json({ message: "Không có quyền xem tiến độ sản xuất" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const data = await listProductionItems({
    search: sp.get("search") ?? undefined,
    orderId: sp.get("order") ?? sp.get("orderId") ?? undefined,
    customerId: sp.get("customer") ?? sp.get("customerId") ?? undefined,
    productionStatus: (sp.get("productionStatus") as ItemProductionStatus | null) ?? undefined,
    deliveryStatus: (sp.get("deliveryStatus") as ItemProductionDeliveryStatus | null) ?? undefined,
    currentStage: (sp.get("currentStage") as ItemProductionStageKey | null) ?? undefined,
    riskStatus: (sp.get("riskStatus") as ItemProductionRiskStatus | null) ?? undefined,
    supplierId: sp.get("supplierId") ?? undefined,
    assignedEmployeeId: sp.get("assignedUser") ?? sp.get("assignedEmployeeId") ?? undefined,
    promisedFrom: sp.get("promisedFrom") ?? undefined,
    promisedTo: sp.get("promisedTo") ?? undefined,
    onlyDelayed: sp.get("onlyDelayed") === "1" || sp.get("onlyDelayed") === "true",
    onlyStale: sp.get("onlyStale") === "1" || sp.get("onlyStale") === "true",
    readyToShip: sp.get("readyToShip") === "1" || sp.get("readyToShip") === "true",
    batchRiskStatus: (sp.get("batchRiskStatus") as ItemProductionRiskStatus | null) ?? undefined,
    batchStatus: sp.get("batchStatus") ?? undefined,
    hasBatches: sp.get("hasBatches") === "1" || sp.get("hasBatches") === "true",
    noBatches: sp.get("noBatches") === "1" || sp.get("noBatches") === "true",
    partiallyAllocated: sp.get("partiallyAllocated") === "1" || sp.get("partiallyAllocated") === "true",
    fullyAllocated: sp.get("fullyAllocated") === "1" || sp.get("fullyAllocated") === "true",
    unallocated: sp.get("unallocated") === "1" || sp.get("unallocated") === "true",
    page: Number(sp.get("page") ?? "1") || 1,
    pageSize: Number(sp.get("pageSize") ?? "20") || 20,
  });
  return NextResponse.json(data);
}
