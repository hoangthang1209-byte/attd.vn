import { prisma } from "@/lib/prisma";

/** Sprint 24 CMS tables required for full CMS operation. */
export const CMS_TABLES = [
  "MediaAsset",
  "ClientLogoRecord",
  "CaseStudyRecord",
  "CompanySettings",
  "TrustMetricsSettings",
  "BrandingSettings",
] as const;

export type CmsTableName = (typeof CMS_TABLES)[number];

export type CmsHealthStatus = "ready" | "needs_migration" | "database_error";

export type CmsHealthReport = {
  databaseConnected: boolean;
  databaseError: string | null;
  tables: Record<CmsTableName, boolean>;
  blobConfigured: boolean;
  ready: boolean;
  status: CmsHealthStatus;
  statusLabel: string;
  fixCommand: string | null;
  appliedMigrations: string[];
  pendingMigration: string | null;
  failedMigration: {
    name: string;
    error: string;
  } | null;
};

const FIX_COMMAND = "npx prisma migrate deploy";

async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  error: string | null;
}> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true, error: null };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    if (
      detail.includes("Can't reach database") ||
      detail.includes("Connection") ||
      detail.includes("ECONNREFUSED") ||
      detail.includes("timeout")
    ) {
      return {
        connected: false,
        error: "DATABASE_URL invalid or database unavailable",
      };
    }
    return {
      connected: false,
      error: "DATABASE_URL invalid or database unavailable",
    };
  }
}

async function checkTableExists(tableName: CmsTableName): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ${tableName}
      ) AS "exists"
    `;
    return rows[0]?.exists === true;
  } catch {
    return false;
  }
}

async function getFailedMigration(): Promise<{ name: string; error: string } | null> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ migration_name: string; logs: string | null }>
    >`
      SELECT migration_name, logs
      FROM "_prisma_migrations"
      WHERE finished_at IS NULL
        AND rolled_back_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;

    const logs = row.logs ?? "";
    const match = logs.match(/message: "([^"]+)"/);
    const error = match?.[1] ?? "Migration failed — see logs in _prisma_migrations";

    return { name: row.migration_name, error };
  } catch {
    return null;
  }
}

async function getAppliedMigrations(): Promise<string[]> {
  try {
    const rows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE rolled_back_at IS NULL
        AND finished_at IS NOT NULL
      ORDER BY finished_at ASC
    `;
    return rows.map((row) => row.migration_name);
  } catch {
    return [];
  }
}

function resolveStatus(
  databaseConnected: boolean,
  tables: Record<CmsTableName, boolean>,
  blobConfigured: boolean
): { status: CmsHealthStatus; statusLabel: string; ready: boolean } {
  if (!databaseConnected) {
    return {
      status: "database_error",
      statusLabel: "Database Error",
      ready: false,
    };
  }

  const allTablesExist = CMS_TABLES.every((name) => tables[name]);

  if (!allTablesExist) {
    return {
      status: "needs_migration",
      statusLabel: "Needs Migration",
      ready: false,
    };
  }

  const onVercel = Boolean(process.env.VERCEL);
  if (onVercel && !blobConfigured) {
    return {
      status: "needs_migration",
      statusLabel: "Needs Migration",
      ready: false,
    };
  }

  return {
    status: "ready",
    statusLabel: "Ready",
    ready: true,
  };
}

export async function getCmsHealth(): Promise<CmsHealthReport> {
  const blobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const { connected: databaseConnected, error: databaseError } =
    await checkDatabaseConnection();

  const tables = {} as Record<CmsTableName, boolean>;
  if (databaseConnected) {
    const results = await Promise.all(
      CMS_TABLES.map(async (name) => ({
        name,
        exists: await checkTableExists(name),
      }))
    );
    for (const { name, exists } of results) {
      tables[name] = exists;
    }
  } else {
    for (const name of CMS_TABLES) {
      tables[name] = false;
    }
  }

  const appliedMigrations = databaseConnected ? await getAppliedMigrations() : [];
  const failedMigration = databaseConnected ? await getFailedMigration() : null;

  let pendingMigration: string | null = null;
  if (databaseConnected) {
    if (!tables.BrandingSettings) {
      pendingMigration = appliedMigrations.includes("0004_sprint243_branding")
        ? "0004_sprint243_branding (table still missing)"
        : "0004_sprint243_branding";
    } else if (
      !appliedMigrations.includes("0002_sprint24_cms") ||
      failedMigration?.name === "0002_sprint24_cms"
    ) {
      pendingMigration = failedMigration
        ? "0002_sprint24_cms (failed)"
        : "0002_sprint24_cms";
    }
  }

  const { status, statusLabel, ready } = resolveStatus(
    databaseConnected,
    tables,
    blobConfigured
  );

  const anyTableMissing = CMS_TABLES.some((name) => !tables[name]);
  const fixCommand =
    databaseConnected && anyTableMissing ? FIX_COMMAND : null;

  return {
    databaseConnected,
    databaseError,
    tables,
    blobConfigured,
    ready,
    status,
    statusLabel,
    fixCommand,
    appliedMigrations,
    pendingMigration,
    failedMigration,
  };
}
