"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { InlineLoading } from "@/components/ui/loading/ContextLoading";
import type { LifecycleQueueView } from "@/features/media/lifecycle/lifecycle.types";

const VIEWS: Array<{ id: LifecycleQueueView; label: string }> = [
  { id: "needs_review", label: "Needs review" },
  { id: "deprecated", label: "Deprecated" },
  { id: "archived", label: "Archived" },
  { id: "retired", label: "Retired" },
  { id: "replacement_pending", label: "Replacement pending" },
  { id: "rights_expiring", label: "Rights expiring" },
  { id: "rights_expired", label: "Rights expired" },
  { id: "unknown_rights_public", label: "Unknown rights (public)" },
];

type QueueItem = {
  id: string;
  title: string | null;
  altText: string | null;
  url: string;
  thumbnailUrl: string | null;
  visibility: string;
  lifecycleStatus: string;
  rightsStatus: string;
  rightsExpiresAt: string | null;
  replacementAssetId: string | null;
  lifecycleReason: string | null;
  _count: { contentMediaAssignments: number; bundleSlotAssets: number };
};

export default function MediaLifecycleQueueClient() {
  const toast = useAdminToast();
  const [view, setView] = useState<LifecycleQueueView>("needs_review");
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reason, setReason] = useState("Lifecycle review");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/media/lifecycle?view=${view}`);
      const data = (await res.json()) as { items?: QueueItem[]; message?: string };
      if (!res.ok) throw new Error(data.message || "Load failed");
      setItems(data.items ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi tải queue");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [view, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function transition(id: string, toStatus: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/media/${id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus, reason }),
      });
      const data = (await res.json()) as { message?: string; code?: string };
      if (!res.ok) {
        toast.error(data.message ?? data.code ?? "Transition failed");
        return;
      }
      toast.success(`Đã cập nhật → ${toStatus}`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function primaryAction(item: QueueItem): { label: string; toStatus: string } | null {
    switch (item.lifecycleStatus) {
      case "REVIEW_REQUIRED":
        return { label: "Restore ACTIVE", toStatus: "ACTIVE" };
      case "DEPRECATED":
        return { label: "Archive", toStatus: "ARCHIVED" };
      case "ARCHIVED":
        return { label: "Restore ACTIVE", toStatus: "ACTIVE" };
      case "RETIRED":
        return { label: "Restore ACTIVE", toStatus: "ACTIVE" };
      default:
        return { label: "Mark review", toStatus: "REVIEW_REQUIRED" };
    }
  }

  return (
    <>
      <AdminPageTitle title="Asset Lifecycle" />
      <p style={{ color: "#6b7280", marginTop: 0, maxWidth: 720 }}>
        Governed lifecycle — không auto-archive, không auto-replace, không xóa file vật lý.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <Link href="/admin/media" className="admin-btn admin-btn--secondary">
          Thư viện
        </Link>
        <Link href="/admin/media/dashboard" className="admin-btn admin-btn--secondary">
          Dashboard
        </Link>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`admin-btn admin-btn--xs ${view === v.id ? "admin-btn--primary" : "admin-btn--secondary"}`}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <label className="admin-field-hint" style={{ display: "block", marginBottom: 12 }}>
        Lý do (bắt buộc khi deprecate / archive / retire)
        <input
          className="admin-input"
          style={{ display: "block", marginTop: 4, maxWidth: 420 }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>

      {loading ? <InlineLoading title="Đang tải…" /> : null}

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => {
          const action = primaryAction(item);
          return (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "64px 1fr auto",
                gap: 12,
                alignItems: "center",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 10,
                background: "#fff",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumbnailUrl || item.url}
                alt={item.altText || item.title || ""}
                style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6 }}
              />
              <div>
                <div style={{ fontWeight: 600 }}>{item.title || item.id}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {item.lifecycleStatus} · {item.visibility} · rights {item.rightsStatus} · refs{" "}
                  {item._count.contentMediaAssignments + item._count.bundleSlotAssets}
                  {item.replacementAssetId ? " · has replacement" : ""}
                </div>
                {item.lifecycleReason ? (
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>{item.lifecycleReason}</div>
                ) : null}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Link
                  href={`/admin/media/${item.id}?section=lifecycle`}
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                >
                  Open
                </Link>
                {action ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary admin-btn--xs"
                    disabled={busyId === item.id}
                    onClick={() => void transition(item.id, action.toStatus)}
                  >
                    {action.label}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
        {!loading && items.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Không có asset trong queue này.</p>
        ) : null}
      </div>
    </>
  );
}
