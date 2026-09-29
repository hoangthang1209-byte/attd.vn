import { prisma } from "@/lib/prisma";
import type { LeadInboundAdapter } from "@/features/crm/lead-intake/adapter.types";
import type { LeadIntakeAdapterKey } from "@/features/crm/lead-intake/taxonomy";
import {
  LeadIntakeValidationError,
  type LeadIntakeResult,
} from "@/features/crm/lead-intake.types";
import { intakeLead } from "@/features/crm/services/lead-intake.service";

async function recordLeadIntakeEvent(params: {
  adapterKey: LeadIntakeAdapterKey;
  source?: string | null;
  sourceRef?: string | null;
  outcome: "CREATED" | "DUPLICATE" | "ERROR";
  errorMessage?: string | null;
}): Promise<void> {
  try {
    await prisma.leadIntakeEvent.create({
      data: {
        adapterKey: params.adapterKey,
        source: params.source as import("@prisma/client").LeadSource | undefined,
        sourceRef: params.sourceRef?.slice(0, 255) ?? null,
        outcome: params.outcome,
        errorMessage: params.errorMessage?.slice(0, 2000) ?? null,
      },
    });
  } catch {
    // Hub remains functional if event table is not migrated yet.
  }
}

export async function runLeadIntakeAdapter<TPayload>(
  adapter: LeadInboundAdapter<TPayload>,
  payload: TPayload,
  options: { receivedAt?: Date } = {}
): Promise<(LeadIntakeResult & { adapterKey: LeadIntakeAdapterKey }) | null> {
  let normalized;
  try {
    normalized = await adapter.normalizeInboundLead(payload, {
      adapterKey: adapter.adapterKey,
      receivedAt: options.receivedAt,
    });
  } catch (err) {
    const message =
      err instanceof LeadIntakeValidationError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Normalize failed";
    await recordLeadIntakeEvent({
      adapterKey: adapter.adapterKey,
      outcome: "ERROR",
      errorMessage: message,
    });
    throw err;
  }

  try {
    const result = await intakeLead(normalized);
    if (!result) {
      await recordLeadIntakeEvent({
        adapterKey: adapter.adapterKey,
        source: normalized.source,
        sourceRef: normalized.sourceRef,
        outcome: "ERROR",
        errorMessage: "CRM lead table unavailable",
      });
      return null;
    }

    await recordLeadIntakeEvent({
      adapterKey: adapter.adapterKey,
      source: normalized.source,
      sourceRef: normalized.sourceRef,
      outcome: result.created ? "CREATED" : "DUPLICATE",
    });

    return { ...result, adapterKey: adapter.adapterKey };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Intake failed";
    await recordLeadIntakeEvent({
      adapterKey: adapter.adapterKey,
      source: normalized.source,
      sourceRef: normalized.sourceRef,
      outcome: "ERROR",
      errorMessage: message,
    });
    throw err;
  }
}
