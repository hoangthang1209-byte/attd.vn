import type { AiProvider } from "@/features/ai/providers/ai-provider";
import { createOpenAiStructuredProvider } from "@/features/ai/providers/openai-structured-provider";
import type {
  ContentGenerationRequest,
  ContentGenerationResult,
} from "@/features/content-generation/contracts/generation.types";
import { getPromptTemplate } from "@/features/content-generation/prompts/prompt-registry";
import type { ContentGenerationProvider } from "@/features/content-generation/providers/content-generation-provider";

function buildUserPrompt(request: ContentGenerationRequest): string {
  return JSON.stringify(
    {
      type: request.type,
      language: request.context.language,
      topic: { title: request.context.topicTitle, primaryKeyword: request.context.primaryKeyword },
      brandVoice: request.context.brandVoice,
      facts: request.context.facts,
      media: request.context.media,
      links: request.context.links,
      prohibitedClaims: request.context.prohibitedClaims,
      outline: request.context.outline,
      section: request.context.section,
      editorInstruction: request.editorInstruction,
    },
    null,
    2,
  );
}

/**
 * Adapter that reuses the existing provider-neutral `AiProvider` (the same
 * OpenAI structured-output client used by the Writing Engine and SEO Brief
 * generator) instead of inventing a parallel HTTP call path.
 */
export class OpenAiContentGenerationProvider implements ContentGenerationProvider {
  readonly name = "openai";

  constructor(private readonly ai: AiProvider) {}

  async generate(request: ContentGenerationRequest): Promise<ContentGenerationResult> {
    const promptTemplate = getPromptTemplate(request.type);
    const result = await this.ai.generateStructured({
      systemPrompt: promptTemplate.systemInstruction,
      userPrompt: buildUserPrompt(request),
      jsonSchema: promptTemplate.jsonSchema,
      schemaName: promptTemplate.outputSchema,
      model: request.model,
      maxOutputTokens: request.maxOutputTokens,
      timeoutMs: request.timeoutMs,
      temperature: 0.2,
    });

    return {
      type: request.type,
      output: result.output,
      rawText: result.rawText,
      usage: result.usage,
      provider: this.name,
      model: request.model,
      warnings: [],
    };
  }
}

export function createOpenAiContentGenerationProvider(): OpenAiContentGenerationProvider {
  return new OpenAiContentGenerationProvider(createOpenAiStructuredProvider());
}
