"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import type {
  KnowledgeGraphEdgeResult,
  KnowledgeGraphNodeResult,
  KnowledgeGraphNeighbourResult,
} from "@/features/knowledge-graph/knowledge-graph-types";
import {
  RELATIONSHIP_TEMPLATES,
  templatesForEntityType,
} from "@/features/knowledge-graph/knowledge-graph-concept-ownership";
import { getRelationshipPolicy } from "@/features/knowledge-graph/knowledge-graph-relationship-policy";
import type { KnowledgeGraphEntityType } from "@prisma/client";

const VI_ERRORS: Record<string, string> = {
  INVALID_RELATIONSHIP_TYPE: "Loại quan hệ không hợp lệ",
  ENTITY_NOT_FOUND: "Không tìm thấy entity",
  DUPLICATE_ACTIVE_RELATIONSHIP: "Quan hệ ACTIVE đã tồn tại",
  EVIDENCE_REQUIRED: "Cần evidence URL theo chính sách",
  CONFIDENCE_OUT_OF_RANGE: "Confidence phải từ 0–100",
  INVALID_TEMPORAL_RANGE: "Khoảng thời gian không hợp lệ",
  SYSTEM_DERIVED_NOT_EDITABLE: "Quan hệ hệ thống chỉ đọc",
  PUBLIC_EDGE_REQUIRES_PUBLIC_ENDPOINTS: "Quan hệ PUBLIC yêu cầu cả hai đầu PUBLIC",
  ONLY_CURATED_APPROVABLE: "Chỉ quan hệ curated mới duyệt được",
  NOT_FOUND: "Không tìm thấy",
};

