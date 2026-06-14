import { generateArticleStructure, generateSeoMetadata, type GeneratedArticle } from "@/features/blog/ai-article-generator";
import type { AiPromptInput } from "@/features/blog/ai-prompts";
import {
  generateArticlePrompt,
  generateFaqPrompt,
  generateSeoPrompt,
  generateTagsPrompt,
} from "@/features/blog/ai-prompts";
import { resolveBlueprint } from "@/features/blog/content-blueprints";
import type { BlogFaqItem } from "@/features/blog/types";
import { SITE_NAME } from "@/lib/seo";

export type AiSeoResult = {
  metaTitle: string;
  metaDescription: string;
  excerpt?: string;
  title?: string;
};

export type AiFaqResult = {
  faqJson: BlogFaqItem[];
};

export type AiTagsResult = {
  tags: string[];
};

export type AiPromptBundle = {
  article: string;
  faq: string;
  seo: string;
  tags: string;
};

export interface AiContentProvider {
  generateArticle(input: AiPromptInput): Promise<GeneratedArticle>;
  generateFaq(input: AiPromptInput): Promise<AiFaqResult>;
  generateSeo(input: AiPromptInput): Promise<AiSeoResult>;
  generateTags(input: AiPromptInput): Promise<AiTagsResult>;
  getPrompts(input: AiPromptInput): AiPromptBundle;
}

/**
 * Mock provider — no API keys, no OpenAI calls.
 * Swap this implementation for a real API client in a future sprint.
 */
export class MockAiContentProvider implements AiContentProvider {
  getPrompts(input: AiPromptInput): AiPromptBundle {
    return {
      article: generateArticlePrompt(input),
      faq: generateFaqPrompt(input),
      seo: generateSeoPrompt(input),
      tags: generateTagsPrompt(input),
    };
  }

  async generateArticle(input: AiPromptInput): Promise<GeneratedArticle> {
    if (!input.keyword.trim()) {
      throw new Error("Keyword là bắt buộc");
    }
    return generateArticleStructure(input);
  }

  async generateFaq(input: AiPromptInput): Promise<AiFaqResult> {
    const blueprint = resolveBlueprint({
      keyword: input.keyword,
      primaryTopic: input.primaryTopic,
      ...input.audiences,
    });
    return { faqJson: blueprint.suggestedFaqs };
  }

  async generateSeo(input: AiPromptInput): Promise<AiSeoResult> {
    return generateSeoMetadata(input);
  }

  async generateTags(input: AiPromptInput): Promise<AiTagsResult> {
    const blueprint = resolveBlueprint({
      keyword: input.keyword,
      primaryTopic: input.primaryTopic,
      ...input.audiences,
    });
    const extra = input.keyword.trim().toLowerCase();
    const tags = [...new Set([extra, ...blueprint.suggestedTags])].filter(Boolean);
    return { tags };
  }
}

export const aiContentProvider: AiContentProvider = new MockAiContentProvider();

/** Future entry point — replace mock with real API without UI changes. */
export async function generateContent(
  type: "article" | "faq" | "seo" | "tags",
  input: AiPromptInput
): Promise<GeneratedArticle | AiFaqResult | AiSeoResult | AiTagsResult> {
  switch (type) {
    case "article":
      return aiContentProvider.generateArticle(input);
    case "faq":
      return aiContentProvider.generateFaq(input);
    case "seo":
      return aiContentProvider.generateSeo(input);
    case "tags":
      return aiContentProvider.generateTags(input);
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown generate type: ${String(_exhaustive)}`);
    }
  }
}

export { SITE_NAME };
