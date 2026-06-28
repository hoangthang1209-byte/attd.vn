import { NextRequest, NextResponse } from "next/server";
import {
  createMeasurementTemplate,
  listMeasurementTemplates,
  MeasurementTemplateValidationError,
} from "@/features/measurement-template/measurement-template.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";

export async function GET(req: NextRequest) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  try {
    const result = await listMeasurementTemplates({
      search: searchParams.get("search") ?? undefined,
      productCategoryId: searchParams.get("productCategoryId") ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/measurement-templates]", err);
    return NextResponse.json({ message: "Không thể tải mẫu thông số." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const created = await createMeasurementTemplate({
      name: String(body.name ?? ""),
      productCategoryId: typeof body.productCategoryId === "string" ? body.productCategoryId : null,
      baseSize: typeof body.baseSize === "string" ? body.baseSize : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof MeasurementTemplateValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/measurement-templates]", err);
    return NextResponse.json({ message: "Không thể tạo mẫu thông số." }, { status: 500 });
  }
}
