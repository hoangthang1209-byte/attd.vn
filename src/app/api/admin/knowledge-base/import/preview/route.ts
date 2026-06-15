import { NextRequest, NextResponse } from "next/server";
import { previewKnowledgeBaseImport } from "@/features/knowledge-base/knowledge-base-import-service";
import type { ColumnMapping } from "@/features/knowledge-base/knowledge-base-import-types";

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

  if (rawRows.length === 0) {
    return NextResponse.json({ message: "Không có dữ liệu để xem trước." }, { status: 400 });
  }

  try {
    const preview = await previewKnowledgeBaseImport({ rawRows, mapping });
    return NextResponse.json(preview);
  } catch (err) {
    console.error("[POST /api/admin/knowledge-base/import/preview]", err);
    return NextResponse.json({ message: "Không thể xem trước import" }, { status: 500 });
  }
}
