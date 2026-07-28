import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  getContentPerformanceArticle,
  parsePerformancePeriod,
} from "@/features/content/services/content-performance.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await ctx.params;
  const started = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const { period, comparisonPeriod } = parsePerformancePeriod(searchParams);
    const article = await getContentPerformanceArticle(id, period, comparisonPeriod);
    if (!article) {
      return NextResponse.json({ message: "Không tìm thấy bài đã xuất bản" }, { status: 404 });
    }
    console.info(
      JSON.stringify({
        op: "content.performance.article",
        ok: true,
        durationMs: Date.now() - started,
        contentId: id,
      }),
    );
    return NextResponse.json({ article });
  } catch (err) {
    console.error(
      JSON.stringify({
        op: "content.performance.article",
        ok: false,
        durationMs: Date.now() - started,
        error: err instanceof Error ? err.message : "unknown",
      }),
    );
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tải chi tiết hiệu quả" },
      { status: 500 },
    );
  }
}
