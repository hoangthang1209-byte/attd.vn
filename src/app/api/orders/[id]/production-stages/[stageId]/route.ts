import { NextRequest, NextResponse } from "next/server";
import type { ProductionStageStatus } from "@prisma/client";
import {
  updateProductionStage,
} from "@/features/orders/production-stage.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";

type RouteContext = { params: Promise<{ id: string; stageId: string }> };

const STAGE_STATUSES = new Set<ProductionStageStatus>([
  "NOT_STARTED",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
  "SKIPPED",
]);

function parseOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id, stageId } = await context.params;
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
    const status =
      typeof raw.status === "string" && STAGE_STATUSES.has(raw.status as ProductionStageStatus)
        ? (raw.status as ProductionStageStatus)
        : undefined;

    const stage = await updateProductionStage(id, stageId, {
      status,
      assignedEmployeeId: parseOptionalString(raw.assignedEmployeeId),
      plannedQuantity: raw.plannedQuantity,
      completedQuantity: raw.completedQuantity,
      passedQuantity: raw.passedQuantity,
      defectQuantity: raw.defectQuantity,
      reworkQuantity: raw.reworkQuantity,
      scrapQuantity: raw.scrapQuantity,
      note: parseOptionalString(raw.note),
      quantityCorrectionReason: parseOptionalString(raw.quantityCorrectionReason),
    });
    return NextResponse.json({ stage });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/orders/[id]/production-stages/[stageId]]", err);
    return NextResponse.json({ message: "Không thể cập nhật công đoạn" }, { status: 500 });
  }
}
