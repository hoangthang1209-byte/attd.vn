import { NextRequest, NextResponse } from "next/server";
import {
  CostingBatchValidationError,
  createQuoteFromCostingBatch,
} from "@/features/pricing/services/costing-batch.service";
import { QuoteValidationError } from "@/features/quotes/quote.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty ok — quote all rows
  }

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const itemIds = Array.isArray(raw.itemIds)
    ? raw.itemIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : undefined;

  try {
    const result = await createQuoteFromCostingBatch(id, itemIds);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof CostingBatchValidationError || err instanceof QuoteValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/pricing/costing-batches/[id]/create-quote]", err);
    return NextResponse.json({ message: "Không thể tạo báo giá từ batch" }, { status: 500 });
  }
}
