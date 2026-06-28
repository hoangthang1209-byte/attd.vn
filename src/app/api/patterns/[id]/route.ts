import { NextRequest, NextResponse } from "next/server";
import {
  getPatternDetail,
  PatternValidationError,
  updatePattern,
} from "@/features/patterns/pattern.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";
import type { ProductionMaterialCategory } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  try {
    const pattern = await getPatternDetail(id);
    if (!pattern) {
      return NextResponse.json({ message: "Không tìm thấy rập." }, { status: 404 });
    }
    return NextResponse.json(pattern);
  } catch (err) {
    console.error("[GET /api/patterns/[id]]", err);
    return NextResponse.json({ message: "Không thể tải rập." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;
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
    const pattern = await updatePattern(id, {
      name: typeof raw.name === "string" ? raw.name : undefined,
      version: typeof raw.version === "number" ? raw.version : undefined,
      productCategoryId:
        raw.productCategoryId === null
          ? null
          : typeof raw.productCategoryId === "string"
            ? raw.productCategoryId
            : undefined,
      productId:
        raw.productId === null
          ? null
          : typeof raw.productId === "string"
            ? raw.productId
            : undefined,
      baseSize: raw.baseSize === null ? null : typeof raw.baseSize === "string" ? raw.baseSize : undefined,
      sizeRange: raw.sizeRange === null ? null : typeof raw.sizeRange === "string" ? raw.sizeRange : undefined,
      gradingRule:
        raw.gradingRule === null ? null : typeof raw.gradingRule === "string" ? raw.gradingRule : undefined,
      productionMaterialCategory:
        raw.productionMaterialCategory === null
          ? null
          : typeof raw.productionMaterialCategory === "string"
            ? (raw.productionMaterialCategory as ProductionMaterialCategory)
            : undefined,
      notes: raw.notes === null ? null : typeof raw.notes === "string" ? raw.notes : undefined,
      measurements: Array.isArray(raw.measurements) ? (raw.measurements as never) : undefined,
    });
    return NextResponse.json(pattern);
  } catch (err) {
    if (err instanceof PatternValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/patterns/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật rập." }, { status: 500 });
  }
}
