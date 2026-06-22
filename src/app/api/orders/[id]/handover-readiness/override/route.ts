import { NextRequest, NextResponse } from "next/server";
import { assertReadyToShipTransition } from "@/features/orders/handover-readiness.service";
import {
  HandoverValidationError,
  ProductionExecutionValidationError,
} from "@/features/orders/production-quantity";

type RouteContext = { params: Promise<{ id: string }> };

function parseOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

export async function POST(req: NextRequest, context: RouteContext) {
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
    const result = await assertReadyToShipTransition(id, {
      handoverReadinessAcknowledged: true,
      handoverOverrideReason: parseOptionalString(raw.reason),
      partialDeliveryAcknowledged: raw.partialDeliveryAcknowledged === true,
    });
    return NextResponse.json({ readiness: result });
  } catch (err) {
    if (err instanceof HandoverValidationError) {
      return NextResponse.json(
        {
          message: err.message,
          code: "HANDOVER_NOT_READY",
          missingConditions: err.missingConditions,
        },
        { status: 400 },
      );
    }
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/[id]/handover-readiness/override]", err);
    return NextResponse.json({ message: "Không thể ghi nhận xác nhận bàn giao" }, { status: 500 });
  }
}
