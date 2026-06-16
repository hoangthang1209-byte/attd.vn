import { NextRequest, NextResponse } from "next/server";
import {
  deleteProductImportJob,
  getProductImportJob,
} from "@/features/products/product-import-job-service";

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
    return NextResponse.json({
      job: {
        ...job,
        hasOriginalFile: Boolean(job.originalFileUrl),
        hasFeedbackFile: Boolean(job.feedbackFileUrl),
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/products/import/jobs/[id]]", err);
    return NextResponse.json({ message: "Không thể tải chi tiết import job." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const job = await getProductImportJob(id);
    if (!job) {
      return NextResponse.json({ message: "Không tìm thấy import job." }, { status: 404 });
    }

    if (job.status === "PROCESSING") {
      return NextResponse.json({ message: "Không thể xóa job đang xử lý." }, { status: 409 });
    }

    await deleteProductImportJob(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/products/import/jobs/[id]]", err);
    return NextResponse.json({ message: "Không thể xóa import job." }, { status: 500 });
  }
}
