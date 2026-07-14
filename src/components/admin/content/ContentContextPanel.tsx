"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

type Readiness = {
  ready: boolean;
  score: number;
  errors: string[];
  warnings: string[];
};

type PackageLite = {
  id: string;
  contentPurpose: string;
  facts: Array<{
    factId: string;
    statement: string;
    sourceType: string;
    authorityRank: number;
    visibility: string;
    evidenceUrl?: string | null;
    stale: boolean;
    required: boolean;
  }>;
  businessRules: Array<{ ruleId: string; title: string }>;
  missingFacts: Array<{ key: string; description: string; blocking: boolean }>;
  conflicts: Array<{ key: string; warning: string; resolution: string; publicUseAllowed: boolean }>;
  prohibitedClaims: Array<{ key: string; reason: string; severity: string }>;
  media: {
    bundle?: { id: string; name: string } | null;
    selectedAssets: Array<{ id: string; slotType: string; url: string; altText?: string | null }>;
    coverage: { missingRequiredSlots: string[] };
    warnings: string[];
  };
  internalLinks: Array<{
    url: string;
    anchorText: string;
    recommendation: string;
    status: string;
  }>;
  brand: { tone?: string | null; voiceRules: string[] };
  outputRules: { publicOutputOnly: boolean; mustNotInventFacts: boolean };
  sourceManifest: Array<{ factId: string; sourceType: string; title: string; visibility: string }>;
  budget: {
    requestedMaxCharacters: number;
    actualCharacters: number;
    estimatedInputTokens?: number | null;
    sectionsTrimmed: string[];
    factsDropped: number;
    mediaDropped: number;
  };
  diagnostics: {
    factCount: number;
    readinessScore: number;
    conflictCount: number;
    blockingConflictCount: number;
  };
  contextText: string;
  brief: { workingTitle?: string | null; approved: boolean };
  topic: { title: string; primaryKeyword: string };
};

type BuildHistoryItem = {
  id: string;
  status: string;
  purpose: string;
  readinessScore: number | null;
  cacheHint?: boolean;
  createdAt: string | Date;
  packageHash: string | null;
};

type Props = {
  topicId: string;
};

