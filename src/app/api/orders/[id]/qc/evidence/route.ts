import { NextRequest, NextResponse } from "next/server";
import type { QcEvidenceType } from "@prisma/client";
import {
  addQcEvidence,
} from "@/features/orders/qc-inspection.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";

type RouteContext = { params: Promise<{ id: string }> };

const EVIDENCE_TYPES = new Set<QcEvidenceType>([
  "DEFECT",
  "PASSED_SAMPLE",
  "PACKING",
  "FINAL_PRODUCT",
  "OTHER",
]);

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
    const evidenceType =
      typeof raw.evidenceType === "string" && EVIDENCE_TYPES.has(raw.evidenceType as QcEvidenceType)
        ? (raw.evidenceType as QcEvidenceType)
        : undefined;

    const orderItemId =
      typeof raw.orderItemId === "string" && raw.orderItemId.trim()
        ? raw.orderItemId.trim()
        : null;

    const evidence = await addQcEvidence(id, {
      mediaAssetId: typeof raw.mediaAssetId === "string" ? raw.mediaAssetId : "",
      title: parseOptionalString(raw.title),
      note: parseOptionalString(raw.note),
      evidenceType,
      orderItemId,
    });
    return NextResponse.json({ evidence }, { status: 201 });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/[id]/qc/evidence]", err);
    return NextResponse.json({ message: "Không thể thêm minh chứng QC" }, { status: 500 });
  }
}
