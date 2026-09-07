"use client";

import { useCallback, useEffect, useState } from "react";
import MediaPicker from "@/components/admin/media/MediaPicker";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsContext";
import type { ProductionApprovalRecord } from "@/features/item-production-tracking/production-approval.types";

type FormOptions = {
  orderId: string;
  artworkOptional: boolean;
  artworkFiles: Array<{
    id: string;
    title: string | null;
    status: string;
    version: number;
    filename: string | null;
  }>;
  sampleFiles: Array<{
    id: string;
    title: string | null;
    status: string;
    version: number;
    filename: string | null;
  }>;
  techPacks: Array<{
    id: string;
    code: string;
    version: number;
    status: string;
    title: string | null;
  }>;
  contacts: Array<{ id: string; fullName: string; title: string | null }>;
};

type Props = { orderItemId: string };

function formatApprovedAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fileLabel(file: {
  title: string | null;
  filename: string | null;
  version?: number;
} | null): string {
  if (!file) return "—";
  const name = file.title || file.filename || "File";
  return file.version != null ? `${name} (v${file.version})` : name;
}

export default function ProductionApprovalCard({ orderItemId }: Props) {
  const { permissions } = useAdminPermissions();
  const canMutate = permissions.canUpdateProduction || permissions.canUpdateItemProduction;

  const [approval, setApproval] = useState<ProductionApprovalRecord | null>(null);
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<"PENDING" | "NEEDS_REVISION" | "RELEASED">("PENDING");
  const [sampleRequired, setSampleRequired] = useState(true);
  const [artworkFileId, setArtworkFileId] = useState("");
  const [sampleFileId, setSampleFileId] = useState("");
  const [techPackId, setTechPackId] = useState("");
  const [approvedByContactId, setApprovedByContactId] = useState("");
  const [approvedByName, setApprovedByName] = useState("");
  const [evidenceMediaAssetId, setEvidenceMediaAssetId] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/production/jobs/${orderItemId}/production-approval`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Không tải được duyệt sản xuất");
      const next = json.approval as ProductionApprovalRecord;
      const opts = json.options as FormOptions;
      setApproval(next);
      setOptions(opts);
      setStatus(next.status);
      setSampleRequired(next.sampleRequired);
      setArtworkFileId(next.artworkFileId ?? "");
      setSampleFileId(next.sampleFileId ?? "");
      setTechPackId(next.techPackId ?? "");
      setApprovedByContactId(next.approvedByContactId ?? "");
      setApprovedByName(next.approvedByName ?? "");
      setEvidenceMediaAssetId(next.evidenceMediaAssetId);
      setEvidenceUrl(next.evidenceMedia?.url ?? null);
      setNote(next.note ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải duyệt sản xuất");
    } finally {
      setLoading(false);
    }
  }, [orderItemId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(nextStatus: "PENDING" | "NEEDS_REVISION" | "RELEASED") {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/production/jobs/${orderItemId}/production-approval`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          sampleRequired,
          artworkFileId: artworkFileId || null,
          sampleFileId: sampleFileId || null,
          techPackId: techPackId || null,
          approvedByContactId: approvedByContactId || null,
          approvedByName: approvedByName || null,
          evidenceMediaAssetId: evidenceMediaAssetId || null,
          note: note || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Không lưu được");
      setApproval(json.approval as ProductionApprovalRecord);
      setStatus((json.approval as ProductionApprovalRecord).status);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được");
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <section className="prod-approval-card" aria-busy="true">
        <h2 className="prod-approval-card__title">Duyệt sản xuất</h2>
        <p className="admin-field-hint">Đang tải…</p>
      </section>
    );
  }

  if (!approval) {
    return (
      <section className="prod-approval-card">
        <h2 className="prod-approval-card__title">Duyệt sản xuất</h2>
        {error ? <p className="admin-error">{error}</p> : null}
      </section>
    );
  }

  const released = approval.status === "RELEASED" && !approval.artworkStale;
  const approver =
    approval.approvedByContact
      ? `${approval.approvedByContact.fullName}${
          approval.approvedByContact.title ? ` — ${approval.approvedByContact.title}` : ""
        }`
      : approval.approvedByName || "—";

  return (
    <section
      className={`prod-approval-card ${released ? "prod-approval-card--released" : "prod-approval-card--pending"}`}
      id="production-approval"
    >
      <div className="prod-approval-card__head">
        <h2 className="prod-approval-card__title">Duyệt sản xuất</h2>
        <div
          className={`prod-approval-card__banner ${
            released ? "prod-approval-card__banner--ok" : "prod-approval-card__banner--warn"
          }`}
          role="status"
        >
          {released ? "✓ ĐÃ DUYỆT SẢN XUẤT" : "⚠ CHƯA DUYỆT SẢN XUẤT"}
        </div>
      </div>

      {approval.artworkStale && approval.artworkStaleMessage ? (
        <p className="prod-approval-card__stale" role="alert">
          {approval.artworkStaleMessage}
        </p>
      ) : null}

      {!editing ? (
        <>
          <dl className="prod-approval-card__dl">
            <div>
              <dt>Artwork</dt>
              <dd>{fileLabel(approval.artworkFile)}</dd>
            </div>
            <div>
              <dt>Sample</dt>
              <dd>
                {approval.sampleRequired
                  ? fileLabel(approval.sampleFile) !== "—"
                    ? fileLabel(approval.sampleFile)
                    : "Cần duyệt mẫu"
                  : "Không yêu cầu mẫu"}
              </dd>
            </div>
            {approval.techPack ? (
              <div>
                <dt>Tech Pack</dt>
                <dd>
                  {approval.techPack.code} v{approval.techPack.version} ({approval.techPack.status})
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Approved by</dt>
              <dd>{approver}</dd>
            </div>
            <div>
              <dt>Approved at</dt>
              <dd>{formatApprovedAt(approval.approvedAt)}</dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>
                {approval.evidenceMedia ? (
                  <a href={approval.evidenceMedia.url ?? "#"} target="_blank" rel="noreferrer">
                    {approval.evidenceMedia.filename ?? "Xem bằng chứng"}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            {approval.note ? (
              <div>
                <dt>Note</dt>
                <dd>{approval.note}</dd>
              </div>
            ) : null}
          </dl>
          {canMutate ? (
            <div className="prod-approval-card__actions">
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => setEditing(true)}>
                {approval.status === "RELEASED" ? "Cập nhật / duyệt lại" : "Mở duyệt sản xuất"}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="prod-approval-card__form">
          {error ? <p className="admin-error">{error}</p> : null}
          <label className="admin-label">
            Artwork
            <select
              className="admin-select"
              value={artworkFileId}
              onChange={(e) => setArtworkFileId(e.target.value)}
            >
              <option value="">
                {options?.artworkOptional ? "— Không có file thiết kế —" : "— Chọn artwork —"}
              </option>
              {(options?.artworkFiles ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {fileLabel(f)} [{f.status}]
                </option>
              ))}
            </select>
          </label>

          <label className="admin-label" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={sampleRequired}
              onChange={(e) => setSampleRequired(e.target.checked)}
            />
            {sampleRequired ? "Cần duyệt mẫu" : "Không yêu cầu mẫu"}
          </label>

          {sampleRequired ? (
            <label className="admin-label">
              Sample / bằng chứng mẫu
              <select
                className="admin-select"
                value={sampleFileId}
                onChange={(e) => setSampleFileId(e.target.value)}
              >
                <option value="">— Chọn file mẫu —</option>
                {(options?.sampleFiles ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {fileLabel(f)} [{f.status}]
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="admin-label">
            Tech Pack (tuỳ chọn)
            <select
              className="admin-select"
              value={techPackId}
              onChange={(e) => setTechPackId(e.target.value)}
            >
              <option value="">— Không chọn —</option>
              {(options?.techPacks ?? []).map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.code} v{tp.version} [{tp.status}] {tp.title ?? ""}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-label">
            Approved by (liên hệ)
            <select
              className="admin-select"
              value={approvedByContactId}
              onChange={(e) => setApprovedByContactId(e.target.value)}
            >
              <option value="">— Chọn liên hệ hoặc nhập tên —</option>
              {(options?.contacts ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                  {c.title ? ` — ${c.title}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-label">
            Approved by (họ tên)
            <input
              className="admin-input"
              value={approvedByName}
              onChange={(e) => setApprovedByName(e.target.value)}
              placeholder="VD: Lan — Marketing"
            />
          </label>

          <div className="admin-field">
            <label className="admin-label">Evidence (Zalo / email / mockup)</label>
            <MediaPicker
              folder="general"
              usageType="auto"
              value={evidenceUrl}
              onChange={(url) => {
                setEvidenceUrl(url);
                if (!url) setEvidenceMediaAssetId(null);
              }}
              onSelectAsset={(asset) => {
                if (!asset) {
                  setEvidenceMediaAssetId(null);
                  setEvidenceUrl(null);
                  return;
                }
                setEvidenceMediaAssetId(asset.id);
                setEvidenceUrl(asset.url);
              }}
            />
          </div>

          <label className="admin-label">
            Note
            <input
              className="admin-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Logo 8.5 cm"
            />
          </label>

          <div className="prod-approval-card__actions">
            <AdminLoadingButton
              type="button"
              variant="primary"
              size="small"
              pending={pending}
              onClick={() => void save("RELEASED")}
            >
              Release — Đã duyệt SX
            </AdminLoadingButton>
            <AdminLoadingButton
              type="button"
              variant="secondary"
              size="small"
              pending={pending}
              onClick={() => void save("PENDING")}
            >
              Lưu (chưa release)
            </AdminLoadingButton>
            <AdminLoadingButton
              type="button"
              variant="secondary"
              size="small"
              pending={pending}
              onClick={() => void save("NEEDS_REVISION")}
            >
              Cần chỉnh duyệt
            </AdminLoadingButton>
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--sm"
              disabled={pending}
              onClick={() => {
                setEditing(false);
                setError(null);
                void load();
              }}
            >
              Huỷ
            </button>
          </div>
          {status !== "RELEASED" ? (
            <p className="admin-field-hint" style={{ marginTop: 8 }}>
              Release chỉ khi đủ artwork, người duyệt{sampleRequired ? ", và bằng chứng mẫu" : ""}.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
