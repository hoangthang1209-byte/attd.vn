import { NextRequest, NextResponse } from "next/server";
import type { SalesOpportunityPriority, SalesOpportunityStage } from "@prisma/client";
import {
  isValidSalesOpportunityPriority,
  isValidSalesOpportunityStage,
  parseCreateSalesOpportunityBody,
  SalesOpportunityValidationError,
} from "@/features/sales/opportunities/sales-opportunity-input";
import {
  createSalesOpportunity,
  listSalesOpportunities,
} from "@/features/sales/opportunities/sales-opportunity.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { searchParams } = new URL(req.url);
  const stageParam = searchParams.get("stage");
  const priorityParam = searchParams.get("priority");

  if (stageParam && !isValidSalesOpportunityStage(stageParam)) {
    return NextResponse.json({ message: "Giai đoạn không hợp lệ" }, { status: 400 });
  }
  if (priorityParam && !isValidSalesOpportunityPriority(priorityParam)) {
    return NextResponse.json({ message: "Ưu tiên không hợp lệ" }, { status: 400 });
  }

  const limitRaw = parseInt(searchParams.get("limit") ?? "200", 10);
  const limit = Number.isFinite(limitRaw) ? limitRaw : 200;

  try {
    const result = await listSalesOpportunities({
      stage: stageParam ? (stageParam as SalesOpportunityStage) : undefined,
      priority: priorityParam ? (priorityParam as SalesOpportunityPriority) : undefined,
      search: searchParams.get("search") ?? undefined,
      limit,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/sales/opportunities]", err);
    return NextResponse.json({ message: "Không thể tải pipeline bán hàng" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  try {
    const input = parseCreateSalesOpportunityBody(body as Record<string, unknown>);
    const opportunity = await createSalesOpportunity(input);
    return NextResponse.json({ opportunity }, { status: 201 });
  } catch (err) {
    if (err instanceof SalesOpportunityValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/sales/opportunities]", err);
    return NextResponse.json({ message: "Không thể tạo cơ hội bán hàng" }, { status: 500 });
  }
}
