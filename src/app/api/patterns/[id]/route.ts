import { NextRequest, NextResponse } from "next/server";
import {
  getPatternDetail,
  PatternValidationError,
  updatePattern,
} from "@/features/patterns/pattern.service";
import { parsePatternUpdateBody } from "@/features/patterns/pattern-update-input";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";

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
  if (auth.error) {
    if (auth.error.status === 403) {
      return NextResponse.json(
        { message: "Bạn không có quyền cập nhật rập này." },
        { status: 403 },
      );
    }
    return auth.error;
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  try {
    const input = parsePatternUpdateBody(body);
    const pattern = await updatePattern(id, input);
    return NextResponse.json(pattern);
  } catch (err) {
    if (err instanceof PatternValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/patterns/[id]]", err);
    return NextResponse.json(
      { message: "Không thể cập nhật rập. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
