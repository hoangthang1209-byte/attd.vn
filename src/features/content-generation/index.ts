/**
 * Sprint 16.0 — Governed AI Content Engine Foundation.
 * Public surface for other features/API routes to depend on.
 */

export * from "@/features/content-generation/contracts/generation.types";
export * from "@/features/content-generation/contracts/config";
export * from "@/features/content-generation/contracts/policy";

export type { ContentGenerationProvider } from "@/features/content-generation/providers/content-generation-provider";
export { resolveContentGenerationProvider } from "@/features/content-generation/providers/registry";
export { TEST_PROVIDER_TOKENS } from "@/features/content-generation/providers/test-provider";

export { getPromptTemplate, listPromptTemplates } from "@/features/content-generation/prompts/prompt-registry";
export type { ContentGenerationPromptTemplate } from "@/features/content-generation/prompts/prompt-registry";

export {
  assembleContentGenerationContext,
} from "@/features/content-generation/services/context-assembler.service";
export type {
  AssembleContentGenerationContextInput,
  ContentGenerationContextDeps,
} from "@/features/content-generation/services/context-assembler.service";

export {
  validateStructuredOutput,
  extractUsedIds,
} from "@/features/content-generation/services/structured-output.service";

export {
  assertSafeProposalText,
  findClaimSafetyViolation,
} from "@/features/content-generation/services/claim-safety.service";

export {
  createProposal,
  applyProposal,
  rejectProposal,
  cancelProposal,
} from "@/features/content-generation/services/proposal.service";
export type {
  ProposalRunRecord,
  ProposalServiceDeps,
  ProposalStore,
  CreateProposalInput,
  ApplyProposalInput,
} from "@/features/content-generation/services/proposal.service";

export {
  createContentProposal,
  applyContentProposal,
  rejectContentProposal,
  cancelContentProposal,
} from "@/features/content-generation/services/proposal.wiring";

export {
  listProposalHistory,
  toSafeProposalSummary,
  toSafeProposalDetail,
} from "@/features/content-generation/services/history.service";

export { getAggregatedContentGenerationStatus } from "@/features/content-generation/services/generation-status.service";
