import { NextRequest, NextResponse } from "next/server";
import {
  applyMeasurementTemplateToTechPack,
  MeasurementTemplateValidationError,
} from "@/features/measurement-template/measurement-template.service";
import { TechPackValidationError } from "@/features/tech-pack/tech-pack.errors";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  try {
    const body = (await req.json()) as { templateId?: string };
    if (!body.templateId) {
      return NextResponse.json({ message: "Thiếu mẫu thông số." }, { status: 400 });
    }
    await applyMeasurementTemplateToTechPack(id, body.templateId, {
      id: auth.session.employeeId ?? auth.session.username,
      name: auth.session.username,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TechPackValidationError || err instanceof MeasurementTemplateValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/tech-packs/[id]/apply-measurement-template]", err);
    return NextResponse.json({ message: "Không thể áp dụng mẫu thông số." }, { status: 500 });
  }
}
