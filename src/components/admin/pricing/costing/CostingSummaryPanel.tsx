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

  return (
    <aside className="costing-summary-panel">
      <div className="costing-summary-panel__inner">
        <div className="costing-summary-panel__head">
          <h3 className="costing-summary-panel__title">Kết quả</h3>
          {isLive && <span className="costing-summary-panel__badge">Ước tính</span>}
        </div>

        <dl className="costing-summary-panel__metrics">
          <div className="costing-summary-panel__metric costing-summary-panel__metric--cost">
            <dt>Giá vốn / SP</dt>
            <dd>{formatPricingCurrency(display.totalCostPerUnit)}</dd>
          </div>
          <div className="costing-summary-panel__metric costing-summary-panel__metric--cost">
            <dt>Tổng giá vốn</dt>
            <dd>{formatPricingCurrency(display.totalCost)}</dd>
          </div>
          <div className="costing-summary-panel__metric costing-summary-panel__metric--sell">
            <dt>Giá bán dự kiến / SP</dt>
            <dd>{formatPricingCurrency(display.suggestedSellingPricePerUnit)}</dd>
          </div>
          <div className="costing-summary-panel__metric costing-summary-panel__metric--margin">
            <dt>Lợi nhuận / SP</dt>
            <dd>
              {formatPricingCurrency(
                display.quantity > 0 ? display.grossProfit / display.quantity : 0,
              )}
            </dd>
          </div>
          <div className="costing-summary-panel__metric costing-summary-panel__metric--margin">
            <dt>Biên lợi nhuận</dt>
            <dd>{formatPricingPercent(display.actualMarginRate)}</dd>
          </div>
        </dl>

        <p className="admin-field-hint costing-summary-panel__target">
          Target margin: {formatPricingPercent(display.targetMarginRate)}
        </p>

        {display.vatRate > 0 && (
          <p className="admin-field-hint">
            VAT {formatPricingPercent(display.vatRate)} · Giá báo cuối{" "}
            {formatPricingCurrency(display.finalQuotePrice)}
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
