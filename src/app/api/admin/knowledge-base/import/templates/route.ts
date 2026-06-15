import { NextRequest, NextResponse } from "next/server";
import { getImportTemplate } from "@/features/knowledge-base/knowledge-base-import-templates";
import {
  generateCsvContent,
  generateXlsxBuffer,
} from "@/features/knowledge-base/knowledge-base-import-parser";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const templateId = searchParams.get("type") ?? "product";
  const format = searchParams.get("format") ?? "csv";

  const template = getImportTemplate(templateId);
  if (!template) {
    return NextResponse.json({ message: "Template không tồn tại" }, { status: 404 });
  }

  const filenameBase = `attd-kb-${templateId}-template`;

  if (format === "xlsx") {
    const buffer = await generateXlsxBuffer(template.headers, template.sampleRows);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
      },
    });
  }

  const csv = generateCsvContent(template.headers, template.sampleRows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
    },
  });
}
