import { NextRequest, NextResponse } from "next/server";
import {
  importPrintMethodsCsv,
  previewPrintMethodsCsv,
  PRODUCTION_MASTER_CSV_TEMPLATES,
} from "@/features/production-master/production-master-import.service";
import { ProductionMasterValidationError } from "@/features/production-master/production-master.errors";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "admin",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  const mode = new URL(req.url).searchParams.get("mode");
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "File CSV không hợp lệ." }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (mode === "preview") {
      const preview = await previewPrintMethodsCsv(buffer);
      return NextResponse.json(preview);
    }
    const summary = await importPrintMethodsCsv(buffer);
    return NextResponse.json({ ...summary, message: "Nhập dữ liệu hoàn tất." });
  } catch (err) {
    if (err instanceof ProductionMasterValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    return NextResponse.json({ message: "File CSV không hợp lệ." }, { status: 400 });
  }
}

export async function GET() {
  const csv = `${PRODUCTION_MASTER_CSV_TEMPLATES["print-method"]}\n`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="print-methods-template.csv"',
    },
  });
}
