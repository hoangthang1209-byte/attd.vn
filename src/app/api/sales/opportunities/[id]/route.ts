import { NextRequest, NextResponse } from "next/server";
import {
  parseUpdateSalesOpportunityBody,
  SalesOpportunityValidationError,
} from "@/features/sales/opportunities/sales-opportunity-input";
import {
  getSalesOpportunityById,
  updateSalesOpportunity,
} from "@/features/sales/opportunities/sales-opportunity.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const opportunity = await getSalesOpportunityById(id);
    if (!opportunity) {
      return NextResponse.json({ message: "Cơ hội không tồn tại" }, { status: 404 });
    }
    return NextResponse.json({ opportunity });
  } catch (err) {
    console.error("[GET /api/sales/opportunities/[id]]", err);
    return NextResponse.json({ message: "Không thể tải cơ hội bán hàng" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;

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
    const input = parseUpdateSalesOpportunityBody(body as Record<string, unknown>);
    const opportunity = await updateSalesOpportunity(id, input);
    return NextResponse.json({ opportunity });
  } catch (err) {
    if (err instanceof SalesOpportunityValidationError) {
      const status = err.message === "Cơ hội không tồn tại" ? 404 : 400;
      return NextResponse.json({ message: err.message }, { status });
    }
    console.error("[PATCH /api/sales/opportunities/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật cơ hội bán hàng" }, { status: 500 });
  }
}
