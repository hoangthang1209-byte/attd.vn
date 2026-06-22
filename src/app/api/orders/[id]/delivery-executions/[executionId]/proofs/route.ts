import { NextRequest, NextResponse } from "next/server";
import { parseDeliveryProofBody } from "@/features/orders/delivery-execution-input";
import {
  addDeliveryProof,
  listDeliveryProofs,
} from "@/features/orders/delivery-execution.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";

type RouteContext = { params: Promise<{ id: string; executionId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id, executionId } = await context.params;
  try {
    const proofs = await listDeliveryProofs(id, executionId);
    return NextResponse.json({ proofs });
  } catch (err) {
    console.error("[GET .../proofs]", err);
    return NextResponse.json({ message: "Không thể tải bằng chứng giao hàng" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { id, executionId } = await context.params;
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
    const parsed = parseDeliveryProofBody(body as Record<string, unknown>);
    const proof = await addDeliveryProof(id, executionId, parsed);
    return NextResponse.json({ proof }, { status: 201 });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST .../proofs]", err);
    return NextResponse.json({ message: "Không thể thêm bằng chứng giao hàng" }, { status: 500 });
  }
}
