import { NextRequest, NextResponse } from "next/server";
import {
  getTechPackDetail,
  TechPackValidationError,
  updateTechPack,
} from "@/features/tech-pack/tech-pack.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

function createTraceId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function jsonError(
  status: number,
  message: string,
  code: string,
  traceId: string,
  fieldErrors: Record<string, string> = {},
) {
  return NextResponse.json(
    { error: message, message, code, traceId, fieldErrors },
    { status, headers: { "x-attd-trace-id": traceId } },
  );
}

function inspectMeasurementPayload(body: unknown) {
  const rows = Array.isArray((body as { measurements?: unknown } | null)?.measurements)
    ? (body as { measurements: unknown[] }).measurements
    : [];
  const sizes = new Set<string>();
  for (const row of rows) {
    const values = row && typeof row === "object" && Array.isArray((row as { values?: unknown }).values)
      ? ((row as { values: unknown[] }).values)
      : [];
    for (const value of values) {
      const size = value && typeof value === "object" ? String((value as { size?: unknown }).size ?? "").trim() : "";
      if (size) sizes.add(size.toUpperCase());
    }
  }
  return { rowCount: rows.length, sizeCount: sizes.size };
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  try {
    const pack = await getTechPackDetail(id);
    if (!pack) {
      return NextResponse.json({ message: "Không tìm thấy Tech Pack." }, { status: 404 });
    }
    return NextResponse.json(pack);
  } catch (err) {
    console.error("[GET /api/tech-packs/[id]]", err);
    return NextResponse.json({ message: "Không thể tải Tech Pack." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const traceId = createTraceId();
  const permission = await requireAdminPermission({
    platform: "tech-pack",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Dữ liệu không hợp lệ.", "TECH_PACK_MEASUREMENT_INVALID", traceId);
  }
  if (!body || typeof body !== "object") {
    return jsonError(400, "Dữ liệu cập nhật không hợp lệ.", "TECH_PACK_MEASUREMENT_INVALID", traceId);
  }
  const raw = body as Record<string, unknown>;
  const isMeasurementUpdate = Object.prototype.hasOwnProperty.call(raw, "measurements");
  const diagnostics = inspectMeasurementPayload(body);

  try {
    const pack = await updateTechPack(id, {
      title: raw.title === null ? null : typeof raw.title === "string" ? raw.title : undefined,
      bomNotes: raw.bomNotes === null ? null : typeof raw.bomNotes === "string" ? raw.bomNotes : undefined,
      trimsNotes: raw.trimsNotes === null ? null : typeof raw.trimsNotes === "string" ? raw.trimsNotes : undefined,
      printMethodNotes:
        raw.printMethodNotes === null
          ? null
          : typeof raw.printMethodNotes === "string"
            ? raw.printMethodNotes
            : undefined,
      embroideryNotes:
        raw.embroideryNotes === null
          ? null
          : typeof raw.embroideryNotes === "string"
            ? raw.embroideryNotes
            : undefined,
      deadline: raw.deadline === null ? null : typeof raw.deadline === "string" ? raw.deadline : undefined,
      qcNotes: raw.qcNotes === null ? null : typeof raw.qcNotes === "string" ? raw.qcNotes : undefined,
      productionNotes:
        raw.productionNotes === null
          ? null
          : typeof raw.productionNotes === "string"
            ? raw.productionNotes
            : undefined,
      internalNotes:
        raw.internalNotes === null
          ? null
          : typeof raw.internalNotes === "string"
            ? raw.internalNotes
            : undefined,
      patternExceptionReason:
        raw.patternExceptionReason === null
          ? null
          : typeof raw.patternExceptionReason === "string"
            ? raw.patternExceptionReason
            : undefined,
      measurements: Array.isArray(raw.measurements) ? (raw.measurements as never) : undefined,
    });
    return NextResponse.json(pack);
  } catch (err) {
    if (err instanceof TechPackValidationError) {
      if (isMeasurementUpdate) {
        console.error("[tech-pack.measurements.save.failed]", {
          traceId,
          route: "PATCH /api/tech-packs/[id]",
          techPackId: id,
          status: 400,
          rowCount: diagnostics.rowCount,
          sizeCount: diagnostics.sizeCount,
          classification: "TECH_PACK_MEASUREMENT_INVALID",
        });
      }
      return jsonError(400, err.message, "TECH_PACK_MEASUREMENT_INVALID", traceId);
    }
    console.error("[PATCH /api/tech-packs/[id]]", {
      traceId,
      techPackId: id,
      isMeasurementUpdate,
      rowCount: diagnostics.rowCount,
      sizeCount: diagnostics.sizeCount,
      err,
    });
    const message = isMeasurementUpdate
      ? "Không thể lưu bảng đo. Vui lòng kiểm tra dữ liệu và thử lại."
      : "Không thể cập nhật Tech Pack.";
    return jsonError(500, message, "TECH_PACK_MEASUREMENT_SAVE_FAILED", traceId);
  }
}
