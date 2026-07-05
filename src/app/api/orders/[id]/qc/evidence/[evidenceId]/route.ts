import { NextRequest, NextResponse } from "next/server";
import type { QcEvidenceType } from "@prisma/client";
import {
  deleteQcEvidence,
  updateQcEvidence,
} from "@/features/orders/qc-inspection.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; evidenceId: string }> };

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

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id, evidenceId } = await context.params;
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

    const evidence = await updateQcEvidence(id, evidenceId, {
      title: parseOptionalString(raw.title),
      note: parseOptionalString(raw.note),
      evidenceType,
    });
    return NextResponse.json({ evidence });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/orders/[id]/qc/evidence/[evidenceId]]", err);
    return NextResponse.json({ message: "Không thể cập nhật minh chứng" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "delete",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id, evidenceId } = await context.params;
  try {
    await deleteQcEvidence(id, evidenceId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[DELETE /api/orders/[id]/qc/evidence/[evidenceId]]", err);
    return NextResponse.json({ message: "Không thể xóa minh chứng" }, { status: 500 });
  }
}
