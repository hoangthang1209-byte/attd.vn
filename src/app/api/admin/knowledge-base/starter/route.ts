import { NextResponse } from "next/server";
import { importKnowledgeBaseStarterData } from "@/features/knowledge-base/knowledge-base-starter-data";

export async function POST() {
  try {
    const result = await importKnowledgeBaseStarterData();
    return NextResponse.json({
      ok: true,
      message: `Đã tạo ${result.created} entry mẫu — bỏ qua ${result.skipped} entry đã tồn tại (tổng ${result.total} entry mẫu có sẵn).`,
      ...result,
    });
  } catch (err) {
    console.error("[POST /api/admin/knowledge-base/starter]", err);
    return NextResponse.json({ message: "Không thể import dữ liệu mẫu" }, { status: 500 });
  }
}
