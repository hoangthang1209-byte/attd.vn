"use client";

import { useEffect, useState } from "react";
import type { ProductionPlanPriority } from "@prisma/client";
import ProductionOwnerSelect from "@/components/admin/orders/ProductionOwnerSelect";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import { useAdminToast } from "@/hooks/useAdminToast";
import { formatOrderDate } from "@/features/orders/order-format";
import type { ProductionPlanDetail, ProductionPlanJobRow } from "@/features/production-planning/production-plan.types";
import {
  PRODUCTION_PLAN_PRIORITY_LABELS,
  WORKSHOP_PRESETS,
} from "@/features/production-planning/production-plan-labels";
import type { EmployeeRecord } from "@/features/employees/employee.service";

type Props = {
  open: boolean;
  row: ProductionPlanJobRow | null;
  onClose: () => void;
  onSaved: (plan: ProductionPlanDetail) => void;
  canEdit: boolean;
};

type FormState = {
  internalDeadlineAt: string;
  plannedStartAt: string;
  plannedEndAt: string;
  productionOwnerId: string;
  productionTeamName: string;
  priority: ProductionPlanPriority;
  estimatedLeadDays: string;
  planningNote: string;
  riskNote: string;
};

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function buildForm(row: ProductionPlanJobRow): FormState {
  return {
    internalDeadlineAt: toDateInput(row.internalDeadline),
    plannedStartAt: toDateInput(row.plannedStartAt),
    plannedEndAt: toDateInput(row.plannedEndAt),
    productionOwnerId: row.ownerId ?? "",
    productionTeamName: row.workshopName ?? "",
    priority: row.priority,
    estimatedLeadDays: "",
    planningNote: "",
    riskNote: "",
  };
}

