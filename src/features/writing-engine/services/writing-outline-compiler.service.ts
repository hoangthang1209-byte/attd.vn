import type { ContentContextPackage } from "@/features/content-context/content-context.types";
import type { WritingProfile } from "@/features/writing-engine/writing-profiles";
import type {
  WritingIssue,
  WritingSectionPlan,
  WritingSectionType,
} from "@/features/writing-engine/writing-engine.types";
import { inferSectionType, sectionKeyFromHeading, stableId } from "@/features/writing-engine/writing-utils";

export type OutlineCompileResult = {
  sections: WritingSectionPlan[];
  errors: WritingIssue[];
  warnings: WritingIssue[];
};

function baseSection(
  partial: Omit<
    WritingSectionPlan,
    | "requiredFactIds"
    | "optionalFactIds"
    | "businessRuleIds"
    | "mediaAssetIds"
    | "mediaSlotTypes"
    | "internalLinkIds"
    | "citationIds"
    | "requiredKeywords"
    | "optionalKeywords"
    | "prohibitedClaims"
    | "instructions"
    | "targetWordCountMin"
    | "targetWordCountMax"
    | "blockingIssues"
  > &
    Partial<Pick<WritingSectionPlan, "targetWordCountMin" | "targetWordCountMax" | "instructions">>
): WritingSectionPlan {
  return {
    requiredFactIds: [],
    optionalFactIds: [],
    businessRuleIds: [],
    mediaAssetIds: [],
    mediaSlotTypes: [],
    internalLinkIds: [],
    citationIds: [],
    requiredKeywords: [],
    optionalKeywords: [],
    prohibitedClaims: [],
    instructions: [],
    targetWordCountMin: partial.targetWordCountMin ?? 80,
    targetWordCountMax: partial.targetWordCountMax ?? 200,
    blockingIssues: [],
    ...partial,
  };
}

export function compileWritingOutline(
  pkg: ContentContextPackage,
  profile: WritingProfile
): OutlineCompileResult {
  const errors: WritingIssue[] = [];
  const warnings: WritingIssue[] = [];
  const sections: WritingSectionPlan[] = [];
  const seenHeadings = new Set<string>();
  let sortOrder = 0;
  let lastH2Id: string | null = null;

  const introId = stableId("sec", "intro");
  sections.push(
    baseSection({
      id: introId,
      sectionKey: "introduction",
      type: "INTRODUCTION",
      headingLevel: 2,
      heading: "Giới thiệu",
      purpose: "Introduce topic and primary keyword context",
      required: true,
      sortOrder: sortOrder++,
      status: "PLANNED",
      targetWordCountMin: 80,
      targetWordCountMax: 180,
      instructions: ["Use primary keyword naturally", "No unsupported claims"],
    })
  );

  const outline = [...(pkg.brief.outline ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  if (outline.length === 0) {
    errors.push({
      code: "MISSING_OUTLINE",
      severity: "BLOCKING",
      message: "Approved brief outline is required",
    });
  }

  for (const item of outline) {
    const headingNorm = item.heading.trim().toLowerCase();
    if (seenHeadings.has(headingNorm)) {
      warnings.push({
        code: "DUPLICATE_HEADING",
        severity: "WARNING",
        message: `Duplicate heading skipped: ${item.heading}`,
      });
      continue;
    }
    seenHeadings.add(headingNorm);

    if (item.level === "H3" && !lastH2Id) {
      errors.push({
        code: "INVALID_H3_HIERARCHY",
        severity: "BLOCKING",
        message: `H3 "${item.heading}" has no preceding H2`,
      });
      continue;
    }

    const sectionId = stableId("sec", `${item.level}-${item.heading}-${item.sortOrder}`);
    const type = inferSectionType(item.purpose ?? "", item.heading);
    const headingLevel = item.level === "H2" ? 2 : 3;

    const section = baseSection({
      id: sectionId,
      sectionKey: sectionKeyFromHeading(item.heading, item.sortOrder),
      type,
      headingLevel: headingLevel as 2 | 3,
      heading: item.heading,
      purpose: item.purpose ?? item.notes ?? "Brief section",
      required: item.required ?? true,
      sortOrder: sortOrder++,
      status: "PLANNED",
      instructions: item.notes ? [item.notes] : [],
    });

    sections.push(section);
    if (item.level === "H2") lastH2Id = sectionId;
  }

  const hasFaqInBrief =
    profile.optionalSections.includes("FAQ") &&
    (pkg.brief.requiredSections?.includes("FAQ") ||
      pkg.topic.questions.length > 0 ||
      outline.some((o) => /faq|câu hỏi/i.test(`${o.heading} ${o.purpose ?? ""}`)));

  if (hasFaqInBrief) {
    sections.push(
      baseSection({
        id: stableId("sec", "faq"),
        sectionKey: "faq",
        type: "FAQ",
        headingLevel: 2,
        heading: "Câu hỏi thường gặp",
        purpose: "Answer approved FAQ from brief/topic",
        required: false,
        sortOrder: sortOrder++,
        status: "PLANNED",
        targetWordCountMin: 120,
        targetWordCountMax: 400,
      })
    );
  }

  if (profile.requiredSections.includes("CTA") || pkg.brief.cta?.text) {
    sections.push(
      baseSection({
        id: stableId("sec", "cta"),
        sectionKey: "cta",
        type: "CTA",
        headingLevel: 2,
        heading: "Liên hệ / Đặt hàng",
        purpose: "Call to action from brief or profile",
        required: profile.requiredSections.includes("CTA"),
        sortOrder: sortOrder++,
        status: "PLANNED",
        targetWordCountMin: 40,
        targetWordCountMax: 100,
      })
    );
  }

  if (profile.requiredSections.includes("CONCLUSION")) {
    sections.push(
      baseSection({
        id: stableId("sec", "conclusion"),
        sectionKey: "conclusion",
        type: "CONCLUSION",
        headingLevel: 2,
        heading: "Kết luận",
        purpose: "Summarize key points without new claims",
        required: true,
        sortOrder: sortOrder++,
        status: "PLANNED",
        targetWordCountMin: 60,
        targetWordCountMax: 150,
      })
    );
  }

  for (const prohibited of pkg.prohibitedClaims) {
    for (const section of sections) {
      section.prohibitedClaims.push(prohibited.key);
    }
  }

  return { sections, errors, warnings };
}

export function mapSectionPriority(type: WritingSectionType): number {
  const weights: Partial<Record<WritingSectionType, number>> = {
    COMMERCIAL: 5,
    MATERIAL: 4,
    PROCESS: 4,
    MANUFACTURING: 4,
    PRODUCT: 4,
    TECHNIQUE: 3,
    INFORMATIONAL: 3,
    FAQ: 2,
    INTRODUCTION: 1,
    CONCLUSION: 1,
    CTA: 1,
  };
  return weights[type] ?? 2;
}
