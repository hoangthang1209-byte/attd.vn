import type { CmsHealthReport } from "@/features/admin/services/cms-health.service";

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

export default function CmsHealthCard({ health }: Props) {
  const allTablesExist = Object.values(health.tables).every(Boolean);

  return (
    <section
      className={`admin-dashboard-card admin-health-card admin-health-card--${health.status}`}
    >
      <div className="admin-health-card-header">
        <p className="admin-dashboard-label">CMS Health</p>
        <span className={`admin-health-status admin-health-status--${health.status}`}>
          {health.statusLabel}
        </span>
      </div>

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
    </section>
  );
}
