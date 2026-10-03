"use client";

import type { CmsHealthReport } from "@/features/admin/services/cms-health.service";
import { useWorkspaceMode } from "@/components/admin/content/WorkspaceModeContext";
import {
  getCmsBusinessStatusHint,
  getCmsBusinessStatusLabel,
} from "@/lib/admin/cms-health-labels";

type Props = {
  health: CmsHealthReport;
};

function HealthItem({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail?: string;
}) {
  return (
    <div className="admin-health-card-row">
      <span>{label}</span>
      <span className={ok ? "admin-health-card-ok" : "admin-health-card-fail"}>
        {detail ?? (ok ? "OK" : "Issue")}
      </span>
    </div>
  );
}

function BusinessHealthView({ health }: { health: CmsHealthReport }) {
  const businessLabel = getCmsBusinessStatusLabel(health);
  const hint = getCmsBusinessStatusHint(health);

  return (
    <>
      <HealthItem
        label="Kết nối dữ liệu"
        ok={health.databaseConnected}
        detail={health.databaseConnected ? "Ổn định" : "Lỗi"}
      />
      <HealthItem
        label="Lưu trữ ảnh"
        ok={health.blobConfigured}
        detail={health.blobConfigured ? "Đã cấu hình" : "Chưa cấu hình"}
      />
      <HealthItem
        label="Tổng thể"
        ok={health.ready}
        detail={businessLabel}
      />
      {hint ? <p className="admin-health-card-fix">{hint}</p> : null}
    </>
  );
}

function DeveloperHealthView({ health }: { health: CmsHealthReport }) {
  const allTablesExist = Object.values(health.tables).every(Boolean);

  return (
    <>
      <HealthItem label="Database" ok={health.databaseConnected} />
      <HealthItem
        label="Prisma Tables"
        ok={allTablesExist}
        detail={allTablesExist ? "All present" : "Missing tables"}
      />
      <HealthItem
        label="Blob Storage"
        ok={health.blobConfigured}
        detail={health.blobConfigured ? "Configured" : "Not configured"}
      />
      <HealthItem
        label="Overall Status"
        ok={health.ready}
        detail={health.statusLabel}
      />

      {!health.ready && health.failedMigration && (
        <p className="admin-health-card-fix">
          Failed: {health.failedMigration.name} — {health.failedMigration.error}
        </p>
      )}

      {!health.ready && health.fixCommand && !health.failedMigration && (
        <p className="admin-health-card-fix">
          Fix: <code>{health.fixCommand}</code>
        </p>
      )}
    </>
  );
}

export default function CmsHealthCard({ health }: Props) {
  const { developerMode } = useWorkspaceMode();
  const businessLabel = getCmsBusinessStatusLabel(health);

  return (
    <section
      className={`admin-dashboard-card admin-health-card admin-health-card--${health.status}`}
    >
      <div className="admin-health-card-header">
        <p className="admin-dashboard-label">
          {developerMode ? "CMS Health" : "Trạng thái CMS"}
        </p>
        <span className={`admin-health-status admin-health-status--${health.status}`}>
          {developerMode ? health.statusLabel : businessLabel}
        </span>
      </div>

      {developerMode ? (
        <DeveloperHealthView health={health} />
      ) : (
        <BusinessHealthView health={health} />
      )}
    </section>
  );
}
