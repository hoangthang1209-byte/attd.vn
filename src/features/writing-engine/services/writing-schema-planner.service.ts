import type { ContentContextPackage } from "@/features/content-context/content-context.types";
import type { WritingProfile } from "@/features/writing-engine/writing-profiles";
import type { WritingSchemaPlan } from "@/features/writing-engine/writing-engine.types";

const FAKE_SCHEMA_PATTERNS = [/AggregateRating/i, /Review/i, /ratingValue/i];

export function planSchema(
  pkg: ContentContextPackage,
  profile: WritingProfile
): WritingSchemaPlan {
  const warnings: string[] = [];
  const hasFaq = (pkg.topic.questions?.length ?? 0) > 0 || pkg.brief.requiredSections?.includes("FAQ");

  let schemaTypes = [...profile.schemaSupport];
  const briefTypes = pkg.brief.schemaTypes ?? [];

  for (const t of briefTypes) {
    if (FAKE_SCHEMA_PATTERNS.some((p) => p.test(t))) {
      warnings.push(`Rejected unsupported schema type: ${t}`);
      continue;
    }
    if (!schemaTypes.includes(t)) schemaTypes.push(t);
  }

  if (!hasFaq) {
    schemaTypes = schemaTypes.filter((t) => t !== "FAQPage");
  }

  if (profile.supportedContentType === "SEO_ARTICLE" && !schemaTypes.includes("BlogPosting")) {
    schemaTypes.unshift("BlogPosting");
  }

  return {
    schemaTypes: [...new Set(schemaTypes)],
    faqEnabled: hasFaq && schemaTypes.includes("FAQPage"),
    breadcrumbEnabled: schemaTypes.includes("BreadcrumbList"),
    warnings,
  };
}
