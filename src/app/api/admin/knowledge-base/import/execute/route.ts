import { NextRequest, NextResponse } from "next/server";
import { executeKnowledgeBaseImport } from "@/features/knowledge-base/knowledge-base-import-service";
import type { ColumnMapping, DuplicateBehavior } from "@/features/knowledge-base/knowledge-base-import-types";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const rawRows = Array.isArray(raw.rows) ? (raw.rows as Record<string, string>[]) : [];
  const mapping = (raw.mapping ?? {}) as ColumnMapping;
  const duplicateBehavior = (raw.duplicateBehavior ?? "skip") as DuplicateBehavior;
  const filename = typeof raw.filename === "string" ? raw.filename : "import.json";

  if (rawRows.length === 0) {
    return NextResponse.json({ message: "Không có dữ liệu để import." }, { status: 400 });
  }

  if (!["skip", "update", "copy"].includes(duplicateBehavior)) {
    return NextResponse.json({ message: "duplicateBehavior không hợp lệ." }, { status: 400 });
  }

  try {
    const result = await executeKnowledgeBaseImport({
      rawRows,
      mapping,
      duplicateBehavior,
      filename,
      createdBy: "admin",
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/admin/knowledge-base/import/execute]", err);
    return NextResponse.json({ message: "Import thất bại" }, { status: 500 });
  }
}
