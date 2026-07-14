"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AI_RETRIEVAL_ENABLED_CONSUMERS,
  AI_RETRIEVAL_PURPOSES,
  AI_RETRIEVAL_SOURCE_TYPES,
  type AiRetrievalConsumer,
  type AiRetrievalPurpose,
  type AiRetrievalSourceType,
} from "@/features/ai-retrieval/ai-retrieval-types";
import { getAiRetrievalPolicy } from "@/features/ai-retrieval/ai-retrieval-policy";

type RetrievalResponse = {
  requestId: string;
  consumer: string;
  purpose: string;
  query: string;
  policy: Record<string, unknown>;
  facts: Array<Record<string, unknown>>;
  businessRules: Array<Record<string, unknown>>;
  conflicts: Array<Record<string, unknown>>;
  warnings: string[];
  sourcesUsed: Array<{ sourceType: string; count: number }>;
  omitted: Array<{ reason: string; count: number }>;
  sourceManifest: Array<Record<string, unknown>>;
  contextText: string;
  contextJson: Record<string, unknown>;
  generatedAt: string;
  message?: string;
  errors?: string[];
};

const DEFAULT_SOURCES: AiRetrievalSourceType[] = [
  "KNOWLEDGE_BASE",
  "PRODUCT",
  "MANUFACTURING_ASSET",
  "MEDIA_BUNDLE",
  "SEO_TOPIC",
];

