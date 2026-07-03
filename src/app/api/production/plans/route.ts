import { NextRequest, NextResponse } from "next/server";
import type { ProductionPlanPriority, ProductionPlanStatus } from "@prisma/client";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";
import {
  listProductionPlans,
  upsertProductionPlan,
} from "@/features/production-planning/production-plan.service";
import type {
  ProductionPlanKpiKey,
  ProductionPlanQuickFilter,
} from "@/features/production-planning/production-plan.types";

const KPI_KEYS = new Set<ProductionPlanKpiKey>([
  "not_planned",
  "missing_docs",
  "missing_materials",
  "ready_to_start",
  "in_progress",
  "awaiting_qc",
  "at_risk",
  "overdue",
]);

const QUICK_FILTERS = new Set<ProductionPlanQuickFilter>([
  "all",
  "mine",
  "not_planned",
  "missing_docs",
  "missing_materials",
  "ready_to_start",
  "in_progress",
  "awaiting_qc",
  "overdue",
]);

export async function GET(req: NextRequest) {
  const { session, error } = requireProductionView(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const kpiRaw = searchParams.get("kpi");
  const quickRaw = searchParams.get("quickFilter");

  try {
    const result = await listProductionPlans(session, {
      search: searchParams.get("search") ?? undefined,
      kpi: kpiRaw && KPI_KEYS.has(kpiRaw as ProductionPlanKpiKey) ? (kpiRaw as ProductionPlanKpiKey) : undefined,
      quickFilter:
        quickRaw && QUICK_FILTERS.has(quickRaw as ProductionPlanQuickFilter)
          ? (quickRaw as ProductionPlanQuickFilter)
          : undefined,
      mine: searchParams.get("mine") === "1",
      status: (searchParams.get("status") as ProductionPlanStatus | null) ?? undefined,
      priority: (searchParams.get("priority") as ProductionPlanPriority | null) ?? undefined,
      ownerId: searchParams.get("ownerId") ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 50,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/production/plans]", err);
    return NextResponse.json({ message: "Không thể tải kế hoạch sản xuất. Vui lòng thử lại." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = requireProductionView(req);
  if (error) return error;

  try {
    const body = await req.json();
    const orderItemId = body.orderItemId as string | undefined;
    if (!orderItemId) {
      return NextResponse.json({ message: "Thiếu orderItemId" }, { status: 400 });
    }
    const detail = await upsertProductionPlan(session, orderItemId, body);
    return NextResponse.json({ plan: detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "FORBIDDEN") {
      return NextResponse.json({ message: "Không có quyền chỉnh sửa kế hoạch" }, { status: 403 });
    }
    if (message === "NOT_FOUND") {
      return NextResponse.json({ message: "Không tìm thấy công việc sản xuất" }, { status: 404 });
    }
    if (message === "INVALID_DATES") {
      return NextResponse.json({ message: "Ngày kết thúc phải sau ngày bắt đầu" }, { status: 400 });
    }
    console.error("[POST /api/production/plans]", err);
    return NextResponse.json({ message: "Không thể lưu kế hoạch sản xuất" }, { status: 500 });
  }
}
