import type { LeadIntakeAdapterKey } from "@/features/crm/lead-intake/taxonomy";
import type {
  LeadIntakeResult,
  NormalizedLeadIntakeInput,
} from "@/features/crm/lead-intake.types";

export type LeadInboundAdapterContext = {
  adapterKey: LeadIntakeAdapterKey;
  receivedAt?: Date;
};

/** Shared adapter contract: verify/parse inbound payload → canonical intake input. */
export type LeadInboundAdapter<TPayload = unknown> = {
  adapterKey: LeadIntakeAdapterKey;
  normalizeInboundLead: (
    payload: TPayload,
    context: LeadInboundAdapterContext
  ) => NormalizedLeadIntakeInput | Promise<NormalizedLeadIntakeInput>;
};

export type LeadIntakeAdapterRunResult = LeadIntakeResult & {
  adapterKey: LeadIntakeAdapterKey;
};
