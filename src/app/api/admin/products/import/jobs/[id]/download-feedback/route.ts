import { NextRequest, NextResponse } from "next/server";
import { getFeedbackCsvForJob, getProductImportJob } from "@/features/products/product-import-job-service";

function formatFeedbackDownloadName(createdAt: Date): string {
  const dateStr = createdAt.toISOString().slice(0, 10);
  return `attd-product-import-feedback-${dateStr}.csv`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const job = await getProductImportJob(id);
    if (!job) {
      return NextResponse.json({ message: "Không tìm thấy import job." }, { status: 404 });
    }

    let csv = await getFeedbackCsvForJob(id);

    if (!csv && job.feedbackFileUrl) {
      const remoteRes = await fetch(job.feedbackFileUrl);
      if (remoteRes.ok) {
        csv = await remoteRes.text();
      }
    }

    if (!csv) {
      return NextResponse.json({ message: "Không có file feedback cho import job này." }, { status: 404 });
    }

    const downloadName = formatFeedbackDownloadName(job.createdAt);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${downloadName}"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/products/import/jobs/[id]/download-feedback]", err);
    return NextResponse.json({ message: "Không thể tải file feedback." }, { status: 500 });
  }
}
