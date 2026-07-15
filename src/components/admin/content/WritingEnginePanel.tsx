"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

type BuildHistoryItem = {
  id: string;
  status: string;
  purpose: string;
  readinessScore: number | null;
  createdAt: string | Date;
  packageHash: string | null;
};

type PlanSummary = {
  id: string;
  status: string;
  contentType: string;
  planHash: string | null;
  readinessScore: number | null;
  sectionCount: number;
  createdAt: string | Date;
};

type WritingPlanLite = {
  id: string;
  planHash: string;
  version: string;
  contentType: string;
  contextBuildId: string;
  readiness: {
    ready: boolean;
    score: number;
    errors: Array<{ code: string; message: string; severity: string }>;
    warnings: Array<{ code: string; message: string; severity: string }>;
  };
  sections: Array<{
    id: string;
    heading: string;
    type: string;
    targetWordCountMin: number;
    targetWordCountMax: number;
    requiredFactIds: string[];
    optionalFactIds: string[];
    mediaAssetIds: string[];
    internalLinkIds: string[];
    status: string;
  }>;
  factPlan: { unallocatedFactIds: string[]; excludedFactIds: string[] };
  mediaPlan: { placements: Array<{ id: string; placement: string; mediaAssetId: string; altText: string }> };
  internalLinkPlan: {
    placements: Array<{ id: string; url: string; anchorText: string; sectionId: string }>;
  };
  ctaPlan: { primary: { text: string; destination?: string | null } };
  keywordPlan: { primaryKeyword: string; secondaryKeywords: string[] };
  schemaPlan: { schemaTypes: string[]; faqEnabled: boolean };
  metadataPlan: { metaTitle: string; metaDescription: string; slug: string };
};

type DraftLite = {
  id: string;
  status: string;
  isMock?: boolean;
  qa?: { passed: boolean; score: number; issues: Array<{ code: string; message: string }> };
  rendered?: { html?: string | null; markdown?: string | null };
};

type Props = {
  topicId: string;
};

