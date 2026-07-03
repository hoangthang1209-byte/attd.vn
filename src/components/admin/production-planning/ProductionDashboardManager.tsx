"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminErrorRecovery from "@/components/admin/feedback/AdminErrorRecovery";
import AdminPageSkeleton from "@/components/admin/feedback/AdminPageSkeleton";
import { formatOrderDate } from "@/features/orders/order-format";
import type { ProductionDashboardResponse } from "@/features/production-planning/production-plan.types";

export default function ProductionDashboardManager() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ProductionDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const legacySearch = searchParams.get("search");

  useEffect(() => {
    setLoading(true);
    void fetch("/api/production/dashboard")
      .then((r) => r.json())
      .then((body: ProductionDashboardResponse & { message?: string }) => {
        if (!body.sections) throw new Error(body.message ?? "Không thể tải tổng quan sản xuất");
        setData(body);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminPageSkeleton message="Đang tải tổng quan sản xuất…" />;
  if (error || !data) {
    return <AdminErrorRecovery message={error ?? "Không thể tải tổng quan sản xuất"} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="prod-dash">
      <header className="prod-dash__header">
        <div>
          <h1 className="prod-dash__title">Tổng quan sản xuất</h1>
          <p className="prod-dash__subtitle">Theo dõi công việc, hạn chót và tải sản xuất hôm nay</p>
        </div>
        <div className="prod-dash__nav">
          <Link href="/admin/production/plan" className="admin-btn admin-btn--primary admin-btn--small">
            Kế hoạch sản xuất
          </Link>
          <Link href="/admin/production/board" className="admin-btn admin-btn--secondary admin-btn--small">
            Bảng tiến độ
          </Link>
        </div>
      </header>

      {legacySearch && (
        <div className="prod-dash__legacy-hint">
          Tìm theo đơn: <strong>{legacySearch}</strong> —{" "}
          <Link href={`/admin/production/plan?search=${encodeURIComponent(legacySearch)}`}>
            Mở trong kế hoạch sản xuất
          </Link>
        </div>
      )}

      <div className="prod-dash__sections">
        {data.sections.map((s) => (
          <Link key={s.key} href={s.href} className="prod-dash__section-card">
            <span className="prod-dash__section-count">{s.count}</span>
            <span className="prod-dash__section-label">{s.label}</span>
          </Link>
        ))}
      </div>

      {data.ownerWorkload.length > 0 && (
        <section className="prod-dash__panel">
          <h2>Tải theo người phụ trách</h2>
          <ul className="prod-dash__workload">
            {data.ownerWorkload.map((w) => (
              <li key={w.ownerId}>
                <span>{w.ownerName}</span>
                <strong>{w.count} việc</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="prod-dash__columns">
        <section className="prod-dash__panel">
          <h2>Việc của tôi</h2>
          {data.myJobs.length === 0 ? (
            <p className="prod-plan-muted">Không có việc được giao.</p>
          ) : (
            <ul className="prod-dash__job-list">
              {data.myJobs.map((job) => (
                <li key={job.orderItemId}>
                  <Link href={`/admin/production/jobs/${job.orderItemId}`}>
                    <strong>{job.jobCode}</strong> · {job.productName}
                  </Link>
                  <span className="prod-plan-sub">
                    {job.internalDeadline ? formatOrderDate(job.internalDeadline) : "Chưa có hạn nội bộ"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="prod-dash__panel">
          <h2>Hạn sắp tới</h2>
          {data.upcomingDeadlines.length === 0 ? (
            <p className="prod-plan-muted">Không có hạn sắp tới.</p>
          ) : (
            <ul className="prod-dash__job-list">
              {data.upcomingDeadlines.map((job) => (
                <li key={job.orderItemId}>
                  <Link href={`/admin/production/jobs/${job.orderItemId}`}>
                    <strong>{job.jobCode}</strong> · {job.orderNo}
                  </Link>
                  <span className={`prod-plan-risk prod-plan-risk--${job.riskTone}`}>
                    {job.internalDeadline ? formatOrderDate(job.internalDeadline) : "—"}
                    {job.risks[0] ? ` · ${job.risks[0]}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
