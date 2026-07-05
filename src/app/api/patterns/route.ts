import { NextRequest, NextResponse } from "next/server";
import { PatternStatus } from "@prisma/client";
import {
  approvePattern,
  archivePattern,
  createPattern,
  listPatterns,
  PatternValidationError,
} from "@/features/patterns/pattern.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const status =
    statusParam && Object.values(PatternStatus).includes(statusParam as PatternStatus)
      ? (statusParam as PatternStatus)
      : undefined;

  try {
    const result = await listPatterns({
      status,
      productCategoryId: searchParams.get("productCategoryId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/patterns]", err);
    return NextResponse.json({ message: "Không thể tải danh sách rập." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "tech-pack",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;

  try {
    const pattern = await createPattern({
      name: typeof raw.name === "string" ? raw.name : "",
      productCategoryId: typeof raw.productCategoryId === "string" ? raw.productCategoryId : null,
      productId: typeof raw.productId === "string" ? raw.productId : null,
      baseSize: typeof raw.baseSize === "string" ? raw.baseSize : null,
      sizeRange: typeof raw.sizeRange === "string" ? raw.sizeRange : null,
      gradingRule: typeof raw.gradingRule === "string" ? raw.gradingRule : null,
      notes: typeof raw.notes === "string" ? raw.notes : null,
      createdBy: auth.session.username ?? auth.session.employeeId,
    });
    return NextResponse.json(pattern, { status: 201 });
  } catch (err) {
    if (err instanceof PatternValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/patterns]", err);
    return NextResponse.json({ message: "Không thể tạo rập." }, { status: 500 });
  }
}
