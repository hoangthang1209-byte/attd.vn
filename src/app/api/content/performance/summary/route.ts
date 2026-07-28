import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  getContentPerformanceSummary,
  parsePerformancePeriod,
} from "@/features/content/services/content-performance.service";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const started = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const { period, comparisonPeriod } = parsePerformancePeriod(searchParams);
    const summary = await getContentPerformanceSummary({ period, comparisonPeriod });
    console.info(
      JSON.stringify({
        op: "content.performance.summary",
        ok: true,
        durationMs: Date.now() - started,
        rowCount: summary.publishedArticles,
        range: summary.period.label,
      }),
    );
    return NextResponse.json({ summary });
  } catch (err) {
    console.error(
      JSON.stringify({
        op: "content.performance.summary",
        ok: false,
        durationMs: Date.now() - started,
        error: err instanceof Error ? err.message : "unknown",
      }),
    );
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tải hiệu quả nội dung" },
      { status: 500 },
    );
  }
}
