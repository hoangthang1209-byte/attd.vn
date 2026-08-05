import "server-only";

import { prisma } from "@/lib/prisma";
import {
  AI_TEST_TOPIC_SLUG,
  buildAiTestTopicCreateInput,
} from "@/features/content-generation/services/ai-test-topic.mapping";

// Re-exported for convenience — every route/UI caller imports these from
// this file; the actual pure implementation lives in ai-test-topic.mapping.ts
// so content-generation-18-1.test.ts can use it without a database (this
// file is `server-only` + prisma-backed).
export {
  AI_TEST_TOPIC_SLUG,
  AI_TEST_TOPIC_TITLE_MARKER,
  AI_TEST_TOPIC_TITLE,
  AI_TEST_TOPIC_PRIMARY_KEYWORD,
  AI_TEST_TOPIC_NOTES,
  buildAiTestTopicCreateInput,
  isAiTestTopicSafe,
} from "@/features/content-generation/services/ai-test-topic.mapping";
export type { AiTestTopicCreateInput } from "@/features/content-generation/services/ai-test-topic.mapping";

/**
 * Sprint 18.1 — a single, well-known, NEVER-published SeoTopic used by the
 * AI Smoke Workspace and Failure Lab to exercise the governed proposal
 * pipeline without touching real editorial content. Identified by a fixed
 * slug so `ensureAiTestTopic`/`getAiTestTopic` are idempotent — at most one
 * row ever exists.
 */
export type AiTestTopicRecord = {
  id: string;
  title: string;
  slug: string | null;
  status: string;
  targetUrl: string | null;
  existingUrl: string | null;
  publishedAt: Date | null;
};

function mapTopic(row: {
  id: string;
  title: string;
  slug: string | null;
  status: string;
  targetUrl: string | null;
  existingUrl: string | null;
  publishedAt: Date | null;
}): AiTestTopicRecord {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    targetUrl: row.targetUrl,
    existingUrl: row.existingUrl,
    publishedAt: row.publishedAt,
  };
}

export type EnsureAiTestTopicResult =
  | { ok: true; created: boolean; topic: AiTestTopicRecord }
  | { ok: false; warning: string };

/**
 * Idempotent create-or-find. Never publishes, never picks a cluster that
 * doesn't already exist (no cascading creation of clusters/strategies) —
 * when the workspace has zero `SeoTopicCluster` rows, this returns a
 * warning and creates nothing, per Sprint 18.1 scope.
 */
export async function ensureAiTestTopic(): Promise<EnsureAiTestTopicResult> {
  const existing = await prisma.seoTopic.findFirst({ where: { slug: AI_TEST_TOPIC_SLUG } });
  if (existing) {
    return { ok: true, created: false, topic: mapTopic(existing) };
  }

  const cluster = await prisma.seoTopicCluster.findFirst({ orderBy: { createdAt: "asc" } });
  if (!cluster) {
    return {
      ok: false,
      warning:
        "Chưa có SeoTopicCluster nào trong hệ thống — cần tạo ít nhất 1 cluster trước khi tạo chủ đề kiểm thử AI.",
    };
  }

  const created = await prisma.seoTopic.create({
    data: buildAiTestTopicCreateInput(cluster.id),
  });
  return { ok: true, created: true, topic: mapTopic(created) };
}

/** Read-only lookup — never creates. Returns null when ensureAiTestTopic has never run. */
export async function getAiTestTopic(): Promise<AiTestTopicRecord | null> {
  const row = await prisma.seoTopic.findFirst({ where: { slug: AI_TEST_TOPIC_SLUG } });
  return row ? mapTopic(row) : null;
}
