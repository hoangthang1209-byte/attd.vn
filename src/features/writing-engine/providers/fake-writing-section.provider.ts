import type {
  WritingSectionDraft,
  WritingSectionProvider,
  WritingSectionProviderOptions,
  WritingSectionProviderResult,
  WritingSectionRequest,
} from "@/features/writing-engine/writing-engine.types";
import { countWords } from "@/features/writing-engine/writing-utils";

export type FakeWritingSectionProviderOptions = {
  draft?: WritingSectionDraft | ((req: WritingSectionRequest) => WritingSectionDraft);
  error?: Error;
  latencyMs?: number;
  failOnceThenSucceed?: boolean;
};

/**
 * Deterministic section provider for tests — never calls a paid API.
 */
export class FakeWritingSectionProvider implements WritingSectionProvider {
  readonly name = "fake";
  callCount = 0;
  lastRequest: WritingSectionRequest | null = null;
  private failOnce = false;

  constructor(private readonly options: FakeWritingSectionProviderOptions = {}) {
    this.failOnce = Boolean(options.failOnceThenSucceed);
  }

  async generateSection(
    request: WritingSectionRequest,
    _options?: WritingSectionProviderOptions
  ): Promise<WritingSectionProviderResult> {
    this.callCount += 1;
    this.lastRequest = request;

    if (this.failOnce && this.callCount === 1) {
      throw new Error("Simulated timeout");
    }
    if (this.options.error) throw this.options.error;

    const draft =
      typeof this.options.draft === "function"
        ? this.options.draft(request)
        : this.options.draft ?? defaultFakeDraft(request);

    return {
      draft,
      usage: {
        inputTokens: 100,
        outputTokens: 80,
        totalTokens: 180,
        estimatedCostUsd: null,
      },
      latencyMs: this.options.latencyMs ?? 5,
      provider: this.name,
      model: "fake-model",
      repaired: Boolean(_options?.repairContext),
    };
  }
}

function defaultFakeDraft(request: WritingSectionRequest): WritingSectionDraft {
  const factIds = request.facts.slice(0, 2).map((f) => f.factId);
  const linkIds = request.internalLinks.slice(0, 1).map((l) => l.id);
  const mediaIds = request.mediaPlacements.slice(0, 1).map((m) => m.id);
  const factBits = request.facts
    .filter((f) => factIds.includes(f.factId))
    .map((f) => {
      const nums = f.structuredValue
        ? Object.values(f.structuredValue).filter((v) => typeof v === "number").join(" ")
        : "";
      return `${f.statement} ${nums}`.trim();
    })
    .join(" ");
  const keyword = request.keywords.required[0] ?? "";
  let plain = `${request.heading}. ${request.purpose}. ${keyword}. ${factBits}`.trim();
  const filler = " ATTD hỗ trợ gia công may mặc B2B với quy trình rõ ràng và tư vấn phù hợp.";
  while (countWords(plain) < request.targetWordCountMin) {
    plain += filler;
  }
  const linkHtml =
    linkIds.length > 0
      ? `<p><a href="${request.internalLinks[0].url}">${request.internalLinks[0].anchorText}</a></p>`
      : "";

  return {
    sectionId: request.sectionId,
    heading: request.heading,
    html: `<p>${plain}</p>${linkHtml}`,
    plainText: plain,
    factIdsUsed: factIds,
    citationIdsUsed: request.citations
      .filter((c) => factIds.includes(c.factId))
      .map((c) => c.id),
    internalLinkIdsUsed: linkIds,
    mediaPlacementIdsUsed: mediaIds,
    keywordUsage: request.keywords.required,
    claims: factIds.map((factId) => ({
      text: request.facts.find((f) => f.factId === factId)?.statement ?? factId,
      factId,
    })),
    wordCount: countWords(plain),
    warnings: [],
  };
}
