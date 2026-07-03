"use client";

export default function ProductionPlanPageSkeleton() {
  const rows = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div className="prod-plan-dashboard prod-plan-skeleton" aria-busy="true" aria-label="Đang tải kế hoạch sản xuất">
      <header className="prod-plan-header">
        <div className="prod-plan-skeleton__block">
          <div className="admin-route-loading__skeleton admin-route-loading__skeleton--title" />
          <div className="admin-route-loading__skeleton admin-route-loading__skeleton--short" style={{ marginTop: 6 }} />
        </div>
        <div className="admin-route-loading__skeleton" style={{ width: 180, height: 32 }} />
      </header>

      <div className="prod-plan-kpi-grid prod-plan-kpi-grid--5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="prod-plan-skeleton__kpi">
            <div className="admin-route-loading__skeleton admin-route-loading__skeleton--short" />
            <div className="admin-route-loading__skeleton" style={{ height: 28, marginTop: 6, width: "40%" }} />
          </div>
        ))}
      </div>

      <div className="prod-plan-controls prod-plan-skeleton__controls">
        <div className="admin-route-loading__skeleton admin-route-loading__skeleton--wide" style={{ height: 36 }} />
        <div className="prod-plan-chips">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="admin-route-loading__skeleton" style={{ width: 72, height: 24, borderRadius: 999 }} />
          ))}
        </div>
      </div>

      <div className="prod-plan-table-wrap prod-plan-skeleton__table">
        <div className="prod-plan-skeleton__thead">
          {["Mã", "Sản phẩm", "SL", "Deadline", "Kế hoạch", "Phụ trách", "TT", "Rủi ro", ""].map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
        {rows.map((i) => (
          <div key={i} className="prod-plan-skeleton__row">
            <div className="admin-route-loading__skeleton admin-route-loading__skeleton--short" />
            <div className="prod-plan-skeleton__product">
              <div className="prod-plan-skeleton__thumb" />
              <div style={{ flex: 1 }}>
                <div className="admin-route-loading__skeleton admin-route-loading__skeleton--medium" />
                <div className="admin-route-loading__skeleton admin-route-loading__skeleton--short" style={{ marginTop: 4 }} />
              </div>
            </div>
            <div className="admin-route-loading__skeleton" style={{ width: 48 }} />
            <div className="admin-route-loading__skeleton admin-route-loading__skeleton--medium" />
            <div className="admin-route-loading__skeleton admin-route-loading__skeleton--short" />
            <div className="admin-route-loading__skeleton admin-route-loading__skeleton--short" />
            <div className="admin-route-loading__skeleton" style={{ width: 64, borderRadius: 999 }} />
            <div className="admin-route-loading__skeleton" style={{ width: 56 }} />
            <div className="admin-route-loading__skeleton" style={{ width: 40, height: 28 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
