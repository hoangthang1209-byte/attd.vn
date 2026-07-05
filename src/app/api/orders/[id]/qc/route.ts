import { NextRequest, NextResponse } from "next/server";
import {
  createQcInspection,
  getQcInspection,
  updateQcInspection,
} from "@/features/orders/qc-inspection.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";
import type { QcInspectionStatus } from "@prisma/client";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

const QC_STATUSES = new Set<QcInspectionStatus>([
  "DRAFT",
  "PASSED",
  "PASSED_WITH_NOTE",
  "FAILED",
  "REWORK_REQUIRED",
]);

function parseOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const orderItemId = req.nextUrl.searchParams.get("orderItemId");
  try {
    const qc = await getQcInspection(id, orderItemId || null);
    return NextResponse.json({ qc });
  } catch (err) {
    console.error("[GET /api/orders/[id]/qc]", err);
    return NextResponse.json({ message: "Không thể tải QC" }, { status: 500 });
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
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty body ok
  }
  const raw = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const orderItemId =
    typeof raw.orderItemId === "string" && raw.orderItemId.trim()
      ? raw.orderItemId.trim()
      : null;
  try {
    const qc = await createQcInspection(id, {
      inspectedByEmployeeId: parseOptionalString(raw.inspectedByEmployeeId) ?? null,
      orderItemId,
    });
    return NextResponse.json({ qc }, { status: 201 });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/[id]/qc]", err);
    return NextResponse.json({ message: "Không thể tạo QC" }, { status: 500 });
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

  const raw = body as Record<string, unknown>;
  try {
    const status =
      typeof raw.status === "string" && QC_STATUSES.has(raw.status as QcInspectionStatus)
        ? (raw.status as QcInspectionStatus)
        : undefined;

    const orderItemId =
      typeof raw.orderItemId === "string" && raw.orderItemId.trim()
        ? raw.orderItemId.trim()
        : null;

    const qc = await updateQcInspection(id, {
      orderItemId,
      status,
      inspectedByEmployeeId: parseOptionalString(raw.inspectedByEmployeeId),
      inspectedAt: parseOptionalString(raw.inspectedAt),
      inspectedQuantity: raw.inspectedQuantity,
      passedQuantity: raw.passedQuantity,
      defectQuantity: raw.defectQuantity,
      reworkQuantity: raw.reworkQuantity,
      scrapQuantity: raw.scrapQuantity,
      summary: parseOptionalString(raw.summary),
      correctiveAction: parseOptionalString(raw.correctiveAction),
    });
    return NextResponse.json({ qc });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/orders/[id]/qc]", err);
    return NextResponse.json({ message: "Không thể cập nhật QC" }, { status: 500 });
  }
}
