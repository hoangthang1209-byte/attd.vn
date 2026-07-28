import { NextRequest, NextResponse } from "next/server";
import { getEditorialCalendarPlan } from "@/features/content/services/seo-calendar.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const started = Date.now();
  try {
    const plan = await getEditorialCalendarPlan();
    console.info(
      JSON.stringify({
        op: "content.seo.calendar",
        ok: true,
        durationMs: Date.now() - started,
        topicCount: plan.topics.length,
        campaignCount: plan.campaigns.length,
      }),
    );
    return NextResponse.json({ plan });
  } catch (err) {
    console.error(
      JSON.stringify({
        op: "content.seo.calendar",
        ok: false,
        durationMs: Date.now() - started,
        error: err instanceof Error ? err.message : "unknown",
      }),
    );
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tải lịch biên tập" },
      { status: 500 },
    );
  }
}
