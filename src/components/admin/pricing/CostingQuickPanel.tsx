"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsContext";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import CostingCostPicker from "@/components/admin/pricing/costing/CostingCostPicker";
import CostingCustomCostForm, {
  type CustomCostFormValues,
} from "@/components/admin/pricing/costing/CostingCustomCostForm";
import {
  buildCostingWorkspaceClone,
  type CostingCalculationCloneRecord,
  type CostingWorkspaceClone,
} from "@/features/pricing/costing-calculation-clone";
import { computeSellingPriceCommercials } from "@/features/pricing/costing-batch-selling-price";
import {
  BUILTIN_COST_LIBRARY,
  type CostLibraryItem,
} from "@/features/pricing/cost-library";
import { costingComponentTypeLabel } from "@/features/pricing/costing-component-labels";
import { previewCostingCalculation } from "@/features/pricing/costing-preview";
import {
  applyQuickCostLineUnitCost,
  customValuesToComponentRow,
  flattenWorkspaceToQuickCostLines,
  libraryItemToComponentRow,
  nextQuickCostCellIndex,
  removeQuickCostLine,
  workspaceToCalculatorInput,
  type QuickCostLine,
} from "@/features/pricing/costing-quick-cost";
import { formatPricingCurrency, formatPricingPercent } from "@/features/pricing/format";
import type { CostingBatchRowView } from "@/features/pricing/services/costing-batch.service";

type Props = {
  open: boolean;
  batchId: string;
  row: CostingBatchRowView | null;
  onClose: () => void;
  onSaved: (batch: import("@/features/pricing/services/costing-batch.service").CostingBatchDetail) => void;
  onError: (message: string | null) => void;
};