export default function ProductionPlanEditor({ open, row, onClose, onSaved, canEdit }: Props) {
  const mutate = useAdminMutation();
  const toast = useAdminToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(row?.planId);

  useEffect(() => {
    if (!open || !row) return;
    setForm(buildForm(row));
    void fetch("/api/employees?active=1&role=PRODUCTION&limit=200")
      .then((r) => r.json())
      .then((data: { employees?: EmployeeRecord[] }) => setEmployees(data.employees ?? []));
    void fetch(`/api/production/plans/${row.orderItemId}`)
      .then((r) => r.json())
      .then((data: { plan?: ProductionPlanDetail }) => {
        if (data.plan) {
          setForm({
            internalDeadlineAt: toDateInput(data.plan.internalDeadline),
            plannedStartAt: toDateInput(data.plan.plannedStartAt),
            plannedEndAt: toDateInput(data.plan.plannedEndAt),
            productionOwnerId: data.plan.ownerId ?? "",
            productionTeamName: data.plan.workshopName ?? "",
            priority: data.plan.priority,
            estimatedLeadDays: data.plan.estimatedLeadDays?.toString() ?? "",
            planningNote: data.plan.planningNote ?? "",
            riskNote: data.plan.riskNote ?? "",
          });
          setWarnings(data.plan.warnings);
        }
      });
  }, [open, row]);

  if (!open || !row || !form) return null;

  async function handleSave() {
    if (!row || !canEdit || !form) return;
    setSaving(true);
    await mutate({
      loadingMessage: "Đang lưu kế hoạch…",
      action: async () => {
        const payload = {
          internalDeadlineAt: form.internalDeadlineAt || null,
          plannedStartAt: form.plannedStartAt || null,
          plannedEndAt: form.plannedEndAt || null,
          productionOwnerId: form.productionOwnerId || null,
          productionTeamName: form.productionTeamName || null,
          priority: form.priority,
          estimatedLeadDays: form.estimatedLeadDays ? Number(form.estimatedLeadDays) : null,
          planningNote: form.planningNote || null,
          riskNote: form.riskNote || null,
        };
        const res = await fetch(`/api/production/plans/${row.orderItemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return parseAdminJsonResponse(res, (data) => data.plan as ProductionPlanDetail);
      },
      onSuccess: (plan) => {
        toast.success(isEdit ? "Đã cập nhật kế hoạch" : "Đã lập kế hoạch");
        onSaved(plan);
        onClose();
      },
      onError: (message) => toast.error(message),
    });
    setSaving(false);
  }

  return (
    <div className="prod-plan-drawer-overlay" role="presentation" onClick={onClose}>
      <div
        className="prod-plan-drawer"
        role="dialog"
        aria-labelledby="prod-plan-editor-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="prod-plan-drawer__header">
          <h2 id="prod-plan-editor-title">
            {isEdit ? "Chỉnh sửa kế hoạch sản xuất" : "Lập kế hoạch sản xuất"}
          </h2>
          <button type="button" className="admin-btn admin-btn--ghost admin-btn--small" onClick={onClose}>
            Đóng
          </button>
        </header>

        {warnings.length > 0 && (
          <div className="prod-plan-drawer__warnings">
            {warnings.map((w) => (
              <span key={w} className="prod-plan-warning-tag">{w}</span>
            ))}
          </div>
        )}

        <div className="prod-plan-drawer__body">
          <div className="prod-plan-readonly-grid">
            <div><span className="prod-plan-field-label">Mã công việc</span><strong>{row.jobCode}</strong></div>
            <div><span className="prod-plan-field-label">Đơn hàng</span><strong>{row.orderNo}</strong></div>
            <div><span className="prod-plan-field-label">Sản phẩm</span><strong>{row.productName}</strong></div>
            <div><span className="prod-plan-field-label">Số lượng</span><strong>{row.quantity.toLocaleString("vi-VN")} {row.quantityUnit}</strong></div>
            <div><span className="prod-plan-field-label">Deadline giao khách</span><strong>{row.deliveryDeadline ? formatOrderDate(row.deliveryDeadline) : "—"}</strong></div>
          </div>

          <label className="admin-field">
            <span className="admin-field-label">Hạn hoàn thành sản xuất</span>
            <input
              type="date"
              className="admin-input"
              value={form.internalDeadlineAt}
              onChange={(e) => setForm({ ...form, internalDeadlineAt: e.target.value })}
              disabled={!canEdit}
            />
          </label>

          <div className="prod-plan-date-row">
            <label className="admin-field">
              <span className="admin-field-label">Ngày bắt đầu dự kiến</span>
              <input
                type="date"
                className="admin-input"
                value={form.plannedStartAt}
                onChange={(e) => setForm({ ...form, plannedStartAt: e.target.value })}
                disabled={!canEdit}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field-label">Ngày kết thúc dự kiến</span>
              <input
                type="date"
                className="admin-input"
                value={form.plannedEndAt}
                onChange={(e) => setForm({ ...form, plannedEndAt: e.target.value })}
                disabled={!canEdit}
              />
            </label>
          </div>

          <label className="admin-field">
            <span className="admin-field-label">Người phụ trách sản xuất</span>
            <ProductionOwnerSelect
              value={form.productionOwnerId}
              onChange={(v) => setForm({ ...form, productionOwnerId: v })}
              employees={employees}
              onEmployeesChange={setEmployees}
              disabled={!canEdit}
            />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">Xưởng / tổ</span>
            <input
              className="admin-input"
              list="prod-workshop-presets"
              value={form.productionTeamName}
              onChange={(e) => setForm({ ...form, productionTeamName: e.target.value })}
              disabled={!canEdit}
              placeholder="VD: Xưởng may A"
            />
            <datalist id="prod-workshop-presets">
              {WORKSHOP_PRESETS.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
          </label>

          <label className="admin-field">
            <span className="admin-field-label">Mức ưu tiên</span>
            <select
              className="admin-input"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as ProductionPlanPriority })}
              disabled={!canEdit}
            >
              {(Object.keys(PRODUCTION_PLAN_PRIORITY_LABELS) as ProductionPlanPriority[]).map((p) => (
                <option key={p} value={p}>{PRODUCTION_PLAN_PRIORITY_LABELS[p]}</option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            <span className="admin-field-label">Lead time dự kiến (ngày)</span>
            <input
              type="number"
              min={0}
              className="admin-input"
              value={form.estimatedLeadDays}
              onChange={(e) => setForm({ ...form, estimatedLeadDays: e.target.value })}
              disabled={!canEdit}
            />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">Ghi chú kế hoạch</span>
            <textarea
              className="admin-input"
              rows={3}
              value={form.planningNote}
              onChange={(e) => setForm({ ...form, planningNote: e.target.value })}
              disabled={!canEdit}
            />
          </label>

          <label className="admin-field">
            <span className="admin-field-label">Ghi chú rủi ro</span>
            <textarea
              className="admin-input"
              rows={2}
              value={form.riskNote}
              onChange={(e) => setForm({ ...form, riskNote: e.target.value })}
              disabled={!canEdit}
            />
          </label>
        </div>

        <footer className="prod-plan-drawer__footer">
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>
            Hủy
          </button>
          {canEdit && (
            <AdminLoadingButton
              type="button"
              variant="primary"
              pending={saving}
              pendingLabel="Đang lưu kế hoạch…"
              onClick={() => void handleSave()}
            >
              Lưu kế hoạch
            </AdminLoadingButton>
          )}
        </footer>
      </div>
    </div>
  );
}
