import type { CmsHealthReport } from "@/features/admin/services/cms-health.service";

type Props = {
  health: CmsHealthReport;
};

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`admin-health-badge${ok ? " admin-health-badge--ok" : " admin-health-badge--fail"}`}>
      {label}
    </span>
  );
}

export default function CmsDiagnosticsPanel({ health }: Props) {
  const showFix =
    health.databaseConnected &&
    Object.values(health.tables).some((exists) => !exists);

  return (
    <section
      className={`admin-health-panel admin-health-panel--${health.status}`}
      aria-label="CMS diagnostics"
    >
      <div className="admin-health-panel-header">
        <h2 className="admin-subtitle">CMS Diagnostics</h2>
        <span className={`admin-health-status admin-health-status--${health.status}`}>
          {health.statusLabel}
        </span>
      </div>

      <dl className="admin-health-list">
        <div className="admin-health-row">
          <dt>Database connected</dt>
          <dd>
            <StatusBadge
              ok={health.databaseConnected}
              label={health.databaseConnected ? "YES" : "NO"}
            />
          </dd>
        </div>

        {!health.databaseConnected && health.databaseError && (
          <div className="admin-health-row admin-health-row--error">
            <dt>Error</dt>
            <dd>{health.databaseError}</dd>
          </div>
        )}

        {(
          [
            ["MediaAsset", "MediaAsset table exists"],
            ["ClientLogoRecord", "ClientLogoRecord table exists"],
            ["CaseStudyRecord", "CaseStudyRecord table exists"],
            ["CompanySettings", "CompanySettings table exists"],
            ["TrustMetricsSettings", "TrustMetricsSettings table exists"],
            ["BrandingSettings", "BrandingSettings table exists"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="admin-health-row">
            <dt>{label}</dt>
            <dd>
              <StatusBadge
                ok={health.tables[key]}
                label={health.tables[key] ? "YES" : "NO"}
              />
            </dd>
          </div>
        ))}

        <div className="admin-health-row">
          <dt>Blob storage configured</dt>
          <dd>
            <StatusBadge
              ok={health.blobConfigured}
              label={health.blobConfigured ? "YES" : "NO"}
            />
          </dd>
        </div>

        {health.pendingMigration && health.databaseConnected && (
          <div className="admin-health-row">
            <dt>Pending migration</dt>
            <dd>
              <code className="admin-health-code">{health.pendingMigration}</code>
            </dd>
          </div>
        )}

        {health.failedMigration && (
          <div className="admin-health-row admin-health-row--error">
            <dt>Failed migration</dt>
            <dd>
              <code className="admin-health-code">{health.failedMigration.name}</code>
              <span>{health.failedMigration.error}</span>
            </dd>
          </div>
        )}
      </dl>

      {showFix && (
        <div className="admin-health-fix">
          <p>One or more CMS tables are missing. Apply pending migrations:</p>
          <pre className="admin-health-command">
            <code>{health.fixCommand ?? "npx prisma migrate deploy"}</code>
          </pre>
          {health.failedMigration && (
            <p className="admin-health-hint">
              Migration <strong>{health.failedMigration.name}</strong> previously failed and
              must be resolved before deploy can succeed. See Prisma migrate resolve docs.
            </p>
          )}
          <p className="admin-health-hint">
            Run against production DATABASE_URL from your deploy environment or CI.
          </p>
        </div>
      )}
    </section>
  );
}
