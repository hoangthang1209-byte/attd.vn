import { NextRequest, NextResponse } from "next/server";
import {
  isValidSalesOpportunityStage,
  SalesOpportunityValidationError,
} from "@/features/sales/opportunities/sales-opportunity-input";
import { updateSalesOpportunityStage } from "@/features/sales/opportunities/sales-opportunity.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

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

  const stage = (body as Record<string, unknown>).stage;
  if (typeof stage !== "string" || !isValidSalesOpportunityStage(stage)) {
    return NextResponse.json({ message: "Giai đoạn không hợp lệ" }, { status: 400 });
  }

  try {
    const opportunity = await updateSalesOpportunityStage(id, stage);
    return NextResponse.json({ opportunity });
  } catch (err) {
    if (err instanceof SalesOpportunityValidationError) {
      const status = err.message === "Cơ hội không tồn tại" ? 404 : 400;
      return NextResponse.json({ message: err.message }, { status });
    }
    console.error("[PATCH /api/sales/opportunities/[id]/stage]", err);
    return NextResponse.json({ message: "Không thể cập nhật giai đoạn" }, { status: 500 });
  }
}
