import { NextRequest, NextResponse } from "next/server";
import {
  archiveOrderProductionFile,
  ProductionPackValidationError,
} from "@/features/orders/production-pack.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "delete",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id, fileId } = await context.params;
  try {
    const file = await archiveOrderProductionFile(id, fileId);
    return NextResponse.json({ file });
  } catch (err) {
    if (err instanceof ProductionPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/[id]/production-files/[fileId]/archive]", err);
    return NextResponse.json({ message: "Không thể lưu trữ file" }, { status: 500 });
  }
}
