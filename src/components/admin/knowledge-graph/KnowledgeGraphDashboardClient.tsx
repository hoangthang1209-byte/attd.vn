"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import type { KnowledgeGraphNodeResult } from "@/features/knowledge-graph/knowledge-graph-types";

type HealthPayload = {
  totalEntities: number;
  totalRelationships: number;
  entitiesByType: Record<string, number>;
  relationshipsByType: Record<string, number>;
  orphanEntities: number;
  brokenSourceReferences: number;
  systemDerivedCount: number;
  curatedCount: number;
  importedCount: number;
  unapprovedCurated: number;
  arrayGraphDivergence: number;
  computedAt: string;
};

export default function KnowledgeGraphDashboardClient() {
  const toast = useAdminToast();
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [entities, setEntities] = useState<KnowledgeGraphNodeResult[]>([]);
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (entityType) params.set("entityType", entityType);
      params.set("pageSize", "50");

      const [healthRes, entitiesRes] = await Promise.all([
        fetch("/api/admin/knowledge-graph/health"),
        fetch(`/api/admin/knowledge-graph/entities?${params.toString()}`),
      ]);
      const healthJson = await healthRes.json();
      const entitiesJson = await entitiesRes.json();
      if (!healthRes.ok) toast.error(healthJson.message ?? "Health load failed");
      else setHealth(healthJson.health);
      if (!entitiesRes.ok) toast.error(entitiesJson.message ?? "Entities load failed");
      else setEntities(entitiesJson.entities ?? []);
    } catch {
      toast.error("Không thể tải Knowledge Graph");
    } finally {
      setLoading(false);
    }
  }, [search, entityType, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="admin-page">
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Link href="/admin/knowledge-graph/health" className="admin-btn">
          Health detail
        </Link>
        <button type="button" className="admin-btn" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {health ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {[
            ["Entities", health.totalEntities],
            ["Relationships", health.totalRelationships],
            ["System", health.systemDerivedCount],
            ["Curated", health.curatedCount],
            ["Imported", health.importedCount],
            ["Orphans", health.orphanEntities],
            ["Broken sources", health.brokenSourceReferences],
            ["Unapproved", health.unapprovedCurated],
            ["Array drift", health.arrayGraphDivergence],
          ].map(([label, value]) => (
            <div key={String(label)} className="admin-sidebar-card" style={{ padding: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="admin-sidebar-card" style={{ marginBottom: 16, padding: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="admin-input"
            placeholder="Search display name / canonical key…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 240 }}
          />
          <select
            className="admin-input"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            <option value="">All types</option>
            {[
              "PRODUCT",
              "PRODUCT_CATEGORY",
              "KNOWLEDGE_ENTRY",
              "SEO_TOPIC",
              "MEDIA_BUNDLE",
              "BLOG_POST",
              "MATERIAL",
              "PRINT_METHOD",
              "USE_CASE",
              "AUDIENCE",
              "INDUSTRY",
            ].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? <p>Loading…</p> : null}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Display name</th>
            <th>Type</th>
            <th>Source</th>
            <th>Visibility</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {entities.map((entity) => (
            <tr key={entity.id}>
              <td>{entity.displayName}</td>
              <td>{entity.entityType}</td>
              <td>
                {entity.sourceType}/{entity.sourceId.slice(0, 8)}…
              </td>
              <td>{entity.visibility}</td>
              <td>{entity.status}</td>
              <td>
                <Link href={`/admin/knowledge-graph/entities/${entity.id}`}>Open</Link>
              </td>
            </tr>
          ))}
          {!loading && entities.length === 0 ? (
            <tr>
              <td colSpan={6}>No graph entities yet. Run entity sync (dry-run first).</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {health ? (
        <p style={{ marginTop: 12, fontSize: 12, opacity: 0.65 }}>
          Health computed at {health.computedAt}
        </p>
      ) : null}
    </div>
  );
}
