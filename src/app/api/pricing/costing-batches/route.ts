import { NextRequest, NextResponse } from "next/server";
import {
  CostingBatchValidationError,
  createCostingBatch,
  listCostingBatches,
} from "@/features/pricing/services/costing-batch.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET() {
  try {
    const result = await listCostingBatches();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/pricing/costing-batches]", err);
    return NextResponse.json({ message: "Không thể tải batch costing" }, { status: 500 });
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

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  try {
    const batch = await createCostingBatch({
      title: typeof raw.title === "string" ? raw.title : undefined,
      leadId: typeof raw.leadId === "string" ? raw.leadId : undefined,
      customerId: typeof raw.customerId === "string" ? raw.customerId : undefined,
      contactId: typeof raw.contactId === "string" ? raw.contactId : undefined,
      internalNote: typeof raw.internalNote === "string" ? raw.internalNote : undefined,
    });
    return NextResponse.json({ batch }, { status: 201 });
  } catch (err) {
    if (err instanceof CostingBatchValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/pricing/costing-batches]", err);
    return NextResponse.json({ message: "Không thể tạo batch costing" }, { status: 500 });
  }
}
