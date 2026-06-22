"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProductionStageStatus } from "@prisma/client";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import type { ProductionStageRecord } from "@/features/orders/production-stage.service";
import type { QcInspectionRecord } from "@/features/orders/qc-inspection.service";
import type { HandoverReadinessResult } from "@/features/orders/handover-readiness.service";
import {
  PRODUCTION_STAGE_STATUS_LABELS,
  QC_EVIDENCE_TYPE_LABELS,
  QC_INSPECTION_STATUS_LABELS,
} from "@/features/orders/production-execution-labels";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import { formatOrderDateTime } from "@/features/orders/order-format";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type Tab = "stages" | "qc" | "handover";

type Props = {
  orderId: string;
  order: OrderDetailRecord;
};

type MediaAssetPick = {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
};

function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

export default function OrderProductionExecutionSection({ orderId, order }: Props) {
  const mutate = useAdminMutation();
  const [tab, setTab] = useState<Tab>("stages");
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<ProductionStageRecord[]>([]);
  const [qc, setQc] = useState<QcInspectionRecord | null>(null);
  const [readiness, setReadiness] = useState<HandoverReadinessResult | null>(null);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [editStage, setEditStage] = useState<ProductionStageRecord | null>(null);
  const [stageForm, setStageForm] = useState({
    status: "NOT_STARTED" as ProductionStageStatus,
    assignedEmployeeId: "",
    completedQuantity: "0",
    passedQuantity: "0",
    defectQuantity: "0",
    reworkQuantity: "0",
    scrapQuantity: "0",
    note: "",
    quantityCorrectionReason: "",
  });
  const [qcForm, setQcForm] = useState({
    status: "DRAFT" as QcInspectionRecord["status"],
    inspectedByEmployeeId: "",
    inspectedQuantity: "0",
    passedQuantity: "0",
    defectQuantity: "0",
    reworkQuantity: "0",
    scrapQuantity: "0",
    summary: "",
    correctiveAction: "",
  });
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetPick[]>([]);
  const [evidenceType, setEvidenceType] = useState<keyof typeof QC_EVIDENCE_TYPE_LABELS>("OTHER");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stagesRes, qcRes, readinessRes] = await Promise.all([
        fetch(`/api/orders/${orderId}/production-stages`),
        fetch(`/api/orders/${orderId}/qc`),
        fetch(`/api/orders/${orderId}/handover-readiness`),
      ]);
      const stagesData = await stagesRes.json();
      const qcData = await qcRes.json();
      const readinessData = await readinessRes.json();
      setStages(Array.isArray(stagesData.stages) ? stagesData.stages : []);
      setQc(qcData.qc ?? null);
      setReadiness(readinessData.readiness ?? null);
      if (qcData.qc) {
        setQcForm({
          status: qcData.qc.status,
          inspectedByEmployeeId: qcData.qc.inspectedByEmployeeId ?? "",
          inspectedQuantity: qcData.qc.inspectedQuantity,
          passedQuantity: qcData.qc.passedQuantity,
          defectQuantity: qcData.qc.defectQuantity,
          reworkQuantity: qcData.qc.reworkQuantity,
          scrapQuantity: qcData.qc.scrapQuantity,
          summary: qcData.qc.summary ?? "",
          correctiveAction: qcData.qc.correctiveAction ?? "",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetch("/api/employees?active=1&role=PRODUCTION&limit=200")
      .then((r) => r.json())
      .then((data: { employees?: EmployeeRecord[] }) => {
        setEmployees(data.employees ?? []);
      });
  }, []);

  function openStageEditor(stage: ProductionStageRecord) {
    setEditStage(stage);
    setStageForm({
      status: stage.status,
      assignedEmployeeId: stage.assignedEmployeeId ?? "",
      completedQuantity: stage.completedQuantity,
      passedQuantity: stage.passedQuantity,
      defectQuantity: stage.defectQuantity,
      reworkQuantity: stage.reworkQuantity,
      scrapQuantity: stage.scrapQuantity,
      note: stage.note ?? "",
      quantityCorrectionReason: "",
    });
  }

  async function saveStage() {
    if (!editStage) return;
    await mutate({
      loadingMessage: "Đang cập nhật công đoạn…",
      successMessage: "Đã cập nhật công đoạn.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/production-stages/${editStage.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: stageForm.status,
            assignedEmployeeId: stageForm.assignedEmployeeId || null,
            completedQuantity: stageForm.completedQuantity,
            passedQuantity: stageForm.passedQuantity,
            defectQuantity: stageForm.defectQuantity,
            reworkQuantity: stageForm.reworkQuantity,
            scrapQuantity: stageForm.scrapQuantity,
            note: stageForm.note || null,
            quantityCorrectionReason: stageForm.quantityCorrectionReason || null,
          }),
        });
        return parseAdminJsonResponse(res, (body) => body.stage as ProductionStageRecord);
      },
      onSuccess: () => {
        setEditStage(null);
        void load();
      },
    });
  }

  async function startQc() {
    await mutate({
      loadingMessage: "Đang khởi tạo QC…",
      successMessage: "Đã bắt đầu kiểm tra QC.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/qc`, { method: "POST" });
        return parseAdminJsonResponse(res, (body) => body.qc as QcInspectionRecord);
      },
      onSuccess: () => void load(),
    });
  }

  async function saveQc(statusOverride?: QcInspectionRecord["status"]) {
    await mutate({
      loadingMessage: "Đang lưu QC…",
      successMessage: "Đã cập nhật kết quả QC.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/qc`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: statusOverride ?? qcForm.status,
            inspectedByEmployeeId: qcForm.inspectedByEmployeeId || null,
            inspectedQuantity: qcForm.inspectedQuantity,
            passedQuantity: qcForm.passedQuantity,
            defectQuantity: qcForm.defectQuantity,
            reworkQuantity: qcForm.reworkQuantity,
            scrapQuantity: qcForm.scrapQuantity,
            summary: qcForm.summary || null,
            correctiveAction: qcForm.correctiveAction || null,
          }),
        });
        return parseAdminJsonResponse(res, (body) => body.qc as QcInspectionRecord);
      },
      onSuccess: () => void load(),
    });
  }

  async function openMediaPicker() {
    setMediaPickerOpen(true);
    const res = await fetch("/api/media?folder=general");
    const data = await res.json();
    setMediaAssets(
      (Array.isArray(data) ? data : []).map((a: Record<string, unknown>) => ({
        id: String(a.id),
        filename: String(a.filename ?? a.originalName ?? "file"),
        url: String(a.url),
        thumbnailUrl: a.thumbnailUrl ? String(a.thumbnailUrl) : null,
        mimeType: String(a.mimeType ?? ""),
      })),
    );
  }

  async function attachEvidence(mediaAssetId: string) {
    await mutate({
      loadingMessage: "Đang thêm minh chứng…",
      successMessage: "Đã thêm minh chứng QC.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/qc/evidence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaAssetId, evidenceType }),
        });
        return parseAdminJsonResponse(res, () => undefined);
      },
      onSuccess: () => {
        setMediaPickerOpen(false);
        void load();
      },
    });
  }

  async function removeEvidence(evidenceId: string) {
    await mutate({
      loadingMessage: "Đang xóa minh chứng…",
      successMessage: "Đã xóa minh chứng.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/qc/evidence/${evidenceId}`, {
          method: "DELETE",
        });
        return parseAdminJsonResponse(res, () => undefined);
      },
      onSuccess: () => void load(),
    });
  }

  const showSection =
    order.status === "IN_PRODUCTION" ||
    order.status === "READY_TO_SHIP" ||
    order.status === "SHIPPED" ||
    order.status === "COMPLETED" ||
    stages.length > 0 ||
    qc !== null;

  if (!showSection) return null;

  return (
    <fieldset className="admin-catalog-fieldset" id="production-execution" style={{ marginTop: 16 }}>
      <legend>TIẾN ĐỘ SẢN XUẤT &amp; QC</legend>

      <div className="admin-tab-bar" style={{ marginBottom: 12 }}>
        {([
          ["stages", "Công đoạn sản xuất"],
          ["qc", "Kiểm tra chất lượng"],
          ["handover", "Bàn giao hoàn thành"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`admin-tab${tab === key ? " admin-tab--active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="admin-loading">Đang tải…</p>
      ) : (
        <>
          {tab === "stages" && (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--compact">
                <thead>
                  <tr>
                    <th>Công đoạn</th>
                    <th>Trạng thái</th>
                    <th>Người phụ trách</th>
                    <th>Bắt đầu</th>
                    <th>Hoàn thành</th>
                    <th>SL HT</th>
                    <th>Đạt</th>
                    <th>Lỗi</th>
                    <th>Làm lại</th>
                    <th>Hủy</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {stages.map((stage) => (
                    <tr key={stage.id}>
                      <td>{stage.stageTypeLabel}</td>
                      <td>{stage.statusLabel}</td>
                      <td>{stage.assignedEmployeeName ?? "—"}</td>
                      <td>{stage.startedAt ? formatOrderDateTime(stage.startedAt) : "—"}</td>
                      <td>{stage.completedAt ? formatOrderDateTime(stage.completedAt) : "—"}</td>
                      <td>{stage.completedQuantity}</td>
                      <td>{stage.passedQuantity}</td>
                      <td>{stage.defectQuantity}</td>
                      <td>{stage.reworkQuantity}</td>
                      <td>{stage.scrapQuantity}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-btn--small"
                          onClick={() => openStageEditor(stage)}
                        >
                          Cập nhật
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "qc" && (
            <div>
              {!qc ? (
                <button type="button" className="admin-btn admin-btn--primary" onClick={() => void startQc()}>
                  Bắt đầu kiểm tra QC
                </button>
              ) : (
                <div className="admin-form-grid">
                  <p>
                    Trạng thái: <strong>{QC_INSPECTION_STATUS_LABELS[qc.status]}</strong>
                    {qc.inspectedAt && ` · ${formatOrderDateTime(qc.inspectedAt)}`}
                  </p>
                  <div className="admin-field">
                    <label className="admin-label">Người kiểm tra</label>
                    <select
                      className="admin-input"
                      value={qcForm.inspectedByEmployeeId}
                      onChange={(e) => setQcForm((f) => ({ ...f, inspectedByEmployeeId: e.target.value }))}
                    >
                      <option value="">—</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>{e.fullName}</option>
                      ))}
                    </select>
                  </div>
                  {(["inspectedQuantity", "passedQuantity", "defectQuantity", "reworkQuantity", "scrapQuantity"] as const).map((field) => (
                    <div className="admin-field" key={field}>
                      <label className="admin-label">{field === "inspectedQuantity" ? "SL kiểm tra" : field === "passedQuantity" ? "SL đạt" : field === "defectQuantity" ? "SL lỗi" : field === "reworkQuantity" ? "SL làm lại" : "SL hủy"}</label>
                      <input
                        className="admin-input"
                        value={qcForm[field]}
                        onChange={(e) => setQcForm((f) => ({ ...f, [field]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="admin-field admin-field--full">
                    <label className="admin-label">Tóm tắt</label>
                    <textarea className="admin-textarea" rows={2} value={qcForm.summary} onChange={(e) => setQcForm((f) => ({ ...f, summary: e.target.value }))} />
                  </div>
                  <div className="admin-field admin-field--full">
                    <label className="admin-label">Hành động khắc phục</label>
                    <textarea className="admin-textarea" rows={2} value={qcForm.correctiveAction} onChange={(e) => setQcForm((f) => ({ ...f, correctiveAction: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className="admin-btn admin-btn--primary" onClick={() => void saveQc()}>Cập nhật kết quả QC</button>
                    <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void saveQc("PASSED")}>Đánh dấu đạt</button>
                    <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void saveQc("REWORK_REQUIRED")}>Cần làm lại</button>
                    <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void saveQc("FAILED")}>Không đạt</button>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                      <strong>Minh chứng QC</strong>
                      <select className="admin-input" value={evidenceType} onChange={(e) => setEvidenceType(e.target.value as keyof typeof QC_EVIDENCE_TYPE_LABELS)}>
                        {(Object.keys(QC_EVIDENCE_TYPE_LABELS) as Array<keyof typeof QC_EVIDENCE_TYPE_LABELS>).map((k) => (
                          <option key={k} value={k}>{QC_EVIDENCE_TYPE_LABELS[k]}</option>
                        ))}
                      </select>
                      <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void openMediaPicker()}>
                        Thêm ảnh/file QC
                      </button>
                    </div>
                    <div className="admin-media-grid">
                      {qc.evidence.map((ev) => (
                        <div key={ev.id} className="admin-media-card">
                          {isImageMime(ev.mimeType) && (ev.thumbnailUrl || ev.url) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={ev.thumbnailUrl ?? ev.url} alt={ev.title ?? ev.filename} />
                          ) : (
                            <div className="admin-media-card__file">{ev.filename}</div>
                          )}
                          <p className="admin-field-hint">{ev.evidenceTypeLabel}</p>
                          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void removeEvidence(ev.id)}>Xóa</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "handover" && readiness && (
            <div className="admin-form-grid">
              <p>Trạng thái: <strong>{readiness.stateLabel}</strong></p>
              <ul className="production-readiness-list">
                <li>Tổng số lượng đơn hàng: {readiness.expectedOrderQuantity.toLocaleString("vi-VN")}</li>
                <li>Đã hoàn thành sản xuất: {readiness.productionCompletedQuantity.toLocaleString("vi-VN")}</li>
                <li>QC đạt: {readiness.qcPassedQuantity.toLocaleString("vi-VN")}</li>
                <li>Cần làm lại: {readiness.reworkQuantity.toLocaleString("vi-VN")}</li>
                <li>Hàng lỗi/hủy: {readiness.defectAndScrapQuantity.toLocaleString("vi-VN")}</li>
                <li>Đóng gói: {readiness.packingCompleted ? "Hoàn thành" : readiness.packingSkipped ? "Không áp dụng" : "Chưa hoàn thành"}</li>
                <li>Sẵn sàng giao hàng: {readiness.isReady ? "Có" : "Chưa"}</li>
              </ul>
              {!readiness.isReady && readiness.missingConditions.length > 0 && (
                <>
                  <p className="admin-field-hint">Điều kiện còn thiếu:</p>
                  <ul>
                    {readiness.missingConditions.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </>
      )}

      {editStage && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setEditStage(null)} />
          <div className="quote-quick-contact-modal__panel">
            <h3 className="quote-quick-contact-modal__title">{editStage.stageTypeLabel}</h3>
            <div className="admin-field">
              <label className="admin-label">Trạng thái</label>
              <select
                className="admin-input"
                value={stageForm.status}
                onChange={(e) => setStageForm((f) => ({ ...f, status: e.target.value as ProductionStageStatus }))}
              >
                {(Object.keys(PRODUCTION_STAGE_STATUS_LABELS) as ProductionStageStatus[]).map((s) => (
                  <option key={s} value={s}>{PRODUCTION_STAGE_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Người phụ trách</label>
              <select
                className="admin-input"
                value={stageForm.assignedEmployeeId}
                onChange={(e) => setStageForm((f) => ({ ...f, assignedEmployeeId: e.target.value }))}
              >
                <option value="">—</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.fullName}</option>
                ))}
              </select>
            </div>
            {(["completedQuantity", "passedQuantity", "defectQuantity", "reworkQuantity", "scrapQuantity"] as const).map((field) => (
              <div className="admin-field" key={field}>
                <label className="admin-label">{field}</label>
                <input className="admin-input" value={stageForm[field]} onChange={(e) => setStageForm((f) => ({ ...f, [field]: e.target.value }))} />
              </div>
            ))}
            <div className="admin-field">
              <label className="admin-label">Ghi chú</label>
              <textarea className="admin-textarea" rows={2} value={stageForm.note} onChange={(e) => setStageForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            {(editStage.status === "COMPLETED" || editStage.status === "SKIPPED") && (
              <div className="admin-field">
                <label className="admin-label">Lý do điều chỉnh số lượng</label>
                <input className="admin-input" value={stageForm.quantityCorrectionReason} onChange={(e) => setStageForm((f) => ({ ...f, quantityCorrectionReason: e.target.value }))} />
              </div>
            )}
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setEditStage(null)}>Đóng</button>
              <button type="button" className="admin-btn admin-btn--primary" onClick={() => void saveStage()}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {mediaPickerOpen && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setMediaPickerOpen(false)} />
          <div className="quote-quick-contact-modal__panel" style={{ maxWidth: 720 }}>
            <h3 className="quote-quick-contact-modal__title">Chọn file minh chứng</h3>
            <div className="admin-media-grid">
              {mediaAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="admin-media-card admin-media-card--pick"
                  onClick={() => void attachEvidence(asset.id)}
                >
                  {isImageMime(asset.mimeType) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.thumbnailUrl ?? asset.url} alt={asset.filename} />
                  ) : (
                    <div className="admin-media-card__file">{asset.filename}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </fieldset>
  );
}
