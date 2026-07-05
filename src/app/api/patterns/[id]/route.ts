import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  getPatternDetail,
  PatternValidationError,
  updatePattern,
} from "@/features/patterns/pattern.service";
import { parsePatternUpdateBody } from "@/features/patterns/pattern-update-input";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";
import type { AdminSessionUser } from "@/features/auth/admin-session.types";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };
type PatternMeasurementErrorCode =
  | "AUTH_SESSION_MISSING"
  | "PATTERN_UPDATE_FORBIDDEN"
  | "PATTERN_NOT_FOUND"
  | "PATTERN_MEASUREMENT_INVALID"
  | "PATTERN_MEASUREMENT_DUPLICATE_SIZE"
  | "PATTERN_MEASUREMENT_DUPLICATE_POM"
  | "PATTERN_MEASUREMENT_DB_CONFLICT"
  | "PATTERN_MEASUREMENT_SAVE_FAILED";

type PatternApiErrorBody = {
  error: string;
  code: PatternMeasurementErrorCode;
  traceId: string;
  fieldErrors: Record<string, string>;
  message: string;
};

function createTraceId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function jsonError(
  status: number,
  error: string,
  code: PatternMeasurementErrorCode,
  traceId: string,
  fieldErrors: Record<string, string> = {},
) {
  return NextResponse.json(
    { error, message: error, code, traceId, fieldErrors } satisfies PatternApiErrorBody,
    { status, headers: { "x-attd-trace-id": traceId } },
  );
}

function getSessionLabel(session: AdminSessionUser | undefined): "owner" | "admin-user" | "legacy-staff" | "none" {
  if (!session?.authenticated) return "none";
  if (session.mode === "owner") return "owner";
  if (session.mode === "legacy") return "legacy-staff";
  return "admin-user";
}

function inspectMeasurementPayload(body: unknown) {
  const rows = Array.isArray((body as { measurements?: unknown } | null)?.measurements)
    ? ((body as { measurements: unknown[] }).measurements)
    : [];
  const sizes = new Set<string>();
  const duplicateSizes = new Set<string>();
  const duplicatePoms = new Set<string>();
  const seenPoms = new Set<string>();

  for (const row of rows) {
    const record = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    const pom = String(record.pointOfMeasure ?? "").trim().toLocaleLowerCase("vi");
    if (pom) {
      if (seenPoms.has(pom)) duplicatePoms.add(pom);
      seenPoms.add(pom);
    }

    const seenRowSizes = new Set<string>();
    const values = Array.isArray(record.values) ? record.values : [];
    for (const entry of values) {
      const valueRecord = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      const size = String(valueRecord.size ?? "").trim().toUpperCase();
      if (!size) continue;
      sizes.add(size);
      if (seenRowSizes.has(size)) duplicateSizes.add(size);
      seenRowSizes.add(size);
    }
  }

  return {
    rowCount: rows.length,
    sizeCount: sizes.size,
    duplicateSizeCount: duplicateSizes.size,
    duplicatePomCount: duplicatePoms.size,
  };
}

function classifyValidationError(err: PatternValidationError, isMeasurementUpdate: boolean): PatternMeasurementErrorCode {
  if (err.code === "NOT_FOUND") return "PATTERN_NOT_FOUND";
  if (err.code === "PERMISSION") return "PATTERN_UPDATE_FORBIDDEN";
  if (err.code === "CONFLICT") return "PATTERN_MEASUREMENT_DB_CONFLICT";
  if (!isMeasurementUpdate) return "PATTERN_MEASUREMENT_INVALID";

  const fieldKeys = Object.keys(err.fieldErrors ?? {});
  if (fieldKeys.some((key) => key.includes(".pointOfMeasure"))) return "PATTERN_MEASUREMENT_DUPLICATE_POM";
  if (fieldKeys.some((key) => key.includes(".values."))) {
    const hasOnlyDuplicateMessages = Object.values(err.fieldErrors ?? {}).every((message) =>
      message.includes("trùng"),
    );
    if (hasOnlyDuplicateMessages) return "PATTERN_MEASUREMENT_DUPLICATE_SIZE";
  }
  return "PATTERN_MEASUREMENT_INVALID";
}

function statusForPatternError(err: PatternValidationError): number {
  if (err.code === "NOT_FOUND") return 404;
  if (err.code === "PERMISSION") return 403;
  if (err.code === "CONFLICT") return 409;
  return 400;
}

