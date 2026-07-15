"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

type RelRow = {
  id: string;
  relationshipType: string;
  status: string;
  origin: string;
  visibility: string;
  confidence: number | null;
  evidenceUrl: string | null;
  sourceEntryId: string | null;
  updatedAt: string;
  from: { id: string; displayName: string; entityType: string };
  to: { id: string; displayName: string; entityType: string };
};

const VIEWS = [
  ["awaiting_approval", "Draft / Awaiting approval"],
  ["active", "Active"],
  ["missing_evidence", "Missing evidence"],
  ["expired", "Expired"],
  ["rejected", "Rejected"],
  ["archived", "Archived"],
  ["system", "System-derived"],
  ["imported", "Imported"],
  ["all", "All"],
] as const;

export default function KnowledgeGraphRelationshipsClient() {
  const toast = useAdminToast();
  const [view, setView] = useState<(typeof VIEWS)[number][0]>("awaiting_approval");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<RelRow[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ view, pageSize: "50" });
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/knowledge-graph/relationships?${params}`);
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.message ?? "Load failed");
      return;
    }
    setRows(json.relationships ?? []);
    setTotal(json.total ?? 0);
    setSelected([]);
  }, [view, search, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    const res = await fetch(`/api/admin/knowledge-graph/relationships/${id}/approve`, {
      method: "POST",
    });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.message ?? "Approve failed");
      return;
    }
    toast.success("Approved");
    void load();
  }

  async function reject(id: string) {
    const res = await fetch(`/api/admin/knowledge-graph/relationships/${id}/reject`, {
      method: "POST",
    });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.message ?? "Reject failed");
      return;
    }
    toast.success("Rejected");
    void load();
  }

  async function batchArchiveRejected() {
    const res = await fetch("/api/admin/knowledge-graph/relationships", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive_rejected", ids: selected }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.message ?? "Batch failed");
      return;
    }
    toast.success(`Archived ${json.archived ?? 0}`);
    void load();
  }

  return (
    <div className="admin-page">
      <p>
        <Link href="/admin/knowledge-graph">← Knowledge Graph</Link>
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <select className="admin-input" value={view} onChange={(e) => setView(e.target.value as never)}>
          {VIEWS.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <input
          className="admin-input"
          placeholder="Search source/target/evidence…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <button type="button" className="admin-btn" onClick={() => void load()}>
          Refresh
        </button>
        {view === "rejected" ? (
          <button
            type="button"
            className="admin-btn"
            disabled={!selected.length}
            onClick={() => void batchArchiveRejected()}
          >
            Archive selected rejected
          </button>
        ) : null}
      </div>
      <p style={{ fontSize: 13 }}>Total: {total}</p>
      <table className="admin-table">
        <thead>
          <tr>
            <th />
            <th>Source</th>
            <th>Relationship</th>
            <th>Target</th>
            <th>Origin</th>
            <th>Visibility</th>
            <th>Confidence</th>
            <th>Evidence</th>
            <th>Status</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.includes(row.id)}
                  onChange={(e) =>
                    setSelected((prev) =>
                      e.target.checked ? [...prev, row.id] : prev.filter((x) => x !== row.id)
                    )
                  }
                />
              </td>
              <td>
                <Link href={`/admin/knowledge-graph/entities/${row.from.id}`}>
                  {row.from.displayName}
                </Link>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{row.from.entityType}</div>
              </td>
              <td>{row.relationshipType}</td>
              <td>
                <Link href={`/admin/knowledge-graph/entities/${row.to.id}`}>
                  {row.to.displayName}
                </Link>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{row.to.entityType}</div>
              </td>
              <td>{row.origin}</td>
              <td>{row.visibility}</td>
              <td>{row.confidence ?? "—"}</td>
              <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
                {row.evidenceUrl ? (
                  <a href={row.evidenceUrl} target="_blank" rel="noreferrer">
                    link
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td>{row.status}</td>
              <td style={{ fontSize: 12 }}>{row.updatedAt.slice(0, 10)}</td>
              <td>
                {row.origin === "CURATED" && row.status === "DRAFT" ? (
                  <>
                    <button type="button" className="admin-btn" onClick={() => void approve(row.id)}>
                      Approve
                    </button>{" "}
                    <button type="button" className="admin-btn" onClick={() => void reject(row.id)}>
                      Reject
                    </button>
                  </>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan={11}>No relationships in this view.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <p style={{ fontSize: 12, opacity: 0.7 }}>
        Bulk approve is disabled. Batch archive applies only to rejected relations.
      </p>
    </div>
  );
}
