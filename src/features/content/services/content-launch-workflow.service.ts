import "server-only";

import {
  CONTENT_LAUNCH_WORKFLOW_STEPS,
} from "@/features/content/launch/content-launch.constants";
import type { ContentLaunchWorkflowStep } from "@/features/content/launch/content-launch.types";
import { getFirstLaunchArticleSnapshot } from "@/features/content/services/content-launch-setup.service";
import { getWritingGenerationSafeStatus } from "@/features/writing-engine/writing-generation-config";

function step(
  partial: Omit<ContentLaunchWorkflowStep, "label" | "actionLabel"> & { id: string },
): ContentLaunchWorkflowStep {
  const meta = CONTENT_LAUNCH_WORKFLOW_STEPS.find((s) => s.id === partial.id);
  return {
    id: partial.id,
    label: meta?.label ?? partial.id,
    status: partial.status,
    entityType: partial.entityType,
    entityId: partial.entityId,
    openHref: partial.openHref,
    actionLabel: meta?.actionLabel ?? "Mở",
    blocker: partial.blocker,
    nextAction: partial.nextAction,
  };
}

/**
 * Resolves the governed pipeline stepper from existing Topic → … → Publish records.
 * Does not skip Brief / Context / Review gates.
 */
export async function resolveContentLaunchWorkflowSteps(): Promise<{
  steps: ContentLaunchWorkflowStep[];
  currentStepId: string;
  topicHref: string | null;
}> {
  const snap = await getFirstLaunchArticleSnapshot();
  const writingStatus = getWritingGenerationSafeStatus();
  const topicHref = snap.topicHref;

  const steps: ContentLaunchWorkflowStep[] = [];

  // 1 Topic
  if (!snap.topicId) {
    steps.push(
      step({
        id: "topic",
        status: "not_started",
        entityType: null,
        entityId: null,
        openHref: "/admin/content/launch",
        blocker: "Chưa có Topic launch.",
        nextAction: "Chạy setup first article",
      }),
    );
  } else {
    steps.push(
      step({
        id: "topic",
        status: "completed",
        entityType: "SeoTopic",
        entityId: snap.topicId,
        openHref: topicHref,
        blocker: null,
        nextAction: snap.briefApproved ? null : "Mở Brief trên Topic",
      }),
    );
  }

  // 2 Brief
  if (!snap.topicId) {
    steps.push(
      step({
        id: "brief",
        status: "blocked",
        entityType: null,
        entityId: null,
        openHref: null,
        blocker: "Cần Topic trước.",
        nextAction: null,
      }),
    );
  } else if (snap.briefApproved) {
    steps.push(
      step({
        id: "brief",
        status: "completed",
        entityType: "SeoContentBrief",
        entityId: snap.briefId,
        openHref: topicHref,
        blocker: null,
        nextAction: "Xây dựng Context Package",
      }),
    );
  } else if (snap.briefId) {
    steps.push(
      step({
        id: "brief",
        status: "in_progress",
        entityType: "SeoContentBrief",
        entityId: snap.briefId,
        openHref: topicHref,
        blocker: "Brief chưa được human approve.",
        nextAction: "Review và approve Brief",
      }),
    );
  } else {
    steps.push(
      step({
        id: "brief",
        status: "not_started",
        entityType: null,
        entityId: null,
        openHref: topicHref,
        blocker: null,
        nextAction: "Tạo / chỉnh Brief (có thể dùng template gợi ý)",
      }),
    );
  }

  // 3 Context
  if (!snap.briefApproved) {
    steps.push(
      step({
        id: "context",
        status: "blocked",
        entityType: snap.contextBuildId ? "ContentContextBuild" : null,
        entityId: snap.contextBuildId,
        openHref: topicHref,
        blocker: "Cần Brief đã approve trước khi Context được coi là hoàn tất.",
        nextAction: "Approve Brief trước",
      }),
    );
  } else if (snap.contextStatus === "COMPLETED") {
    steps.push(
      step({
        id: "context",
        status: "completed",
        entityType: "ContentContextBuild",
        entityId: snap.contextBuildId,
        openHref: topicHref,
        blocker: null,
        nextAction: "Tạo Writing Plan",
      }),
    );
  } else if (snap.contextBuildId) {
    steps.push(
      step({
        id: "context",
        status: "in_progress",
        entityType: "ContentContextBuild",
        entityId: snap.contextBuildId,
        openHref: topicHref,
        blocker: snap.contextStatus === "FAILED" ? "Context build thất bại." : null,
        nextAction: "Xây dựng lại Context Package",
      }),
    );
  } else {
    steps.push(
      step({
        id: "context",
        status: "not_started",
        entityType: null,
        entityId: null,
        openHref: topicHref,
        blocker: null,
        nextAction: "Xây dựng Context Package",
      }),
    );
  }

  // 4 Writing plan
  if (!snap.contextBuildId || snap.contextStatus !== "COMPLETED") {
    steps.push(
      step({
        id: "writing_plan",
        status: "blocked",
        entityType: snap.writingPlanId ? "WritingPlanRecord" : null,
        entityId: snap.writingPlanId,
        openHref: topicHref,
        blocker: "Cần Context READY.",
        nextAction: null,
      }),
    );
  } else if (snap.writingPlanId) {
    steps.push(
      step({
        id: "writing_plan",
        status: "completed",
        entityType: "WritingPlanRecord",
        entityId: snap.writingPlanId,
        openHref: topicHref,
        blocker: null,
        nextAction: "Tạo Draft shell",
      }),
    );
  } else {
    steps.push(
      step({
        id: "writing_plan",
        status: "not_started",
        entityType: null,
        entityId: null,
        openHref: topicHref,
        blocker: null,
        nextAction: "Tạo Writing Plan",
      }),
    );
  }

  // 5 Draft
  if (!snap.writingPlanId) {
    steps.push(
      step({
        id: "draft",
        status: "blocked",
        entityType: null,
        entityId: null,
        openHref: topicHref,
        blocker: "Cần Writing Plan.",
        nextAction: null,
      }),
    );
  } else if (snap.writingDraftId) {
    steps.push(
      step({
        id: "draft",
        status: "completed",
        entityType: "WritingDraftRecord",
        entityId: snap.writingDraftId,
        openHref: topicHref,
        blocker: null,
        nextAction: writingStatus.configured
          ? "Sinh 1 section low-risk hoặc nhập thủ công"
          : "Nhập nội dung thủ công (AI chưa cấu hình)",
      }),
    );
  } else {
    steps.push(
      step({
        id: "draft",
        status: "not_started",
        entityType: null,
        entityId: null,
        openHref: topicHref,
        blocker: null,
        nextAction: "Tạo Draft shell",
      }),
    );
  }

  // 6 Generation (optional AI)
  if (!snap.writingDraftId) {
    steps.push(
      step({
        id: "generation",
        status: "blocked",
        entityType: null,
        entityId: null,
        openHref: topicHref,
        blocker: "Cần Draft.",
        nextAction: null,
      }),
    );
  } else if (!writingStatus.configured) {
    steps.push(
      step({
        id: "generation",
        status: "skipped_optional",
        entityType: "WritingDraftRecord",
        entityId: snap.writingDraftId,
        openHref: topicHref,
        blocker: null,
        nextAction: "AI chưa được cấu hình. Bạn vẫn có thể nhập nội dung thủ công.",
      }),
    );
  } else {
    steps.push(
      step({
        id: "generation",
        status: "ready",
        entityType: "WritingDraftRecord",
        entityId: snap.writingDraftId,
        openHref: topicHref,
        blocker: null,
        nextAction: "Sinh một section low-risk (Introduction / chất liệu) — không auto all sections",
      }),
    );
  }

  // 7 QA
  if (!snap.writingDraftId) {
    steps.push(
      step({
        id: "qa",
        status: "blocked",
        entityType: null,
        entityId: null,
        openHref: topicHref,
        blocker: "Cần Draft có nội dung.",
        nextAction: null,
      }),
    );
  } else {
    steps.push(
      step({
        id: "qa",
        status: "ready",
        entityType: "WritingDraftRecord",
        entityId: snap.writingDraftId,
        openHref: topicHref,
        blocker: null,
        nextAction: "Chạy QA deterministic trên Draft",
      }),
    );
  }

  // 8 Review — mandatory human
  if (!snap.writingDraftId) {
    steps.push(
      step({
        id: "review",
        status: "blocked",
        entityType: null,
        entityId: null,
        openHref: "/admin/content/reviews",
        blocker: "Cần Draft trước.",
        nextAction: null,
      }),
    );
  } else if (snap.reviewStatus === "APPROVED") {
    steps.push(
      step({
        id: "review",
        status: "completed",
        entityType: "ContentReviewSession",
        entityId: snap.reviewSessionId,
        openHref: snap.reviewSessionId
          ? `/admin/content/reviews/${snap.reviewSessionId}`
          : "/admin/content/reviews",
        blocker: null,
        nextAction: "Handoff Blog DRAFT",
      }),
    );
  } else if (snap.reviewSessionId) {
    steps.push(
      step({
        id: "review",
        status: "in_progress",
        entityType: "ContentReviewSession",
        entityId: snap.reviewSessionId,
        openHref: `/admin/content/reviews/${snap.reviewSessionId}`,
        blocker: "Human approval bắt buộc — không auto-approve.",
        nextAction: "Tiếp tục kiểm duyệt",
      }),
    );
  } else {
    steps.push(
      step({
        id: "review",
        status: "not_started",
        entityType: null,
        entityId: null,
        openHref: "/admin/content/reviews",
        blocker: null,
        nextAction: "Bắt đầu kiểm duyệt",
      }),
    );
  }

  // 9 Blog handoff
  if (snap.reviewStatus !== "APPROVED") {
    steps.push(
      step({
        id: "blog_handoff",
        status: "blocked",
        entityType: snap.handoffId ? "ContentHandoffRecord" : null,
        entityId: snap.handoffId,
        openHref: snap.reviewSessionId
          ? `/admin/content/reviews/${snap.reviewSessionId}`
          : "/admin/content/reviews",
        blocker: "Cần Review APPROVED trước khi handoff.",
        nextAction: null,
      }),
    );
  } else if (snap.blogPostId) {
    steps.push(
      step({
        id: "blog_handoff",
        status: "completed",
        entityType: "BlogPost",
        entityId: snap.blogPostId,
        openHref: snap.blogHref,
        blocker: null,
        nextAction: "Kiểm tra publish readiness",
      }),
    );
  } else {
    steps.push(
      step({
        id: "blog_handoff",
        status: "ready",
        entityType: snap.handoffId ? "ContentHandoffRecord" : null,
        entityId: snap.handoffId,
        openHref: snap.reviewSessionId
          ? `/admin/content/reviews/${snap.reviewSessionId}`
          : null,
        blocker: null,
        nextAction: snap.matchingExistingBlogs.length
          ? "Có Blog trùng — dùng update flow, không tạo duplicate"
          : "Tạo Blog DRAFT từ handoff",
      }),
    );
  }

  // 10 Publish readiness
  if (!snap.blogPostId) {
    steps.push(
      step({
        id: "publish_readiness",
        status: "blocked",
        entityType: null,
        entityId: null,
        openHref: null,
        blocker: "Cần Blog DRAFT sau handoff.",
        nextAction: null,
      }),
    );
  } else if (snap.blogStatus === "PUBLISHED") {
    steps.push(
      step({
        id: "publish_readiness",
        status: "completed",
        entityType: "BlogPost",
        entityId: snap.blogPostId,
        openHref: snap.blogHref,
        blocker: null,
        nextAction: null,
      }),
    );
  } else {
    steps.push(
      step({
        id: "publish_readiness",
        status: "ready",
        entityType: "BlogPost",
        entityId: snap.blogPostId,
        openHref: snap.blogHref,
        blocker: null,
        nextAction: "Mở Blog editor → kiểm tra readiness → confirm publish",
      }),
    );
  }

  // 11 Published
  if (snap.blogStatus === "PUBLISHED") {
    steps.push(
      step({
        id: "published",
        status: "completed",
        entityType: "BlogPost",
        entityId: snap.blogPostId,
        openHref: snap.blogHref,
        blocker: null,
        nextAction: "Chạy public smoke sau khi human publish",
      }),
    );
  } else {
    steps.push(
      step({
        id: "published",
        status: "not_started",
        entityType: snap.blogPostId ? "BlogPost" : null,
        entityId: snap.blogPostId,
        openHref: snap.blogHref,
        blocker: "Chưa human publish — giữ DRAFT.",
        nextAction: "Chỉ publish sau khi user xác nhận rõ ràng",
      }),
    );
  }

  const current =
    steps.find((s) => s.status === "in_progress" || s.status === "ready" || s.status === "not_started") ??
    steps[steps.length - 1];

  return { steps, currentStepId: current.id, topicHref };
}
