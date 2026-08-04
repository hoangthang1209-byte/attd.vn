import {
  ContentGenerationError,
  type AltCaptionResult,
  type BriefResult,
  type ContentGenerationRequest,
  type ContentGenerationResult,
  type ContentGenerationUsage,
  type CtaResult,
  type FaqResult,
  type LinkSuggestionResult,
  type MediaSuggestionResult,
  type MetaResult,
  type OutlineResult,
  type SectionResult,
} from "@/features/content-generation/contracts/generation.types";
import type { ContentGenerationProvider } from "@/features/content-generation/providers/content-generation-provider";

/**
 * Magic tokens editors/tests can put in `editorInstruction` to force a
 * scenario deterministically. Never active for provider=openai.
 */
export const TEST_PROVIDER_TOKENS = {
  TIMEOUT: "__TEST_TIMEOUT__",
  MALFORMED: "__TEST_MALFORMED__",
  UNSAFE_CLAIM: "__TEST_UNSAFE_CLAIM__",
  PROVIDER_ERROR: "__TEST_PROVIDER_ERROR__",
} as const;

const TEST_MODEL = "test-model";

function usage(): ContentGenerationUsage {
  return { inputTokens: 120, outputTokens: 80, totalTokens: 200, estimatedCostUsd: 0 };
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Deterministic provider for tests/dev — never calls a paid API. Produces
 * stable structured outputs per generation type, and simulates failure
 * scenarios via magic tokens embedded in `editorInstruction`.
 */
export class TestContentGenerationProvider implements ContentGenerationProvider {
  readonly name = "test";
  callCount = 0;

  async generate(request: ContentGenerationRequest): Promise<ContentGenerationResult> {
    this.callCount += 1;
    const instruction = request.editorInstruction ?? "";

    if (instruction.includes(TEST_PROVIDER_TOKENS.TIMEOUT)) {
      throw new ContentGenerationError("Test provider timeout simulation", "TIMEOUT");
    }
    if (instruction.includes(TEST_PROVIDER_TOKENS.PROVIDER_ERROR)) {
      throw new ContentGenerationError("Test provider simulated failure", "PROVIDER_ERROR");
    }

    if (instruction.includes(TEST_PROVIDER_TOKENS.MALFORMED)) {
      return {
        type: request.type,
        // Intentionally missing required fields to exercise structured-output validation.
        output: { unexpectedShape: true },
        usage: usage(),
        provider: this.name,
        model: TEST_MODEL,
        warnings: [],
      };
    }

    const unsafe = instruction.includes(TEST_PROVIDER_TOKENS.UNSAFE_CLAIM);
    const firstFactId = request.context.facts[0]?.factId ?? null;
    const firstMedia = request.context.media[0] ?? null;
    const firstLink = request.context.links[0] ?? null;

    const output = this.buildOutput(request, { unsafe, firstFactId, firstMedia, firstLink });

    return {
      type: request.type,
      output,
      usage: usage(),
      provider: this.name,
      model: TEST_MODEL,
      warnings: [],
    };
  }

  private buildOutput(
    request: ContentGenerationRequest,
    opts: {
      unsafe: boolean;
      firstFactId: string | null;
      firstMedia: ContentGenerationRequest["context"]["media"][number] | null;
      firstLink: ContentGenerationRequest["context"]["links"][number] | null;
    },
  ): unknown {
    const { unsafe, firstFactId, firstMedia, firstLink } = opts;

    switch (request.type) {
      case "SECTION_DRAFT":
      case "SECTION_REWRITE":
      case "SECTION_SHORTEN":
      case "SECTION_EXPAND":
      case "SECTION_TONE_CHANGE":
      case "SECTION_EXAMPLE": {
        const heading = request.context.section?.heading ?? "Test Section";
        const plainText = unsafe
          ? "MOQ chỉ 50 pcs, giao hàng trong 3 ngày, đảm bảo 100% chất lượng tốt nhất thị trường."
          : `${heading}. Nội dung đề xuất B2B ATTD dựa trên fact đã cung cấp.${
              firstFactId ? ` (fact:${firstFactId})` : ""
            }`;
        const result: SectionResult = {
          sectionId: request.context.section?.id ?? request.sectionId ?? "test-section",
          heading,
          html: `<p>${plainText}</p>`,
          plainText,
          factIdsUsed: unsafe ? [] : firstFactId ? [firstFactId] : [],
          mediaIdsUsed: [],
          internalLinkIdsUsed: [],
          wordCount: wordCount(plainText),
          warnings: [],
        };
        return result;
      }
      case "BRIEF_SUGGESTION": {
        const result: BriefResult = {
          workingTitle: `${request.context.topicTitle} — Test Brief`,
          proposedSlug: "test-brief-slug",
          metaTitle: `${request.context.topicTitle} | ATTD`,
          metaDescription: "Mô tả meta đề xuất test cho brief.",
          audienceNotes: "Người mua B2B (OEM/ODM).",
          valueProposition: "Giá trị đề xuất test.",
          outline: [
            { level: "H2", heading: "Tổng quan", purpose: "overview", required: true, sortOrder: 0 },
            { level: "H2", heading: "Quy trình đặt hàng", purpose: "process", required: true, sortOrder: 1 },
          ],
          requiredSections: ["FAQ"],
          ctaType: "CONTACT",
          ctaText: "Liên hệ tư vấn",
          wordCountMin: 800,
          wordCountMax: 1500,
          schemaTypes: ["Article"],
          factIdsUsed: firstFactId ? [firstFactId] : [],
          warnings: [],
        };
        return result;
      }
      case "OUTLINE_SUGGESTION": {
        const result: OutlineResult = {
          outline: [
            { level: "H2", heading: "Tổng quan", purpose: "overview", required: true, sortOrder: 0 },
            { level: "H2", heading: "Chi tiết kỹ thuật", purpose: "detail", required: true, sortOrder: 1 },
          ],
          warnings: [],
        };
        return result;
      }
      case "FAQ_SUGGESTION": {
        const result: FaqResult = {
          items: [
            {
              question: "MOQ tối thiểu là bao nhiêu?",
              answerHtml: `<p>Theo fact đã cung cấp.${firstFactId ? ` (fact:${firstFactId})` : ""}</p>`,
              factIdsUsed: firstFactId ? [firstFactId] : [],
            },
          ],
          warnings: [],
        };
        return result;
      }
      case "META_SUGGESTION": {
        const result: MetaResult = {
          metaTitle: `${request.context.topicTitle} | ATTD`,
          metaDescription: "Mô tả meta đề xuất test.",
          warnings: [],
        };
        return result;
      }
      case "CTA_SUGGESTION": {
        const result: CtaResult = {
          ctaType: "CONTACT",
          ctaText: "Liên hệ tư vấn ngay",
          destination: null,
          warnings: [],
        };
        return result;
      }
      case "INTERNAL_LINK_SUGGESTION": {
        const result: LinkSuggestionResult = {
          suggestions: firstLink
            ? [
                {
                  url: firstLink.url,
                  anchorText: firstLink.anchorText,
                  targetTopicId: firstLink.targetTopicId,
                  sectionId: request.sectionId,
                  reason: "test_suggestion",
                },
              ]
            : [],
          warnings: firstLink ? [] : ["no_link_candidates_in_context"],
        };
        return result;
      }
      case "MEDIA_SUGGESTION": {
        const result: MediaSuggestionResult = {
          suggestions: firstMedia
            ? [
                {
                  mediaAssetId: firstMedia.id,
                  placement: "INLINE_AFTER",
                  altText: firstMedia.altText ?? "Ảnh minh họa ATTD",
                  caption: firstMedia.caption ?? null,
                  reason: "test_suggestion",
                },
              ]
            : [],
          warnings: firstMedia ? [] : ["no_media_candidates_in_context"],
        };
        return result;
      }
      case "ALT_CAPTION_SUGGESTION": {
        const result: AltCaptionResult = {
          mediaAssetId: firstMedia?.id ?? null,
          altText: "Ảnh minh họa sản phẩm ATTD",
          caption: "Caption đề xuất test.",
          warnings: firstMedia ? [] : ["no_media_candidates_in_context"],
        };
        return result;
      }
      default: {
        throw new ContentGenerationError(`Test provider chưa hỗ trợ loại "${request.type}".`, "TYPE_NOT_ALLOWED");
      }
    }
  }
}
