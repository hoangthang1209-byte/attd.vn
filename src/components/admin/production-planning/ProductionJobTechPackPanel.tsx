"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { TechPackStatusBadge } from "@/components/admin/tech-pack/TechPackEntityStatusBadge";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsContext";
import { useAdminMutation } from "@/hooks/useAdminAction";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import type { TechPackItemLink } from "@/features/tech-pack/tech-pack.types";
import type { TechPackStatus } from "@prisma/client";
import { TECH_PACK_STATUS_LABELS } from "@/features/tech-pack/tech-pack-labels";

type Props = {
  orderItemId: string;
  jobCode?: string;
  canManage?: boolean;
};

export default function ProductionJobTechPackPanel({
  orderItemId,
  jobCode,
  canManage = false,
}: Props) {
  const router = useRouter();
  const mutate = useAdminMutation();
  const { permissions } = useAdminPermissions();
  const allowManage = canManage && permissions.canUpdateProduction;

  const [link, setLink] = useState<TechPackItemLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/tech-packs/item-links?orderItemIds=${encodeURIComponent(orderItemId)}`,
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? "Không tải được Tech Pack");
      setLink(body.orderItems?.[orderItemId] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được Tech Pack");
    } finally {
      setLoading(false);
    }
  }, [orderItemId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createTechPack() {
    await mutate({
      loadingMessage: "Đang tạo Tech Pack…",
      successMessage: "Đã tạo Tech Pack.",
      action: async () => {
        const res = await fetch("/api/tech-packs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderItemId }),
        });
        return parseAdminJsonResponse(res, (body) => body as { id: string });
      },
      onSuccess: (data) => {
        if (data?.id) router.push(`/admin/tech-pack/${data.id}`);
        else void load();
      },
    });
  }

  if (loading) {
    return (
      <section className="prod-job-tech-pack" aria-busy="true">
        <AdminInlineLoader message="Đang tải Tech Pack công việc…" />
      </section>
    );
  }

  const status = link?.latestTechPackStatus as TechPackStatus | undefined;
  const statusLabel = status ? TECH_PACK_STATUS_LABELS[status] : null;

  return (
    <section className="prod-job-tech-pack" aria-label="Tech Pack">
      <div className="prod-job-tech-pack__header">
        <h3 className="prod-job-section-title">Tech Pack</h3>
        {jobCode && <span className="admin-field-hint">Mã việc: {jobCode}</span>}
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {link ? (
        <div className="prod-job-tech-pack__summary">
          <div className="prod-job-tech-pack__meta">
            <span className="prod-job-tech-pack__code">{link.latestTechPackCode}</span>
            <span className="admin-field-hint">v{link.latestTechPackVersion}</span>
            {status && <TechPackStatusBadge status={status} />}
          </div>
          <dl className="prod-job-tech-pack__dl">
            <div>
              <dt>Trạng thái</dt>
              <dd>{statusLabel ?? "—"}</dd>
            </div>
            <div>
              <dt>Rập</dt>
              <dd>{link.patternCodeSnapshot ?? (link.hasPattern ? "Đã gắn" : "Chưa gắn")}</dd>
            </div>
          </dl>
          <div className="prod-job-tech-pack__actions">
            <Link
              href={`/admin/tech-pack/${link.latestTechPackId}`}
              className="admin-btn admin-btn--primary admin-btn--small"
            >
              Mở Tech Pack
            </Link>
            {allowManage && (
              <Link
                href={`/admin/tech-pack/${link.latestTechPackId}#pattern`}
                className="admin-btn admin-btn--secondary admin-btn--small"
              >
                Gắn rập
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="prod-job-tech-pack__empty">
          <p className="admin-field-hint">Chưa có Tech Pack cho công việc này.</p>
          {allowManage ? (
            <button
              type="button"
              className="admin-btn admin-btn--primary admin-btn--small"
              onClick={() => void createTechPack()}
            >
              Tạo Tech Pack
            </button>
          ) : (
            <p className="admin-field-hint">Liên hệ quản lý sản xuất để tạo Tech Pack.</p>
          )}
        </div>
      )}
    </section>
  );
}
