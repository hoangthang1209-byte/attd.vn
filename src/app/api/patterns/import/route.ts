import { NextRequest, NextResponse } from "next/server";
import { bulkImportPatterns } from "@/features/patterns/pattern-bulk-import.service";
import {
  PATTERN_IMPORT_MAX_ROWS,
  type PatternBulkImportRow,
} from "@/features/patterns/pattern-bulk-import";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseRow(value: unknown, fallbackRowNumber: number): PatternBulkImportRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const rawFiles = Array.isArray(row.files) ? row.files : [];

  return {
    rowNumber:
      typeof row.rowNumber === "number" && Number.isFinite(row.rowNumber)
        ? Math.max(1, Math.trunc(row.rowNumber))
        : fallbackRowNumber,
    name: text(row.name),
    category: text(row.category),
    product: text(row.product),
    baseSize: text(row.baseSize),
    sizeRange: text(row.sizeRange),
    gradingRule: text(row.gradingRule),
    sourceType: text(row.sourceType),
    supplier: text(row.supplier),
    customer: text(row.customer),
    sourceNotes: text(row.sourceNotes),
    notes: text(row.notes),
    files: rawFiles.map(text).filter(Boolean).slice(0, 20),
  };
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
    return NextResponse.json({ message: "Dữ liệu nhập không hợp lệ." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Thiếu dữ liệu nhập." }, { status: 400 });
  }

  const rawRows = Array.isArray((body as Record<string, unknown>).rows)
    ? ((body as Record<string, unknown>).rows as unknown[])
    : [];

  if (rawRows.length === 0) {
    return NextResponse.json({ message: "Không có dòng dữ liệu để nhập." }, { status: 400 });
  }
  if (rawRows.length > PATTERN_IMPORT_MAX_ROWS) {
    return NextResponse.json(
      { message: `Mỗi lần chỉ nhập tối đa ${PATTERN_IMPORT_MAX_ROWS} rập.` },
      { status: 400 },
    );
  }

  const rows = rawRows
    .map((row, index) => parseRow(row, index + 2))
    .filter((row): row is PatternBulkImportRow => Boolean(row));

  if (rows.length === 0) {
    return NextResponse.json({ message: "Không đọc được dữ liệu rập." }, { status: 400 });
  }

  try {
    const result = await bulkImportPatterns({
      rows,
      createdBy: auth.session.username ?? auth.session.employeeId ?? null,
    });
    return NextResponse.json(result, { status: result.failed === rows.length ? 422 : 200 });
  } catch (error) {
    console.error("[POST /api/patterns/import]", error);
    return NextResponse.json({ message: "Không thể nhập dữ liệu rập." }, { status: 500 });
  }
}