export default function ContentContextPanel({ topicId }: Props) {
  const toast = useAdminToast();
  const [building, setBuilding] = useState(false);
  const [cacheHit, setCacheHit] = useState(false);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [pkg, setPkg] = useState<PackageLite | null>(null);
  const [history, setHistory] = useState<BuildHistoryItem[]>([]);
  const [openSection, setOpenSection] = useState<string>("readiness");
  const [purpose, setPurpose] = useState("SEO_ARTICLE");

  const loadHistory = useCallback(async () => {
    const res = await fetch(`/api/content/seo/topics/${topicId}/context-builds`);
    const data = await res.json();
    if (res.ok) setHistory((data.builds as BuildHistoryItem[]) ?? []);
  }, [topicId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function build(forceRefresh = false) {
    setBuilding(true);
    try {
      const res = await fetch(`/api/content/seo/topics/${topicId}/build-context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          preview: true,
          includeMedia: true,
          includeSuggestedInternalLinks: true,
          forceRefreshRetrieval: forceRefresh,
          maxCharacters: 40000,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Build thất bại");
      setCacheHit(Boolean(data.cacheHit));
      setReadiness(data.readiness as Readiness);
      setPkg(data.package as PackageLite);
      toast.success(
        data.cacheHit
          ? "Cache hit — tái sử dụng Context Package."
          : "Đã xây dựng Context Package (không tạo bài viết).",
      );
      await loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Build thất bại");
    } finally {
      setBuilding(false);
    }
  }

  async function copyText(kind: "json" | "text") {
    if (!pkg) return;
    const value =
      kind === "json" ? JSON.stringify(pkg, null, 2) : pkg.contextText;
    await navigator.clipboard.writeText(value);
    toast.success(kind === "json" ? "Đã copy context JSON" : "Đã copy context text");
  }

  function Section({
    id,
    title,
    children,
  }: {
    id: string;
    title: string;
    children: React.ReactNode;
  }) {
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
      <h3 className="admin-sidebar-title">Content Context Package</h3>
      <p className="admin-field-hint">
        Gói ngữ cảnh governed cho writer tương lai. Không gọi AI, không tạo bài viết, không publish.
      </p>

      <div className="admin-field">
        <label className="admin-label">Purpose</label>
        <select
          className="admin-input"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        >
          <option value="SEO_ARTICLE">SEO_ARTICLE</option>
          <option value="SEO_LANDING_PAGE">SEO_LANDING_PAGE</option>
          <option value="PRODUCT_GUIDE">PRODUCT_GUIDE</option>
          <option value="CASE_STUDY">CASE_STUDY</option>
          <option value="KNOWLEDGE_ARTICLE">KNOWLEDGE_ARTICLE</option>
          <option value="CONTENT_REVIEW">CONTENT_REVIEW</option>
        </select>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <AdminLoadingButton
          type="button"
          pending={building}
          variant="primary"
          size="small"
          onClick={() => void build(false)}
        >
          Xây dựng Context Package
        </AdminLoadingButton>
        <AdminLoadingButton
          type="button"
          pending={building}
          variant="secondary"
          size="small"
          onClick={() => void build(true)}
        >
          Rebuild (force)
        </AdminLoadingButton>
        <Link
          href={`/admin/content/ai-retrieval?consumer=SEO_CONTENT&purpose=CONTENT_WRITING&seoTopicId=${encodeURIComponent(topicId)}`}
          className="admin-btn admin-btn--secondary admin-btn--small"
        >
          Open Retrieval Context
        </Link>
        {pkg && (
          <>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              onClick={() => void copyText("json")}
            >
              Copy context JSON
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              onClick={() => void copyText("text")}
            >
              Copy context text
            </button>
          </>
        )}
      </div>

      {cacheHit && <p className="admin-field-hint">Cache hit: true</p>}

      {readiness && (
        <Section id="readiness" title={`Readiness · ${readiness.score}/100`}>
          <p>
            {readiness.ready ? "Ready" : "Not ready"} · score {readiness.score}
          </p>
          {readiness.errors.length > 0 && (
            <ul>
              {readiness.errors.map((e) => (
                <li key={e} className="admin-error">
                  {e}
                </li>
              ))}
            </ul>
          )}
          {readiness.warnings.length > 0 && (
            <ul className="admin-field-hint">
              {readiness.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {pkg && (
        <>
          <Section id="topic" title="Topic and Brief">
            <p>
              {pkg.topic.title} · {pkg.topic.primaryKeyword}
            </p>
            <p className="admin-field-hint">
              Brief: {pkg.brief.workingTitle ?? "—"} ·{" "}
              {pkg.brief.approved ? "Đã duyệt" : "Chưa duyệt"}
            </p>
          </Section>

          <Section id="facts" title={`Facts (${pkg.facts.length})`}>
            <ul style={{ fontSize: 13, paddingLeft: 16 }}>
              {pkg.facts.slice(0, 20).map((f) => (
                <li key={f.factId}>
                  [{f.sourceType} · auth {f.authorityRank}
                  {f.required ? " · required" : ""}
                  {f.stale ? " · stale" : ""}
                  {f.evidenceUrl ? " · evidence" : ""}] {f.statement.slice(0, 160)}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="rules" title={`Business rules (${pkg.businessRules.length})`}>
            <ul style={{ fontSize: 13, paddingLeft: 16 }}>
              {pkg.businessRules.map((r) => (
                <li key={r.ruleId}>{r.title}</li>
              ))}
            </ul>
          </Section>

          <Section id="missing" title={`Missing facts (${pkg.missingFacts.length})`}>
            <ul style={{ fontSize: 13, paddingLeft: 16 }}>
              {pkg.missingFacts.map((m) => (
                <li key={m.key}>
                  {m.blocking ? "[BLOCKING] " : ""}
                  {m.key}: {m.description}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="conflicts" title={`Conflicts (${pkg.conflicts.length})`}>
            <ul style={{ fontSize: 13, paddingLeft: 16 }}>
              {pkg.conflicts.map((c) => (
                <li key={c.key}>
                  {c.key} · {c.resolution} · {c.warning}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="prohibited" title="Prohibited information">
            <ul style={{ fontSize: 13, paddingLeft: 16 }}>
              {pkg.prohibitedClaims.map((p) => (
                <li key={p.key}>
                  [{p.severity}] {p.reason}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="media" title="Media plan">
            <p className="admin-field-hint">
              Bundle: {pkg.media.bundle?.name ?? "—"} · assets{" "}
              {pkg.media.selectedAssets.length}
            </p>
            {pkg.media.coverage.missingRequiredSlots.length > 0 && (
              <p>Missing slots: {pkg.media.coverage.missingRequiredSlots.join(", ")}</p>
            )}
            <ul style={{ fontSize: 13, paddingLeft: 16 }}>
              {pkg.media.selectedAssets.slice(0, 12).map((a) => (
                <li key={`${a.id}-${a.slotType}`}>
                  {a.slotType}: {a.altText || a.url}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="links" title={`Internal links (${pkg.internalLinks.length})`}>
            <ul style={{ fontSize: 13, paddingLeft: 16 }}>
              {pkg.internalLinks.map((l) => (
                <li key={`${l.url}-${l.anchorText}`}>
                  [{l.recommendation}/{l.status}] {l.anchorText} → {l.url}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="brand" title="Brand and CTA">
            <p>Tone: {pkg.brand.tone ?? "professional_b2b"}</p>
            <ul style={{ fontSize: 13, paddingLeft: 16 }}>
              {pkg.brand.voiceRules.slice(0, 6).map((r) => (
                <li key={r.slice(0, 40)}>{r}</li>
              ))}
            </ul>
          </Section>

          <Section id="rules-out" title="Output rules">
            <p className="admin-field-hint">
              publicOutputOnly={String(pkg.outputRules.publicOutputOnly)} · mustNotInventFacts=
              {String(pkg.outputRules.mustNotInventFacts)}
            </p>
          </Section>

          <Section id="sources" title={`Sources (${pkg.sourceManifest.length})`}>
            <ul style={{ fontSize: 13, paddingLeft: 16 }}>
              {pkg.sourceManifest.slice(0, 30).map((s) => (
                <li key={s.factId}>
                  {s.sourceType} · {s.visibility} · {s.title}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="budget" title="Budget">
            <p className="admin-field-hint">
              {pkg.budget.actualCharacters}/{pkg.budget.requestedMaxCharacters} chars · ~{" "}
              {pkg.budget.estimatedInputTokens ?? "—"} tokens · dropped facts{" "}
              {pkg.budget.factsDropped} / media {pkg.budget.mediaDropped}
            </p>
            {pkg.budget.sectionsTrimmed.length > 0 && (
              <p>Trimmed: {pkg.budget.sectionsTrimmed.join(", ")}</p>
            )}
            <p>
              Diagnostics: facts {pkg.diagnostics.factCount} · conflicts{" "}
              {pkg.diagnostics.conflictCount} (blocking{" "}
              {pkg.diagnostics.blockingConflictCount})
            </p>
          </Section>

          <Section id="preview" title="Context preview">
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 12,
                maxHeight: 280,
                overflow: "auto",
                background: "rgba(0,0,0,0.04)",
                padding: 8,
              }}
            >
              {pkg.contextText.slice(0, 4000)}
              {pkg.contextText.length > 4000 ? "\n…" : ""}
            </pre>
          </Section>
        </>
      )}

      <Section id="history" title={`Build history (${history.length})`}>
        <ul style={{ fontSize: 13, paddingLeft: 16 }}>
          {history.map((h) => (
            <li key={h.id}>
              {h.status} · {h.purpose} · score {h.readinessScore ?? "—"} ·{" "}
              {new Date(h.createdAt).toLocaleString("vi-VN")}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
