import { NextResponse } from "next/server";
import { listProductImportJobs } from "@/features/products/product-import-job-service";

export async function GET() {
  try {
    const jobs = await listProductImportJobs(50);
    return NextResponse.json({ jobs });
  } catch (err) {
    console.error("[GET /api/admin/products/import/jobs]", err);
    return NextResponse.json({ message: "Không thể tải lịch sử import", jobs: [] }, { status: 500 });
  }
}
