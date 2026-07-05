import { NextRequest, NextResponse } from "next/server";
import {
  createPrintMethod,
  listPrintMethods,
  ProductionMasterValidationError,
} from "@/features/production-master/print-method.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  try {
    const result = await listPrintMethods({
      search: searchParams.get("search") ?? undefined,
      activeOnly: searchParams.get("activeOnly") === "true",
      inactiveOnly: searchParams.get("inactiveOnly") === "true",
      category: searchParams.get("category") ?? undefined,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ message: "Không thể tải danh sách công nghệ in." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const created = await createPrintMethod({
      name: String(body.name ?? ""),
      category: typeof body.category === "string" ? body.category : undefined,
      description: body.description === null ? null : typeof body.description === "string" ? body.description : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof ProductionMasterValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Không thể tạo công nghệ in." }, { status: 500 });
  }
}
