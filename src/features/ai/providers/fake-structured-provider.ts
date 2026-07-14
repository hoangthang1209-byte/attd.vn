import type {
  AiGenerationResult,
  AiProvider,
  AiStructuredGenerateParams,
} from "@/features/ai/providers/ai-provider";

export type FakeStructuredProviderOptions = {
  /** Fixed output returned on every call. */
  output?: unknown;
  /** Factory for dynamic outputs (e.g. based on prompt). */
  resolveOutput?: (params: AiStructuredGenerateParams) => unknown;
  /** Throw instead of returning. */
  error?: Error;
  /** Simulate usage. */
  usage?: AiGenerationResult["usage"];
  model?: string;
};

/**
 * Deterministic provider for unit tests — never calls a paid API.
 */
export class FakeStructuredProvider implements AiProvider {
  readonly name = "fake";
  callCount = 0;
  lastParams: AiStructuredGenerateParams | null = null;

  constructor(private readonly options: FakeStructuredProviderOptions = {}) {}

  async generateStructured(params: AiStructuredGenerateParams): Promise<AiGenerationResult> {
    this.callCount += 1;
    this.lastParams = params;

    if (this.options.error) {
      throw this.options.error;
    }

    const output =
      this.options.resolveOutput?.(params) ??
      this.options.output ?? {
        workingTitle: "Fake SEO Brief Title",
        proposedSlug: "fake-seo-brief",
        metaTitle: "Fake meta title",
        metaDescription: "Fake meta description for testing only.",
        searchIntentNotes: "informational",
        audienceNotes: "B2B buyers",
        valueProposition: "Test value prop",
        outline: [
          {
            level: "H2",
            heading: "Tổng quan",
            purpose: "Giới thiệu",
            notes: "Dựa trên fact đã truy xuất",
            required: true,
            sortOrder: 0,
          },
        ],
        questions: [{ question: "MOQ là bao nhiêu?", answerDirection: "Dùng fact đã có" }],
        entities: ["ATTD"],
        requiredSections: ["FAQ"],
        ctaType: "CONTACT",
        ctaText: "Liên hệ tư vấn",
        wordCountMin: 800,
        wordCountMax: 1500,
        schemaTypes: ["Article", "FAQPage"],
        mediaRequirements: { hero: true },
        editorNotes: "Suggestion-only; human must apply.",
        requiredFactIds: [],
        missingFacts: [],
        internalLinkSuggestions: [],
        contentWarnings: [],
      };

    const rawText = JSON.stringify(output);
    return {
      output,
      rawText,
      usage:
        this.options.usage ?? {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          estimatedCostUsd: 0,
        },
      provider: this.name,
      model: this.options.model ?? params.model,
    };
  }
}
