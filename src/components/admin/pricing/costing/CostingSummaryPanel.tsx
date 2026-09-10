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

  return (
    <aside className="costing-summary-panel">
      <div className="costing-summary-panel__inner">
        <div className="costing-summary-panel__head">
          <h3 className="costing-summary-panel__title">Kết quả</h3>
          {isLive && <span className="costing-summary-panel__badge">Ước tính</span>}
        </div>

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
          <div className="costing-summary-panel__metric costing-summary-panel__metric--cost">
            <dt>Giá vốn / SP</dt>
            <dd>{formatPricingCurrency(display.totalCostPerUnit)}</dd>
          </div>
          <div className="costing-summary-panel__metric costing-summary-panel__metric--cost">
            <dt>Tổng giá vốn</dt>
            <dd>{formatPricingCurrency(display.totalCost)}</dd>
          </div>
          <div className="costing-summary-panel__metric costing-summary-panel__metric--sell">
            <dt>Giá bán đề xuất / SP</dt>
            <dd>{formatPricingCurrency(display.suggestedSellingPricePerUnit)}</dd>
          </div>
          <div className="costing-summary-panel__metric costing-summary-panel__metric--sell">
            <dt>Doanh thu dự kiến</dt>
            <dd>{formatPricingCurrency(display.revenueBeforeVat)}</dd>
          </div>
          <div className="costing-summary-panel__metric costing-summary-panel__metric--margin">
            <dt>Lợi nhuận gộp</dt>
            <dd>{formatPricingCurrency(display.grossProfit)}</dd>
          </div>
          <div className="costing-summary-panel__metric costing-summary-panel__metric--margin">
            <dt>Margin %</dt>
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
