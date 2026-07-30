"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { AdminLoadingState, EmptyState, StatusBadge } from "@/components/admin/AdminUi";
import { REVIEW_STATUS_LABELS } from "@/features/content/editorial/editorial-ux";
import {
  BULK_APPROVE_EXCLUSION_LABELS,
  STALE_REVIEW_BANNER,
  approvalToastMessage,
  groupApprovalBlockers,
  type ApprovalChecklistItem,
  type BulkApproveExclusionReason,
  type BulkApprovePlan,
  type ReviewBlocker,
  type ReviewBlockerGroupView,
} from "@/features/content/editorial/review-approval.policy";

type Props = { reviewId: string };

type Readiness = {
  readyToApprove: boolean;
  score: number;
  blockingIssues: string[];
  warnings: string[];
  blockers: ReviewBlocker[];
  stale: boolean;
  reviewDraftVersion: number;
  latestDraftVersion: number | null;
  checklist: ApprovalChecklistItem[];
  bulkApprove: BulkApprovePlan;
  sectionSummary: {
    total: number;
    approved: number;
    pending: number;
    changesRequested: number;
    rejected: number;
    blocked: number;
    stale: number;
  };
};

type DraftChanges = {
  available: boolean;
  reviewDraftVersion: number;
  latestDraftVersion: number | null;
  addedSections: string[];
  removedSections: string[];
  modifiedSections: string[];
  faqCountBefore: number;
  faqCountAfter: number;
  qaScoreBefore: number | null;
  qaScoreAfter: number | null;
};

function reviewStatusTone(status: string): "neutral" | "info" | "success" | "warning" | "danger" {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "danger";
  if (status === "CHANGES_REQUESTED" || status === "IN_REVIEW") return "warning";
  return "info";
}

