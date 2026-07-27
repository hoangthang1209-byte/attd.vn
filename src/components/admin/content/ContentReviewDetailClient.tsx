"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { AdminLoadingState, EmptyState, StatusBadge } from "@/components/admin/AdminUi";
import { REVIEW_STATUS_LABELS } from "@/features/content/editorial/editorial-ux";

type Props = { reviewId: string };

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

  async function post(path: string, body?: Record<string, unknown>) {
    setPending(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed");
      toast.success(json.message ?? "OK");
      await load();
      return json;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  if (loading) return <AdminLoadingState label="Đang tải kiểm duyệt…" rows={4} />;
  if (loadError || !data) {
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
  const readiness = data.readiness as {
    readyToApprove: boolean;
    score: number;
    blockingIssues: string[];
    warnings: string[];
    sectionSummary: { approved: number; total: number };
  };
  const structured = data.structuredDraft as {
    title?: string;
    sections?: Array<{ sectionId: string; heading: string; html: string; plainText: string }>;
    rendered?: { html?: string | null };
  } | null;
  const media = (data.media as Array<Record<string, unknown>>) ?? [];
  const links = (data.internalLinks as Array<Record<string, unknown>>) ?? [];
  const metadata = data.metadata as Record<string, unknown> | null;

  const currentSection = structured?.sections?.find((s) => s.sectionId === activeSection);
  const reviewLabel = structured?.title
    ? String(structured.title)
    : `Kiểm duyệt ${session.id.slice(0, 8)}…`;
  const openIssues = session.issues.filter((i) => i.status === "OPEN");

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
              Draft v{session.writingDraftVersion} · QA {readiness.score} ·{" "}
              {readiness.sectionSummary.approved}/{readiness.sectionSummary.total} đoạn đã duyệt
            </span>
          </p>
        </div>
      </div>

      {readiness.blockingIssues.length > 0 && (
        <div className="admin-message admin-message--error" style={{ marginBottom: 12 }}>
          <strong>Cần xử lý trước khi duyệt:</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {readiness.blockingIssues.map((b) => (
              <li key={b}>{b}</li>
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
          <section className="admin-sidebar-card" style={{ margin: 0 }}>
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
                    onClick={() =>
                      void post(`/api/content/reviews/${reviewId}/sections/${activeSection}/reject`, {
                        note,
                      })
                    }
                  >
                    Reject đoạn
                  </AdminLoadingButton>
                </div>
              </>
            ) : (
              <p className="admin-field-hint">Chọn một đoạn bên trái để ghi chú.</p>
            )}
          </section>

          <section className="admin-sidebar-card" style={{ margin: 0 }}>
            <h3 className="admin-sidebar-title">Decision</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <AdminLoadingButton
                pending={pending}
                size="small"
                variant="primary"
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
