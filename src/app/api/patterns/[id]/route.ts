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
        {
          error: "Bạn không có quyền cập nhật rập này.",
          message: "Bạn không có quyền cập nhật rập này.",
        },
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
    return NextResponse.json(
      { error: "Dữ liệu không hợp lệ.", message: "Dữ liệu không hợp lệ." },
      { status: 400 },
    );
  }
  const isMeasurementUpdate =
    body !== null &&
    typeof body === "object" &&
    Object.prototype.hasOwnProperty.call(body, "measurements");

  try {
    const input = parsePatternUpdateBody(body);
    if (process.env.NODE_ENV === "development" && input.measurements !== undefined) {
      const duplicateSizeLabels = input.measurements.flatMap((row) => {
        const seen = new Set<string>();
        const duplicates = new Set<string>();
        for (const value of row.values) {
          if (seen.has(value.size)) duplicates.add(value.size);
          seen.add(value.size);
        }
        return [...duplicates];
      });
      console.info("[PATCH /api/patterns/[id] measurements]", {
        id,
        rowCount: input.measurements.length,
        sizeCount: new Set(input.measurements.flatMap((row) => row.values.map((value) => value.size))).size,
        duplicateSizeLabels,
      });
    }
    const pattern = await updatePattern(id, input);
    return NextResponse.json(pattern);
  } catch (err) {
    if (err instanceof PatternValidationError) {
      if (process.env.NODE_ENV === "development") {
        console.info("[PATCH /api/patterns/[id] validation]", {
          id,
          message: err.message,
          fieldErrors: err.fieldErrors,
        });
      }
      const status =
        err.code === "NOT_FOUND" ? 404 : err.code === "PERMISSION" ? 403 : err.code === "CONFLICT" ? 409 : 400;
      const response =
        isMeasurementUpdate || err.fieldErrors
          ? {
              error: err.message,
              message: err.message,
              ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}),
            }
          : { message: err.message };
      return NextResponse.json(response, { status });
    }
    console.error("[PATCH /api/patterns/[id]]", err);
    if (isMeasurementUpdate) {
      return NextResponse.json(
        {
          error: "Không thể lưu bảng đo. Vui lòng thử lại.",
          message: "Không thể lưu bảng đo. Vui lòng thử lại.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { message: "Không thể cập nhật rập. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
