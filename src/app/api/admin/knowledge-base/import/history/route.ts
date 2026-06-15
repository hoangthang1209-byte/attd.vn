import { NextResponse } from "next/server";
import { listKnowledgeBaseImportJobs } from "@/features/knowledge-base/knowledge-base-import-service";

export async function GET() {
  try {
    const jobs = await listKnowledgeBaseImportJobs(20);
    return NextResponse.json({ jobs });
  } catch (err) {
    console.error("[GET /api/admin/knowledge-base/import/history]", err);
    return NextResponse.json({ message: "Không thể tải lịch sử import", jobs: [] }, { status: 500 });
  }
}
