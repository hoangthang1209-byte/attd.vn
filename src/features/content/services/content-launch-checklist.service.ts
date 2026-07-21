import "server-only";

import type { ContentLaunchChecklistItem } from "@/features/content/launch/content-launch.types";
import { getContentLaunchStatus } from "@/features/content/services/content-launch-status.service";
import { getFirstLaunchArticleSnapshot } from "@/features/content/services/content-launch-setup.service";
import { inspectPoloLaunchMediaBundle } from "@/features/content/services/content-launch-media.service";
import { evaluatePoloLaunchKnowledgeReadiness } from "@/features/content/services/content-launch-knowledge.service";

export async function getContentLaunchChecklist(): Promise<{
  items: ContentLaunchChecklistItem[];
  requiredRemaining: number;
  optionalRemaining: number;
  percentComplete: number;
}> {
  const [status, article, media, knowledge] = await Promise.all([
    getContentLaunchStatus(),
    getFirstLaunchArticleSnapshot(),
    inspectPoloLaunchMediaBundle(),
    evaluatePoloLaunchKnowledgeReadiness(),
  ]);

  const items: ContentLaunchChecklistItem[] = [
    // System
    {
      id: "sys-ai",
      group: "system",
      label: "AI provider configured (optional)",
      done: status.readyForAiAssistedLaunch,
      required: false,
      detail: status.aiGeneration.enabled
        ? status.aiGeneration.providerConfigured
          ? `Provider ${status.aiGeneration.provider} / ${status.aiGeneration.model}`
          : "Enabled nhưng thiếu key"
        : "AI tắt — dùng manual path",
      href: null,
    },
    {
      id: "sys-cron",
      group: "system",
      label: "Cron configured (optional for immediate launch)",
      done: status.readyForScheduledPublishing,
      required: false,
      detail: status.publishing.cronSecretConfigured
        ? `Schedule ${status.publishing.cronSchedule}`
        : "Secret missing — immediate publish vẫn OK",
      href: "/admin/content/publishing",
    },
    {
      id: "sys-graph-off",
      group: "system",
      label: "Knowledge Graph consumer expansion OFF",
      done:
        !status.graph.globalExpansionEnabled && status.graph.consumerFlagsEnabled.length === 0,
      required: true,
      detail: `rollout=${status.graph.rolloutMode}; flags=${status.graph.consumerFlagsEnabled.join(",") || "none"}`,
      href: "/admin/knowledge-graph",
    },
    {
      id: "sys-kb",
      group: "system",
      label: "Public knowledge usable",
      done: knowledge.readyForInformationalArticle,
      required: true,
      detail: `${knowledge.publicApprovedFacts} public approved facts`,
      href: "/admin/knowledge-base",
    },

    // Content
    {
      id: "c-topic",
      group: "content",
      label: "Topic exists",
      done: Boolean(article.topicId),
      required: true,
      detail: article.topicTitle,
      href: article.topicHref,
    },
    {
      id: "c-brief",
      group: "content",
      label: "Brief approved",
      done: article.briefApproved,
      required: true,
      detail: article.briefId ? (article.briefApproved ? "Approved" : "Pending approval") : "Missing",
      href: article.topicHref,
    },
    {
      id: "c-context",
      group: "content",
      label: "Context complete",
      done: article.contextStatus === "COMPLETED",
      required: true,
      detail: article.contextStatus,
      href: article.topicHref,
    },
    {
      id: "c-plan",
      group: "content",
      label: "Writing Plan ready",
      done: Boolean(article.writingPlanId),
      required: true,
      detail: article.writingPlanId,
      href: article.topicHref,
    },
    {
      id: "c-draft",
      group: "content",
      label: "Draft complete",
      done: Boolean(article.writingDraftId),
      required: true,
      detail: article.writingDraftId,
      href: article.topicHref,
    },
    {
      id: "c-qa",
      group: "content",
      label: "QA passed (run in writing workspace)",
      done: false,
      required: true,
      detail: "Xác nhận sau khi chạy QA trên Draft — không auto-pass",
      href: article.topicHref,
    },
    {
      id: "c-review",
      group: "content",
      label: "Review approved",
      done: article.reviewStatus === "APPROVED",
      required: true,
      detail: article.reviewStatus,
      href: article.reviewSessionId
        ? `/admin/content/reviews/${article.reviewSessionId}`
        : "/admin/content/reviews",
    },
    {
      id: "c-handoff",
      group: "content",
      label: "Blog handoff completed",
      done: Boolean(article.blogPostId),
      required: true,
      detail: article.blogStatus,
      href: article.blogHref,
    },
    {
      id: "c-readiness",
      group: "content",
      label: "Publish readiness passed",
      done: false,
      required: true,
      detail: "Kiểm tra trong Blog editor trước khi publish",
      href: article.blogHref,
    },

    // Media
    {
      id: "m-bundle",
      group: "media",
      label: "Pilot bundle linked / available",
      done: Boolean(media.bundleId),
      required: false,
      detail: media.bundleStatus,
      href: media.editorHref,
    },
    {
      id: "m-featured",
      group: "media",
      label: "Featured/Hero public asset",
      done: media.slots.some(
        (s) =>
          (s.slotType === "FEATURED" || s.slotType === "HERO") && s.publicAssetCount > 0,
      ),
      required: false,
      detail: "Theo Blog publish policy hiện tại",
      href: media.editorHref,
    },
    {
      id: "m-alt",
      group: "media",
      label: "Alt text on public assets",
      done: media.slots.every((s) => s.missingAlt === 0),
      required: false,
      detail: media.warnings.find((w) => w.includes("alt")) ?? "OK hoặc chưa có asset",
      href: media.editorHref,
    },

    // SEO
    {
      id: "seo-title",
      group: "seo",
      label: "Title / slug / meta (via Brief + Blog)",
      done: article.briefApproved,
      required: true,
      detail: "Hoàn tất trên Brief đã duyệt và Blog editor",
      href: article.topicHref,
    },

    // Publishing
    {
      id: "p-confirm",
      group: "publishing",
      label: "Explicit human publish confirmation",
      done: article.blogStatus === "PUBLISHED",
      required: true,
      detail: "Không auto-publish",
      href: article.blogHref ?? "/admin/content/publishing",
    },
    {
      id: "p-public",
      group: "publishing",
      label: "Public URL + sitemap after publish",
      done: article.blogStatus === "PUBLISHED",
      required: false,
      detail: "Chạy smoke helper sau khi human publish",
      href: null,
    },
  ];

  const required = items.filter((i) => i.required);
  const requiredRemaining = required.filter((i) => !i.done).length;
  const optionalRemaining = items.filter((i) => !i.required && !i.done).length;
  const percentComplete = Math.round(
    (items.filter((i) => i.done).length / Math.max(1, items.length)) * 100,
  );

  return { items, requiredRemaining, optionalRemaining, percentComplete };
}
