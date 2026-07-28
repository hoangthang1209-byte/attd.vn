import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  listContentPerformanceArticles,
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
    const take = Number(searchParams.get("take") ?? 50);
    const skip = Number(searchParams.get("skip") ?? 0);
    const result = await listContentPerformanceArticles({
      period,
      comparisonPeriod,
      strategyId: searchParams.get("strategyId") ?? undefined,
      clusterId: searchParams.get("clusterId") ?? undefined,
      topicId: searchParams.get("topicId") ?? undefined,
      refreshStatus: searchParams.get("refreshStatus") ?? undefined,
      take: Number.isFinite(take) ? take : 50,
      skip: Number.isFinite(skip) ? skip : 0,
    });
    console.info(
      JSON.stringify({
        op: "content.performance.articles",
        ok: true,
        durationMs: Date.now() - started,
        rowCount: result.articles.length,
        total: result.total,
      }),
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error(
      JSON.stringify({
        op: "content.performance.articles",
        ok: false,
        durationMs: Date.now() - started,
        error: err instanceof Error ? err.message : "unknown",
      }),
    );
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tải danh sách bài" },
      { status: 500 },
    );
  }
}
