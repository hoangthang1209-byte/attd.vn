import type { ContentContextPackage } from "@/features/content-context/content-context.types";
import type {
  WritingKeywordPlan,
  WritingSectionPlan,
  WritingTitlePlan,
  WritingMetadataPlan,
} from "@/features/writing-engine/writing-engine.types";
import { slugify } from "@/features/writing-engine/writing-utils";

export function planKeywords(
  pkg: ContentContextPackage,
  sections: WritingSectionPlan[]
): WritingKeywordPlan {
  const primaryKeyword = pkg.topic.primaryKeyword;
  const secondaryKeywords = pkg.topic.supportingKeywords.slice(0, 8);

  const sectionAssignments = sections.map((section) => {
    const required: string[] = [];
    const optional: string[] = [];

    if (section.type === "INTRODUCTION") {
      required.push(primaryKeyword);
      optional.push(...secondaryKeywords.slice(0, 2));
    } else if (section.headingLevel === 2 && section.type !== "CTA" && section.type !== "FAQ") {
      optional.push(primaryKeyword);
      optional.push(...secondaryKeywords.slice(0, 1));
    } else {
      optional.push(...secondaryKeywords.slice(0, 2));
    }

    section.requiredKeywords = required;
    section.optionalKeywords = optional;

    return { sectionId: section.id, requiredKeywords: required, optionalKeywords: optional };
  });

  return {
    primaryKeyword,
    secondaryKeywords,
    sectionAssignments,
    prohibitedPatterns: ["top 1", "số 1", "best nhất", "guaranteed", "đảm bảo 100%"],
  };
}

export function planTitleAndMetadata(
  pkg: ContentContextPackage
): { titlePlan: WritingTitlePlan; metadataPlan: WritingMetadataPlan } {
  const h1 = pkg.brief.workingTitle?.trim() || pkg.topic.title;
  const metaTitle = (pkg.brief.metaTitle?.trim() || h1).slice(0, 60);
  const metaDescription = (pkg.brief.metaDescription?.trim() || pkg.topic.primaryKeyword).slice(
    0,
    160
  );
  const slug = slugify(pkg.brief.proposedSlug?.trim() || h1);

  return {
    titlePlan: {
      h1,
      alternatives: [],
      rules: [
        "Primary keyword in H1",
        "No unsupported superlatives",
        "No invented year unless brief requires",
      ],
    },
    metadataPlan: {
      metaTitle,
      metaDescription,
      slug,
      canonicalUrl: null,
      ogTitle: metaTitle,
      ogDescription: metaDescription,
    },
  };
}
