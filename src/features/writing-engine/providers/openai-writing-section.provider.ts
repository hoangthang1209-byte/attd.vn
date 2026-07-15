import type { AiProvider } from "@/features/ai/providers/ai-provider";
import { createOpenAiStructuredProvider } from "@/features/ai/providers/openai-structured-provider";
import {
  buildWritingSectionRepairPrompt,
  buildWritingSectionSystemPrompt,
  buildWritingSectionUserPrompt,
  WRITING_SECTION_JSON_SCHEMA,
} from "@/features/writing-engine/services/writing-section-prompt.service";
import {
  ensureWordCount,
  plainTextFromHtml,
  sanitizeWritingSectionHtml,
} from "@/features/writing-engine/services/writing-section-sanitize.service";
import type {
  WritingSectionDraft,
  WritingSectionProvider,
  WritingSectionProviderOptions,
  WritingSectionProviderResult,
  WritingSectionRequest,
} from "@/features/writing-engine/writing-engine.types";
import { getWritingGenerationConfig } from "@/features/writing-engine/writing-generation-config";

function normalizeDraft(
  request: WritingSectionRequest,
  raw: Record<string, unknown>
): WritingSectionDraft {
  const html = sanitizeWritingSectionHtml(String(raw.html ?? ""));
  const plainText = String(raw.plainText ?? plainTextFromHtml(html));
  return {
    sectionId: String(raw.sectionId ?? request.sectionId),
    heading: String(raw.heading ?? request.heading),
    html,
    plainText,
    factIdsUsed: Array.isArray(raw.factIdsUsed) ? raw.factIdsUsed.map(String) : [],
    citationIdsUsed: Array.isArray(raw.citationIdsUsed) ? raw.citationIdsUsed.map(String) : [],
    internalLinkIdsUsed: Array.isArray(raw.internalLinkIdsUsed)
      ? raw.internalLinkIdsUsed.map(String)
      : [],
    mediaPlacementIdsUsed: Array.isArray(raw.mediaPlacementIdsUsed)
      ? raw.mediaPlacementIdsUsed.map(String)
      : [],
    keywordUsage: Array.isArray(raw.keywordUsage) ? raw.keywordUsage.map(String) : [],
    claims: Array.isArray(raw.claims)
      ? raw.claims.map((c) => {
          const row = c as { text?: string; factId?: string | null };
          return { text: String(row.text ?? ""), factId: row.factId ?? null };
        })
      : [],
    wordCount: ensureWordCount(plainText, Number(raw.wordCount ?? 0)),
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map(String) : [],
  };
}

export class OpenAiWritingSectionProvider implements WritingSectionProvider {
  readonly name = "openai";

  constructor(
    private readonly ai: AiProvider,
    private readonly model: string,
    private readonly maxOutputTokens: number,
    private readonly timeoutMs: number
  ) {}

  async generateSection(
    request: WritingSectionRequest,
    options?: WritingSectionProviderOptions
  ): Promise<WritingSectionProviderResult> {
    const started = Date.now();
    const systemPrompt = buildWritingSectionSystemPrompt();
    const userPrompt = options?.repairContext
      ? buildWritingSectionRepairPrompt(
          request,
          options.repairContext.previousOutput,
          options.repairContext.validationIssues
        )
      : buildWritingSectionUserPrompt(request);

    const result = await this.ai.generateStructured({
      systemPrompt,
      userPrompt,
      jsonSchema: WRITING_SECTION_JSON_SCHEMA,
      schemaName: "writing_section_draft",
      model: this.model,
      maxOutputTokens: this.maxOutputTokens,
      timeoutMs: this.timeoutMs,
      temperature: options?.repairContext ? 0 : 0.2,
    });

    const output = result.output as Record<string, unknown>;
    const draft = normalizeDraft(request, output);

    return {
      draft,
      usage: result.usage,
      latencyMs: Date.now() - started,
      repaired: Boolean(options?.repairContext),
      provider: this.name,
      model: this.model,
    };
  }
}

export function createOpenAiWritingSectionProvider(): OpenAiWritingSectionProvider {
  const config = getWritingGenerationConfig();
  return new OpenAiWritingSectionProvider(
    createOpenAiStructuredProvider(),
    config.model,
    config.maxOutputTokensPerSection,
    config.timeoutMs
  );
}
