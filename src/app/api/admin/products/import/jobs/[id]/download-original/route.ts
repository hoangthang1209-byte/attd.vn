import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getProductImportJob } from "@/features/products/product-import-job-service";

function contentTypeForFileType(fileType: string | null, fileName: string): string {
  const ext = fileType ?? fileName.split(".").pop()?.toLowerCase() ?? "csv";
  if (ext === "xlsx" || ext === "xls") {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (ext === "json") return "application/json";
  return "text/csv";
}

function formatDownloadName(fileName: string, createdAt: Date): string {
  const dateStr = createdAt.toISOString().slice(0, 10);
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "csv";
  return `attd-product-import-original-${dateStr}.${ext}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const job = await getProductImportJob(id);
    if (!job?.originalFileUrl) {
      return NextResponse.json({ message: "Không có file gốc cho import job này." }, { status: 404 });
    }

    const downloadName = formatDownloadName(job.fileName, job.createdAt);
    const contentType = contentTypeForFileType(job.fileType, job.fileName);

    if (job.originalFileUrl.startsWith("/") && job.originalFileKey) {
      const absolutePath = path.join(process.cwd(), "public", job.originalFileKey);
      const buffer = await readFile(absolutePath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${downloadName}"`,
        },
      });
    }

    const remoteRes = await fetch(job.originalFileUrl);
    if (!remoteRes.ok) {
      return NextResponse.json({ message: "Không thể tải file gốc." }, { status: 502 });
    }
    const buffer = Buffer.from(await remoteRes.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${downloadName}"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/products/import/jobs/[id]/download-original]", err);
    return NextResponse.json({ message: "Không thể tải file gốc." }, { status: 500 });
  }
}
