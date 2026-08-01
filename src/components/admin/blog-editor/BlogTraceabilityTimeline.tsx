"use client";

import Link from "next/link";
import type { BlogPostRecord } from "@/features/blog/types";

type TimelineStep = {
  id: string;
  label: string;
  detail: string;
  state: "done" | "current" | "pending";
  href?: string;
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function shortId(value: string | null | undefined): string {
  return value ? `${value.slice(0, 8)}…` : "—";
}

export function buildTraceabilitySteps(post: BlogPostRecord): TimelineStep[] {
  const hasDraft = Boolean(post.sourceWritingDraftId);
  const hasReview = Boolean(post.sourceReviewSessionId);
  const hasHandoff = Boolean(post.sourceHandoffRecordId);
  const published = post.status === "PUBLISHED";

  return [
    {
      id: "draft",
      label: "Draft",
      detail: hasDraft
        ? `${shortId(post.sourceWritingDraftId)}${post.sourceWritingDraftVersion != null ? ` · v${post.sourceWritingDraftVersion}` : ""}`
        : "Không có Writing Draft",
      state: hasDraft ? "done" : "pending",
    },
    {
      id: "review",
      label: "Review",
      detail: hasReview ? shortId(post.sourceReviewSessionId) : "Chưa liên kết Review",
      state: hasReview ? "done" : "pending",
      href: post.sourceReviewSessionId
        ? `/admin/content/reviews/${post.sourceReviewSessionId}`
        : undefined,
    },
    {
      id: "handoff",
      label: "Handoff",
      detail: hasHandoff ? `${shortId(post.sourceHandoffRecordId)} · ${formatDate(post.lastHandoffAt)}` : "Chưa bàn giao",
      state: hasHandoff ? "done" : "pending",
    },
    {
      id: "blog",
      label: "Blog",
      detail: `${post.status} · ${post.slug}`,
      state: published ? "done" : "current",
      href: `/blog/${post.slug}`,
    },
    {
      id: "publish",
      label: "Publish",
      detail: published ? formatDate(post.lastPublishedAt ?? post.publishedAt) : "Chưa xuất bản",
      state: published ? "done" : "pending",
    },
  ];
}

export default function BlogTraceabilityTimeline({
  post,
  compact = false,
}: {
  post: BlogPostRecord;
  compact?: boolean;
}) {
  const steps = buildTraceabilitySteps(post);

  return (
    <ol className={`content-timeline ${compact ? "content-timeline--compact" : ""}`} aria-label="Chuỗi truy vết nội dung">
      {steps.map((step) => (
        <li key={step.id} className={`content-timeline__step is-${step.state}`}>
          <span className="content-timeline__marker" aria-hidden="true" />
          <span className="content-timeline__label">{step.label}</span>
          <span className="content-timeline__detail">
            {step.href ? <Link href={step.href}>{step.detail}</Link> : step.detail}
          </span>
        </li>
      ))}
    </ol>
  );
}
