"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import type {
  KnowledgeGraphEdgeResult,
  KnowledgeGraphNodeResult,
  KnowledgeGraphNeighbourResult,
} from "@/features/knowledge-graph/knowledge-graph-types";

export default function KnowledgeGraphEntityDetailClient({ entityId }: { entityId: string }) {
  const toast = useAdminToast();
  const [entity, setEntity] = useState<KnowledgeGraphNodeResult | null>(null);
  const [outgoing, setOutgoing] = useState<KnowledgeGraphEdgeResult[]>([]);
  const [incoming, setIncoming] = useState<KnowledgeGraphEdgeResult[]>([]);
  const [neighbours, setNeighbours] = useState<KnowledgeGraphNeighbourResult | null>(null);
  const [depth, setDepth] = useState(1);

  const load = useCallback(async () => {
    const [detailRes, neighbourRes] = await Promise.all([
      fetch(`/api/admin/knowledge-graph/entities/${entityId}`),
      fetch(`/api/admin/knowledge-graph/entities/${entityId}/neighbours?depth=${depth}`),
    ]);
    const detail = await detailRes.json();
    const neigh = await neighbourRes.json();
    if (!detailRes.ok) {
      toast.error(detail.message ?? "Load failed");
      return;
    }
    setEntity(detail.entity);
    setOutgoing(detail.outgoing ?? []);
    setIncoming(detail.incoming ?? []);
    if (neighbourRes.ok) setNeighbours(neigh);
  }, [entityId, depth, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!entity) return <p>Loading…</p>;

  return (
    <div className="admin-page">
      <p>
        <Link href="/admin/knowledge-graph">← Knowledge Graph</Link>
      </p>

      <div className="admin-sidebar-card" style={{ padding: 16, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>{entity.displayName}</h2>
        <p style={{ margin: "4px 0" }}>
          <strong>{entity.entityType}</strong> · {entity.visibility} · {entity.status}
        </p>
        <p style={{ margin: "4px 0", fontSize: 13 }}>
          Source: {entity.sourceType} / <code>{entity.sourceId}</code>
        </p>
        <p style={{ margin: "4px 0", fontSize: 13 }}>Canonical: {entity.canonicalKey}</p>
        <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
          {entity.adminRoute ? (
            <Link href={entity.adminRoute} className="admin-btn">
              Open authoritative record
            </Link>
          ) : null}
          {entity.publicRoute ? (
            <Link href={entity.publicRoute} className="admin-btn">
              Public page
            </Link>
          ) : null}
        </div>
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
          Graph projections never contain MOQ, price, lead time, or operational facts.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="admin-sidebar-card" style={{ padding: 12 }}>
          <h3>Outgoing ({outgoing.length})</h3>
          <ul style={{ fontSize: 13, paddingLeft: 16 }}>
            {outgoing.map((edge) => (
              <li key={edge.id}>
                {edge.relationshipType} → {edge.toEntityId.slice(0, 8)}… ({edge.origin}/
                {edge.status})
              </li>
            ))}
            {!outgoing.length ? <li>None</li> : null}
          </ul>
        </div>
        <div className="admin-sidebar-card" style={{ padding: 12 }}>
          <h3>Incoming ({incoming.length})</h3>
          <ul style={{ fontSize: 13, paddingLeft: 16 }}>
            {incoming.map((edge) => (
              <li key={edge.id}>
                {edge.fromEntityId.slice(0, 8)}… → {edge.relationshipType} ({edge.origin}/
                {edge.status})
              </li>
            ))}
            {!incoming.length ? <li>None</li> : null}
          </ul>
        </div>
      </div>

      <div className="admin-sidebar-card" style={{ padding: 12, marginTop: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Neighbour expansion</h3>
          <select
            className="admin-input"
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
          >
            <option value={1}>Depth 1</option>
            <option value={2}>Depth 2</option>
          </select>
        </div>
        {neighbours ? (
          <>
            <p style={{ fontSize: 13 }}>
              Nodes: {neighbours.nodes.length} · Edges: {neighbours.edges.length}
              {neighbours.truncated ? " · truncated" : ""}
            </p>
            {neighbours.warnings.length ? (
              <p style={{ fontSize: 12, color: "#a15c00" }}>
                Warnings: {neighbours.warnings.join(", ")}
              </p>
            ) : null}
            <ul style={{ fontSize: 13, paddingLeft: 16 }}>
              {neighbours.nodes
                .filter((n) => n.id !== entity.id)
                .map((n) => (
                  <li key={n.id}>
                    <Link href={`/admin/knowledge-graph/entities/${n.id}`}>
                      {n.displayName}
                    </Link>{" "}
                    ({n.entityType})
                  </li>
                ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}
