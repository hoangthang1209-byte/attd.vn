"use client";

import { useState } from "react";
import type { ProductionStageStatus } from "@prisma/client";
import type { OrderItemExecutionBundle } from "@/features/orders/production-execution.service";
import type { ProductionStageRecord } from "@/features/orders/production-stage.service";
import type { QcInspectionRecord } from "@/features/orders/qc-inspection.service";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import {
  PRODUCTION_STAGE_STATUS_LABELS,
  QC_EVIDENCE_TYPE_LABELS,
  QC_INSPECTION_STATUS_LABELS,
} from "@/features/orders/production-execution-labels";
import { formatOrderDateTime } from "@/features/orders/order-format";
import { formatOrderItemCardHeading } from "@/features/orders/order-item-display";
import OrderItemReadinessBadge from "@/components/admin/orders/OrderItemReadinessBadge";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type MediaAssetPick = {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
};

type Props = {
  orderId: string;
  item: OrderItemExecutionBundle;
  expanded: boolean;
  onToggle: () => void;
  employees: EmployeeRecord[];
  productionOwnerName: string | null;
  onUpdated: () => void;
  isLegacySharedData?: boolean;
  /** Presentation-only: split stages/QC for production job workspace tabs */
  variant?: "default" | "workspace-stages" | "workspace-qc";
};

function findActiveStageId(stages: ProductionStageRecord[]): string | null {
  const inProgress = stages.find((s) => s.status === "IN_PROGRESS");
  if (inProgress) return inProgress.id;
  const next = stages.find((s) => s.status === "NOT_STARTED" || s.status === "BLOCKED");
  if (next) return next.id;
  return stages[0]?.id ?? null;
}

function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

