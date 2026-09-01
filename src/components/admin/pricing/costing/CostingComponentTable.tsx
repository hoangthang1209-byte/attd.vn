"use client";

import { formatPricingCurrency } from "@/features/pricing/format";
import {
  COSTING_COMPONENT_TYPE_OPTIONS,
  costingComponentTypeLabel,
} from "@/features/pricing/costing-component-labels";
import type { CostingComponentType } from "@/features/pricing/costing-types";

export type CostingComponentRow = {
  label: string;
  type: CostingComponentType;
  unitCost: string;
  totalCost: string;
  quantityFactor: string;
  note: string;
};

type Props = {
  rows: CostingComponentRow[];
  quantity: number;
  onUpdate: (index: number, patch: Partial<CostingComponentRow>) => void;
  onRemove: (index: number) => void;
};

function lineUnitCost(row: CostingComponentRow, quantity: number): number | null {
  const explicitTotal = row.totalCost.trim() ? Number(row.totalCost) : null;
  const unit = row.unitCost.trim() ? Number(row.unitCost) : 0;
  const factor = row.quantityFactor.trim() ? Number(row.quantityFactor) : 1;
  if (explicitTotal != null && Number.isFinite(explicitTotal) && quantity > 0) {
    return Math.round((explicitTotal / quantity) * 100) / 100;
  }
  if (Number.isFinite(unit)) return Math.round(unit * factor * 100) / 100;
  return null;
}

export default function CostingComponentTable({ rows, quantity, onUpdate, onRemove }: Props) {
  if (rows.length === 0) {
    return <p className="admin-field-hint">Chưa có dòng chi phí công đoạn. Dùng &quot;+ Thêm chi phí&quot;.</p>;
  }

  return (
    <>
      <div className="admin-table-wrap costing-component-table-wrap">
        <table className="admin-table costing-component-table">
          <thead>
            <tr>
              <th>Chi phí</th>
              <th>Loại</th>
              <th>Cost / đơn vị</th>
              <th>Hệ số</th>
              <th>Tổng cost</th>
              <th>Ghi chú</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const derivedUnit = lineUnitCost(row, quantity);
              const hasTotalOverride = row.totalCost.trim().length > 0;
              return (
                <tr key={index}>
                  <td>
                    <input
                      className="admin-input"
                      value={row.label}
                      onChange={(e) => onUpdate(index, { label: e.target.value })}
                      placeholder="Tên chi phí"
                    />
                  </td>
                  <td>
                    <select
                      className="admin-input"
                      value={row.type}
                      onChange={(e) =>
                        onUpdate(index, { type: e.target.value as CostingComponentType })
                      }
                    >
                      {COSTING_COMPONENT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="admin-input"
                      type="number"
                      min="0"
                      value={row.unitCost}
                      onChange={(e) => onUpdate(index, { unitCost: e.target.value })}
                      disabled={hasTotalOverride}
                      title={hasTotalOverride ? "Đang dùng tổng cost dòng" : undefined}
                    />
                    {hasTotalOverride && derivedUnit != null && (
                      <span className="admin-field-hint costing-component-table__derived">
                        ≈ {formatPricingCurrency(derivedUnit)}/SP
                      </span>
                    )}
                  </td>
                  <td>
                    <input
                      className="admin-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.quantityFactor}
                      onChange={(e) => onUpdate(index, { quantityFactor: e.target.value })}
                      disabled={hasTotalOverride}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input"
                      type="number"
                      min="0"
                      value={row.totalCost}
                      onChange={(e) => onUpdate(index, { totalCost: e.target.value })}
                      placeholder="Ưu tiên nếu nhập"
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input"
                      value={row.note}
                      onChange={(e) => onUpdate(index, { note: e.target.value })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      aria-label="Xóa dòng"
                      onClick={() => onRemove(index)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="costing-component-cards">
        {rows.map((row, index) => (
          <div key={`mobile-${index}`} className="costing-component-card">
            <div className="costing-component-card__head">
              <strong>{row.label || "Chi phí"}</strong>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                onClick={() => onRemove(index)}
              >
                Xóa
              </button>
            </div>
            <p className="admin-field-hint">{costingComponentTypeLabel(row.type)}</p>
            <div className="costing-component-card__grid">
              <label>
                Cost/SP
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  value={row.unitCost}
                  onChange={(e) => onUpdate(index, { unitCost: e.target.value })}
                />
              </label>
              <label>
                Hệ số
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.quantityFactor}
                  onChange={(e) => onUpdate(index, { quantityFactor: e.target.value })}
                />
              </label>
              <label>
                Tổng cost
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  value={row.totalCost}
                  onChange={(e) => onUpdate(index, { totalCost: e.target.value })}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
