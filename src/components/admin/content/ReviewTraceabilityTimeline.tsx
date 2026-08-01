"use client";

import Link from "next/link";

type ReviewTraceabilityProps = {
  draftId: string;
  draftVersion: number;
  reviewId: string;
  reviewStatus: string;
  handoffRecordId?: string | null;
  blog?: { id: string; status: string; adminRoute: string } | null;
};

type Step = {
  id: string;
  label: string;
  detail: string;
  state: "done" | "current" | "pending";
  href?: string;
};

/** Draft → Review → Handoff → Blog → Publish, as one horizontal chain. */
export default function ReviewTraceabilityTimeline({
  draftId,
  draftVersion,
  reviewId,
  reviewStatus,
  handoffRecordId,
  blog,
}: ReviewTraceabilityProps) {
  const approved = reviewStatus === "APPROVED";
  const published = blog?.status === "PUBLISHED";

  const steps: Step[] = [
    {
      id: "draft",
      label: "Draft",
      detail: `${draftId.slice(0, 8)}… · v${draftVersion}`,
      state: "done",
    },
    {
      id: "review",
      label: "Review",
      detail: `${reviewId.slice(0, 8)}… · ${reviewStatus}`,
      state: approved ? "done" : "current",
    },
    {
      id: "handoff",
      label: "Handoff",
      detail: handoffRecordId ? `${handoffRecordId.slice(0, 8)}…` : "Chưa bàn giao",
      state: handoffRecordId ? "done" : approved ? "current" : "pending",
    },
    {
      id: "blog",
      label: "Blog",
      detail: blog ? `${blog.id.slice(0, 8)}… · ${blog.status}` : "Chưa có Blog",
      state: blog ? (published ? "done" : "current") : "pending",
      href: blog?.adminRoute,
    },
    {
      id: "publish",
      label: "Publish",
      detail: published ? "Đã xuất bản" : "Chưa xuất bản",
      state: published ? "done" : "pending",
    },
  ];

  return (
    <ol className="content-timeline content-timeline--compact" aria-label="Chuỗi truy vết nội dung">
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