export default function ContentReviewDetailClient({ reviewId }: Props) {
  const toast = useAdminToast();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");
  const [activeSection, setActiveSection] = useState("");
  const [showChanges, setShowChanges] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [submitGroups, setSubmitGroups] = useState<ReviewBlockerGroupView[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/content/reviews/${reviewId}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? "Load failed");
      }
      setData(json);
      setActiveSection((prev) => {
        if (prev) return prev;
        const sections = (json.session as { sections?: Array<{ sectionId: string }> })?.sections;
        return sections?.[0]?.sectionId ?? "";
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Load failed";
      setLoadError(message);
      setData(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [reviewId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const post = useCallback(
    async (path: string, body?: Record<string, unknown>) => {
      setPending(true);
      try {
        const res = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body ?? {}),
        });
        const json = await res.json();
        if (!res.ok) {
          // A restart that lost the race still knows where the successor lives.
          if (json.code === "SUCCESSOR_EXISTS" && typeof json.adminRoute === "string") {
            toast.error(json.message ?? "Phiên kiểm duyệt mới đã tồn tại.");
            window.location.href = json.adminRoute;
            return null;
          }
          // Detailed blockers belong in the inline panel — the toast stays short.
          const groups = (json.groups as ReviewBlockerGroupView[] | undefined) ?? null;
          setSubmitGroups(groups);
          toast.error(groups ? approvalToastMessage(groups) : (json.message ?? "Failed"));
          return null;
        }
        setSubmitGroups(null);
        toast.success(json.message ?? "OK");
        await load();
        return json;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
        return null;
      } finally {
        setPending(false);
      }
    },
    [load, toast],
  );

  const readiness = data?.readiness as Readiness | undefined;
  const liveGroups = useMemo(
    () => groupApprovalBlockers(readiness?.blockers ?? []),
    [readiness?.blockers],
  );
  const groups = submitGroups ?? liveGroups;

  if (loading) return <AdminLoadingState label="Đang tải kiểm duyệt…" rows={4} />;
  if (loadError || !data || !readiness) {
    return (
      <EmptyState
        tone="error"
        title="Không tải được chi tiết kiểm duyệt"
        description={loadError ?? "Không tìm thấy phiên kiểm duyệt."}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="admin-btn" onClick={() => void load()}>
              Thử lại
            </button>
            <Link href="/admin/content/reviews" className="admin-btn admin-btn--secondary">
              Quay lại danh sách
            </Link>
          </div>
        }
      />
    );
  }

  const session = data.session as {
    id: string;
    status: string;
    writingDraftId: string;
    writingDraftVersion: number;
    writingPlanId: string;
    contextBuildId: string;
    sections: Array<{
      sectionId: string;
      heading: string;
      status: string;
      reviewerNotes?: string | null;
    }>;
    issues: Array<{
      id: string;
      code: string;
      severity: string;
      status: string;
      message: string;
      sectionId?: string | null;
    }>;
    decisions: Array<{
      decisionType: string;
      actorId: string;
      createdAt: string;
      note?: string | null;
    }>;
  };
  const structured = data.structuredDraft as {
    title?: string;
    sections?: Array<{ sectionId: string; heading: string; html: string; plainText: string }>;
    rendered?: { html?: string | null };
  } | null;
  const media = (data.media as Array<Record<string, unknown>>) ?? [];
  const links = (data.internalLinks as Array<Record<string, unknown>>) ?? [];
  const metadata = data.metadata as Record<string, unknown> | null;
  const draftChanges = (data.draftChanges as DraftChanges | null) ?? null;
  const successor = data.successorReview as { id: string; status: string; writingDraftVersion: number } | null;
  const successorRoute = (data.successorAdminRoute as string | null) ?? null;
  const restartMode = (data.restartMode as
    | "STALE"
    | "ORPHAN_RECOVERY"
    | "OPEN_SUCCESSOR"
    | "NONE"
    | undefined) ?? "NONE";

  const currentSection = structured?.sections?.find((s) => s.sectionId === activeSection);
  const reviewLabel = structured?.title
    ? String(structured.title)
    : `Kiểm duyệt ${session.id.slice(0, 8)}…`;
  const openIssues = session.issues.filter((i) => i.status === "OPEN");
  const summary = readiness.sectionSummary;
  const bulk = readiness.bulkApprove;
  const stale = readiness.stale;
  const sessionClosed = !["NOT_STARTED", "IN_REVIEW", "CHANGES_REQUESTED"].includes(session.status);
  const sectionActionsDisabled = pending || stale || sessionClosed;

  const excludedByReason = bulk.excluded.reduce<Record<string, number>>((acc, item) => {
    acc[item.reason] = (acc[item.reason] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="admin-panel">
      <AdminPageTitle title={reviewLabel} />
      <div className="admin-section-header" style={{ alignItems: "flex-start" }}>
        <div>
          <p className="admin-field-hint" style={{ margin: 0 }}>
            <Link href="/admin/content/reviews">← Hàng đợi kiểm duyệt</Link>
          </p>
          <p style={{ margin: "8px 0 0", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <StatusBadge tone={reviewStatusTone(session.status)}>
              {REVIEW_STATUS_LABELS[session.status] ?? session.status}
            </StatusBadge>
            <span className="admin-field-hint">
              Draft v{readiness.reviewDraftVersion}
              {readiness.latestDraftVersion != null &&
              readiness.latestDraftVersion !== readiness.reviewDraftVersion
                ? ` (mới nhất v${readiness.latestDraftVersion})`
                : ""}{" "}
              · QA {readiness.score}
            </span>
          </p>
          <p style={{ margin: "8px 0 0", display: "flex", flexWrap: "wrap", gap: 6 }}>
            <StatusBadge tone="success">
              Đã duyệt {summary.approved}/{summary.total}
            </StatusBadge>
            <StatusBadge tone={summary.blocked > 0 ? "danger" : "neutral"}>
              Bị chặn {summary.blocked}
            </StatusBadge>
            <StatusBadge tone={summary.pending > 0 ? "warning" : "neutral"}>
              Chờ duyệt {summary.pending}
            </StatusBadge>
            <StatusBadge tone={summary.stale > 0 ? "danger" : "neutral"}>
              Lệch phiên bản {summary.stale}
            </StatusBadge>
          </p>
        </div>
      </div>

      {restartMode === "OPEN_SUCCESSOR" && successorRoute && (
        <div className="admin-message admin-message--warning" style={{ marginBottom: 12 }}>
          <strong>Phiên kiểm duyệt này đã được thay thế.</strong>
          <p className="admin-field-hint" style={{ margin: "6px 0 0" }}>
            Phiên kế nhiệm: {successor?.id} · bản nháp v{successor?.writingDraftVersion} ·{" "}
            {REVIEW_STATUS_LABELS[successor?.status ?? ""] ?? successor?.status}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Link href={successorRoute} className="admin-btn admin-btn--primary admin-btn--small">
              Mở phiên kiểm duyệt mới
            </Link>
          </div>
        </div>
      )}

      {restartMode === "ORPHAN_RECOVERY" && (
        <div className="admin-message admin-message--error" style={{ marginBottom: 12 }}>
          <strong>Phiên này đã bị đánh dấu thay thế nhưng chưa có phiên kế nhiệm.</strong>
          <p className="admin-field-hint" style={{ margin: "6px 0 0" }}>
            Lần tạo phiên mới trước đó không hoàn tất. Tạo phiên kế nhiệm từ bản nháp v
            {readiness.latestDraftVersion ?? "?"} để tiếp tục kiểm duyệt.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <AdminLoadingButton
              pending={pending}
              size="small"
              variant="primary"
              onClick={async () => {
                const json = await post(`/api/content/reviews/${reviewId}/restart`, { note });
                if (json?.adminRoute) window.location.href = String(json.adminRoute);
              }}
            >
              Tạo phiên kiểm duyệt mới
            </AdminLoadingButton>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              onClick={() => setShowChanges((v) => !v)}
            >
              {STALE_REVIEW_BANNER.secondaryAction}
            </button>
          </div>
          {showChanges && draftChanges?.available && (
            <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13 }}>
              <li>
                Phiên bản: v{draftChanges.reviewDraftVersion} → v{draftChanges.latestDraftVersion}
              </li>
              <li>Đoạn đã sửa: {draftChanges.modifiedSections.length}</li>
              <li>
                FAQ: {draftChanges.faqCountBefore} → {draftChanges.faqCountAfter}
              </li>
            </ul>
          )}
        </div>
      )}

      {stale && restartMode !== "OPEN_SUCCESSOR" && restartMode !== "ORPHAN_RECOVERY" && (
        <div className="admin-message admin-message--error" style={{ marginBottom: 12 }}>
          <strong>{STALE_REVIEW_BANNER.title}</strong>
          <p className="admin-field-hint" style={{ margin: "6px 0 0" }}>
            Phiên này chụp bản nháp v{readiness.reviewDraftVersion}, bản nháp hiện tại là v
            {readiness.latestDraftVersion ?? "?"}. Không thể duyệt đoạn trên nội dung cũ.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {restartMode === "STALE" && (
              <AdminLoadingButton
                pending={pending}
                size="small"
                variant="primary"
                onClick={async () => {
                  const json = await post(`/api/content/reviews/${reviewId}/restart`, { note });
                  if (json?.adminRoute) window.location.href = String(json.adminRoute);
                }}
              >
                {STALE_REVIEW_BANNER.primaryAction}
              </AdminLoadingButton>
            )}
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              onClick={() => setShowChanges((v) => !v)}
            >
              {STALE_REVIEW_BANNER.secondaryAction}
            </button>
          </div>
          {showChanges && (
            <div style={{ marginTop: 10, fontSize: 13 }}>
              {draftChanges?.available ? (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>
                    Phiên bản: v{draftChanges.reviewDraftVersion} → v{draftChanges.latestDraftVersion}
                  </li>
                  <li>Đoạn đã sửa: {draftChanges.modifiedSections.length}</li>
                  <li>Đoạn thêm mới: {draftChanges.addedSections.length}</li>
                  <li>Đoạn bị xóa: {draftChanges.removedSections.length}</li>
                  <li>
                    FAQ: {draftChanges.faqCountBefore} → {draftChanges.faqCountAfter}
                  </li>
                  <li>
                    QA: {draftChanges.qaScoreBefore ?? "—"} → {draftChanges.qaScoreAfter ?? "—"}
                  </li>
                </ul>
              ) : (
                <p className="admin-field-hint" style={{ margin: 0 }}>
                  Không còn ảnh chụp bản nháp v{readiness.reviewDraftVersion} để so sánh chi tiết.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {groups.length > 0 && (
        <div className="admin-message admin-message--error" style={{ marginBottom: 12 }}>
          <strong>Chưa đủ điều kiện phê duyệt — {groups.length} nhóm vấn đề</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {groups.map((group) => (
              <li key={group.group} style={{ marginBottom: 4 }}>
                <strong>{group.label}:</strong> {group.summary}
                {group.collapsed ? (
                  <>
                    {" "}
                    <a href="#review-sections">Xem danh sách đoạn</a>
                  </>
                ) : group.items.length > 1 ? (
                  <ul style={{ margin: "2px 0 0", paddingLeft: 18 }}>
                    {group.items.slice(1).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* PR-style: left draft · right review decision */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 0.9fr)",
          gap: 16,
          alignItems: "start",
        }}
        className="content-review-detail-layout"
      >
        <div style={{ display: "grid", gap: 12 }}>
          <section className="admin-sidebar-card" style={{ margin: 0 }} id="review-sections">
            <h3 className="admin-sidebar-title">Draft</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {session.sections.map((s) => (
                <button
                  key={s.sectionId}
                  type="button"
                  className={
                    s.sectionId === activeSection
                      ? "admin-btn admin-btn--primary admin-btn--small"
                      : "admin-btn admin-btn--secondary admin-btn--small"
                  }
                  onClick={() => setActiveSection(s.sectionId)}
                >
                  {s.status === "APPROVED" ? "✓ " : ""}
                  {s.heading}
                </button>
              ))}
            </div>
            {currentSection ? (
              <div
                style={{ maxHeight: 420, overflow: "auto", border: "1px solid #e5e7eb", padding: 12, borderRadius: 8 }}
                dangerouslySetInnerHTML={{
                  __html: currentSection.html || `<p>${currentSection.plainText}</p>`,
                }}
              />
            ) : structured?.rendered?.html ? (
              <div
                style={{ maxHeight: 420, overflow: "auto", border: "1px solid #e5e7eb", padding: 12, borderRadius: 8 }}
                dangerouslySetInnerHTML={{ __html: structured.rendered.html }}
              />
            ) : (
              <p className="admin-field-hint">Chưa có nội dung đoạn để xem.</p>
            )}
          </section>

          <section className="admin-sidebar-card" style={{ margin: 0 }}>
            <h3 className="admin-sidebar-title">Outline</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {session.sections.map((s) => (
                <li key={s.sectionId} className="admin-field-hint">
                  {s.heading} · {s.status}
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-sidebar-card" style={{ margin: 0 }}>
            <h3 className="admin-sidebar-title">Metadata</h3>
            <p className="admin-field-hint" style={{ margin: 0 }}>
              Title: {String(metadata?.title ?? structured?.title ?? "—")}
            </p>
            <p className="admin-field-hint" style={{ margin: "4px 0 0" }}>
              Media: {media.length} · Internal links: {links.length}
            </p>
          </section>
        </div>

        <div style={{ display: "grid", gap: 12, position: "sticky", top: 12 }}>
          <section className="admin-sidebar-card" style={{ margin: 0 }}>
            <h3 className="admin-sidebar-title">Duyệt đoạn</h3>
            <p className="admin-field-hint" style={{ marginTop: 0 }}>
              {bulk.eligible.length} đoạn đạt điều kiện · {bulk.excluded.length} đoạn loại trừ
            </p>
            <AdminLoadingButton
              pending={pending}
              size="small"
              variant="secondary"
              disabled={sectionActionsDisabled || bulk.eligible.length === 0}
              onClick={() => setBulkConfirmOpen(true)}
            >
              {STALE_REVIEW_BANNER.bulkApproveAction}
            </AdminLoadingButton>
            {bulkConfirmOpen && (
              <div
                style={{
                  marginTop: 10,
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 13,
                }}
              >
                <strong>Xác nhận duyệt hàng loạt</strong>
                <ul style={{ margin: "6px 0", paddingLeft: 18 }}>
                  <li>Sẽ duyệt: {bulk.eligible.length} đoạn</li>
                  <li>Loại trừ: {bulk.excluded.length} đoạn</li>
                  {Object.entries(excludedByReason).map(([reason, count]) => (
                    <li key={reason}>
                      {BULK_APPROVE_EXCLUSION_LABELS[reason as BulkApproveExclusionReason] ?? reason}:{" "}
                      {count}
                    </li>
                  ))}
                  {bulk.blockers.length > 0 && <li>Vướng mắc: {bulk.blockers.join(", ")}</li>}
                </ul>
                <p style={{ margin: "0 0 8px" }}>
                  Đây là hành động phê duyệt của con người. Bạn xác nhận đã đọc và chịu trách nhiệm
                  cho nội dung các đoạn được duyệt.
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <AdminLoadingButton
                    pending={pending}
                    size="small"
                    variant="primary"
                    onClick={async () => {
                      setBulkConfirmOpen(false);
                      await post(`/api/content/reviews/${reviewId}/bulk-approve-sections`, {
                        confirmed: true,
                        note,
                      });
                    }}
                  >
                    Tôi xác nhận duyệt {bulk.eligible.length} đoạn
                  </AdminLoadingButton>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--small"
                    onClick={() => setBulkConfirmOpen(false)}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="admin-sidebar-card" style={{ margin: 0 }}>
            <h3 className="admin-sidebar-title">QA</h3>
            <p className="admin-field-hint">Điểm {readiness.score} · {openIssues.length} vấn đề mở</p>
            <AdminLoadingButton
              pending={pending}
              size="small"
              variant="secondary"
              onClick={() => void post(`/api/content/reviews/${reviewId}/rerun-qa`)}
            >
              Chạy lại QA
            </AdminLoadingButton>
            <ul style={{ fontSize: 13, paddingLeft: 16, marginTop: 8 }}>
              {session.issues.length === 0 ? (
                <li className="admin-field-hint">Không có vấn đề QA.</li>
              ) : (
                session.issues.map((i) => (
                  <li key={i.id} style={{ marginBottom: 6 }}>
                    <strong>{i.severity}</strong> · {i.message}
                    {i.status === "OPEN" ? (
                      <span style={{ marginLeft: 6, display: "inline-flex", gap: 4 }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-btn--small"
                          onClick={() =>
                            void post(`/api/content/reviews/${reviewId}/issues/${i.id}/resolve`)
                          }
                        >
                          Resolve
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-btn--small"
                          onClick={() =>
                            void post(`/api/content/reviews/${reviewId}/issues/${i.id}/dismiss`, {
                              note: note || "dismissed",
                            })
                          }
                        >
                          Dismiss
                        </button>
                      </span>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="admin-sidebar-card" style={{ margin: 0 }}>
            <h3 className="admin-sidebar-title">Review comments</h3>
            {currentSection ? (
              <>
                <p className="admin-field-hint">Đoạn: {currentSection.heading}</p>
                <textarea
                  className="admin-input"
                  rows={3}
                  placeholder="Ghi chú kiểm duyệt"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  <AdminLoadingButton
                    pending={pending}
                    size="small"
                    variant="primary"
                    disabled={sectionActionsDisabled}
                    onClick={() =>
                      void post(`/api/content/reviews/${reviewId}/sections/${activeSection}/approve`, {
                        note,
                      })
                    }
                  >
                    Duyệt đoạn
                  </AdminLoadingButton>
                  <AdminLoadingButton
                    pending={pending}
                    size="small"
                    variant="secondary"
                    disabled={sectionActionsDisabled}
                    onClick={() =>
                      void post(
                        `/api/content/reviews/${reviewId}/sections/${activeSection}/request-changes`,
                        { note },
                      )
                    }
                  >
                    Return
                  </AdminLoadingButton>
                  <AdminLoadingButton
                    pending={pending}
                    size="small"
                    variant="secondary"
                    disabled={sectionActionsDisabled}
                    onClick={() =>
                      void post(`/api/content/reviews/${reviewId}/sections/${activeSection}/reject`, {
                        note,
                      })
                    }
                  >
                    Reject đoạn
                  </AdminLoadingButton>
                </div>
                {stale && (
                  <p className="admin-field-hint" style={{ margin: "6px 0 0" }}>
                    Cần tạo phiên kiểm duyệt mới trước khi duyệt đoạn.
                  </p>
                )}
              </>
            ) : (
              <p className="admin-field-hint">Chọn một đoạn bên trái để ghi chú.</p>
            )}
          </section>

          <section className="admin-sidebar-card" style={{ margin: 0 }}>
            <h3 className="admin-sidebar-title">Decision</h3>
            <ul style={{ listStyle: "none", margin: "0 0 10px", padding: 0, fontSize: 13 }}>
              {readiness.checklist.map((item) => (
                <li key={item.id} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                  <span style={{ color: item.passed ? "#047857" : "#b91c1c" }}>
                    {item.passed ? "✓" : "✕"}
                  </span>
                  <span>
                    {item.label}
                    {item.detail ? (
                      <span className="admin-field-hint"> — {item.detail}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <AdminLoadingButton
                pending={pending}
                size="small"
                variant="primary"
                disabled={pending || !readiness.readyToApprove}
                onClick={() => void post(`/api/content/reviews/${reviewId}/approve`, { note })}
              >
                Approve
              </AdminLoadingButton>
              <AdminLoadingButton
                pending={pending}
                size="small"
                variant="secondary"
                onClick={() => void post(`/api/content/reviews/${reviewId}/reject`, { note })}
              >
                Reject
              </AdminLoadingButton>
              <AdminLoadingButton
                pending={pending}
                size="small"
                variant="secondary"
                onClick={() => void post(`/api/content/reviews/${reviewId}/reopen`, { note })}
              >
                Return
              </AdminLoadingButton>
              <AdminLoadingButton
                pending={pending}
                size="small"
                variant="primary"
                onClick={async () => {
                  const json = await post(`/api/content/reviews/${reviewId}/handoff/blog`, {
                    mode: "CREATE_NEW",
                  });
                  if (json?.adminRoute) window.location.href = json.adminRoute;
                }}
              >
                Tạo Blog Draft
              </AdminLoadingButton>
            </div>
            {!readiness.readyToApprove && (
              <p className="admin-field-hint" style={{ marginTop: 8 }}>
                Nút Approve mở khóa khi mọi mục trong checklist đạt.
              </p>
            )}
            <p className="admin-field-hint" style={{ marginTop: 8 }}>
              <Link href="/admin/content/publishing">Mở Publishing</Link>
            </p>
          </section>

          <section className="admin-sidebar-card" style={{ margin: 0 }}>
            <h3 className="admin-sidebar-title">Activity</h3>
            <ul style={{ fontSize: 12, paddingLeft: 16, margin: 0 }}>
              {(session.decisions ?? [])
                .slice()
                .reverse()
                .map((d, i) => (
                  <li key={`${d.createdAt}-${i}`}>
                    {d.decisionType} · {new Date(d.createdAt).toLocaleString("vi-VN")}
                    {d.note ? ` — ${d.note}` : ""}
                  </li>
                ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
