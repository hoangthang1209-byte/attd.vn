import { NextRequest, NextResponse } from "next/server";
import { approvePattern, PatternValidationError } from "@/features/patterns/pattern.service";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  try {
    const pattern = await approvePattern(id, auth.session.username ?? auth.session.employeeId);
    return NextResponse.json(pattern);
  } catch (err) {
    if (err instanceof PatternValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/patterns/[id]/approve]", err);
    return NextResponse.json({ message: "Không thể duyệt rập." }, { status: 500 });
  }
}
