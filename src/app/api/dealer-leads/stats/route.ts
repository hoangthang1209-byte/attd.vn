import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/dealer-leads/stats
 *
 * Returns pipeline status counts and aggregate metrics.
 * Intended for future dashboard charts — no client state required yet.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const [statusGroups, totalEstimated, wonEstimated] = await Promise.all([
      // Count per pipeline status
      prisma.dealerLead.groupBy({
        by: ["pipelineStatus"],
        _count: { id: true },
      }),
      // Total estimated pipeline value
      prisma.dealerLead.aggregate({
        _sum: { estimatedValue: true },
      }),
      // Won estimated value only
      prisma.dealerLead.aggregate({
        where: { pipelineStatus: "WON" },
        _sum: { estimatedValue: true },
      }),
    ]);

    const counts: Record<string, number> = {
      NEW: 0,
      CONTACTED: 0,
      QUOTED: 0,
      NEGOTIATING: 0,
      WON: 0,
      LOST: 0,
    };

    for (const row of statusGroups) {
      counts[row.pipelineStatus] = row._count.id;
    }

    return NextResponse.json({
      success: true,
      pipeline: counts,
      totalLeads: Object.values(counts).reduce((a, b) => a + b, 0),
      estimatedValue: {
        total: totalEstimated._sum.estimatedValue?.toString() ?? null,
        won: wonEstimated._sum.estimatedValue?.toString() ?? null,
      },
    });
  } catch (err) {
    console.error("[GET /api/dealer-leads/stats] DB error:", err);
    return NextResponse.json(
      { success: false, message: "Đã có lỗi xảy ra." },
      { status: 500 }
    );
  }
}
