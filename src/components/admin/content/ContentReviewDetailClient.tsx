"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

type Props = { reviewId: string };

export default function ContentReviewDetailClient({ reviewId }: Props) {
  const toast = useAdminToast();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");
  const [activeSection, setActiveSection] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/content/reviews/${reviewId}`);
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.message ?? "Load failed");
      return;
    }
    setData(json);
    setActiveSection((prev) => {
      if (prev) return prev;
      const sections = (json.session as { sections?: Array<{ sectionId: string }> })?.sections;
      return sections?.[0]?.sectionId ?? "";
    });
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

  if (!data) return <p className="admin-page">Đang tải review…</p>;

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
  const facts = (data.facts as Array<Record<string, unknown>>) ?? [];
  const media = (data.media as Array<Record<string, unknown>>) ?? [];
  const links = (data.internalLinks as Array<Record<string, unknown>>) ?? [];
  const metadata = data.metadata as Record<string, unknown> | null;

  const currentSection = structured?.sections?.find((s) => s.sectionId === activeSection);

  return (
    <div className="admin-page">
      <p className="admin-field-hint">
        <Link href="/admin/content/reviews">← Danh sách</Link>
      </p>
      <h1 className="admin-page-title">Review {session.id.slice(0, 8)}…</h1>
      <p className="admin-field-hint">
        Status: <strong>{session.status}</strong> · Draft v{session.writingDraftVersion} · readiness{" "}
        {readiness.score} · sections {readiness.sectionSummary.approved}/{readiness.sectionSummary.total}
      </p>
      <p className="admin-field-hint">
        Plan {session.writingPlanId.slice(0, 8)}… · Context {session.contextBuildId.slice(0, 8)}…
      </p>

      {readiness.blockingIssues.length > 0 && (
        <div className="admin-sidebar-card" style={{ marginBottom: 12 }}>
          <strong>Blocking</strong>
          {readiness.blockingIssues.map((b) => (
            <p key={b} style={{ color: "#c00", margin: "4px 0" }}>
              {b}
            </p>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 }}>
        <div>
          <h3>Sections</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {session.sections.map((s) => (
              <li key={s.sectionId} style={{ marginBottom: 6 }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--small"
                  onClick={() => setActiveSection(s.sectionId)}
                  style={{ width: "100%", textAlign: "left" }}
                >
                  {s.heading} · {s.status}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          {currentSection && (
            <div className="admin-sidebar-card" style={{ marginBottom: 12 }}>
              <h3>{currentSection.heading}</h3>
              <div
                style={{ maxHeight: 280, overflow: "auto", border: "1px solid #ddd", padding: 8 }}
                dangerouslySetInnerHTML={{
                  __html: currentSection.html || `<p>${currentSection.plainText}</p>`,
                }}
              />
              <textarea
                className="admin-input"
                rows={2}
                placeholder="Ghi chú reviewer"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ marginTop: 8 }}
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
                  Approve
                </AdminLoadingButton>
                <AdminLoadingButton
                  pending={pending}
                  size="small"
                  variant="secondary"
                  onClick={() =>
                    void post(
                      `/api/content/reviews/${reviewId}/sections/${activeSection}/request-changes`,
                      { note }
                    )
                  }
                >
                  Request changes
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
                  Reject
                </AdminLoadingButton>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--small"
                  onClick={() => toast.info("Sửa section qua Writing Engine panel trên SEO Topic.")}
                >
                  Edit via Writing Engine
                </button>
              </div>
            </div>
          )}

          <div className="admin-sidebar-card" style={{ marginBottom: 12 }}>
            <h3>Fact / source inspector</h3>
            <ul style={{ fontSize: 13, paddingLeft: 16 }}>
              {facts
                .filter((f) => !activeSection || f.sectionId === activeSection)
                .map((f) => (
                  <li key={String(f.factId)}>
                    <strong>{String(f.statement)}</strong> · {String(f.factId)} · {String(f.sourceType)} /{" "}
                    {String(f.sourceTitle)}
                    {f.mustUseExactValue ? " · exact" : ""}
                    {f.evidenceUrl ? (
                      <>
                        {" "}
                        · <a href={String(f.evidenceUrl)}>evidence</a>
                      </>
                    ) : null}
                  </li>
                ))}
            </ul>
          </div>

          <div className="admin-sidebar-card" style={{ marginBottom: 12 }}>
            <h3>QA issues</h3>
            <AdminLoadingButton
              pending={pending}
              size="small"
              variant="secondary"
              onClick={() => void post(`/api/content/reviews/${reviewId}/rerun-qa`)}
            >
              Rerun QA
            </AdminLoadingButton>
            <ul style={{ fontSize: 13, paddingLeft: 16, marginTop: 8 }}>
              {session.issues.map((i) => (
                <li key={i.id}>
                  [{i.severity}/{i.status}] {i.code}: {i.message}
                  {i.status === "OPEN" && (
                    <span style={{ marginLeft: 6 }}>
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
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="admin-sidebar-card" style={{ marginBottom: 12 }}>
            <h3>Media / Links / Meta</h3>
            <p className="admin-field-hint">
              Media: {media.length} · Links: {links.length} · Title: {String(metadata?.title ?? "—")}
            </p>
          </div>

          <div className="admin-sidebar-card" style={{ marginBottom: 12 }}>
            <h3>Final actions</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <AdminLoadingButton
                pending={pending}
                size="small"
                variant="primary"
                onClick={() => void post(`/api/content/reviews/${reviewId}/approve`, { note })}
              >
                Approve draft
              </AdminLoadingButton>
              <AdminLoadingButton
                pending={pending}
                size="small"
                variant="secondary"
                onClick={() => void post(`/api/content/reviews/${reviewId}/reject`, { note })}
              >
                Reject draft
              </AdminLoadingButton>
              <AdminLoadingButton
                pending={pending}
                size="small"
                variant="secondary"
                onClick={() => void post(`/api/content/reviews/${reviewId}/reopen`, { note })}
              >
                Reopen
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
            <p className="admin-field-hint">Handoff chỉ tạo Blog DRAFT — không publish.</p>
          </div>

          <div className="admin-sidebar-card">
            <h3>Decision history</h3>
            <ul style={{ fontSize: 12, paddingLeft: 16 }}>
              {session.decisions?.map((d, i) => (
                <li key={i}>
                  {d.decisionType} · {d.actorId} · {new Date(d.createdAt).toLocaleString("vi-VN")}
                  {d.note ? ` — ${d.note}` : ""}
                </li>
              ))}
            </ul>
          </div>

          {structured?.rendered?.html && (
            <div className="admin-sidebar-card" style={{ marginTop: 12 }}>
              <h3>Draft preview</h3>
              <div
                style={{ maxHeight: 240, overflow: "auto", border: "1px solid #ddd", padding: 8 }}
                dangerouslySetInnerHTML={{ __html: structured.rendered.html }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
