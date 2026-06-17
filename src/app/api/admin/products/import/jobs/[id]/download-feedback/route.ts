import { NextRequest, NextResponse } from "next/server";
import {
  getFeedbackCsvForJob,
  getFeedbackExcelForJob,
  getProductImportJob,
} from "@/features/products/product-import-job-service";

function formatFeedbackDownloadName(createdAt: Date, ext: "xlsx" | "csv"): string {
  const dateStr = createdAt.toISOString().slice(0, 10);
  return `attd-product-import-feedback-${dateStr}.${ext}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const format = req.nextUrl.searchParams.get("format")?.toLowerCase();

  try {
    const job = await getProductImportJob(id);
    if (!job) {
      return NextResponse.json({ message: "Không tìm thấy import job." }, { status: 404 });
    }

    if (format === "csv") {
      let csv = await getFeedbackCsvForJob(id);
      if (!csv && job.feedbackFileUrl?.endsWith(".csv")) {
        const remoteRes = await fetch(job.feedbackFileUrl);
        if (remoteRes.ok) csv = await remoteRes.text();
      }
      if (!csv) {
        return NextResponse.json({ message: "Không có file feedback CSV cho import job này." }, { status: 404 });
      }
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${formatFeedbackDownloadName(job.createdAt, "csv")}"`,
        },
      });
    }

    const excelBuffer = await getFeedbackExcelForJob(id);
    if (excelBuffer) {
      return new NextResponse(new Uint8Array(excelBuffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${formatFeedbackDownloadName(job.createdAt, "xlsx")}"`,
        },
      });
    }

    if (job.feedbackFileUrl && job.feedbackFileUrl.includes(".xlsx")) {
      const remoteRes = await fetch(job.feedbackFileUrl);
      if (remoteRes.ok) {
        const buffer = Buffer.from(await remoteRes.arrayBuffer());
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${formatFeedbackDownloadName(job.createdAt, "xlsx")}"`,
          },
        });
      }
    }

    const csv = await getFeedbackCsvForJob(id);
    if (csv) {
      console.error("[GET download-feedback] Excel generation failed, falling back to CSV for job", id);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${formatFeedbackDownloadName(job.createdAt, "csv")}"`,
        },
      });
    }

    return NextResponse.json({ message: "Không có file feedback cho import job này." }, { status: 404 });
  } catch (err) {
    console.error("[GET /api/admin/products/import/jobs/[id]/download-feedback]", err);
    return NextResponse.json({ message: "Không thể tải file feedback." }, { status: 500 });
  }
}
