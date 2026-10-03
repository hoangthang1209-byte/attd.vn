"use client";

import { formatPricingCurrency, formatPricingPercent } from "@/features/pricing/format";
import type { CostingCalculatorResult } from "@/features/pricing/costing-types";

type Props = {
  preview: CostingCalculatorResult;
  officialResult: CostingCalculatorResult | null;
};

export default function CostingSummaryPanel({ preview, officialResult }: Props) {
  const display = officialResult ?? preview;
  const isLive = !officialResult;
  const otherCost = display.otherCostPerUnit ?? 0;
  const profitPerUnit = Math.max(0, display.suggestedSellingPricePerUnit - display.totalCostPerUnit);

  return (
    <aside className="costing-summary-panel">
      <div className="costing-summary-panel__inner">
        <div className="costing-summary-panel__head">
          <h3 className="costing-summary-panel__title">Kết quả</h3>
          {isLive && <span className="costing-summary-panel__badge">Ước tính</span>}
        </div>

        <div className="costing-summary-panel__primary">
          <div>
            <span>Giá vốn / SP</span>
            <strong>{formatPricingCurrency(display.totalCostPerUnit)}</strong>
          </div>
          <div>
            <span>Giá bán / SP</span>
            <strong>{formatPricingCurrency(display.suggestedSellingPricePerUnit)}</strong>
          </div>
          <div>
            <span>Lãi / SP</span>
            <strong>{formatPricingCurrency(profitPerUnit)}</strong>
          </div>
        </div>

        <dl className="costing-summary-panel__metrics costing-summary-panel__metrics--compact">
          <div className="costing-summary-panel__metric">
            <dt>Margin</dt>
            <dd>{formatPricingPercent(display.actualMarginRate)}</dd>
          </div>
          <div className="costing-summary-panel__metric">
            <dt>Doanh thu</dt>
            <dd>{formatPricingCurrency(display.revenueBeforeVat)}</dd>
          </div>
          <div className="costing-summary-panel__metric">
            <dt>Lợi nhuận gộp</dt>
            <dd>{formatPricingCurrency(display.grossProfit)}</dd>
          </div>
        </dl>

        <details className="costing-summary-panel__breakdown">
          <summary>Cơ cấu giá vốn</summary>
          <dl className="costing-summary-panel__metrics">
            <div className="costing-summary-panel__metric">
              <dt>Nguyên phụ liệu / SP</dt>
              <dd>{formatPricingCurrency(display.materialCostPerUnit)}</dd>
            </div>
            <div className="costing-summary-panel__metric">
              <dt>Gia công / SP</dt>
              <dd>{formatPricingCurrency(display.processCostPerUnit)}</dd>
            </div>
            <div className="costing-summary-panel__metric">
              <dt>Chi phí khác / SP</dt>
              <dd>{formatPricingCurrency(otherCost)}</dd>
            </div>
            <div className="costing-summary-panel__metric">
              <dt>Tổng giá vốn</dt>
              <dd>{formatPricingCurrency(display.totalCost)}</dd>
            </div>
          </dl>
        </details>

        {display.vatRate > 0 && (
          <p className="admin-field-hint costing-summary-panel__target">
            VAT {formatPricingPercent(display.vatRate)} · Giá báo cuối {formatPricingCurrency(display.finalQuotePrice)}
          </p>
        )}

        {officialResult && officialResult.warnings.length > 0 && (
          <ul className="admin-kb-warning-list costing-summary-panel__warnings">
            {officialResult.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        )}
      </div>
    </aside>
  );
}
