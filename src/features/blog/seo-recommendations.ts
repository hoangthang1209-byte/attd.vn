import type { AiPromptInput } from "@/features/blog/ai-prompts";
import { resolveBlueprint } from "@/features/blog/content-blueprints";
import type { BlogCategoryRecord, BlogFaqItem } from "@/features/blog/types";

export type SeoRecommendations = {
  relatedKeywords: string[];
  suggestedTags: string[];
  suggestedFaqs: BlogFaqItem[];
  suggestedInternalLinks: { keyword: string; href: string }[];
  suggestedCategoryIds: string[];
};

const INTERNAL_LINK_MAP: { keyword: string; href: string }[] = [
  { keyword: "nguồn hàng áo thun trơn", href: "/nguon-hang-ao-thun-tron" },
  { keyword: "áo thun trơn sỉ", href: "/ao-thun-tron-si" },
  { keyword: "kho áo thun trơn", href: "/kho-ao-thun-tron" },
  { keyword: "OEM", href: "/oem" },
  { keyword: "đại lý", href: "/dai-ly" },
  { keyword: "quà tặng doanh nghiệp", href: "/qua-tang-doanh-nghiep" },
  { keyword: "nguồn hàng", href: "/nguon-hang" },
  { keyword: "đồng phục công ty", href: "/ao-thun-cong-ty" },
];

function relatedKeywordsFor(input: AiPromptInput): string[] {
  const blueprint = resolveBlueprint({
    keyword: input.keyword,
    primaryTopic: input.primaryTopic,
    ...input.audiences,
  });

  const base = [
    input.keyword.trim(),
    input.primaryTopic?.trim(),
    ...blueprint.internalLinkKeywords,
    "báo giá áo thun sỉ",
    "MOQ áo thun trơn",
    "in logo áo thun",
  ].filter((item): item is string => Boolean(item?.trim()));

  return [...new Set(base)].slice(0, 10);
}

function matchCategories(
  hints: string[],
  categories: BlogCategoryRecord[]
): string[] {
  const normalizedHints = hints.map((h) => h.toLowerCase());
  return categories
    .filter((cat) =>
      normalizedHints.some(
        (hint) =>
          cat.name.toLowerCase().includes(hint) ||
          cat.slug.toLowerCase().includes(hint)
      )
    )
    .map((cat) => cat.id);
}

export function generateSeoRecommendations(
  input: AiPromptInput,
  categories: BlogCategoryRecord[] = []
): SeoRecommendations {
  const blueprint = resolveBlueprint({
    keyword: input.keyword,
    primaryTopic: input.primaryTopic,
    ...input.audiences,
  });

  const suggestedInternalLinks = INTERNAL_LINK_MAP.filter((link) =>
    blueprint.internalLinkKeywords.some(
      (kw) => kw.toLowerCase() === link.keyword.toLowerCase()
    )
  );

  const extraLinks = INTERNAL_LINK_MAP.filter(
    (link) => !suggestedInternalLinks.includes(link)
  ).slice(0, 2);

  return {
    relatedKeywords: relatedKeywordsFor(input),
    suggestedTags: blueprint.suggestedTags,
    suggestedFaqs: blueprint.suggestedFaqs,
    suggestedInternalLinks: [...suggestedInternalLinks, ...extraLinks],
    suggestedCategoryIds: matchCategories(blueprint.categoryHints, categories),
  };
}
