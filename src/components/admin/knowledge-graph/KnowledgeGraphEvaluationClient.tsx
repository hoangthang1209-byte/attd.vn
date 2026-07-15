"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { KNOWLEDGE_GRAPH_EVALUATION_CASES } from "@/features/knowledge-graph/knowledge-graph-evaluation";

export default function KnowledgeGraphEvaluationClient() {
  const toast = useAdminToast();
  const [caseId, setCaseId] = useState(KNOWLEDGE_GRAPH_EVALUATION_CASES[0]?.id ?? "");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/knowledge-graph/evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, preview: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? "Evaluation failed");
        return;
      }
      setResult(json);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-page">
      <p>
        <Link href="/admin/knowledge-graph">← Knowledge Graph</Link>
      </p>
      <div className="admin-sidebar-card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Local / admin graph expansion preview</h3>
        <p style={{ fontSize: 13 }}>
          Production Retrieval remains unchanged while{" "}
          <code>KNOWLEDGE_GRAPH_EXPANSION_ENABLED</code> is off. This preview is scoped and
          authorized.
        </p>
        <select
          className="admin-input"
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
          style={{ marginRight: 8 }}
        >
          {KNOWLEDGE_GRAPH_EVALUATION_CASES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.query}
            </option>
          ))}
        </select>
        <button type="button" className="admin-btn" disabled={loading} onClick={() => void run()}>
          {loading ? "Running…" : "Run baseline vs graph preview"}
        </button>
      </div>
      {result ? (
        <pre
          style={{
            background: "#f6f4ef",
            padding: 16,
            borderRadius: 8,
            overflow: "auto",
            fontSize: 12,
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
