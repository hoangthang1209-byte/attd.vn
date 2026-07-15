"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

type BenchmarkRow = {
  benchmarkId: string;
  query: string;
  consumer: string;
  expectedPaths: Array<{ fromEntityType: string; relationshipType: string; toEntityType: string }>;
  pathsFound: Array<{ matchedOn: string; fromEntityType: string; relationshipType: string; toEntityType: string }>;
  missingRequiredPaths: Array<{ fromEntityType: string; relationshipType: string; toEntityType: string }>;
  baseline: { factCount: number; chars: number; sourceCount: number; durationMs: number };
  expanded: {
    factCount: number;
    chars: number;
    sourceCount: number;
    durationMs: number;
    scopeEntityCount: number;
    pathCount: number;
    graphPaths: string[];
    warnings: string[];
  };
  relevantAddedEntities: string[];
  irrelevantAddedEntities: string[];
  duplicateAddedEntities: string[];
  conflictsUnresolved: number;
  judgment: {
    precision: number;
    recall: number;
    contextGrowthPercent: number;
    directAuthorityPreserved: boolean;
    visibilitySafe: boolean;
    conflictSafe: boolean;
    expectedPathsFound: number;
    expectedPathsTotal: number;
  };
  metrics: { improved: boolean; baselineParity?: number; mediaBundleUseful?: boolean };
  gaps: string[];
  graphContextBudget?: {
    baselineCharacters?: number;
    graphAllowance?: number;
    proposedGraphCharacters?: number;
    acceptedGraphCharacters?: number;
    finalCharacters?: number | null;
    proposedGrowthPercent?: number;
    acceptedGrowthPercent?: number;
    actualGrowthPercent?: number | null;
    hardCapFallbackUsed?: boolean;
    fallbackToBaseline?: boolean;
    factsTrimmed?: unknown[];
    blogCandidatesTrimmed?: number;
    mediaItemsTrimmed?: number;
    valueRetainedPerCharacter?: number | null;
  } | null;
  baselineParity?: number;
};

type RunResult = {
  overallVerdict: string;
  overallReasons: string[];
  recommendation: { recommendation: string; rationale: string };
  byConsumer: Array<{ consumer: string; verdict: string; improvedCount: number; reasons: string[] }>;
  productionFlags: Record<string, unknown>;
  durationMs: number;
  runId?: string;
  benchmarks: BenchmarkRow[];
};

