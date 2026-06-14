import { NextResponse } from "next/server";
import { getCmsHealth } from "@/features/admin/services/cms-health.service";

export async function GET() {
  const health = await getCmsHealth();

  return NextResponse.json({
    databaseConnected: health.databaseConnected,
    databaseError: health.databaseError,
    tables: health.tables,
    brandingTable: health.tables.BrandingSettings,
    blobConfigured: health.blobConfigured,
    ready: health.ready,
    status: health.status,
    statusLabel: health.statusLabel,
    fixCommand: health.fixCommand,
    appliedMigrations: health.appliedMigrations,
    pendingMigration: health.pendingMigration,
    failedMigration: health.failedMigration,
  });
}
