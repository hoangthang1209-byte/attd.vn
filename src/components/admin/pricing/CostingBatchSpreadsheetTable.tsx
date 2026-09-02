"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import CostingBatchStyleCell from "@/components/admin/pricing/CostingBatchStyleCell";
import {
  formatPricingCurrency,
  formatPricingPercent,
} from "@/features/pricing/format";
import type { CostingBatchDetail, CostingBatchRowView } from "@/features/pricing/services/costing-batch.service";
import {
  buildPersistPayloadFromDraft,
  canPersistSpreadsheetRow,
  computeSpreadsheetLiveRow,
  computeSpreadsheetTotals,
  createEmptyDraftRow,
  liveRowFromPersisted,
  nextEditableColumn,
  parseSpreadsheetTsv,
  pastedRowToDraft,
  parseIntegerQuantity,
  parseSellingPrice,
  type SpreadsheetEditableColumn,
  type SpreadsheetRowDraft,
} from "@/features/pricing/costing-batch-spreadsheet";

type Props = {
  batchId: string;
  batch: CostingBatchDetail;
  selected: Set<string>;
  onBatchUpdate: (batch: CostingBatchDetail) => void;
  onError: (message: string | null) => void;
  onToggleRow: (itemId: string) => void;
  onToggleAllCosted: () => void;
  onCloneStart: (itemId: string) => void;
  onFinalizeRow: (itemId: string) => void;
};

function newDraftId() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function rowToEditState(row: CostingBatchRowView) {
  if (row.isIncomplete) {
    return {
      customProductName: row.label ?? "",
      quantity: "",
      groupLabel: row.groupLabel ?? "",
      sellingPrice: "",
    };
  }
  return {
    productId: row.productId ?? undefined,
    variantId: row.variantId ?? undefined,
    customProductName: row.customProductName ?? row.productName ?? "",
    quantity: row.quantity != null ? String(row.quantity) : "",
    groupLabel: row.groupLabel ?? "",
    sellingPrice:
      row.sellingPricePerUnit != null ? String(row.sellingPricePerUnit) : "",
  };
}

