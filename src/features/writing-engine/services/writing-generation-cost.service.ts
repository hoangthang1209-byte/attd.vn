import { hashObject } from "@/features/writing-engine/writing-utils";
import type { WritingSectionRequest } from "@/features/writing-engine/writing-engine.types";
import {
  WRITING_SECTION_PROMPT_VERSION,
  WRITING_SECTION_SCHEMA_VERSION,
} from "@/features/writing-engine/writing-engine.types";

export function hashWritingSectionRequest(input: {
  planHash: string;
  sectionId: string;
  request: WritingSectionRequest;
  provider: string;
  model: string;
}): string {
  return hashObject({
    planHash: input.planHash,
    sectionId: input.sectionId,
    request: input.request,
    provider: input.provider,
    model: input.model,
    promptVersion: WRITING_SECTION_PROMPT_VERSION,
    schemaVersion: WRITING_SECTION_SCHEMA_VERSION,
  });
}

export function estimateGenerationCost(input: {
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}): number | null {
  if (input.inputTokens == null || input.outputTokens == null) return null;
  const rates: Record<string, { in: number; out: number }> = {
    "gpt-5.4-mini": { in: 0.75 / 1_000_000, out: 4.5 / 1_000_000 },
    "gpt-5.4": { in: 2.5 / 1_000_000, out: 15 / 1_000_000 },
    "gpt-4o-mini": { in: 0.15 / 1_000_000, out: 0.6 / 1_000_000 },
    "gpt-4o": { in: 2.5 / 1_000_000, out: 10 / 1_000_000 },
  };
  const rate =
    rates[input.model] ??
    (input.model.includes("mini") ? rates["gpt-5.4-mini"] : null);
  if (!rate) return null;
  return Number((input.inputTokens * rate.in + input.outputTokens * rate.out).toFixed(6));
}
