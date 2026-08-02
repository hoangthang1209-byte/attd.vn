import type { MediaBundleSlotType } from "@prisma/client";
import type { SectionMediaIntent } from "@/features/content/inline-media/inline-media.types";

type IntentRule = {
  intent: SectionMediaIntent;
  /** Folded Vietnamese/ASCII patterns matched against heading + keywords. */
  patterns: RegExp[];
  preferredSlots: MediaBundleSlotType[];
  preferredSuitabilities: string[];
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deterministic section → media intent map. No LLM.
 * Order matters: first matching rule wins.
 */
export const SECTION_INTENT_RULES: IntentRule[] = [
  {
    intent: "EXCLUDE",
    patterns: [
      /\bcau hoi thuong gap\b/,
      /\bfaq\b/,
      /\blien he\b/,
      /\byeu cau tu van\b/,
      /\bket luan\b/,
      /\bgia\b.*\bmoq\b/,
    ],
    preferredSlots: [],
    preferredSuitabilities: [],
  },
  {
    intent: "HERO_SUPPORT",
    patterns: [/\bgioi thieu\b/, /\boverview\b/, /\btoi uu\b/, /\bvi sao\b/],
    preferredSlots: ["PRODUCT", "FEATURED", "INLINE"],
    preferredSuitabilities: ["BLOG_INLINE", "PRODUCT_GALLERY", "FEATURED_IMAGE"],
  },
  {
    intent: "MATERIAL_DETAIL",
    patterns: [
      /\bchat lieu\b/,
      /\bvai\b/,
      /\bcotton\b/,
      /\bcvc\b/,
      /\bpolyester\b/,
      /\bdinh luong\b/,
      /\bdo day\b/,
      /\bfabric\b/,
      /\bmaterial\b/,
    ],
    preferredSlots: ["MATERIAL", "INLINE"],
    preferredSuitabilities: ["MATERIAL_DETAIL", "BLOG_INLINE", "PRODUCT_DETAIL"],
  },
  {
    intent: "FABRIC_CLOSEUP",
    patterns: [/\bclose ?up\b/, /\bsoi vai\b/, /\bket cau vai\b/],
    preferredSlots: ["MATERIAL", "INLINE"],
    preferredSuitabilities: ["MATERIAL_DETAIL", "PRODUCT_DETAIL"],
  },
  {
    intent: "PRINT_METHOD",
    patterns: [
      /\bin\b/,
      /\btheu\b/,
      /\blogo\b/,
      /\bin thêu\b/,
      /\bprint\b/,
      /\bembroidery\b/,
      /\bky thuat trang tri\b/,
    ],
    preferredSlots: ["TECHNIQUE", "INLINE"],
    preferredSuitabilities: ["TECHNIQUE_DETAIL", "BLOG_INLINE", "PRODUCT_DETAIL"],
  },
  {
    intent: "EMBROIDERY",
    patterns: [/\btheu\b/, /\bembroidery\b/],
    preferredSlots: ["TECHNIQUE", "INLINE"],
    preferredSuitabilities: ["TECHNIQUE_DETAIL", "PRODUCT_DETAIL"],
  },
  {
    intent: "LOGO_DETAIL",
    patterns: [/\blogo\b/, /\bvi tri logo\b/, /\bkich thuoc logo\b/],
    preferredSlots: ["TECHNIQUE", "PRODUCT", "INLINE"],
    preferredSuitabilities: ["TECHNIQUE_DETAIL", "PRODUCT_DETAIL", "BLOG_INLINE"],
  },
  {
    intent: "PROCESS",
    patterns: [
      /\bquy trinh\b/,
      /\bdat hang\b/,
      /\bprocess\b/,
      /\bbuoc\b/,
      /\bsan xuat\b/,
    ],
    preferredSlots: ["PROCESS", "FACTORY", "INLINE"],
    preferredSuitabilities: ["PROCESS_STEP", "FACTORY_STORY", "BLOG_INLINE"],
  },
  {
    intent: "FACTORY",
    patterns: [/\bxuong\b/, /\bfactory\b/, /\bgia cong\b/],
    preferredSlots: ["FACTORY", "PROCESS"],
    preferredSuitabilities: ["FACTORY_STORY", "PROCESS_STEP"],
  },
  {
    intent: "QC",
    patterns: [/\bqc\b/, /\bkiem tra chat luong\b/, /\bquality\b/],
    preferredSlots: ["PROCESS", "FACTORY"],
    preferredSuitabilities: ["PROCESS_STEP", "FACTORY_STORY"],
  },
  {
    intent: "PACKING",
    patterns: [/\bdong goi\b/, /\bpacking\b/, /\bgiao hang\b/],
    preferredSlots: ["PROCESS", "INLINE"],
    preferredSuitabilities: ["PROCESS_STEP", "DOCUMENTATION"],
  },
  {
    intent: "SIZE_CHART",
    patterns: [/\bsize\b/, /\bform\b/, /\bkich thuoc\b/, /\bbang size\b/],
    preferredSlots: ["PRODUCT", "INLINE"],
    preferredSuitabilities: ["SPECIFICATION", "PRODUCT_DETAIL", "BLOG_INLINE"],
  },
  {
    intent: "FIT",
    patterns: [/\bfit\b/, /\bdang ao\b/, /\bform dang\b/],
    preferredSlots: ["PRODUCT", "INLINE"],
    preferredSuitabilities: ["PRODUCT_DETAIL", "BLOG_INLINE"],
  },
  {
    intent: "PRODUCT_OVERVIEW",
    patterns: [
      /\bao polo\b/,
      /\bsan pham\b/,
      /\btieu chi\b/,
      /\bdoi tuong\b/,
      /\bmau sac\b/,
      /\bngan sach\b/,
    ],
    preferredSlots: ["PRODUCT", "INLINE", "GALLERY"],
    preferredSuitabilities: ["PRODUCT_GALLERY", "BLOG_INLINE", "PRODUCT_DETAIL"],
  },
  {
    intent: "CONTACT",
    patterns: [/\bbao gia\b/, /\btu van\b/, /\bcta\b/, /\bdat hang\b$/],
    preferredSlots: ["TEAM", "FACTORY", "CUSTOMER"],
    preferredSuitabilities: ["TEAM_PROFILE", "FACTORY_STORY", "BLOG_INLINE"],
  },
  {
    intent: "SHOWROOM",
    patterns: [/\bshowroom\b/, /\bcua hang\b/],
    preferredSlots: ["CUSTOMER", "TEAM"],
    preferredSuitabilities: ["TEAM_PROFILE", "CASE_STUDY"],
  },
  {
    intent: "TEAM",
    patterns: [/\bdoi ngu\b/, /\bteam\b/],
    preferredSlots: ["TEAM"],
    preferredSuitabilities: ["TEAM_PROFILE"],
  },
];

export type DerivedSectionIntent = {
  intent: SectionMediaIntent;
  preferredSlots: MediaBundleSlotType[];
  preferredSuitabilities: string[];
  excluded: boolean;
};

export function deriveSectionMediaIntent(input: {
  heading: string;
  primaryKeyword?: string | null;
  supportingKeywords?: string[];
  sectionGoal?: string | null;
}): DerivedSectionIntent {
  const haystack = fold(
    [input.heading, input.primaryKeyword ?? "", ...(input.supportingKeywords ?? []), input.sectionGoal ?? ""].join(
      " ",
    ),
  );

  for (const rule of SECTION_INTENT_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      return {
        intent: rule.intent,
        preferredSlots: rule.preferredSlots,
        preferredSuitabilities: rule.preferredSuitabilities,
        excluded: rule.intent === "EXCLUDE",
      };
    }
  }

  return {
    intent: "GENERAL",
    preferredSlots: ["INLINE", "PRODUCT", "GALLERY"],
    preferredSuitabilities: ["BLOG_INLINE", "PRODUCT_GALLERY"],
    excluded: false,
  };
}

/** Map a Media Bundle slot type to the section intents it best serves. */
export function intentsForBundleSlot(slotType: MediaBundleSlotType): SectionMediaIntent[] {
  switch (slotType) {
    case "PRODUCT":
      return ["PRODUCT_OVERVIEW", "PRODUCT_DETAIL", "HERO_SUPPORT", "FIT"];
    case "MATERIAL":
      return ["MATERIAL_DETAIL", "FABRIC_CLOSEUP", "COMPARISON"];
    case "TECHNIQUE":
      return ["PRINT_METHOD", "EMBROIDERY", "LOGO_DETAIL"];
    case "PROCESS":
      return ["PROCESS", "QC", "PACKING"];
    case "FACTORY":
      return ["FACTORY", "PROCESS", "CONTACT"];
    case "INLINE":
    case "GALLERY":
      return ["GENERAL", "PRODUCT_OVERVIEW", "HERO_SUPPORT"];
    case "TEAM":
      return ["TEAM", "CONTACT", "SHOWROOM"];
    case "CUSTOMER":
      return ["SHOWROOM", "CONTACT"];
    case "FEATURED":
    case "COVER":
    case "HERO":
      return ["HERO_SUPPORT"];
    default:
      return ["GENERAL"];
  }
}
