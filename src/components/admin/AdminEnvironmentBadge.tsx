"use client";

import { useWorkspaceMode } from "@/components/admin/content/WorkspaceModeContext";

/**
 * Read-only environment badge shown in the authenticated admin shell.
 *
 * Renders nothing when the app runs in production, so the production UI is
 * unchanged. `process.env.NODE_ENV` is statically inlined into the client
 * bundle at build time, so the production build tree-shakes this badge away and
 * never ships a non-production label. Only a safe environment label is exposed —
 * no environment variable values or secrets.
 *
 * Hidden from team mode unless Developer Mode is on.
 */

const NON_PRODUCTION_ENV_LABELS: Record<string, string> = {
  development: "DEV",
  test: "TEST",
};

/** Returns a short badge label for non-production environments, or null in production. */
export function getNonProductionEnvLabel(
  nodeEnv: string | undefined,
): string | null {
  if (nodeEnv === "production") return null;
  if (!nodeEnv) return "NON-PROD";
  return NON_PRODUCTION_ENV_LABELS[nodeEnv] ?? nodeEnv.toUpperCase();
}

export default function AdminEnvironmentBadge() {
  const { developerMode } = useWorkspaceMode();
  const label = getNonProductionEnvLabel(process.env.NODE_ENV);

  if (!label || !developerMode) return null;

  return (
    <span
      title="Môi trường không phải production"
      aria-label={`Môi trường ${label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
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
