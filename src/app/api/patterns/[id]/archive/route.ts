import { NextRequest, NextResponse } from "next/server";
import { archivePattern, PatternValidationError } from "@/features/patterns/pattern.service";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  try {
    const pattern = await archivePattern(id);
    return NextResponse.json(pattern);
  } catch (err) {
    if (err instanceof PatternValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/patterns/[id]/archive]", err);
    return NextResponse.json({ message: "Không thể lưu trữ rập." }, { status: 500 });
  }
}
