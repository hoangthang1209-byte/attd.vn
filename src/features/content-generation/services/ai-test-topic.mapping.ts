/**
 * Sprint 18.1 — pure constants/shape builders for the AI test topic. Split
 * out of ai-test-topic.service.ts (which is `server-only` + prisma-backed)
 * so this module can be imported from content-generation-18-1.test.ts
 * without a database, mirroring the mapping/service split used throughout
 * this feature (see usage-ledger.mapping.ts, proposal-detail.service.ts).
 */

export const AI_TEST_TOPIC_SLUG = "ai-test-smoke-topic";
export const AI_TEST_TOPIC_TITLE_MARKER = "[AI TEST]";
export const AI_TEST_TOPIC_TITLE = `${AI_TEST_TOPIC_TITLE_MARKER} Chủ đề kiểm thử AI (không xuất bản)`;
export const AI_TEST_TOPIC_PRIMARY_KEYWORD = "ai-test-smoke";
export const AI_TEST_TOPIC_NOTES =
  "Chủ đề kiểm thử tự động cho AI Smoke Workspace (Sprint 18.1) — chỉ dùng để kiểm tra pipeline AI, không phải nội dung biên tập thật, không được xuất bản.";

export type AiTestTopicCreateInput = {
  clusterId: string;
  title: string;
  slug: string;
  primaryKeyword: string;
  searchIntent: "INFORMATIONAL";
  contentType: "BLOG_ARTICLE";
  funnelStage: "AWARENESS";
  status: "DRAFTING";
  targetUrl: null;
  existingUrl: null;
  publishedAt: null;
  notes: string;
};

/**
 * Pure — the exact create payload for the AI test topic, given a chosen
 * cluster id. Kept separate from `ensureAiTestTopic` (which hits the DB) so
 * unit tests can assert the safety-critical fields (never-published shape,
 * `[AI TEST]` marker, `ai-test-` slug prefix) without a database.
 */
export function buildAiTestTopicCreateInput(clusterId: string): AiTestTopicCreateInput {
  if (!clusterId?.trim()) {
    throw new Error("clusterId là bắt buộc để tạo AI test topic.");
  }
  return {
    clusterId,
    title: AI_TEST_TOPIC_TITLE,
    slug: AI_TEST_TOPIC_SLUG,
    primaryKeyword: AI_TEST_TOPIC_PRIMARY_KEYWORD,
    searchIntent: "INFORMATIONAL",
    contentType: "BLOG_ARTICLE",
    funnelStage: "AWARENESS",
    status: "DRAFTING",
    targetUrl: null,
    existingUrl: null,
    publishedAt: null,
    notes: AI_TEST_TOPIC_NOTES,
  };
}

/**
 * Pure safety check — true only when a topic is provably unpublishable in
 * its current shape: DRAFTING status, no target/existing URL, no
 * publishedAt, and carries both the `[AI TEST]` title marker and the
 * `ai-test-` slug prefix. Used by the smoke checks and the unit tests below
 * so "never published" is a checkable invariant, not just a convention.
 */
export function isAiTestTopicSafe(topic: {
  title: string;
  slug: string | null;
  status: string;
  targetUrl: string | null;
  existingUrl: string | null;
  publishedAt: Date | string | null;
}): boolean {
  return (
    topic.status === "DRAFTING" &&
    topic.targetUrl == null &&
    topic.existingUrl == null &&
    topic.publishedAt == null &&
    topic.title.includes(AI_TEST_TOPIC_TITLE_MARKER) &&
    Boolean(topic.slug?.startsWith("ai-test-"))
  );
}
