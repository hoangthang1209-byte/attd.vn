/**
 * Read-only environment badge shown in the authenticated admin shell.
 *
 * Renders nothing in production, so the production UI is unchanged. Vercel's
 * public deployment environment distinguishes preview deployments (whose
 * `NODE_ENV` is also "production") from the production deployment. Only a safe
 * environment label and the public Vercel commit SHA are exposed — no secrets.
 */

const NON_PRODUCTION_ENV_LABELS: Record<string, string> = {
  development: "DEV",
  preview: "TEST",
  test: "TEST",
};

/** Returns a short badge label for non-production environments, or null in production. */
export function getNonProductionEnvLabel(
  nodeEnv: string | undefined,
  vercelEnv?: string,
): string | null {
  const normalizedVercelEnv = vercelEnv?.trim().toLowerCase();
  if (normalizedVercelEnv === "production") return null;
  if (normalizedVercelEnv) {
    return NON_PRODUCTION_ENV_LABELS[normalizedVercelEnv] ?? normalizedVercelEnv.toUpperCase();
  }

  if (nodeEnv === "production") return null;
  if (!nodeEnv) return "NON-PROD";
  return NON_PRODUCTION_ENV_LABELS[nodeEnv] ?? nodeEnv.toUpperCase();
}

/** Builds the visible badge text, adding a safe short SHA when available. */
export function getNonProductionBadgeLabel(
  nodeEnv: string | undefined,
  vercelEnv: string | undefined,
  commitSha: string | undefined,
): string | null {
  const environmentLabel = getNonProductionEnvLabel(nodeEnv, vercelEnv);
  if (!environmentLabel) return null;

  const normalizedSha = commitSha?.trim().toLowerCase();
  const shortSha =
    normalizedSha && /^[0-9a-f]{7,64}$/.test(normalizedSha)
      ? normalizedSha.slice(0, 7)
      : null;

  return shortSha ? `${environmentLabel} · ${shortSha}` : environmentLabel;
}

export default function AdminEnvironmentBadge() {
  const label = getNonProductionBadgeLabel(
    process.env.NODE_ENV,
    process.env.NEXT_PUBLIC_VERCEL_ENV,
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  );
  if (!label) return null;

  return (
    <span
      title="Môi trường không phải production"
      aria-label={`Môi trường ${label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
        padding: "2px 5px",
        borderRadius: 999,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: "0.02em",
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        color: "#0b1120",
        background: "#fbbf24",
        border: "1px solid #f59e0b",
      }}
    >
      {label}
    </span>
  );
}
