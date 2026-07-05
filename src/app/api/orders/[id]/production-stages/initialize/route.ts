import { NextRequest, NextResponse } from "next/server";
import { initializeProductionStages } from "@/features/orders/production-stage.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  try {
    const stages = await initializeProductionStages(id);
    return NextResponse.json({ stages }, { status: 201 });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/[id]/production-stages/initialize]", err);
    return NextResponse.json({ message: "Không thể khởi tạo công đoạn" }, { status: 500 });
  }
}