export default function AiRetrievalPreviewClient({
  initialConsumer = "SEO_CONTENT",
  initialPurpose = "PUBLIC_OUTPUT",
  initialQuery = "",
  initialSeoTopicId = "",
}: {
  initialConsumer?: AiRetrievalConsumer;
  initialPurpose?: AiRetrievalPurpose;
  initialQuery?: string;
  initialSeoTopicId?: string;
}) {
  const [consumer, setConsumer] = useState<AiRetrievalConsumer>(initialConsumer);
  const [purpose, setPurpose] = useState<AiRetrievalPurpose>(initialPurpose);
  const [query, setQuery] = useState(initialQuery);
  const [sources, setSources] = useState<AiRetrievalSourceType[]>(DEFAULT_SOURCES);
  const [includeMedia, setIncludeMedia] = useState(true);
  const [includeRules, setIncludeRules] = useState(true);
  const [compatibilityMode, setCompatibilityMode] = useState(true);
  const [maxItems, setMaxItems] = useState(30);
  const [seoTopicId, setSeoTopicId] = useState(initialSeoTopicId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RetrievalResponse | null>(null);

  const policy = useMemo(() => getAiRetrievalPolicy(consumer), [consumer]);

  const allowedPurposes = policy.allowedPurposes;

  const toggleSource = (source: AiRetrievalSourceType) => {
    setSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const runQuery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-retrieval/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consumer,
          purpose,
          query,
          sourceTypes: sources,
          includeMedia,
          includeBusinessRules: includeRules,
          includeConflicts: true,
          compatibilityMode,
          maxItems,
          seoTopicIds: seoTopicId.trim() ? [seoTopicId.trim()] : undefined,
        }),
      });
      const data = (await res.json()) as RetrievalResponse;
      if (!res.ok) {
        setError(data.message || data.errors?.join(" ") || "Retrieval failed");
        setResult(null);
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retrieval failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [
    consumer,
    purpose,
    query,
    sources,
    includeMedia,
    includeRules,
    compatibilityMode,
    maxItems,
    seoTopicId,
  ]);

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <p>
          Kiểm tra ngữ cảnh mà các hệ thống AI tương lai sẽ nhận — không gọi LLM, không embeddings.
        </p>
      </div>

      <div className="admin-form" style={{ display: "grid", gap: 12, marginBottom: 24 }}>
        <div className="admin-field">
          <label className="admin-label">Consumer</label>
          <select
            className="admin-input"
            value={consumer}
            onChange={(e) => {
              const next = e.target.value as AiRetrievalConsumer;
              setConsumer(next);
              const nextPolicy = getAiRetrievalPolicy(next);
              if (!nextPolicy.allowedPurposes.includes(purpose)) {
                setPurpose(nextPolicy.allowedPurposes[0]);
              }
            }}
          >
            {AI_RETRIEVAL_ENABLED_CONSUMERS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-field">
          <label className="admin-label">Purpose</label>
          <select
            className="admin-input"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as AiRetrievalPurpose)}
          >
            {allowedPurposes.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
            {AI_RETRIEVAL_PURPOSES.filter((p) => !allowedPurposes.includes(p)).map((id) => (
              <option key={id} value={id} disabled>
                {id} (not allowed)
              </option>
            ))}
          </select>
        </div>

        <div className="admin-field">
          <label className="admin-label">Query</label>
          <input
            className="admin-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="áo polo đồng phục công ty"
          />
        </div>

        <div className="admin-field">
          <label className="admin-label">SEO Topic ID (optional)</label>
          <input
            className="admin-input"
            value={seoTopicId}
            onChange={(e) => setSeoTopicId(e.target.value)}
            placeholder="cuid…"
          />
        </div>

        <div className="admin-field">
          <label className="admin-label">Sources</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {AI_RETRIEVAL_SOURCE_TYPES.filter((s) => policy.sourceScopes.includes(s)).map((source) => (
              <label key={source} className="admin-radio-item">
                <input
                  type="checkbox"
                  checked={sources.includes(source)}
                  onChange={() => toggleSource(source)}
                />
                <span>{source}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <label className="admin-radio-item">
            <input
              type="checkbox"
              checked={includeMedia}
              onChange={(e) => setIncludeMedia(e.target.checked)}
            />
            <span>Include media</span>
          </label>
          <label className="admin-radio-item">
            <input
              type="checkbox"
              checked={includeRules}
              onChange={(e) => setIncludeRules(e.target.checked)}
            />
            <span>Include business rules</span>
          </label>
          <label className="admin-radio-item">
            <input
              type="checkbox"
              checked={compatibilityMode}
              onChange={(e) => setCompatibilityMode(e.target.checked)}
            />
            <span>Compatibility mode (legacy verified)</span>
          </label>
          <label className="admin-field">
            <span className="admin-label">Max results</span>
            <input
              className="admin-input"
              type="number"
              min={1}
              max={60}
              value={maxItems}
              onChange={(e) => setMaxItems(Number(e.target.value) || 30)}
            />
          </label>
        </div>

        <button
          type="button"
          className="admin-btn admin-btn--primary"
          onClick={() => void runQuery()}
          disabled={loading}
        >
          {loading ? "Đang truy vấn…" : "Chạy retrieval"}
        </button>
      </div>

      <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
        <h3 className="admin-sidebar-title">Policy summary</h3>
        <p className="admin-field-hint">
          maxVisibility={policy.maxVisibility} · allowConfidential={String(policy.allowConfidential)} ·
          requireApproved={String(policy.requireApproved)} · requireVerified={String(policy.requireVerified)} ·
          allowStale={String(policy.allowStaleKnowledge)}
        </p>
      </div>

      {error && <p className="admin-kb-warning">{error}</p>}

      {result && (
        <>
          <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
            <h3 className="admin-sidebar-title">Kết quả</h3>
            <p className="admin-field-hint">
              requestId={result.requestId} · facts={result.facts.length} · conflicts=
              {result.conflicts.length} · warnings={result.warnings.length} · omitted=
              {result.omitted.reduce((s, o) => s + o.count, 0)}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => void copyText(result.contextText)}
              >
                Copy context text
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => void copyText(JSON.stringify(result.contextJson, null, 2))}
              >
                Copy context JSON
              </button>
            </div>
          </div>

          {result.warnings.length > 0 && (
            <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
              <h3 className="admin-sidebar-title">Warnings</h3>
              <ul>
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {result.conflicts.length > 0 && (
            <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
              <h3 className="admin-sidebar-title">Conflicts</h3>
              {result.conflicts.map((c) => (
                <div key={String(c.key)} style={{ marginBottom: 8 }}>
                  <strong>{String(c.key)}</strong> — {String(c.warning)} ({String(c.resolution)})
                </div>
              ))}
            </div>
          )}

          <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
            <h3 className="admin-sidebar-title">Source manifest</h3>
            <ul>
              {result.sourcesUsed.map((s) => (
                <li key={s.sourceType}>
                  {s.sourceType}: {s.count}
                </li>
              ))}
            </ul>
            {result.omitted.length > 0 && (
              <p className="admin-field-hint">
                Omitted:{" "}
                {result.omitted.map((o) => `${o.reason}(${o.count})`).join(", ")}
              </p>
            )}
          </div>

          <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
            <h3 className="admin-sidebar-title">Context preview</h3>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, maxHeight: 320, overflow: "auto" }}>
              {result.contextText}
            </pre>
          </div>

          <div className="admin-sidebar-card">
            <h3 className="admin-sidebar-title">Facts</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {result.facts.map((fact) => (
                <div key={String(fact.id)} style={{ borderTop: "1px solid #eee", paddingTop: 8 }}>
                  <strong>{String(fact.title)}</strong>
                  <div className="admin-field-hint">
                    {String(fact.sourceType)} · visibility={String(fact.visibility)} · claim=
                    {String(fact.claimStatus)} · authority={String(fact.authorityRank)} · stale=
                    {String(fact.stale)} · publicOutput={String(fact.publicOutputAllowed)}
                  </div>
                  {fact.adminRoute ? (
                    <a href={String(fact.adminRoute)} className="admin-btn admin-btn--secondary">
                      Open source
                    </a>
                  ) : null}
                  {Array.isArray(fact.warnings) && fact.warnings.length > 0 ? (
                    <p className="admin-kb-warning">{(fact.warnings as string[]).join("; ")}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
