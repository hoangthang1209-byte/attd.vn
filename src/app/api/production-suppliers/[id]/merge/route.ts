import { NextRequest, NextResponse } from "next/server";
import { mergeProductionSuppliers } from "@/features/production-master/production-supplier-merge.service";
import { ProductionMasterValidationError } from "@/features/production-master/production-master.errors";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "admin",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  try {
    const body = (await req.json()) as { targetSupplierId?: string };
    if (!body.targetSupplierId) {
      return NextResponse.json({ message: "Thiếu nhà cung cấp đích." }, { status: 400 });
    }
    const result = await mergeProductionSuppliers(id, body.targetSupplierId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ProductionMasterValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Không thể gộp nhà cung cấp." }, { status: 500 });
  }
}
