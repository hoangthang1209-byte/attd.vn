import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  getStrategyPerformanceRows,
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
    const { period, comparisonPeriod } = parsePerformancePeriod(new URL(req.url).searchParams);
    const strategies = await getStrategyPerformanceRows({ period, comparisonPeriod });
    console.info(
      JSON.stringify({
        op: "content.performance.strategies",
        ok: true,
        durationMs: Date.now() - started,
        rowCount: strategies.length,
      }),
    );
    return NextResponse.json({ strategies });
  } catch (err) {
    console.error(
      JSON.stringify({
        op: "content.performance.strategies",
        ok: false,
        durationMs: Date.now() - started,
        error: err instanceof Error ? err.message : "unknown",
      }),
    );
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tải hiệu quả chiến lược" },
      { status: 500 },
    );
  }
}
