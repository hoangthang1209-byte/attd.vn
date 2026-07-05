import { NextRequest, NextResponse } from "next/server";
import { parseCreateDeliveryExecutionBody } from "@/features/orders/delivery-execution-input";
import {
  buildDefaultExecutionItems,
  createDeliveryExecution,
  listDeliveryExecutions,
} from "@/features/orders/delivery-execution.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const executions = await listDeliveryExecutions(id);
    return NextResponse.json({ executions });
  } catch (err) {
    console.error("[GET /api/orders/[id]/delivery-executions]", err);
    return NextResponse.json({ message: "Không thể tải chuyến giao hàng" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
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

  const raw = body as Record<string, unknown>;
  try {
    const parsed = parseCreateDeliveryExecutionBody(raw);
    if (parsed.items.length === 0 && raw.useDefaultItems === true) {
      parsed.items = await buildDefaultExecutionItems(id);
    }
    const execution = await createDeliveryExecution(id, parsed);
    return NextResponse.json({ execution }, { status: 201 });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/[id]/delivery-executions]", err);
    return NextResponse.json({ message: "Không thể tạo chuyến giao hàng" }, { status: 500 });
  }
}