function safeMessageForCode(code: PatternMeasurementErrorCode, fallback?: string): string {
  if (code === "AUTH_SESSION_MISSING") return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (code === "PATTERN_UPDATE_FORBIDDEN") return "Bạn không có quyền cập nhật rập này.";
  if (code === "PATTERN_NOT_FOUND") return "Không tìm thấy rập.";
  if (code === "PATTERN_MEASUREMENT_DB_CONFLICT") {
    return "Không thể lưu bảng đo do dữ liệu đang xung đột. Vui lòng tải lại và thử lại.";
  }
  if (code === "PATTERN_MEASUREMENT_SAVE_FAILED") return fallback ?? "Không thể lưu bảng đo.";
  return fallback ?? "Dữ liệu bảng đo không hợp lệ.";
}

function getPrismaCode(err: unknown): string | undefined {
  if (err instanceof Prisma.PrismaClientKnownRequestError) return err.code;
  return undefined;
}

function logMeasurementSaveFailure(input: {
  traceId: string;
  patternId: string;
  session: AdminSessionUser | undefined;
  status: number;
  payload: ReturnType<typeof inspectMeasurementPayload>;
  prismaCode?: string;
  classification: PatternMeasurementErrorCode;
}) {
  console.error("[pattern.measurements.save.failed]", {
    traceId: input.traceId,
    route: "PATCH /api/patterns/[id]",
    patternId: input.patternId,
    sessionType: getSessionLabel(input.session),
    status: input.status,
    normalizedRowCount: input.payload.rowCount,
    normalizedSizeCount: input.payload.sizeCount,
    duplicateSizeCheck: input.payload.duplicateSizeCount > 0 ? "duplicate" : "ok",
    duplicatePomCheck: input.payload.duplicatePomCount > 0 ? "duplicate" : "ok",
    prismaCode: input.prismaCode,
    classification: input.classification,
  });
}

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
  const permission = await requireAdminPermission({
    platform: "tech-pack",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const traceId = createTraceId();
  let measurementDiagnostics = inspectMeasurementPayload(null);
  const auth = requireProductionUpdate(req);
  if (auth.error) {
    const status = auth.error.status;
    const code = status === 403 ? "PATTERN_UPDATE_FORBIDDEN" : "AUTH_SESSION_MISSING";
    const { id } = await context.params;
    logMeasurementSaveFailure({
      traceId,
      patternId: id,
      session: auth.session,
      status,
      payload: measurementDiagnostics,
      classification: code,
    });
    return jsonError(status, safeMessageForCode(code), code, traceId);
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    logMeasurementSaveFailure({
      traceId,
      patternId: id,
      session: auth.session,
      status: 400,
      payload: measurementDiagnostics,
      classification: "PATTERN_MEASUREMENT_INVALID",
    });
    return jsonError(400, "Dữ liệu không hợp lệ.", "PATTERN_MEASUREMENT_INVALID", traceId);
  }
  const isMeasurementUpdate =
    body !== null &&
    typeof body === "object" &&
    Object.prototype.hasOwnProperty.call(body, "measurements");
  measurementDiagnostics = inspectMeasurementPayload(body);

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
      const status = statusForPatternError(err);
      const code = classifyValidationError(err, isMeasurementUpdate);
      logMeasurementSaveFailure({
        traceId,
        patternId: id,
        session: auth.session,
        status,
        payload: measurementDiagnostics,
        classification: code,
      });
      return jsonError(status, safeMessageForCode(code, err.message), code, traceId, err.fieldErrors ?? {});
    }
    const prismaCode = getPrismaCode(err);
    if (isMeasurementUpdate) {
      logMeasurementSaveFailure({
        traceId,
        patternId: id,
        session: auth.session,
        status: 500,
        payload: measurementDiagnostics,
        prismaCode,
        classification: "PATTERN_MEASUREMENT_SAVE_FAILED",
      });
      return jsonError(
        500,
        `Không thể lưu bảng đo. Mã tra cứu: ${traceId}`,
        "PATTERN_MEASUREMENT_SAVE_FAILED",
        traceId,
      );
    }
    console.error("[PATCH /api/patterns/[id]]", { traceId, err });
    return jsonError(
      500,
      `Không thể cập nhật rập. Mã tra cứu: ${traceId}`,
      "PATTERN_MEASUREMENT_SAVE_FAILED",
      traceId,
    );
  }
}