export default function KnowledgeGraphEntityDetailClient({ entityId }: { entityId: string }) {
  const toast = useAdminToast();
  const [entity, setEntity] = useState<KnowledgeGraphNodeResult | null>(null);
  const [outgoing, setOutgoing] = useState<KnowledgeGraphEdgeResult[]>([]);
  const [incoming, setIncoming] = useState<KnowledgeGraphEdgeResult[]>([]);
  const [neighbours, setNeighbours] = useState<KnowledgeGraphNeighbourResult | null>(null);
  const [depth, setDepth] = useState(1);
  const [direction, setDirection] = useState<"both" | "outgoing" | "incoming">("both");
  const [relTypeFilter, setRelTypeFilter] = useState("");
  const [originFilter, setOriginFilter] = useState("");

  const [templateId, setTemplateId] = useState("");
  const [relationshipType, setRelationshipType] = useState("SUITABLE_FOR");
  const [targetSearch, setTargetSearch] = useState("");
  const [targetOptions, setTargetOptions] = useState<KnowledgeGraphNodeResult[]>([]);
  const [toEntityId, setToEntityId] = useState("");
  const [visibility, setVisibility] = useState("INTERNAL");
  const [confidence, setConfidence] = useState("70");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [sourceEntryId, setSourceEntryId] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [evidenceEntry, setEvidenceEntry] = useState<{
    title?: string;
    claimStatus?: string;
    visibility?: string;
    isVerified?: boolean;
    evidenceUrl?: string | null;
  } | null>(null);

  const templates = useMemo(
    () => (entity ? templatesForEntityType(entity.entityType as KnowledgeGraphEntityType) : []),
    [entity]
  );

  const load = useCallback(async () => {
    const params = new URLSearchParams({ depth: String(depth) });
    if (relTypeFilter) params.set("relationshipTypes", relTypeFilter);
    const [detailRes, neighbourRes] = await Promise.all([
      fetch(`/api/admin/knowledge-graph/entities/${entityId}`),
      fetch(`/api/admin/knowledge-graph/entities/${entityId}/neighbours?${params}`),
    ]);
    const detail = await detailRes.json();
    const neigh = await neighbourRes.json();
    if (!detailRes.ok) {
      toast.error(VI_ERRORS[detail.message] ?? detail.message ?? "Load failed");
      return;
    }
    setEntity(detail.entity);
    setOutgoing(detail.outgoing ?? []);
    setIncoming(detail.incoming ?? []);
    if (neighbourRes.ok) setNeighbours(neigh);
  }, [entityId, depth, relTypeFilter, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const tpl = RELATIONSHIP_TEMPLATES.find((t) => t.id === templateId);
    if (tpl) setRelationshipType(tpl.relationshipType);
  }, [templateId]);

  useEffect(() => {
    const policy = getRelationshipPolicy(relationshipType);
    if (!policy || !targetSearch.trim()) {
      setTargetOptions([]);
      return;
    }
    const allowed = policy.allowedTo;
    const timer = setTimeout(() => {
      void (async () => {
        const results: KnowledgeGraphNodeResult[] = [];
        for (const entityType of allowed.slice(0, 4)) {
          const res = await fetch(
            `/api/admin/knowledge-graph/entities?search=${encodeURIComponent(targetSearch)}&entityType=${entityType}&pageSize=10`
          );
          const json = await res.json();
          if (res.ok) results.push(...(json.entities ?? []));
        }
        setTargetOptions(results.slice(0, 20));
      })();
    }, 250);
    return () => clearTimeout(timer);
  }, [targetSearch, relationshipType]);

  useEffect(() => {
    if (!sourceEntryId.trim()) {
      setEvidenceEntry(null);
      return;
    }
    void (async () => {
      const res = await fetch(`/api/admin/knowledge-base/${sourceEntryId.trim()}`);
      const json = await res.json();
      if (res.ok && json.entry) {
        setEvidenceEntry({
          title: json.entry.title,
          claimStatus: json.entry.claimStatus,
          visibility: json.entry.visibility,
          isVerified: json.entry.isVerified,
          evidenceUrl: json.entry.evidenceUrl,
        });
      } else {
        setEvidenceEntry(null);
      }
    })();
  }, [sourceEntryId]);

  async function createRelation() {
    const res = await fetch("/api/admin/knowledge-graph/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromEntityId: entityId,
        toEntityId,
        relationshipType,
        visibility,
        confidence: confidence ? Number(confidence) : null,
        evidenceUrl: evidenceUrl || null,
        sourceEntryId: sourceEntryId || null,
        validFrom: validFrom || null,
        validUntil: validUntil || null,
        metadata: notes ? { notes } : null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(VI_ERRORS[json.message] ?? json.message ?? "Tạo thất bại");
      return;
    }
    toast.success("Đã tạo quan hệ DRAFT");
    setToEntityId("");
    setNotes("");
    void load();
  }

  async function actOnRelation(id: string, action: "approve" | "reject" | "archive") {
    const url =
      action === "archive"
        ? `/api/admin/knowledge-graph/relationships/${id}`
        : `/api/admin/knowledge-graph/relationships/${id}/${action}`;
    const res = await fetch(url, {
      method: action === "archive" ? "DELETE" : "POST",
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(VI_ERRORS[json.message] ?? json.message ?? "Thất bại");
      return;
    }
    toast.success(action === "approve" ? "Đã duyệt ACTIVE" : action === "reject" ? "Đã từ chối" : "Đã archive");
    void load();
  }

  if (!entity) return <p>Loading…</p>;

  const filteredOutgoing = outgoing.filter((e) => {
    if (originFilter && e.origin !== originFilter) return false;
    if (relTypeFilter && e.relationshipType !== relTypeFilter) return false;
    return true;
  });
  const filteredIncoming = incoming.filter((e) => {
    if (originFilter && e.origin !== originFilter) return false;
    if (relTypeFilter && e.relationshipType !== relTypeFilter) return false;
    return true;
  });

  const summaryFromNeighbours = (type: string) =>
    (neighbours?.edges ?? [])
      .filter((e) => e.relationshipType === type)
      .map((e) => {
        const otherId = e.fromEntityId === entity.id ? e.toEntityId : e.fromEntityId;
        return neighbours?.nodes.find((n) => n.id === otherId)?.displayName;
      })
      .filter(Boolean)
      .slice(0, 6);

  return (
    <div className="admin-page">
      <p>
        <Link href="/admin/knowledge-graph">← Knowledge Graph</Link>
        {" · "}
        <Link href="/admin/knowledge-graph/relationships">Approval queue</Link>
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
        </div>
      </div>

      {entity.entityType === "PRODUCT" && neighbours ? (
        <div className="admin-sidebar-card" style={{ padding: 12, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Product context</h3>
          <p style={{ fontSize: 13 }}>Use cases: {summaryFromNeighbours("SUITABLE_FOR").join(", ") || "—"}</p>
          <p style={{ fontSize: 13 }}>Audiences: {summaryFromNeighbours("TARGETS").join(", ") || "—"}</p>
          <p style={{ fontSize: 13 }}>Capabilities: {summaryFromNeighbours("HAS_CAPABILITY").join(", ") || "—"}</p>
          <p style={{ fontSize: 13 }}>Materials: {summaryFromNeighbours("MADE_FROM").join(", ") || "—"}</p>
          <p style={{ fontSize: 13 }}>Media: {summaryFromNeighbours("HAS_MEDIA").join(", ") || "—"}</p>
        </div>
      ) : null}

      <div className="admin-sidebar-card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Tạo quan hệ curated</h3>
        <div style={{ display: "grid", gap: 8, maxWidth: 640 }}>
          <label>
            Template
            <select
              className="admin-input"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              style={{ display: "block", width: "100%" }}
            >
              <option value="">— chọn mẫu —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.group}: {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Relationship type
            <select
              className="admin-input"
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              style={{ display: "block", width: "100%" }}
            >
              {RELATIONSHIP_TEMPLATES.map((t) => t.relationshipType)
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Tìm target entity
            <input
              className="admin-input"
              value={targetSearch}
              onChange={(e) => setTargetSearch(e.target.value)}
              placeholder="Tên hiển thị…"
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <select
            className="admin-input"
            value={toEntityId}
            onChange={(e) => setToEntityId(e.target.value)}
          >
            <option value="">— chọn target —</option>
            {targetOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.displayName} ({opt.entityType})
              </option>
            ))}
          </select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label>
              Visibility
              <select
                className="admin-input"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                style={{ display: "block", width: "100%" }}
              >
                <option value="PUBLIC">PUBLIC</option>
                <option value="INTERNAL">INTERNAL</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
              </select>
            </label>
            <label>
              Confidence (0–100)
              <input
                className="admin-input"
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
                style={{ display: "block", width: "100%" }}
              />
            </label>
          </div>
          <label>
            Evidence URL
            <input
              className="admin-input"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label>
            Source Knowledge Entry ID
            <input
              className="admin-input"
              value={sourceEntryId}
              onChange={(e) => setSourceEntryId(e.target.value)}
              style={{ display: "block", width: "100%" }}
            />
          </label>
          {evidenceEntry ? (
            <p style={{ fontSize: 12, margin: 0 }}>
              KB: {evidenceEntry.title} · claim={evidenceEntry.claimStatus} ·{" "}
              {evidenceEntry.visibility} · verified={String(evidenceEntry.isVerified)}
            </p>
          ) : null}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label>
              Valid from
              <input
                type="date"
                className="admin-input"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                style={{ display: "block", width: "100%" }}
              />
            </label>
            <label>
              Valid until
              <input
                type="date"
                className="admin-input"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                style={{ display: "block", width: "100%" }}
              />
            </label>
          </div>
          <label>
            Notes
            <input
              className="admin-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <button
            type="button"
            className="admin-btn"
            disabled={!toEntityId}
            onClick={() => void createRelation()}
          >
            Tạo DRAFT
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <select className="admin-input" value={direction} onChange={(e) => setDirection(e.target.value as never)}>
          <option value="both">Incoming + Outgoing</option>
          <option value="outgoing">Outgoing</option>
          <option value="incoming">Incoming</option>
        </select>
        <input
          className="admin-input"
          placeholder="Filter relationship type"
          value={relTypeFilter}
          onChange={(e) => setRelTypeFilter(e.target.value)}
        />
        <select className="admin-input" value={originFilter} onChange={(e) => setOriginFilter(e.target.value)}>
          <option value="">All origins</option>
          <option value="SYSTEM_DERIVED">SYSTEM_DERIVED</option>
          <option value="CURATED">CURATED</option>
          <option value="IMPORTED">IMPORTED</option>
        </select>
        <select className="admin-input" value={depth} onChange={(e) => setDepth(Number(e.target.value))}>
          <option value={1}>Depth 1</option>
          <option value={2}>Depth 2</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {(direction === "both" || direction === "outgoing") && (
          <div className="admin-sidebar-card" style={{ padding: 12 }}>
            <h3>Outgoing ({filteredOutgoing.length})</h3>
            <ul style={{ fontSize: 13, paddingLeft: 16 }}>
              {filteredOutgoing.map((edge) => (
                <li key={edge.id} style={{ marginBottom: 8 }}>
                  {edge.relationshipType} → {edge.toEntityId.slice(0, 8)}… ({edge.origin}/
                  {edge.status})
                  {edge.origin === "CURATED" ? (
                    <span style={{ marginLeft: 8 }}>
                      {edge.status === "DRAFT" ? (
                        <>
                          <button type="button" className="admin-btn" onClick={() => void actOnRelation(edge.id, "approve")}>
                            Approve
                          </button>{" "}
                          <button type="button" className="admin-btn" onClick={() => void actOnRelation(edge.id, "reject")}>
                            Reject
                          </button>
                        </>
                      ) : null}
                      <button type="button" className="admin-btn" onClick={() => void actOnRelation(edge.id, "archive")}>
                        Archive
                      </button>
                    </span>
                  ) : (
                    <em style={{ opacity: 0.6 }}> read-only</em>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {(direction === "both" || direction === "incoming") && (
          <div className="admin-sidebar-card" style={{ padding: 12 }}>
            <h3>Incoming ({filteredIncoming.length})</h3>
            <ul style={{ fontSize: 13, paddingLeft: 16 }}>
              {filteredIncoming.map((edge) => (
                <li key={edge.id}>
                  {edge.fromEntityId.slice(0, 8)}… → {edge.relationshipType} ({edge.origin}/
                  {edge.status})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {neighbours ? (
        <div className="admin-sidebar-card" style={{ padding: 12, marginTop: 16 }}>
          <h3>Neighbours</h3>
          <p style={{ fontSize: 13 }}>
            Nodes: {neighbours.nodes.length} · Edges: {neighbours.edges.length}
            {neighbours.truncated ? " · truncated" : ""}
          </p>
          <ul style={{ fontSize: 13, paddingLeft: 16 }}>
            {(neighbours.paths ?? []).slice(0, 20).map((p, i) => (
              <li key={i}>
                path: {p.entityIds.map((id) => id.slice(0, 6)).join(" → ")} · rels{" "}
                {p.relationshipIds.map((id) => id.slice(0, 6)).join(",")}
              </li>
            ))}
          </ul>
          <ul style={{ fontSize: 13, paddingLeft: 16 }}>
            {neighbours.nodes
              .filter((n) => n.id !== entity.id)
              .map((n) => (
                <li key={n.id}>
                  <Link href={`/admin/knowledge-graph/entities/${n.id}`}>{n.displayName}</Link> (
                  {n.entityType})
                  {n.adminRoute ? (
                    <>
                      {" "}
                      · <Link href={n.adminRoute}>source</Link>
                    </>
                  ) : null}
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
