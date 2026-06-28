import { NextRequest, NextResponse } from "next/server";
import {
  createProductionTrim,
  listProductionTrims,
  ProductionMasterValidationError,
} from "@/features/production-master/production-trim.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";

export async function GET(req: NextRequest) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  try {
    const result = await listProductionTrims({
      search: searchParams.get("search") ?? undefined,
      activeOnly: searchParams.get("activeOnly") === "true",
      inactiveOnly: searchParams.get("inactiveOnly") === "true",
      category: searchParams.get("category") ?? undefined,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ message: "Không thể tải danh sách phụ liệu." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const created = await createProductionTrim({
      name: String(body.name ?? ""),
      category: typeof body.category === "string" ? body.category : undefined,
      supplierId: body.supplierId === null ? null : typeof body.supplierId === "string" ? body.supplierId : undefined,
      notes: body.notes === null ? null : typeof body.notes === "string" ? body.notes : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof ProductionMasterValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Không thể tạo phụ liệu." }, { status: 500 });
  }
}