export default function KnowledgeGraphEvaluationClient() {
  const toast = useAdminToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [consumers, setConsumers] = useState("SEO_TOPIC_PLANNER,SEO_BRIEF");
  const [selected, setSelected] = useState<BenchmarkRow | null>(null);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/knowledge-graph/evaluation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consumers: consumers.split(",").map((s) => s.trim()).filter(Boolean),
          depth: 1,
          persist: true,
        }),
      });
      const json = (await res.json()) as RunResult & { message?: string };
      if (!res.ok) {
        toast.error(json.message ?? "Evaluation failed");
        return;
      }
      setResult(json);
      setSelected(json.benchmarks[0] ?? null);
      toast.success(`Evaluation ${json.overallVerdict}`);
    } finally {
      setLoading(false);
    }
  }

  async function markIrrelevant(row: BenchmarkRow, key: string) {
    const res = await fetch("/api/admin/knowledge-graph/evaluation/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: result?.runId,
        benchmarkId: row.benchmarkId,
        targetType: "ENTITY",
        targetKey: key,
        label: "IRRELEVANT",
        note: "Marked irrelevant from evaluation UI",
      }),
    });
    if (!res.ok) {
      toast.error("Annotation failed");
      return;
    }
    toast.success("Annotated (graph relation unchanged)");
  }

  return (
    <div className="admin-page">
      <p>
        <Link href="/admin/knowledge-graph">← Knowledge Graph</Link>
        {" · "}
        <Link href="/admin/knowledge-graph/relationships">Relations</Link>
        {" · "}
        <Link href="/admin/knowledge-graph/health">Health</Link>
      </p>

      <div className="admin-sidebar-card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Governed graph retrieval evaluation</h3>
        <p style={{ fontSize: 13, maxWidth: 720 }}>
          Compares baseline Retrieval with evaluation-only graph expansion. Production flags stay
          off. No AI judge. Thresholds drive PASS / CONDITIONAL_PASS / FAIL and a pilot recommendation.
        </p>
        <label style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Consumers</label>
        <input
          className="admin-input"
          value={consumers}
          onChange={(e) => setConsumers(e.target.value)}
          style={{ width: "min(420px, 100%)", marginRight: 8 }}
        />
        <button type="button" className="admin-btn" disabled={loading} onClick={() => void run()}>
          {loading ? "Running…" : "Run all benchmarks"}
        </button>
      </div>

      {result ? (
        <div style={{ marginBottom: 16 }}>
          <div className="admin-sidebar-card" style={{ padding: 16, marginBottom: 12 }}>
            <strong>Verdict:</strong> {result.overallVerdict}
            <div style={{ fontSize: 13, marginTop: 6 }}>
              Recommendation: {result.recommendation.recommendation} — {result.recommendation.rationale}
            </div>
            <div style={{ fontSize: 12, marginTop: 6, color: "#555" }}>
              Duration {result.durationMs}ms · run {result.runId ?? "(not persisted)"}
            </div>
            <pre style={{ fontSize: 11, marginTop: 8, overflow: "auto" }}>
              {JSON.stringify({ flags: result.productionFlags, byConsumer: result.byConsumer, reasons: result.overallReasons }, null, 2)}
            </pre>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 12 }}>
            <div className="admin-sidebar-card" style={{ padding: 12 }}>
              <h4 style={{ marginTop: 0 }}>Benchmarks</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13 }}>
                {result.benchmarks.map((b) => (
                  <li key={`${b.consumer}-${b.benchmarkId}`} style={{ marginBottom: 6 }}>
                    <button
                      type="button"
                      className="admin-btn"
                      style={{ width: "100%", textAlign: "left", fontSize: 12 }}
                      onClick={() => setSelected(b)}
                    >
                      [{b.consumer}] {b.query}
                      <br />
                      <span style={{ opacity: 0.7 }}>
                        {b.metrics.improved ? "improved" : "not improved"} · P
                        {b.judgment.precision.toFixed(2)} · Δ
                        {b.judgment.contextGrowthPercent.toFixed(0)}%
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {selected ? (
              <div className="admin-sidebar-card" style={{ padding: 16 }}>
                <h3 style={{ marginTop: 0 }}>
                  {selected.query} · {selected.consumer}
                </h3>
                <p style={{ fontSize: 13 }}>
                  Paths {selected.judgment.expectedPathsFound}/{selected.judgment.expectedPathsTotal} ·
                  authority {selected.judgment.directAuthorityPreserved ? "ok" : "FAIL"} · visibility{" "}
                  {selected.judgment.visibilitySafe ? "ok" : "FAIL"} · conflicts{" "}
                  {selected.judgment.conflictSafe ? "ok" : "FAIL"} · unresolved{" "}
                  {selected.conflictsUnresolved} · baseline parity{" "}
                  {(selected.baselineParity ?? selected.metrics.baselineParity ?? 1).toFixed(2)}
                  {selected.metrics.mediaBundleUseful ? " · media useful" : ""}
                </p>

                {selected.graphContextBudget ? (
                  <section style={{ marginBottom: 12 }}>
                    <h4>Context budget diagnostics</h4>
                    <ul style={{ fontSize: 13 }}>
                      <li>Baseline chars: {selected.graphContextBudget.baselineCharacters}</li>
                      <li>Graph allowance: {selected.graphContextBudget.graphAllowance}</li>
                      <li>
                        Proposed: {selected.graphContextBudget.proposedGraphCharacters} (
                        {selected.graphContextBudget.proposedGrowthPercent}%)
                      </li>
                      <li>
                        Accepted: {selected.graphContextBudget.acceptedGraphCharacters} (
                        {selected.graphContextBudget.acceptedGrowthPercent}%)
                      </li>
                      <li>
                        Actual growth: {selected.graphContextBudget.actualGrowthPercent ?? "—"}% ·
                        final {selected.graphContextBudget.finalCharacters ?? "—"}
                      </li>
                      <li>
                        Hard-cap fallback:{" "}
                        {selected.graphContextBudget.hardCapFallbackUsed ? "yes" : "no"} · baseline
                        fallback: {selected.graphContextBudget.fallbackToBaseline ? "yes" : "no"}
                      </li>
                      <li>
                        Trimmed facts: {selected.graphContextBudget.factsTrimmed?.length ?? 0} · blogs{" "}
                        {selected.graphContextBudget.blogCandidatesTrimmed ?? 0} · media{" "}
                        {selected.graphContextBudget.mediaItemsTrimmed ?? 0}
                      </li>
                      <li>
                        Value/char: {selected.graphContextBudget.valueRetainedPerCharacter ?? "—"}
                      </li>
                    </ul>
                  </section>
                ) : null}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <section>
                    <h4>Baseline</h4>
                    <ul style={{ fontSize: 13 }}>
                      <li>Facts: {selected.baseline.factCount}</li>
                      <li>Sources: {selected.baseline.sourceCount}</li>
                      <li>Chars: {selected.baseline.chars}</li>
                      <li>ms: {selected.baseline.durationMs}</li>
                    </ul>
                  </section>
                  <section>
                    <h4>Graph preview</h4>
                    <ul style={{ fontSize: 13 }}>
                      <li>Facts: {selected.expanded.factCount}</li>
                      <li>Sources: {selected.expanded.sourceCount}</li>
                      <li>Chars: {selected.expanded.chars}</li>
                      <li>Scopes: {selected.expanded.scopeEntityCount}</li>
                      <li>Paths: {selected.expanded.pathCount}</li>
                      <li>ms: {selected.expanded.durationMs}</li>
                    </ul>
                  </section>
                </div>

                <h4>Expected paths</h4>
                <ul style={{ fontSize: 12 }}>
                  {selected.expectedPaths.map((p, i) => (
                    <li key={i}>
                      {p.fromEntityType} → {p.relationshipType} → {p.toEntityType}
                    </li>
                  ))}
                </ul>

                <h4>Paths found</h4>
                <ul style={{ fontSize: 12 }}>
                  {selected.pathsFound.slice(0, 20).map((p, i) => (
                    <li key={i}>{p.matchedOn}</li>
                  ))}
                </ul>

                <h4>Relevant additions</h4>
                <ul style={{ fontSize: 12 }}>
                  {selected.relevantAddedEntities.slice(0, 15).map((k) => (
                    <li key={k}>
                      {k}{" "}
                      <button type="button" className="admin-btn" style={{ fontSize: 11 }} onClick={() => void markIrrelevant(selected, k)}>
                        Mark irrelevant
                      </button>
                    </li>
                  ))}
                </ul>

                <h4>Irrelevant / duplicates</h4>
                <p style={{ fontSize: 12 }}>
                  Irrelevant: {selected.irrelevantAddedEntities.slice(0, 10).join(", ") || "—"}
                  <br />
                  Duplicates: {selected.duplicateAddedEntities.slice(0, 10).join(", ") || "—"}
                </p>

                <h4>Curation gaps</h4>
                <ul style={{ fontSize: 12 }}>
                  {selected.gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>

                <p style={{ fontSize: 12 }}>
                  <Link href="/admin/knowledge-graph/relationships">Open relations</Link>
                  {" · "}
                  <Link href="/admin/knowledge-graph">Open entities</Link>
                  {" · "}
                  <button type="button" className="admin-btn" disabled={loading} onClick={() => void run()}>
                    Rerun evaluation
                  </button>
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