export default function OrderItemExecutionCard({
  orderId,
  item,
  expanded,
  onToggle,
  employees,
  productionOwnerName,
  onUpdated,
  isLegacySharedData,
  variant = "default",
}: Props) {
  const mutate = useAdminMutation();
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
  const [qcForm, setQcForm] = useState(() => buildQcForm(item.qc));
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetPick[]>([]);
  const [evidenceType, setEvidenceType] = useState<keyof typeof QC_EVIDENCE_TYPE_LABELS>("OTHER");

  const heading = formatOrderItemCardHeading({
    productNameSnapshot: item.productName,
    variantNameSnapshot: null,
    colorSnapshot: item.colorSnapshot,
    quantity: item.quantity,
    unit: item.unit,
  });

  function buildQcForm(qc: QcInspectionRecord | null) {
    return {
      status: (qc?.status ?? "DRAFT") as QcInspectionRecord["status"],
      inspectedByEmployeeId: qc?.inspectedByEmployeeId ?? "",
      inspectedQuantity: qc?.inspectedQuantity ?? "0",
      passedQuantity: qc?.passedQuantity ?? "0",
      defectQuantity: qc?.defectQuantity ?? "0",
      reworkQuantity: qc?.reworkQuantity ?? "0",
      scrapQuantity: qc?.scrapQuantity ?? "0",
      summary: qc?.summary ?? "",
      correctiveAction: qc?.correctiveAction ?? "",
    };
  }

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
        onUpdated();
      },
    });
  }

  async function startQc() {
    await mutate({
      loadingMessage: "Đang khởi tạo QC…",
      successMessage: "Đã bắt đầu kiểm tra QC.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/qc`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderItemId: isLegacySharedData ? null : item.orderItemId }),
        });
        return parseAdminJsonResponse(res, (body) => body.qc as QcInspectionRecord);
      },
      onSuccess: (qc) => {
        setQcForm(buildQcForm(qc));
        onUpdated();
      },
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
            orderItemId: isLegacySharedData ? null : item.orderItemId,
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
      onSuccess: (qc) => {
        setQcForm(buildQcForm(qc));
        onUpdated();
      },
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
          body: JSON.stringify({
            mediaAssetId,
            evidenceType,
            orderItemId: isLegacySharedData ? null : item.orderItemId,
          }),
        });
        return parseAdminJsonResponse(res, () => undefined);
      },
      onSuccess: () => {
        setMediaPickerOpen(false);
        onUpdated();
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
      onSuccess: () => onUpdated(),
    });
  }

  const qc = item.qc;
  const isWorkspace = variant !== "default";
  const showStages = variant !== "workspace-qc";
  const showQc = variant !== "workspace-stages";
  const showHeader = variant === "default";
  const isExpanded = isWorkspace ? true : expanded;
  const activeStageId = findActiveStageId(item.stages);
  const hasQcIssue =
    qc?.status === "REWORK_REQUIRED" ||
    Number(qc?.reworkQuantity ?? 0) > 0 ||
    Number(qc?.defectQuantity ?? 0) > 0;

  function renderStagesTable() {
    return (
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
            {item.stages.length === 0 ? (
              <tr>
                <td colSpan={11}>Chưa có công đoạn sản xuất cho sản phẩm này.</td>
              </tr>
            ) : (
              item.stages.map((stage) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderWorkspaceStages() {
    if (item.stages.length === 0) {
      return <p className="admin-field-hint">Chưa có công đoạn sản xuất cho sản phẩm này.</p>;
    }

    return (
      <div className="prod-job-stages">
        {hasQcIssue && (
          <p className="prod-job-stages__qc-warn" role="status">
            Có vấn đề QC liên quan — kiểm tra tab QC.
          </p>
        )}
        {item.stages.map((stage) => {
          const isDone = stage.status === "COMPLETED" || stage.status === "SKIPPED";
          const isActive = stage.id === activeStageId && !isDone;
          const isUpcoming = !isDone && !isActive;

          if (isDone) {
            return (
              <div key={stage.id} className="prod-job-stage prod-job-stage--done">
                <span className="prod-job-stage__name">{stage.stageTypeLabel}</span>
                <span className="prod-job-stage__status">{stage.statusLabel}</span>
                <span className="prod-job-stage__meta">
                  {stage.completedAt ? formatOrderDateTime(stage.completedAt) : "—"}
                  {stage.assignedEmployeeName ? ` · ${stage.assignedEmployeeName}` : ""}
                </span>
              </div>
            );
          }

          if (isActive) {
            return (
              <div key={stage.id} className="prod-job-stage prod-job-stage--active">
                <div className="prod-job-stage__head">
                  <strong>{stage.stageTypeLabel}</strong>
                  <span className="prod-job-stage__status">{stage.statusLabel}</span>
                </div>
                <dl className="prod-job-stage__details">
                  <div>
                    <dt>Phụ trách</dt>
                    <dd>{stage.assignedEmployeeName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>SL kế hoạch</dt>
                    <dd>{stage.plannedQuantity ?? item.quantity}</dd>
                  </div>
                  <div>
                    <dt>SL hoàn thành</dt>
                    <dd>{stage.completedQuantity}</dd>
                  </div>
                  <div>
                    <dt>Bắt đầu</dt>
                    <dd>{stage.startedAt ? formatOrderDateTime(stage.startedAt) : "—"}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary admin-btn--small"
                  onClick={() => openStageEditor(stage)}
                >
                  Cập nhật công đoạn
                </button>
              </div>
            );
          }

          return (
            <div key={stage.id} className="prod-job-stage prod-job-stage--upcoming">
              <span className="prod-job-stage__name">{stage.stageTypeLabel}</span>
              <span className="prod-job-stage__status">{stage.statusLabel}</span>
              {isUpcoming && stage.assignedEmployeeName && (
                <span className="prod-job-stage__meta">{stage.assignedEmployeeName}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <article
      className={`order-item-execution-card${isExpanded ? " is-expanded" : ""}${
        isWorkspace ? " order-item-execution-card--workspace" : ""
      }`}
    >
      {showHeader && (
        <header className="order-item-execution-card__header">
          <button type="button" className="order-item-execution-card__toggle" onClick={onToggle}>
            <span className="order-item-execution-card__title">{heading}</span>
            <OrderItemReadinessBadge state={item.readiness.state} label={item.readiness.stateLabel} />
          </button>
          <div className="order-item-execution-card__meta">
            {productionOwnerName && (
              <span className="admin-field-hint">Phụ trách SX: {productionOwnerName}</span>
            )}
            {isLegacySharedData && (
              <span className="admin-field-hint order-item-execution-card__legacy-hint">
                Dùng dữ liệu công đoạn/QC cấp đơn hàng (legacy)
              </span>
            )}
          </div>
        </header>
      )}

      {isWorkspace && isLegacySharedData && (
        <p className="admin-field-hint order-item-execution-card__legacy-hint">
          Dùng dữ liệu công đoạn/QC cấp đơn hàng (legacy)
        </p>
      )}

      {isExpanded && (
        <div className="order-item-execution-card__body">
          {showStages && (variant === "workspace-stages" ? renderWorkspaceStages() : renderStagesTable())}

          {showQc && (
          <section className="order-item-execution-card__qc">
            <h4 className="admin-subtitle">Kiểm tra chất lượng</h4>
            {!qc ? (
              <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={() => void startQc()}>
                Bắt đầu kiểm tra QC
              </button>
            ) : (
              <div className="admin-form-grid">
                <p className="admin-field-hint">
                  Trạng thái: <strong>{QC_INSPECTION_STATUS_LABELS[qc.status]}</strong>
                  {qc.inspectedAt && ` · ${formatOrderDateTime(qc.inspectedAt)}`}
                  {qc.updatedAt && ` · Cập nhật: ${formatOrderDateTime(qc.updatedAt)}`}
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
                    <label className="admin-label">
                      {field === "inspectedQuantity"
                        ? "Số lượng kiểm"
                        : field === "passedQuantity"
                          ? "Đạt"
                          : field === "defectQuantity"
                            ? "Lỗi"
                            : field === "reworkQuantity"
                              ? "Làm lại"
                              : "Hủy"}
                    </label>
                    <input
                      className="admin-input"
                      value={qcForm[field]}
                      onChange={(e) => setQcForm((f) => ({ ...f, [field]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="admin-field admin-field--full">
                  <label className="admin-label">Ghi chú QC</label>
                  <textarea className="admin-textarea" rows={2} value={qcForm.summary} onChange={(e) => setQcForm((f) => ({ ...f, summary: e.target.value }))} />
                </div>
                <div className="admin-field admin-field--full">
                  <label className="admin-label">Hành động khắc phục</label>
                  <textarea className="admin-textarea" rows={2} value={qcForm.correctiveAction} onChange={(e) => setQcForm((f) => ({ ...f, correctiveAction: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={() => void saveQc()}>Cập nhật QC</button>
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void saveQc("PASSED")}>Đánh dấu đạt</button>
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void saveQc("REWORK_REQUIRED")}>Cần làm lại</button>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                    <strong>Minh chứng</strong>
                    <select className="admin-input" value={evidenceType} onChange={(e) => setEvidenceType(e.target.value as keyof typeof QC_EVIDENCE_TYPE_LABELS)}>
                      {(Object.keys(QC_EVIDENCE_TYPE_LABELS) as Array<keyof typeof QC_EVIDENCE_TYPE_LABELS>).map((k) => (
                        <option key={k} value={k}>{QC_EVIDENCE_TYPE_LABELS[k]}</option>
                      ))}
                    </select>
                    <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void openMediaPicker()}>
                      Thêm minh chứng
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
          </section>
          )}
        </div>
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
    </article>
  );
}
