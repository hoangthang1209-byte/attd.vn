import { NextRequest, NextResponse } from "next/server";
import {
  duplicateMeasurementTemplate,
  MeasurementTemplateValidationError,
} from "@/features/measurement-template/measurement-template.service";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "tech-pack",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  try {
    const created = await duplicateMeasurementTemplate(id);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof MeasurementTemplateValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/measurement-templates/[id]/duplicate]", err);
    return NextResponse.json({ message: "Không thể sao chép mẫu." }, { status: 500 });
  }
}
