import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { ensureAiTestTopic, isAiTestTopicSafe } from "@/features/content-generation/services/ai-test-topic.service";
import { mapContentGenerationError } from "@/app/api/content/generation/_shared";

/**
 * Sprint 18.1 — ensures the single well-known AI test topic exists (idempotent
 * create-or-find). Never publishes anything: the topic is created DRAFTING
 * with no targetUrl/existingUrl/publishedAt, and this route only ever
 * returns/creates that one row.
 */
export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  try {
    const result = await ensureAiTestTopic();
    if (!result.ok) {
      return NextResponse.json({ message: result.warning, code: "AI_TEST_TOPIC_UNAVAILABLE" }, { status: 200 });
    }

    return NextResponse.json({
      topic: {
        id: result.topic.id,
        title: result.topic.title,
        status: result.topic.status,
      },
      created: result.created,
      neverPublished: isAiTestTopicSafe(result.topic),
      message: result.created
        ? "Đã tạo chủ đề kiểm thử AI (không xuất bản)."
        : "Chủ đề kiểm thử AI đã tồn tại.",
    });
  } catch (err) {
    return mapContentGenerationError(err);
  }
}
