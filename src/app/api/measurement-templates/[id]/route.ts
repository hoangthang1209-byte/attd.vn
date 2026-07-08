import { NextRequest, NextResponse } from "next/server";
import {
  getMeasurementTemplateDetail,
  updateMeasurementTemplate,
  MeasurementTemplateValidationError,
} from "@/features/measurement-template/measurement-template.service";
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

function inspectItemPayload(body: unknown) {
  const rows = Array.isArray((body as { items?: unknown } | null)?.items)
    ? (body as { items: unknown[] }).items
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
  const template = await getMeasurementTemplateDetail(id);
  if (!template) return NextResponse.json({ message: "Không tìm thấy mẫu." }, { status: 404 });
  return NextResponse.json(template);
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
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, "Dữ liệu không hợp lệ.", "MEASUREMENT_TEMPLATE_INVALID", traceId);
  }
  const isMeasurementUpdate = Object.prototype.hasOwnProperty.call(body, "items");
  const diagnostics = inspectItemPayload(body);

  try {
    const updated = await updateMeasurementTemplate(id, {
      name: typeof body.name === "string" ? body.name : undefined,
      productCategoryId:
        body.productCategoryId === null
          ? null
          : typeof body.productCategoryId === "string"
            ? body.productCategoryId
            : undefined,
      baseSize: body.baseSize === null ? null : typeof body.baseSize === "string" ? body.baseSize : undefined,
      notes: body.notes === null ? null : typeof body.notes === "string" ? body.notes : undefined,
      items: Array.isArray(body.items)
        ? (body.items as Array<Record<string, unknown>>).map((row, index) => ({
            pointOfMeasure: String(row.pointOfMeasure ?? ""),
            description: typeof row.description === "string" ? row.description : null,
            tolerance: typeof row.tolerance === "string" ? row.tolerance : null,
            sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : index,
            values: Array.isArray(row.values)
              ? (row.values as Array<{ size?: string; value?: string }>).map((v) => ({
                  size: String(v.size ?? ""),
                  value: String(v.value ?? ""),
                }))
              : [],
          }))
        : undefined,
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof MeasurementTemplateValidationError) {
      if (isMeasurementUpdate) {
        console.error("[measurement-template.measurements.save.failed]", {
          traceId,
          route: "PATCH /api/measurement-templates/[id]",
          templateId: id,
          status: 400,
          rowCount: diagnostics.rowCount,
          sizeCount: diagnostics.sizeCount,
          classification: "MEASUREMENT_TEMPLATE_INVALID",
        });
      }
      return jsonError(400, err.message, "MEASUREMENT_TEMPLATE_INVALID", traceId);
    }
    console.error("[PATCH /api/measurement-templates/[id]]", {
      traceId,
      templateId: id,
      isMeasurementUpdate,
      rowCount: diagnostics.rowCount,
      sizeCount: diagnostics.sizeCount,
      err,
    });
    const message = isMeasurementUpdate
      ? "Không thể lưu bảng đo. Vui lòng kiểm tra dữ liệu và thử lại."
      : "Không thể lưu mẫu thông số.";
    return jsonError(500, message, "MEASUREMENT_TEMPLATE_SAVE_FAILED", traceId);
  }
}
