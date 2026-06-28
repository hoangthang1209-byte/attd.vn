import { NextRequest, NextResponse } from "next/server";
import {
  getMeasurementTemplateDetail,
  updateMeasurementTemplate,
  MeasurementTemplateValidationError,
} from "@/features/measurement-template/measurement-template.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  const template = await getMeasurementTemplateDetail(id);
  if (!template) return NextResponse.json({ message: "Không tìm thấy mẫu." }, { status: 404 });
  return NextResponse.json(template);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  try {
    const body = (await req.json()) as Record<string, unknown>;
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
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/measurement-templates/[id]]", err);
    return NextResponse.json({ message: "Không thể lưu mẫu thông số." }, { status: 500 });
  }
}
