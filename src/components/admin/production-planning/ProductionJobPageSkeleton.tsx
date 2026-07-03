"use client";

export default function ProductionJobPageSkeleton() {
  return (
    <div className="prod-job prod-job-skeleton" aria-busy="true" aria-label="Đang tải công việc sản xuất">
      <nav className="prod-job__breadcrumb">
        <div className="admin-route-loading__skeleton admin-route-loading__skeleton--short" style={{ width: 220 }} />
      </nav>

      <header className="prod-job__header prod-job-header">
        <div className="prod-job-header__main">
          <div className="admin-route-loading__skeleton admin-route-loading__skeleton--title" style={{ maxWidth: 360 }} />
          <div className="admin-route-loading__skeleton admin-route-loading__skeleton--short" style={{ marginTop: 8, width: 140 }} />
          <div className="admin-route-loading__skeleton admin-route-loading__skeleton--short" style={{ marginTop: 6, width: 280 }} />
        </div>
        <div className="prod-job-header__aside">
          <div className="admin-route-loading__skeleton" style={{ width: 88, height: 24, borderRadius: 999 }} />
          <div className="admin-route-loading__skeleton" style={{ width: 72, height: 28 }} />
        </div>
      </header>

      <div className="prod-job-ops-strip prod-job-ops-strip--skeleton">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="prod-job-ops-strip__block">
            <div className="admin-route-loading__skeleton admin-route-loading__skeleton--short" />
            <div className="admin-route-loading__skeleton" style={{ marginTop: 6, height: 18, width: "80%" }} />
          </div>
        ))}
      </div>

      <div className="prod-job__tabs prod-job-tabs">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="admin-route-loading__skeleton" style={{ width: 72, height: 28 }} />
        ))}
      </div>

      <div className="prod-job__content">
        <div className="prod-job-overview">
          <div className="prod-job-overview__col">
            <div className="admin-route-loading__skeleton admin-route-loading__skeleton--medium" />
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="admin-route-loading__skeleton" style={{ marginTop: 10, height: 16 }} />
            ))}
          </div>
          <div className="prod-job-overview__col">
            <div className="admin-route-loading__skeleton admin-route-loading__skeleton--medium" />
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="admin-route-loading__skeleton" style={{ marginTop: 10, height: 16 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