export default function WritingEnginePanel({ topicId }: Props) {
  const toast = useAdminToast();
  const [contextBuilds, setContextBuilds] = useState<BuildHistoryItem[]>([]);
  const [contextBuildId, setContextBuildId] = useState("");
  const [contentType, setContentType] = useState("SEO_ARTICLE");
  const [building, setBuilding] = useState(false);
  const [plan, setPlan] = useState<WritingPlanLite | null>(null);
  const [planHistory, setPlanHistory] = useState<PlanSummary[]>([]);
  const [draft, setDraft] = useState<DraftLite | null>(null);
  const [openSection, setOpenSection] = useState("readiness");
  const [mockEnabled, setMockEnabled] = useState(false);
  const [cacheHint, setCacheHint] = useState(false);

  const loadBuilds = useCallback(async () => {
    const res = await fetch(`/api/content/seo/topics/${topicId}/context-builds`);
    const data = await res.json();
    if (res.ok) {
      const builds = (data.builds as BuildHistoryItem[]).filter((b) => b.status === "COMPLETED");
      setContextBuilds(builds);
      if (!contextBuildId && builds[0]) setContextBuildId(builds[0].id);
    }
  }, [topicId, contextBuildId]);

  const loadPlans = useCallback(async () => {
    const res = await fetch(`/api/content/seo/topics/${topicId}/writing-plans`);
    const data = await res.json();
    if (res.ok) {
      setPlanHistory((data.plans as PlanSummary[]) ?? []);
      setMockEnabled(Boolean(data.mockEnabled));
    }
  }, [topicId]);

  useEffect(() => {
    void loadBuilds();
    void loadPlans();
  }, [loadBuilds, loadPlans]);

  async function buildPlan(forceRebuild = false) {
    if (!contextBuildId) {
      toast.error("Chọn Context Build đã hoàn thành");
      return;
    }
    setBuilding(true);
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}/writing-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextBuildId, contentType, forceRebuild }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Không thể tạo plan");
      setPlan(data.plan as WritingPlanLite);
      setCacheHint(Boolean(data.cacheHint));
      setDraft(null);
      toast.success(
        data.cacheHint ? "Cache hit — tái sử dụng Writing Plan." : "Đã tạo Writing Plan (không LLM)."
      );
      await loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Build plan thất bại");
    } finally {
      setBuilding(false);
    }
  }

  async function createDraftShell() {
    if (!plan?.id) return;
    setBuilding(true);
    try {
      const res = await fetch(`/api/content/writing-plans/${plan.id}/create-draft`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Không thể tạo draft");
      setDraft(data.draft as DraftLite);
      toast.success("Draft shell trống — chưa có văn bản.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tạo draft thất bại");
    } finally {
      setBuilding(false);
    }
  }

  async function runQa() {
    if (!draft?.id) return;
    setBuilding(true);
    try {
      const res = await fetch(`/api/content/writing-drafts/${draft.id}/qa`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "QA thất bại");
      setDraft(data.draft as DraftLite);
      toast.info(data.qa.passed ? "QA passed" : "QA có cảnh báo/lỗi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "QA thất bại");
    } finally {
      setBuilding(false);
    }
  }

  async function renderPreview() {
    if (!draft?.id) return;
    setBuilding(true);
    try {
      const res = await fetch(`/api/content/writing-drafts/${draft.id}/render`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Render thất bại");
      setDraft(data.draft as DraftLite);
      toast.success("Đã render preview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Render thất bại");
    } finally {
      setBuilding(false);
    }
  }

  async function mockGenerate() {
    if (!draft?.id) return;
    setBuilding(true);
    try {
      const res = await fetch(`/api/content/writing-drafts/${draft.id}/mock-generate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Mock thất bại");
      setDraft(data.draft as DraftLite);
      toast.info("MOCK — không phải nội dung production");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mock thất bại");
    } finally {
      setBuilding(false);
    }
  }

  function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    const open = openSection === id;
    return (
      <div className="admin-sidebar-card" style={{ marginTop: 8 }}>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          onClick={() => setOpenSection(open ? "" : id)}
        >
          {open ? "Thu gọn" : "Mở"} · {title}
        </button>
        {open ? <div style={{ marginTop: 8 }}>{children}</div> : null}
      </div>
    );
  }

  return (
    <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
      <h3 className="admin-sidebar-title">Writing Engine</h3>
      <p className="admin-field-hint">
        Lập kế hoạch nội dung provider-neutral từ Context Build. Không gọi LLM production, không tạo Blog.
      </p>

      <div className="admin-field">
        <label className="admin-label">Context Build (COMPLETED)</label>
        <select
          className="admin-input"
          value={contextBuildId}
          onChange={(e) => setContextBuildId(e.target.value)}
        >
          <option value="">— Chọn build —</option>
          {contextBuilds.map((b) => (
            <option key={b.id} value={b.id}>
              {b.id.slice(0, 8)}… · {b.purpose} · score {b.readinessScore ?? "—"}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-field">
        <label className="admin-label">Content type</label>
        <select className="admin-input" value={contentType} onChange={(e) => setContentType(e.target.value)}>
          <option value="SEO_ARTICLE">SEO_ARTICLE</option>
          <option value="LANDING_PAGE">LANDING_PAGE</option>
          <option value="PRODUCT_GUIDE">PRODUCT_GUIDE</option>
          <option value="CASE_STUDY">CASE_STUDY</option>
          <option value="KNOWLEDGE_ARTICLE">KNOWLEDGE_ARTICLE</option>
        </select>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <AdminLoadingButton pending={building} variant="primary" size="small" onClick={() => void buildPlan(false)}>
          Tạo Writing Plan
        </AdminLoadingButton>
        <AdminLoadingButton pending={building} variant="secondary" size="small" onClick={() => void buildPlan(true)}>
          Rebuild plan
        </AdminLoadingButton>
        {plan?.readiness.ready && (
          <AdminLoadingButton pending={building} variant="secondary" size="small" onClick={() => void createDraftShell()}>
            Tạo Draft shell (trống)
          </AdminLoadingButton>
        )}
        {draft?.id && (
          <>
            <AdminLoadingButton pending={building} variant="secondary" size="small" onClick={() => void runQa()}>
              Chạy QA
            </AdminLoadingButton>
            <AdminLoadingButton pending={building} variant="secondary" size="small" onClick={() => void renderPreview()}>
              Render preview
            </AdminLoadingButton>
          </>
        )}
        {mockEnabled && draft?.id && (
          <AdminLoadingButton pending={building} variant="secondary" size="small" onClick={() => void mockGenerate()}>
            Tạo bản nháp mô phỏng (MOCK)
          </AdminLoadingButton>
        )}
      </div>

      {cacheHint && <p className="admin-field-hint">Cache hit — cùng inputHash.</p>}

      {plan && (
        <>
          <p className="admin-field-hint">
            Plan {plan.id.slice(0, 10)}… · hash {plan.planHash.slice(0, 12)} · {plan.version} ·{" "}
            {plan.readiness.ready ? "READY" : "INVALID"} · score {plan.readiness.score}
          </p>

          <Section id="readiness" title="Readiness">
            {plan.readiness.errors.length === 0 && plan.readiness.warnings.length === 0 ? (
              <p className="admin-field-hint">Không có lỗi/cảnh báo.</p>
            ) : (
              <>
                {plan.readiness.errors.map((e) => (
                  <p key={e.code} style={{ color: "var(--admin-danger, #c00)" }}>
                    [{e.severity}] {e.message}
                  </p>
                ))}
                {plan.readiness.warnings.map((e) => (
                  <p key={e.code} className="admin-field-hint">
                    [{e.severity}] {e.message}
                  </p>
                ))}
              </>
            )}
          </Section>

          <Section id="sections" title={`Sections (${plan.sections.length})`}>
            <ul style={{ fontSize: 13, paddingLeft: 16 }}>
              {plan.sections.map((s) => (
                <li key={s.id}>
                  <strong>{s.heading}</strong> ({s.type}) · {s.targetWordCountMin}-{s.targetWordCountMax} từ · facts{" "}
                  {s.requiredFactIds.length}+{s.optionalFactIds.length}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="facts" title="Fact allocation">
            <p className="admin-field-hint">
              Unallocated: {plan.factPlan.unallocatedFactIds.join(", ") || "—"} · Excluded:{" "}
              {plan.factPlan.excludedFactIds.join(", ") || "—"}
            </p>
          </Section>

          <Section id="media" title="Media">
            <ul style={{ fontSize: 13, paddingLeft: 16 }}>
              {plan.mediaPlan.placements.map((m) => (
                <li key={m.id}>
                  {m.placement} · {m.mediaAssetId.slice(0, 8)}… · alt: {m.altText}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="links" title="Internal links">
            <ul style={{ fontSize: 13, paddingLeft: 16 }}>
              {plan.internalLinkPlan.placements.map((l) => (
                <li key={l.id}>
                  {l.anchorText} → {l.url}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="meta" title="Metadata / CTA / Schema">
            <p className="admin-field-hint">
              SEO: {plan.metadataPlan.metaTitle} · slug {plan.metadataPlan.slug}
            </p>
            <p className="admin-field-hint">
              CTA: {plan.ctaPlan.primary.text} → {plan.ctaPlan.primary.destination ?? "—"}
            </p>
            <p className="admin-field-hint">
              Keywords: {plan.keywordPlan.primaryKeyword} · Schema: {plan.schemaPlan.schemaTypes.join(", ")}
            </p>
          </Section>
        </>
      )}

      {draft && (
        <Section id="draft" title={`Draft ${draft.id.slice(0, 8)}… (${draft.status})`}>
          {draft.isMock && <p style={{ color: "orange" }}>MOCK OUTPUT — NOT PRODUCTION</p>}
          {draft.qa && (
            <p className="admin-field-hint">
              QA: {draft.qa.passed ? "passed" : "failed"} · score {draft.qa.score} · issues {draft.qa.issues.length}
            </p>
          )}
          {draft.rendered?.html && (
            <div
              className="admin-field-hint"
              style={{ maxHeight: 240, overflow: "auto", border: "1px solid #ddd", padding: 8 }}
              dangerouslySetInnerHTML={{ __html: draft.rendered.html }}
            />
          )}
        </Section>
      )}

      {planHistory.length > 0 && (
        <Section id="history" title="Plan history">
          <ul style={{ fontSize: 12, paddingLeft: 16 }}>
            {planHistory.slice(0, 8).map((p) => (
              <li key={p.id}>
                {p.id.slice(0, 8)}… · {p.contentType} · {p.status} · {p.sectionCount} sections
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