export default function CostingBatchSpreadsheetTable({
  batchId,
  batch,
  selected,
  onBatchUpdate,
  onError,
  onToggleRow,
  onToggleAllCosted,
  onCloneStart,
  onFinalizeRow,
}: Props) {
  const [drafts, setDrafts] = useState<SpreadsheetRowDraft[]>([]);
  const [rowEdits, setRowEdits] = useState<Record<string, ReturnType<typeof rowToEditState>>>({});
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const focusStyleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const next: Record<string, ReturnType<typeof rowToEditState>> = {};
    for (const row of batch.rows) {
      next[row.itemId] = rowToEditState(row);
    }
    setRowEdits(next);
  }, [batch.rows]);

  const groupedPersisted = useMemo(() => {
    const groups = new Map<string, CostingBatchRowView[]>();
    for (const row of batch.rows) {
      const key = row.groupLabel?.trim() || "";
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "vi"));
  }, [batch.rows]);

  const liveRows = useMemo(() => {
    const persisted = batch.rows.map((row) => {
      if (row.isIncomplete) {
        const qty = parseIntegerQuantity(row.label ?? "");
        return computeSpreadsheetLiveRow({
          quantity: qty,
          sellingPricePerUnit: null,
          totalCost: null,
        });
      }
      const edit = rowEdits[row.itemId];
      const qty = edit
        ? parseIntegerQuantity(edit.quantity)
        : row.quantity;
      const sell = edit
        ? parseSellingPrice(edit.sellingPrice)
        : row.sellingPricePerUnit;
      return liveRowFromPersisted({
        quantity: qty ?? row.quantity,
        sellingPricePerUnit: sell ?? row.sellingPricePerUnit,
        totalCost: row.totalCost,
      });
    });

    const draftLive = drafts.map((draft) => {
      const qty = parseIntegerQuantity(draft.quantity);
      const sell = parseSellingPrice(draft.sellingPrice);
      return computeSpreadsheetLiveRow({
        quantity: qty,
        sellingPricePerUnit: sell,
        totalCost: null,
      });
    });

    return [...persisted, ...draftLive];
  }, [batch.rows, drafts, rowEdits]);

  const previewTotals = useMemo(() => computeSpreadsheetTotals(liveRows), [liveRows]);

  const markSaving = (key: string, saving: boolean) => {
    setSavingKeys((prev) => {
      const next = new Set(prev);
      if (saving) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const addDraftRow = useCallback((focus = true) => {
    setDrafts((prev) => [...prev, createEmptyDraftRow(newDraftId())]);
    if (focus) setTimeout(() => focusStyleRef.current?.focus(), 0);
  }, []);

  const removeDraft = (draftId: string) => {
    setDrafts((prev) => prev.filter((d) => d.draftId !== draftId));
  };

  const updateDraft = (draftId: string, patch: Partial<SpreadsheetRowDraft>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.draftId === draftId ? { ...d, ...patch, fieldErrors: undefined } : d)),
    );
  };

  const persistDraft = async (draft: SpreadsheetRowDraft) => {
    const payload = buildPersistPayloadFromDraft(draft);
    if (!payload) return;
    markSaving(draft.draftId, true);
    onError(null);
    try {
      const res = await fetch(`/api/pricing/costing-batches/${batchId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "persist", ...payload }),
      });
      const data = (await res.json()) as { batch?: CostingBatchDetail; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể lưu dòng");
      if (data.batch) onBatchUpdate(data.batch);
      setDrafts((prev) => prev.filter((d) => d.draftId !== draft.draftId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi lưu dòng";
      onError(message);
      updateDraft(draft.draftId, { saveError: message });
    } finally {
      markSaving(draft.draftId, false);
    }
  };

  const persistIncomplete = async (row: CostingBatchRowView, edit: ReturnType<typeof rowToEditState>) => {
    const draft: SpreadsheetRowDraft = {
      draftId: row.itemId,
      productId: edit.productId,
      variantId: edit.variantId,
      customProductName: edit.customProductName,
      quantity: edit.quantity,
      groupLabel: edit.groupLabel,
      sellingPrice: edit.sellingPrice,
    };
    const payload = buildPersistPayloadFromDraft(draft);
    if (!payload) return;
    markSaving(row.itemId, true);
    onError(null);
    try {
      const res = await fetch(`/api/pricing/costing-batches/${batchId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "persist", itemId: row.itemId, ...payload }),
      });
      const data = (await res.json()) as { batch?: CostingBatchDetail; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể lưu dòng");
      if (data.batch) onBatchUpdate(data.batch);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Lỗi lưu dòng");
    } finally {
      markSaving(row.itemId, false);
    }
  };

  const updatePersistedRow = async (
    row: CostingBatchRowView,
    edit: ReturnType<typeof rowToEditState>,
  ) => {
    const quantity = parseIntegerQuantity(edit.quantity);
    if (!quantity) return;
    markSaving(row.itemId, true);
    onError(null);
    try {
      const body: Record<string, unknown> = {
        action: "fields",
        productId: edit.productId ?? null,
        variantId: edit.variantId ?? null,
        customProductName: edit.productId ? null : edit.customProductName.trim(),
        quantity,
        groupLabel: edit.groupLabel.trim() || null,
      };
      if (edit.sellingPrice.trim()) {
        const sell = parseSellingPrice(edit.sellingPrice);
        if (sell != null) body.sellingPricePerUnit = sell;
      }
      const res = await fetch(
        `/api/pricing/costing-batches/${batchId}/items/${row.itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = (await res.json()) as { batch?: CostingBatchDetail; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể cập nhật dòng");
      if (data.batch) onBatchUpdate(data.batch);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Lỗi cập nhật dòng");
    } finally {
      markSaving(row.itemId, false);
    }
  };

  const commitRowEdit = async (row: CostingBatchRowView) => {
    const edit = rowEdits[row.itemId] ?? rowToEditState(row);
    if (row.isIncomplete) {
      if (canPersistSpreadsheetRow({
        draftId: row.itemId,
        ...edit,
      } as SpreadsheetRowDraft)) {
        await persistIncomplete(row, edit);
      }
      return;
    }
    if (row.isFinal) {
      if (edit.sellingPrice.trim()) {
        const sell = parseSellingPrice(edit.sellingPrice);
        if (sell == null) return;
        markSaving(row.itemId, true);
        try {
          const res = await fetch(
            `/api/pricing/costing-batches/${batchId}/items/${row.itemId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "sellingPrice", sellingPricePerUnit: sell }),
            },
          );
          const data = (await res.json()) as { batch?: CostingBatchDetail; message?: string };
          if (!res.ok) throw new Error(data.message ?? "Không thể cập nhật giá bán");
          if (data.batch) onBatchUpdate(data.batch);
        } catch (err) {
          onError(err instanceof Error ? err.message : "Lỗi cập nhật giá bán");
        } finally {
          markSaving(row.itemId, false);
        }
      }
      return;
    }
    await updatePersistedRow(row, edit);
  };

  const removePersistedRow = async (itemId: string) => {
    markSaving(itemId, true);
    onError(null);
    try {
      const res = await fetch(`/api/pricing/costing-batches/${batchId}/items/${itemId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { batch?: CostingBatchDetail; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể xóa dòng");
      if (data.batch) onBatchUpdate(data.batch);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Không thể xóa dòng");
    } finally {
      markSaving(itemId, false);
    }
  };

  const handlePasteApply = () => {
    const rows = parseSpreadsheetTsv(pasteText);
    if (!rows.length) return;
    setDrafts((prev) => [
      ...prev,
      ...rows.map((row) => pastedRowToDraft(row, newDraftId())),
    ]);
    setPasteText("");
    setPasteOpen(false);
  };

  const persistAllDrafts = async () => {
    const valid = drafts.filter(canPersistSpreadsheetRow);
    if (!valid.length) return;
    onError(null);
    const payloads = valid.map((d) => buildPersistPayloadFromDraft(d)).filter(Boolean);
    if (!payloads.length) return;
    markSaving("bulk", true);
    try {
      const res = await fetch(`/api/pricing/costing-batches/${batchId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "persistBulk", rows: payloads }),
      });
      const data = (await res.json()) as { batch?: CostingBatchDetail; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể lưu các dòng");
      if (data.batch) onBatchUpdate(data.batch);
      setDrafts((prev) => prev.filter((d) => !canPersistSpreadsheetRow(d)));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Không thể lưu các dòng");
    } finally {
      markSaving("bulk", false);
    }
  };

  function costingHref(row: CostingBatchRowView) {
    const params = new URLSearchParams({ batchId, batchItemId: row.itemId });
    if (row.calculationId) params.set("fromCalculation", row.calculationId);
    return `/admin/pricing/costing?${params.toString()}`;
  }

  function renderEditableCell(
    rowKey: string,
    column: SpreadsheetEditableColumn,
    value: string,
    onValueChange: (v: string) => void,
    options?: {
      disabled?: boolean;
      numeric?: boolean;
      onCommit?: () => void;
      onKeyNav?: (key: "enter" | "tab" | "shiftTab" | "escape") => void;
      styleCell?: boolean;
      styleProps?: {
        productId?: string;
        onStyleChange: (next: {
          customProductName: string;
          productId?: string;
          variantId?: string;
        }) => void;
        autoFocus?: boolean;
        inputRef?: React.RefObject<HTMLInputElement | null>;
      };
    },
  ) {
    if (options?.styleCell && options.styleProps) {
      return (
        <CostingBatchStyleCell
          value={value}
          productId={options.styleProps.productId}
          disabled={options?.disabled}
          autoFocus={options.styleProps.autoFocus}
          inputRef={options.styleProps.inputRef}
          onChange={options.styleProps.onStyleChange}
          onCommit={options.onCommit}
          onKeyNav={options.onKeyNav}
        />
      );
    }

    return (
      <input
        className="costing-batch-cell-input"
        type={options?.numeric ? "text" : "text"}
        inputMode={options?.numeric ? "numeric" : "text"}
        value={value}
        disabled={options?.disabled}
        onChange={(e) => onValueChange(e.target.value)}
        onBlur={() => options?.onCommit?.()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            options?.onKeyNav?.("enter");
          } else if (e.key === "Tab" && e.shiftKey) {
            e.preventDefault();
            options?.onKeyNav?.("shiftTab");
          } else if (e.key === "Tab") {
            e.preventDefault();
            options?.onKeyNav?.("tab");
          } else if (e.key === "Escape") {
            e.preventDefault();
            options?.onKeyNav?.("escape");
          }
        }}
      />
    );
  }

  function keyNavHandler(
    column: SpreadsheetEditableColumn,
    onColumnFocus: (col: SpreadsheetEditableColumn) => void,
    onRowDown?: () => void,
  ) {
    return (key: "enter" | "tab" | "shiftTab" | "escape") => {
      if (key === "enter") {
        onRowDown?.();
        return;
      }
      if (key === "escape") return;
      const dir = key === "tab" ? 1 : -1;
      onColumnFocus(nextEditableColumn(column, dir as 1 | -1));
    };
  }

  function renderDraftRow(draft: SpreadsheetRowDraft, isFirstDraft: boolean) {
    const live = computeSpreadsheetLiveRow({
      quantity: parseIntegerQuantity(draft.quantity),
      sellingPricePerUnit: parseSellingPrice(draft.sellingPrice),
      totalCost: null,
    });
    const saving = savingKeys.has(draft.draftId);

    return (
      <tr key={draft.draftId} className="costing-batch-table__draft-row">
        <td />
        <td>
          {renderEditableCell(draft.draftId, "style", draft.customProductName, () => {}, {
            styleCell: true,
            styleProps: {
              productId: draft.productId,
              autoFocus: isFirstDraft && drafts.length === 1,
              inputRef: isFirstDraft ? focusStyleRef : undefined,
              onStyleChange: (next) =>
                updateDraft(draft.draftId, {
                  customProductName: next.customProductName,
                  productId: next.productId,
                  variantId: next.variantId,
                }),
            },
            onCommit: () => {
              if (canPersistSpreadsheetRow(draft)) void persistDraft(draft);
            },
            onKeyNav: keyNavHandler("style", () => {}, () => {
              if (canPersistSpreadsheetRow(draft)) void persistDraft(draft);
            }),
          })}
          {draft.fieldErrors?.style && (
            <span className="admin-field-error">{draft.fieldErrors.style}</span>
          )}
        </td>
        <td>
          {renderEditableCell(
            draft.draftId,
            "quantity",
            draft.quantity,
            (v) => updateDraft(draft.draftId, { quantity: v }),
            {
              numeric: true,
              onCommit: () => {
                if (canPersistSpreadsheetRow(draft)) void persistDraft(draft);
              },
              onKeyNav: keyNavHandler("quantity", () => {}, () => {
                if (canPersistSpreadsheetRow(draft)) void persistDraft(draft);
              }),
            },
          )}
          {draft.fieldErrors?.quantity && (
            <span className="admin-field-error">{draft.fieldErrors.quantity}</span>
          )}
        </td>
        <td>
          {renderEditableCell(
            draft.draftId,
            "group",
            draft.groupLabel,
            (v) => updateDraft(draft.draftId, { groupLabel: v }),
            {
              onCommit: () => {
                if (canPersistSpreadsheetRow(draft)) void persistDraft(draft);
              },
            },
          )}
        </td>
        <td className="costing-batch-table__num">—</td>
        <td className="costing-batch-table__num">—</td>
        <td>
          {renderEditableCell(
            draft.draftId,
            "sellingPrice",
            draft.sellingPrice,
            (v) => updateDraft(draft.draftId, { sellingPrice: v }),
            {
              numeric: true,
              onCommit: () => {
                if (canPersistSpreadsheetRow(draft)) void persistDraft(draft);
              },
            },
          )}
        </td>
        <td className="costing-batch-table__num">
          {live.revenue != null ? formatPricingCurrency(live.revenue) : "—"}
        </td>
        <td className="costing-batch-table__num">—</td>
        <td className="costing-batch-table__num">—</td>
        <td>—</td>
        <td>
          <div className="costing-batch-table__actions">
            <button
              type="button"
              className="admin-btn admin-btn--xs admin-btn--secondary"
              disabled={saving || !canPersistSpreadsheetRow(draft)}
              onClick={() => void persistDraft(draft)}
            >
              Lưu
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--xs admin-btn--secondary"
              onClick={() => removeDraft(draft.draftId)}
            >
              Xóa
            </button>
          </div>
          {draft.saveError && <span className="admin-field-error">{draft.saveError}</span>}
        </td>
      </tr>
    );
  }

  function renderPersistedRow(row: CostingBatchRowView) {
    const edit = row.isIncomplete
      ? rowEdits[row.itemId] ?? {
          customProductName: row.label ?? "",
          quantity: "",
          groupLabel: row.groupLabel ?? "",
          sellingPrice: "",
        }
      : rowEdits[row.itemId] ?? rowToEditState(row);

    if (row.isIncomplete && !rowEdits[row.itemId]) {
      // ensure incomplete row has edit state
    }

    const live = row.isIncomplete
      ? computeSpreadsheetLiveRow({
          quantity: parseIntegerQuantity(edit.quantity),
          sellingPricePerUnit: parseSellingPrice(edit.sellingPrice),
          totalCost: null,
        })
      : liveRowFromPersisted({
          quantity: parseIntegerQuantity(edit.quantity) ?? row.quantity,
          sellingPricePerUnit:
            parseSellingPrice(edit.sellingPrice) ?? row.sellingPricePerUnit,
          totalCost: row.totalCost,
        });

    const saving = savingKeys.has(row.itemId);
    const structuralLocked = row.isFinal || false;
    const styleLocked = structuralLocked && !row.isIncomplete;

    const setEdit = (patch: Partial<typeof edit>) => {
      setRowEdits((prev) => ({
        ...prev,
        [row.itemId]: { ...edit, ...patch },
      }));
    };

    return (
      <tr key={row.itemId} className={row.isIncomplete ? "costing-batch-table__draft-row" : undefined}>
        <td>
          {row.calculationId && (
            <input
              type="checkbox"
              checked={selected.has(row.itemId)}
              onChange={() => onToggleRow(row.itemId)}
              aria-label={`Chọn ${row.productName}`}
            />
          )}
        </td>
        <td>
          {styleLocked ? (
            <strong>{row.productName}</strong>
          ) : (
            renderEditableCell(row.itemId, "style", edit.customProductName, () => {}, {
              styleCell: true,
              styleProps: {
                productId: edit.productId,
                onStyleChange: (next) =>
                  setEdit({
                    customProductName: next.customProductName,
                    productId: next.productId,
                    variantId: next.variantId,
                  }),
              },
              onCommit: () => void commitRowEdit(row),
            })
          )}
          {row.calculationCode && (
            <span className="admin-field-hint"> · {row.calculationCode}</span>
          )}
        </td>
        <td>
          {styleLocked ? (
            row.quantity != null ? row.quantity : "—"
          ) : (
            renderEditableCell(
              row.itemId,
              "quantity",
              edit.quantity,
              (v) => setEdit({ quantity: v }),
              {
                numeric: true,
                onCommit: () => void commitRowEdit(row),
              },
            )
          )}
        </td>
        <td>
          {styleLocked ? (
            row.groupLabel ?? "—"
          ) : (
            renderEditableCell(
              row.itemId,
              "group",
              edit.groupLabel,
              (v) => setEdit({ groupLabel: v }),
              {
                onCommit: () => void commitRowEdit(row),
              },
            )
          )}
        </td>
        <td className="costing-batch-table__num">
          {row.costPerUnit != null ? formatPricingCurrency(row.costPerUnit) : "—"}
        </td>
        <td className="costing-batch-table__num">
          {row.totalCost != null ? formatPricingCurrency(row.totalCost) : "—"}
        </td>
        <td>
          {renderEditableCell(
            row.itemId,
            "sellingPrice",
            edit.sellingPrice,
            (v) => setEdit({ sellingPrice: v }),
            {
              numeric: true,
              onCommit: () => void commitRowEdit(row),
            },
          )}
        </td>
        <td className="costing-batch-table__num">
          {live.revenue != null ? formatPricingCurrency(live.revenue) : "—"}
        </td>
        <td className="costing-batch-table__num">
          {live.profit != null ? formatPricingCurrency(live.profit) : "—"}
        </td>
        <td className="costing-batch-table__num">
          {formatPricingPercent(live.marginRate)}
        </td>
        <td>
          {row.revisionDisplay ?? "—"}
          {row.isFinal && (
            <span className="admin-kb-badge admin-kb-badge--verified">FINAL</span>
          )}
        </td>
        <td>
          <div className="costing-batch-table__actions">
            <Link
              href={costingHref(row)}
              className="admin-btn admin-btn--xs admin-btn--secondary"
            >
              {row.calculationId ? "Sửa costing" : "Tính giá"}
            </Link>
            {row.calculationId && !row.isFinal && (
              <button
                type="button"
                className="admin-btn admin-btn--xs admin-btn--secondary"
                disabled={saving}
                onClick={() => onFinalizeRow(row.itemId)}
              >
                Chốt
              </button>
            )}
            {row.calculationId && !row.isFinal && (
              <button
                type="button"
                className="admin-btn admin-btn--xs admin-btn--secondary"
                disabled={saving}
                onClick={() => onCloneStart(row.itemId)}
              >
                Nhân bản
              </button>
            )}
            {row.calculationId && (
              <Link
                href={`/admin/pricing/history/${row.calculationId}`}
                className="admin-btn admin-btn--xs admin-btn--secondary"
              >
                Chi tiết
              </Link>
            )}
            {!row.isFinal && (
              <button
                type="button"
                className="admin-btn admin-btn--xs admin-btn--secondary"
                disabled={saving}
                onClick={() => void removePersistedRow(row.itemId)}
              >
                Xóa
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  const costedCount = batch.rows.filter((r) => r.calculationId).length;

  return (
    <>
      <div className="costing-batch-spreadsheet-toolbar">
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => addDraftRow()}>
          Thêm style
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          onClick={() => setPasteOpen(true)}
        >
          Dán nhiều style
        </button>
        {drafts.some(canPersistSpreadsheetRow) && (
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={savingKeys.has("bulk")}
            onClick={() => void persistAllDrafts()}
          >
            Lưu tất cả draft hợp lệ ({drafts.filter(canPersistSpreadsheetRow).length})
          </button>
        )}
        <span className="admin-field-hint costing-batch-spreadsheet-toolbar__preview">
          Preview: {previewTotals.totalQuantity.toLocaleString("vi-VN")} SL ·{" "}
          {formatPricingCurrency(previewTotals.totalRevenue)} doanh thu
          {previewTotals.hasCostTotals
            ? ` · ${formatPricingCurrency(previewTotals.totalProfit)} lợi nhuận`
            : " · cost chưa có"}
        </span>
      </div>

      <div className="admin-table-wrap costing-batch-table-wrap">
        <table className="admin-table costing-batch-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả"
                  onChange={() => onToggleAllCosted()}
                  checked={costedCount > 0 && selected.size === costedCount}
                />
              </th>
              <th>Style / SP</th>
              <th>SL</th>
              <th>Nhóm</th>
              <th>Cost / SP</th>
              <th>Tổng cost</th>
              <th>Giá bán / SP</th>
              <th>Doanh thu</th>
              <th>Lợi nhuận</th>
              <th>Margin</th>
              <th>Revision</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {groupedPersisted.flatMap(([groupLabel, rows]) => {
              const header =
                groupLabel
                  ? (
                      <tr key={`group-${groupLabel}`} className="costing-batch-table__group-row">
                        <td colSpan={12}><strong>{groupLabel}</strong></td>
                      </tr>
                    )
                  : null;
              return header
                ? [header, ...rows.map(renderPersistedRow)]
                : rows.map(renderPersistedRow);
            })}
            {drafts.map((draft, index) => renderDraftRow(draft, index === 0))}
            {batch.rows.length === 0 && drafts.length === 0 && (
              <tr>
                <td colSpan={12} className="admin-field-hint">
                  Chưa có dòng. Thêm style hoặc dán từ Excel.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pasteOpen && (
        <div className="costing-picker-backdrop" role="presentation" onClick={() => setPasteOpen(false)}>
          <div
            className="costing-picker costing-picker--form"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="costing-picker__title">Dán nhiều style</h3>
            <p className="admin-field-hint">
              Cột: Style · SL · Nhóm · Giá bán (tab-separated, mỗi dòng một style)
            </p>
            <textarea
              className="admin-input"
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Sleeveless Top	270	T-SHIRTS	162000"
            />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button type="button" className="admin-btn admin-btn--primary" onClick={handlePasteApply}>
                Thêm draft để xem lại
              </button>
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setPasteOpen(false)}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
