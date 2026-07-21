import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getContentLaunchStatus } from "@/features/content/services/content-launch-status.service";
import { resolveContentLaunchWorkflowSteps } from "@/features/content/services/content-launch-workflow.service";
import { evaluatePoloLaunchKnowledgeReadiness } from "@/features/content/services/content-launch-knowledge.service";
import { inspectPoloLaunchMediaBundle } from "@/features/content/services/content-launch-media.service";
import { getContentLaunchQaPreset } from "@/features/content/launch/content-launch-qa-preset";
import { assertNoSecretsInLaunchStatus } from "@/features/content/launch/content-launch-status.rules";
import { listContentReviews } from "@/features/content/services/content-review.service";
import { CONTENT_LAUNCH_ARTICLE } from "@/features/content/launch/content-launch.constants";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  try {
    const [status, workflow, knowledge, media, reviews] = await Promise.all([
      getContentLaunchStatus(),
      resolveContentLaunchWorkflowSteps(),
      evaluatePoloLaunchKnowledgeReadiness(),
      inspectPoloLaunchMediaBundle(),
      listContentReviews({}).catch(() => []),
    ]);

    const launchReviews = (Array.isArray(reviews) ? reviews : []).filter((r) => {
      const title = (r as { topicTitle?: string | null }).topicTitle ?? "";
      return title.toLowerCase().includes("polo") || title.includes(CONTENT_LAUNCH_ARTICLE.title);
    });

    const payload = {
      status,
      workflow,
      knowledge,
      media,
      qaPreset: getContentLaunchQaPreset(),
      recentLaunchReviews: launchReviews.slice(0, 8),
      manualFallbackMessage:
        "AI chưa được cấu hình. Bạn vẫn có thể nhập nội dung thủ công.",
    };

    const leaks = assertNoSecretsInLaunchStatus(payload);
    if (leaks.length) {
      console.error("[content-launch/status] refused secret leak", leaks);
      return NextResponse.json({ message: "Status serialization blocked" }, { status: 500 });
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[GET /api/content/launch/status]", err);
    return NextResponse.json({ message: "Không tải được launch status" }, { status: 500 });
  }
}