export default function CostingQuickPanel({
  open,
  batchId,
  row,
  onClose,
  onSaved,
  onError,
}: Props) {
  const { permissions } = useAdminPermissions();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workspace, setWorkspace] = useState<CostingWorkspaceClone | null>(null);
  const [revisionNote, setRevisionNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [costPickerOpen, setCostPickerOpen] = useState(false);
  const [customCostOpen, setCustomCostOpen] = useState(false);
  const [customCostBusy, setCustomCostBusy] = useState(false);
  const [customCostError, setCustomCostError] = useState<string | null>(null);
  const [libraryItems, setLibraryItems] = useState<CostLibraryItem[]>(BUILTIN_COST_LIBRARY);
  const [focusLineIndex, setFocusLineIndex] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const loadLibrary = useCallback(async () => {
    try {
      const res = await fetch("/api/pricing/cost-library");
      const data = (await res.json()) as { items?: CostLibraryItem[] };
      setLibraryItems(data.items ?? BUILTIN_COST_LIBRARY);
    } catch {
      setLibraryItems(BUILTIN_COST_LIBRARY);
    }
  }, []);

  useEffect(() => {
    if (!open || !row?.calculationId) return;
    setLoading(true);
    setError(null);
    setRevisionNote(null);
    void loadLibrary();
    void fetch(`/api/pricing/calculations/${row.calculationId}`)
      .then(async (res) => {
        const data = (await res.json()) as {
          calculation?: CostingCalculationCloneRecord & {
            isFinal: boolean;
            code: string;
            revisionLabel: string | null;
          };
          message?: string;
        };
        if (!res.ok) throw new Error(data.message ?? "Không thể tải costing");
        if (!data.calculation) throw new Error("Không có dữ liệu costing");
        const clone = buildCostingWorkspaceClone(data.calculation);
        if (!clone) throw new Error("Không thể đọc dữ liệu costing");
        setWorkspace(clone);
        if (data.calculation.isFinal) {
          setRevisionNote(
            `FINAL ${data.calculation.code} — lưu sẽ tạo phiên bản WORKING mới, bản FINAL không thay đổi.`,
          );
        }
        setFocusLineIndex(0);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, row?.calculationId, loadLibrary]);

  useEffect(() => {
    if (!open) {
      setWorkspace(null);
      setError(null);
    }
  }, [open]);

  const quickLines = useMemo(
    () => (workspace ? flattenWorkspaceToQuickCostLines(workspace) : []),
    [workspace],
  );

  const preview = useMemo(() => {
    if (!workspace) return null;
    return previewCostingCalculation(workspaceToCalculatorInput(workspace));
  }, [workspace]);

  const commercial = useMemo(() => {
    if (!preview || !row?.quantity) return null;
    const sell = row.sellingPricePerUnit;
    if (sell == null) return null;
    return computeSellingPriceCommercials({
      quantity: row.quantity,
      costEstimate: preview.totalCost,
      sellingPricePerUnit: sell,
    });
  }, [preview, row?.quantity, row?.sellingPricePerUnit]);

  function focusLine(index: number) {
    setFocusLineIndex(index);
    setTimeout(() => inputRefs.current[index]?.focus(), 0);
  }

  function updateLineUnitCost(line: QuickCostLine, value: string) {
    if (!workspace) return;
    setWorkspace(applyQuickCostLineUnitCost(workspace, line, value));
  }

  function appendComponent(row: import("@/components/admin/pricing/costing/CostingComponentTable").CostingComponentRow) {
    if (!workspace) return;
    setWorkspace({
      ...workspace,
      components: [...workspace.components, row],
    });
    const nextIndex = quickLines.length;
    setTimeout(() => focusLine(nextIndex), 0);
  }

  async function handleCustomCostSubmit(values: CustomCostFormValues) {
    setCustomCostBusy(true);
    setCustomCostError(null);
    try {
      appendComponent(customValuesToComponentRow(values));
      setCustomCostOpen(false);
      setCostPickerOpen(false);
    } finally {
      setCustomCostBusy(false);
    }
  }

  const handleSave = useCallback(async () => {
    if (!workspace || !row) return;
    setSaving(true);
    onError(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/pricing/costing-batches/${batchId}/items/${row.itemId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "quickCost", workspace }),
        },
      );
      const data = (await res.json()) as {
        batch?: import("@/features/pricing/services/costing-batch.service").CostingBatchDetail;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể lưu quick costing");
      if (data.batch) {
        onSaved(data.batch);
        onClose();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể lưu";
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }, [workspace, row, batchId, onClose, onError, onSaved]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handleSave]);

  function handleLineKeyDown(
    e: React.KeyboardEvent,
    lineIndex: number,
    line: QuickCostLine,
  ) {
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const next = nextQuickCostCellIndex(lineIndex, quickLines.length, 1);
      focusLine(next);
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      const prev = nextQuickCostCellIndex(lineIndex, quickLines.length, -1);
      focusLine(prev);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const next = nextQuickCostCellIndex(lineIndex, quickLines.length, 1);
      if (next === lineIndex) void handleSave();
      else focusLine(next);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  if (!open || !row) return null;

  return (
    <>
      <div
        className="costing-quick-panel__backdrop"
        role="presentation"
        onClick={() => !saving && onClose()}
      />
      <aside className="costing-quick-panel" role="dialog" aria-modal="true" aria-label="Quick costing">
        <header className="costing-quick-panel__header">
          <div>
            <h3 className="costing-quick-panel__title">Sửa nhanh giá vốn</h3>
            <p className="admin-field-hint">
              {row.productName}
              {row.quantity != null && ` · ${row.quantity} ${row.unit ?? ""}`}
            </p>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--xs"
            disabled={saving}
            onClick={onClose}
          >
            Đóng
          </button>
        </header>

        {loading && <p className="admin-field-hint">Đang tải…</p>}
        {error && <p className="admin-error">{error}</p>}
        {revisionNote && (
          <p className="admin-kb-badge admin-kb-badge--medium costing-quick-panel__revision-note">
            {revisionNote}
          </p>
        )}

        {workspace && preview && (
          <div className="costing-quick-panel__body">
            <div className="costing-quick-panel__summary">
              <div>
                <span className="admin-field-hint">Giá vốn / SP</span>
                <strong>
                  {preview.totalCostPerUnit > 0
                    ? formatPricingCurrency(preview.totalCostPerUnit)
                    : "—"}
                </strong>
              </div>
              <div>
                <span className="admin-field-hint">Tổng giá vốn</span>
                <strong>
                  {preview.totalCost > 0 ? formatPricingCurrency(preview.totalCost) : "—"}
                </strong>
              </div>
              <div>
                <span className="admin-field-hint">Giá bán / SP</span>
                <strong>
                  {commercial
                    ? formatPricingCurrency(commercial.sellingPricePerUnit)
                    : row.sellingPricePerUnit != null
                      ? formatPricingCurrency(row.sellingPricePerUnit)
                      : "—"}
                </strong>
              </div>
              <div>
                <span className="admin-field-hint">LN / SP</span>
                <strong>
                  {commercial && preview.totalCost > 0
                    ? formatPricingCurrency(commercial.profit / commercial.quantity)
                    : "—"}
                </strong>
              </div>
              <div>
                <span className="admin-field-hint">Margin</span>
                <strong>
                  {commercial && preview.totalCost > 0
                    ? formatPricingPercent(commercial.marginRate)
                    : "—"}
                </strong>
              </div>
            </div>

            <div className="costing-quick-panel__toolbar">
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                onClick={() => setCostPickerOpen(true)}
              >
                + Chi phí
              </button>
              <Link
                href={`/admin/pricing/costing?batchId=${batchId}&batchItemId=${row.itemId}${
                  row.calculationId ? `&fromCalculation=${row.calculationId}` : ""
                }`}
                className="admin-btn admin-btn--secondary admin-btn--xs"
              >
                Mở costing đầy đủ
              </Link>
            </div>

            <table className="costing-quick-panel__table">
              <thead>
                <tr>
                  <th>Loại</th>
                  <th>Chi phí</th>
                  <th>Cost / SP</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {quickLines.map((line, index) => (
                  <tr key={line.key}>
                    <td className="costing-quick-panel__type">
                      {costingComponentTypeLabel(line.type)}
                    </td>
                    <td>
                      <strong>{line.label}</strong>
                      {line.detail && (
                        <span className="admin-field-hint"> · {line.detail}</span>
                      )}
                    </td>
                    <td>
                      <input
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        className="costing-batch-cell-input costing-quick-panel__cost-input"
                        type="text"
                        inputMode="numeric"
                        value={line.unitCost}
                        disabled={saving}
                        onChange={(e) => updateLineUnitCost(line, e.target.value)}
                        onKeyDown={(e) => handleLineKeyDown(e, index, line)}
                      />
                    </td>
                    <td>
                      {!row.isFinal && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--xs admin-btn--secondary"
                          aria-label="Xóa dòng"
                          disabled={saving}
                          onClick={() => {
                            if (!workspace) return;
                            setWorkspace(removeQuickCostLine(workspace, line));
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {quickLines.length === 0 && (
                  <tr>
                    <td colSpan={4} className="admin-field-hint">
                      Chưa có dòng chi phí. Thêm từ thư viện hoặc costing đầy đủ.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <footer className="costing-quick-panel__footer">
          <p className="admin-field-hint">Tab / Shift+Tab · Enter xuống dòng · Ctrl+Enter lưu</p>
          <div className="costing-quick-panel__footer-actions">
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              disabled={saving}
              onClick={onClose}
            >
              Hủy
            </button>
            <AdminLoadingButton
              type="button"
              variant="primary"
              pending={saving}
              pendingLabel="Đang lưu…"
              disabled={!workspace || loading}
              onClick={() => void handleSave()}
            >
              Lưu giá vốn
            </AdminLoadingButton>
          </div>
        </footer>
      </aside>

      <CostingCostPicker
        open={costPickerOpen}
        items={libraryItems}
        onClose={() => setCostPickerOpen(false)}
        onPickLibraryItem={(id) => {
          const item = libraryItems.find((entry) => entry.id === id);
          if (item) appendComponent(libraryItemToComponentRow(item));
        }}
        onOpenCustomForm={() => {
          setCustomCostOpen(true);
          setCostPickerOpen(false);
        }}
      />

      <CostingCustomCostForm
        open={customCostOpen}
        busy={customCostBusy}
        error={customCostError}
        canSaveToLibrary={permissions.canAccessPricing}
        onClose={() => setCustomCostOpen(false)}
        onSubmit={(values) => void handleCustomCostSubmit(values)}
      />
    </>
  );
}
