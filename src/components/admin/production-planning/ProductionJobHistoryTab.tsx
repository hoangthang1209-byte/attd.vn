"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminSectionSkeleton from "@/components/admin/feedback/AdminSectionSkeleton";
import AdminErrorRecovery from "@/components/admin/feedback/AdminErrorRecovery";
import type { OrderItemExecutionBundle } from "@/features/orders/production-execution.service";
import type { OrderProductionFileRecord } from "@/features/orders/production-pack.types";
import { formatOrderDateTime } from "@/features/orders/order-format";
import { buildJobHistoryEvents } from "@/components/admin/production-planning/production-job-workspace";

const PAGE_SIZE = 20;

type Props = {
  orderId: string;
  orderItemId: string;
  itemBundle: OrderItemExecutionBundle | null;
};

export default function ProductionJobHistoryTab({ orderId, orderItemId, itemBundle }: Props) {
  const [files, setFiles] = useState<OrderProductionFileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/production-files`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? "Không tải được lịch sử");
      setFiles(Array.isArray(body.files) ? body.files : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được lịch sử");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const events = useMemo(
    () =>
      buildJobHistoryEvents({
        orderItemId,
        stages: itemBundle?.stages ?? [],
        qc: itemBundle?.qc ?? null,
        files,
      }),
    [orderItemId, itemBundle, files],
  );

  const visibleEvents = events.slice(0, visibleCount);
  const hasMore = visibleCount < events.length;

  if (loading) {
    return <AdminSectionSkeleton message="Đang tải lịch sử…" />;
  }

  if (error) {
    return <AdminErrorRecovery message={error} onRetry={() => void loadFiles()} />;
  }

  if (events.length === 0) {
    return <p className="prod-job-empty">Chưa có sự kiện lịch sử cho công việc này.</p>;
  }

  return (
    <div className="prod-job-history">
      <ol className="prod-job-history__list">
        {visibleEvents.map((event) => (
          <li key={event.id} className="prod-job-history__item">
            <time className="prod-job-history__time" dateTime={event.at}>
              {formatOrderDateTime(event.at)}
            </time>
            <div className="prod-job-history__body">
              <strong>{event.title}</strong>
              {event.detail && <p>{event.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
      {hasMore && (
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
        >
          Xem thêm ({events.length - visibleCount} sự kiện)
        </button>
      )}
    </div>
  );
}
