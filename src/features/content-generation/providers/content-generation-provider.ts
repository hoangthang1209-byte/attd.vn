import type {
  ContentGenerationRequest,
  ContentGenerationResult,
} from "@/features/content-generation/contracts/generation.types";

/**
 * Provider-neutral contract for content-generation proposals. Implementations
 * must NEVER be called from React — only from services/proposal.service.ts
 * (server-side orchestration).
 */
export interface ContentGenerationProvider {
  readonly name: string;
  generate(request: ContentGenerationRequest): Promise<ContentGenerationResult>;
}
