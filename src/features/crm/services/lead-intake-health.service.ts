import { prisma } from "@/lib/prisma";
import {
  getLeadIntakeAdapterLabel,
  LEAD_INTAKE_ADAPTER_KEYS,
  type LeadIntakeAdapterKey,
} from "@/features/crm/lead-intake/taxonomy";

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type LeadIntakeHealthRow = {
  adapterKey: LeadIntakeAdapterKey;
  label: string;
  connectionState: "active" | "configured" | "inactive" | "unknown";
  lastSuccessfulIntakeAt: string | null;
  recentCreated: number;
  recentDuplicate: number;
  recentError: number;
  lastErrorSummary: string | null;
};

export type LeadIntakeHealthResponse = {
  generatedAt: string;
  rows: LeadIntakeHealthRow[];
};

function resolveConnectionState(adapterKey: LeadIntakeAdapterKey): LeadIntakeHealthRow["connectionState"] {
  const secretConfigured = Boolean(
    process.env.LEAD_INTAKE_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim()
  );

  switch (adapterKey) {
    case "website-attd":
    case "website-aothun":
    case "website-vcn":
    case "website-public":
    case "manual-admin":
    case "csv-import":
      return "active";
    case "gmail":
    case "webhook-generic":
    case "webhook-partner":
      return secretConfigured ? "configured" : "inactive";
    default:
      return "unknown";
  }
}

export async function getLeadIntakeHealthReport(): Promise<LeadIntakeHealthResponse> {
  const since = new Date(Date.now() - RECENT_WINDOW_MS);

  const eventCounts = new Map<
    LeadIntakeAdapterKey,
    { created: number; duplicate: number; error: number; lastError: string | null }
  >();

  for (const key of LEAD_INTAKE_ADAPTER_KEYS) {
    eventCounts.set(key, { created: 0, duplicate: 0, error: 0, lastError: null });
  }

  try {
    const events = await prisma.leadIntakeEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    for (const event of events) {
      const key = event.adapterKey as LeadIntakeAdapterKey;
      if (!eventCounts.has(key)) continue;
      const bucket = eventCounts.get(key)!;
      if (event.outcome === "CREATED") bucket.created += 1;
      if (event.outcome === "DUPLICATE") bucket.duplicate += 1;
      if (event.outcome === "ERROR") {
        bucket.error += 1;
        if (!bucket.lastError && event.errorMessage) {
          bucket.lastError = event.errorMessage;
        }
      }
    }
  } catch {
    // Event table may be unavailable pre-migration.
  }

  const lastSuccessByAdapter = new Map<LeadIntakeAdapterKey, Date>();

  try {
    const recentLeads = await prisma.lead.findMany({
      where: {
        OR: [{ receivedAt: { not: null } }, { createdAt: { gte: since } }],
      },
      select: {
        receivedAt: true,
        createdAt: true,
        intakeMetadata: true,
      },
      orderBy: { createdAt: "desc" },
      take: 2000,
    });

    for (const lead of recentLeads) {
      const metadata = lead.intakeMetadata;
      let adapterKey: LeadIntakeAdapterKey | null = null;
      if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
        const raw = (metadata as Record<string, unknown>).adapterKey;
        if (typeof raw === "string" && LEAD_INTAKE_ADAPTER_KEYS.includes(raw as LeadIntakeAdapterKey)) {
          adapterKey = raw as LeadIntakeAdapterKey;
        }
      }
      if (!adapterKey) continue;
      const at = lead.receivedAt ?? lead.createdAt;
      const prev = lastSuccessByAdapter.get(adapterKey);
      if (!prev || at > prev) {
        lastSuccessByAdapter.set(adapterKey, at);
      }
    }
  } catch {
    // ignore
  }

  const rows: LeadIntakeHealthRow[] = LEAD_INTAKE_ADAPTER_KEYS.map((adapterKey) => {
    const counts = eventCounts.get(adapterKey)!;
    const lastAt = lastSuccessByAdapter.get(adapterKey);
    return {
      adapterKey,
      label: getLeadIntakeAdapterLabel(adapterKey),
      connectionState: resolveConnectionState(adapterKey),
      lastSuccessfulIntakeAt: lastAt?.toISOString() ?? null,
      recentCreated: counts.created,
      recentDuplicate: counts.duplicate,
      recentError: counts.error,
      lastErrorSummary: counts.lastError,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    rows,
  };
}
