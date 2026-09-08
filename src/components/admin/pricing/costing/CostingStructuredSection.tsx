"use client";

import { formatPricingCurrency } from "@/features/pricing/format";
import type { CostingLineSection, CostingStructuredLine } from "@/features/pricing/costing-types";
import {
  consumptionHint,
  materialLineSubtitle,
  pricingBasisLabel,
} from "@/features/pricing/costing-v2-identity";
import { restoreLineReferencePrice } from "@/features/pricing/costing-v2";

type Props = {
  section: CostingLineSection;
  title: string;
  addLabel: string;
  lines: CostingStructuredLine[];
  quantity: number;
  subtotal: number;
  onAdd: () => void;
  onChange: (key: string, patch: Partial<CostingStructuredLine>) => void;
  onRemove: (key: string) => void;
  onReplaceSource?: (key: string) => void;
};

function numericOrEmpty(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value);
}

export default function CostingStructuredSection({
  section,
  title,
  addLabel,
  lines,
  quantity,
  subtotal,
  onAdd,
  onChange,
  onRemove,
  onReplaceSource,
}: Props) {
  return (
    <section className={`costing-section costing-line-section costing-line-section--${section.toLowerCase()}`}>
      <div className="costing-section__head">
        <h2 className="costing-section__title">{title}</h2>
        <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={onAdd}>
          {addLabel}
        </button>
      </div>

      {lines.length === 0 ? (
        <p className="admin-field-hint">Chưa có dòng. Dùng “{addLabel}”.</p>
      ) : (
        <>
          <div className="admin-table-wrap costing-component-table-wrap costing-line-table-wrap">
            <table className="admin-table costing-component-table costing-line-table">
              <thead>
                <tr>
                  <th>Hạng mục</th>
                  {section !== "OTHER" && <th>{section === "PROCESS" ? "Xưởng / NCC" : "Nhà cung cấp"}</th>}
                  {section !== "OTHER" && <th>Đơn giá</th>}
                  {section === "MATERIAL" && <th>Đơn vị</th>}
                  {section === "PROCESS" && <th>Cách tính</th>}
                  <th>{section === "MATERIAL" ? "Định mức" : section === "PROCESS" ? "SL / Hệ số" : "Cost/SP"}</th>
                  <th>Cost/SP</th>
                  <th>Ghi chú</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.key} className={line.origin === "CUSTOM" ? "costing-line-row--custom" : undefined}>
                    <td>
                      <input
                        className="admin-input"
                        value={line.label}
                        onChange={(event) => onChange(line.key, { label: event.target.value })}
                        placeholder="Hạng mục"
                      />
                      {line.origin === "LEGACY" && (
                        <span className="admin-field-hint">Công thức cũ · không đổi khi mở lại</span>
                      )}
                      {line.pricingBasis === "LEGACY_YIELD" && onReplaceSource && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                          onClick={() => onReplaceSource(line.key)}
                        >
                          Thay bằng nguồn V2
                        </button>
                      )}
                      {line.isOverride && (
                        <span className="costing-line-override">
                          Đã điều chỉnh
                          {line.referenceUnitPrice != null && (
                            <button
                              type="button"
                              className="admin-btn admin-btn--secondary admin-btn--xs"
                              onClick={() => onChange(line.key, restoreLineReferencePrice(line, quantity))}
                            >
                              Khôi phục giá thư viện
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                    {section !== "OTHER" && (
                      <td>
                        <span>{line.supplierName || (line.origin === "CUSTOM" ? "Thủ công" : "—")}</span>
                        {section === "MATERIAL" && materialLineSubtitle(line) && (
                          <span className="admin-field-hint">{materialLineSubtitle(line)}</span>
                        )}
                      </td>
                    )}
                    {section !== "OTHER" && (
                      <td>
                        <input
                          className="admin-input"
                          type="number"
                          min="0"
                          value={numericOrEmpty(line.unitPrice)}
                          onChange={(event) =>
                            onChange(line.key, {
                              unitPrice: event.target.value === "" ? 0 : Number(event.target.value),
                            })
                          }
                        />
                      </td>
                    )}
                    {section === "MATERIAL" && (
                      <td>
                        <input
                          className="admin-input"
                          value={line.unit}
                          onChange={(event) => onChange(line.key, { unit: event.target.value })}
                        />
                      </td>
                    )}
                    {section === "PROCESS" && <td>{pricingBasisLabel(line.pricingBasis)}</td>}
                    <td>
                      {section === "MATERIAL" && (
                        <>
                          <input
                            className="admin-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={numericOrEmpty(line.consumption)}
                            onChange={(event) =>
                              onChange(line.key, {
                                consumption: event.target.value === "" ? null : Number(event.target.value),
                              })
                            }
                            disabled={line.pricingBasis === "MANUAL"}
                          />
                          <span className="admin-field-hint">
                            {consumptionHint(line.unit, line.pricingBasis)}
                          </span>
                        </>
                      )}
                      {section === "PROCESS" && (
                        <input
                          className="admin-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.pricingBasis === "PER_ORDER" ? "" : numericOrEmpty(line.quantityFactor ?? 1)}
                          placeholder={line.pricingBasis === "PER_ORDER" ? "—" : "1"}
                          disabled={line.pricingBasis === "PER_ORDER" || line.pricingBasis === "MANUAL"}
                          onChange={(event) =>
                            onChange(line.key, {
                              quantityFactor: event.target.value === "" ? 1 : Number(event.target.value),
                            })
                          }
                        />
                      )}
                      {section === "OTHER" && (
                        <input
                          className="admin-input"
                          type="number"
                          min="0"
                          value={numericOrEmpty(line.unitPrice)}
                          onChange={(event) =>
                            onChange(line.key, {
                              unitPrice: event.target.value === "" ? 0 : Number(event.target.value),
                            })
                          }
                        />
                      )}
                    </td>
                    <td>
                      <strong>{formatPricingCurrency(line.costPerUnit)}</strong>
                    </td>
                    <td>
                      <input
                        className="admin-input"
                        value={line.note ?? ""}
                        onChange={(event) => onChange(line.key, { note: event.target.value })}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        aria-label="Xóa dòng"
                        onClick={() => onRemove(line.key)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="costing-component-cards">
            {lines.map((line) => (
              <div
                key={`mobile-${line.key}`}
                className={`costing-component-card${line.origin === "CUSTOM" ? " costing-line-row--custom" : ""}`}
              >
                <div className="costing-component-card__head">
                  <strong>{line.label || "Hạng mục"}</strong>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--xs"
                    onClick={() => onRemove(line.key)}
                  >
                    Xóa
                  </button>
                </div>
                {section !== "OTHER" && (
                  <p className="admin-field-hint">{line.supplierName || "Thủ công"}</p>
                )}
                {line.isOverride && <p className="costing-line-override">Đã điều chỉnh</p>}
                <div className="costing-component-card__grid">
                  {section !== "OTHER" && (
                    <label>
                      Đơn giá
                      <input
                        className="admin-input"
                        type="number"
                        min="0"
                        value={numericOrEmpty(line.unitPrice)}
                        onChange={(event) =>
                          onChange(line.key, {
                            unitPrice: event.target.value === "" ? 0 : Number(event.target.value),
                          })
                        }
                      />
                    </label>
                  )}
                  {section === "MATERIAL" && (
                    <label>
                      Định mức ({consumptionHint(line.unit, line.pricingBasis)})
                      <input
                        className="admin-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={numericOrEmpty(line.consumption)}
                        onChange={(event) =>
                          onChange(line.key, {
                            consumption: event.target.value === "" ? null : Number(event.target.value),
                          })
                        }
                      />
                    </label>
                  )}
                  {section === "PROCESS" && (
                    <label>
                      SL / Hệ số
                      <input
                        className="admin-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.pricingBasis === "PER_ORDER" ? "" : numericOrEmpty(line.quantityFactor ?? 1)}
                        disabled={line.pricingBasis === "PER_ORDER"}
                        onChange={(event) =>
                          onChange(line.key, {
                            quantityFactor: event.target.value === "" ? 1 : Number(event.target.value),
                          })
                        }
                      />
                    </label>
                  )}
                  {section === "OTHER" && (
                    <label>
                      Cost/SP
                      <input
                        className="admin-input"
                        type="number"
                        min="0"
                        value={numericOrEmpty(line.unitPrice)}
                        onChange={(event) =>
                          onChange(line.key, {
                            unitPrice: event.target.value === "" ? 0 : Number(event.target.value),
                          })
                        }
                      />
                    </label>
                  )}
                  <label>
                    Cost/SP
                    <strong>{formatPricingCurrency(line.costPerUnit)}</strong>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="costing-line-section__subtotal">
        <span>Tạm tính / SP</span>
        <strong>{formatPricingCurrency(subtotal)}</strong>
      </div>
    </section>
  );
}
