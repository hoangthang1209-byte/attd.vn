import type {
  MediaBundleContentType,
  MediaBundleSlotType,
  MediaContentSuitability,
} from "@prisma/client";

export const MEDIA_CONTENT_SUITABILITIES: MediaContentSuitability[] = [
  "FEATURED_IMAGE",
  "LANDING_HERO",
  "BLOG_INLINE",
  "BLOG_COVER",
  "PRODUCT_GALLERY",
  "PRODUCT_DETAIL",
  "COMPARISON",
  "PROCESS_STEP",
  "MATERIAL_DETAIL",
  "TECHNIQUE_DETAIL",
  "FACTORY_STORY",
  "CASE_STUDY",
  "TESTIMONIAL",
  "TEAM_PROFILE",
  "TIMELINE",
  "BEFORE_AFTER",
  "SPECIFICATION",
  "SOCIAL_POST",
  "OG_IMAGE",
  "BACKGROUND",
  "CATALOGUE",
  "PRESENTATION",
  "DOCUMENTATION",
];

export const MEDIA_CONTENT_SUITABILITY_LABELS: Record<MediaContentSuitability, string> = {
  FEATURED_IMAGE: "Ảnh đại diện nội dung",
  LANDING_HERO: "Hero landing page",
  BLOG_INLINE: "Ảnh chèn trong bài",
  BLOG_COVER: "Ảnh bìa bài viết",
  PRODUCT_GALLERY: "Gallery sản phẩm",
  PRODUCT_DETAIL: "Chi tiết sản phẩm",
  COMPARISON: "So sánh",
  PROCESS_STEP: "Bước quy trình",
  MATERIAL_DETAIL: "Chi tiết vật liệu",
  TECHNIQUE_DETAIL: "Chi tiết kỹ thuật",
  FACTORY_STORY: "Câu chuyện sản xuất",
  CASE_STUDY: "Case study",
  TESTIMONIAL: "Khách hàng / testimonial",
  TEAM_PROFILE: "Đội ngũ",
  TIMELINE: "Timeline",
  BEFORE_AFTER: "Trước / sau",
  SPECIFICATION: "Thông số / đặc tả",
  SOCIAL_POST: "Social media",
  OG_IMAGE: "Ảnh chia sẻ SEO",
  BACKGROUND: "Ảnh nền",
  CATALOGUE: "Catalogue",
  PRESENTATION: "Presentation",
  DOCUMENTATION: "Tài liệu",
};

export const MEDIA_BUNDLE_CONTENT_TYPES: MediaBundleContentType[] = [
  "BLOG_ARTICLE",
  "LANDING_PAGE",
  "PRODUCT_CONTENT",
  "CASE_STUDY",
  "CAMPAIGN",
  "SOCIAL",
  "PRESENTATION",
  "GENERAL",
];

export const MEDIA_BUNDLE_CONTENT_TYPE_LABELS: Record<MediaBundleContentType, string> = {
  BLOG_ARTICLE: "Bài viết blog",
  LANDING_PAGE: "Landing page",
  PRODUCT_CONTENT: "Nội dung sản phẩm",
  CASE_STUDY: "Case study",
  CAMPAIGN: "Chiến dịch",
  SOCIAL: "Social",
  PRESENTATION: "Presentation",
  GENERAL: "Chung",
};

export const MEDIA_BUNDLE_SLOT_TYPES: MediaBundleSlotType[] = [
  "HERO",
  "FEATURED",
  "COVER",
  "GALLERY",
  "INLINE",
  "PRODUCT",
  "FACTORY",
  "PROCESS",
  "MATERIAL",
  "TECHNIQUE",
  "PACKAGING",
  "CUSTOMER",
  "TEAM",
  "TESTIMONIAL",
  "BEFORE_AFTER",
  "TIMELINE",
  "OG_IMAGE",
  "BACKGROUND",
  "DOCUMENTATION",
  "OTHER",
];

export const MEDIA_BUNDLE_SLOT_TYPE_LABELS: Record<MediaBundleSlotType, string> = {
  HERO: "Hero",
  FEATURED: "Nổi bật",
  COVER: "Ảnh bìa",
  GALLERY: "Gallery",
  INLINE: "Chèn bài",
  PRODUCT: "Sản phẩm",
  FACTORY: "Nhà máy",
  PROCESS: "Quy trình",
  MATERIAL: "Vật liệu",
  TECHNIQUE: "Kỹ thuật",
  PACKAGING: "Bao bì",
  CUSTOMER: "Khách hàng",
  TEAM: "Đội ngũ",
  TESTIMONIAL: "Testimonial",
  BEFORE_AFTER: "Trước / sau",
  TIMELINE: "Timeline",
  OG_IMAGE: "OG Image",
  BACKGROUND: "Nền",
  DOCUMENTATION: "Tài liệu",
  OTHER: "Khác",
};

export function validateMediaContentSuitability(
  value: unknown,
): MediaContentSuitability | null {
  if (typeof value !== "string") return null;
  return MEDIA_CONTENT_SUITABILITIES.includes(value as MediaContentSuitability)
    ? (value as MediaContentSuitability)
    : null;
}

export function validateMediaBundleContentType(
  value: unknown,
): MediaBundleContentType | null {
  if (typeof value !== "string") return null;
  return MEDIA_BUNDLE_CONTENT_TYPES.includes(value as MediaBundleContentType)
    ? (value as MediaBundleContentType)
    : null;
}

export function validateMediaBundleSlotType(value: unknown): MediaBundleSlotType | null {
  if (typeof value !== "string") return null;
  return MEDIA_BUNDLE_SLOT_TYPES.includes(value as MediaBundleSlotType)
    ? (value as MediaBundleSlotType)
    : null;
}

export type MediaBundlePresetSlot = {
  slotType: MediaBundleSlotType;
  label: string;
  description?: string;
  required: boolean;
  recommended: boolean;
  minAssets: number;
  maxAssets?: number;
  sortOrder: number;
};

export type MediaBundlePreset = {
  contentType: MediaBundleContentType;
  slots: MediaBundlePresetSlot[];
};

const PRESETS: Record<MediaBundleContentType, MediaBundlePresetSlot[]> = {
  BLOG_ARTICLE: [
    { slotType: "FEATURED", label: "Ảnh nổi bật", required: true, recommended: true, minAssets: 1, maxAssets: 1, sortOrder: 10 },
    { slotType: "INLINE", label: "Ảnh chèn bài", required: false, recommended: true, minAssets: 3, sortOrder: 20 },
    { slotType: "PROCESS", label: "Quy trình", required: false, recommended: false, minAssets: 1, sortOrder: 30 },
    { slotType: "MATERIAL", label: "Vật liệu", required: false, recommended: false, minAssets: 1, sortOrder: 40 },
    { slotType: "OG_IMAGE", label: "OG Image", required: false, recommended: false, minAssets: 1, maxAssets: 1, sortOrder: 50 },
  ],
  LANDING_PAGE: [
    { slotType: "HERO", label: "Hero", required: true, recommended: true, minAssets: 1, maxAssets: 1, sortOrder: 10 },
    { slotType: "FEATURED", label: "Nổi bật", required: false, recommended: false, minAssets: 1, sortOrder: 20 },
    { slotType: "PRODUCT", label: "Sản phẩm", required: false, recommended: true, minAssets: 3, sortOrder: 30 },
    { slotType: "PROCESS", label: "Quy trình", required: false, recommended: true, minAssets: 3, sortOrder: 40 },
    { slotType: "FACTORY", label: "Nhà máy", required: false, recommended: false, minAssets: 1, sortOrder: 50 },
    { slotType: "TESTIMONIAL", label: "Testimonial", required: false, recommended: false, minAssets: 1, sortOrder: 60 },
    { slotType: "BACKGROUND", label: "Nền", required: false, recommended: false, minAssets: 1, sortOrder: 70 },
    { slotType: "OG_IMAGE", label: "OG Image", required: false, recommended: false, minAssets: 1, maxAssets: 1, sortOrder: 80 },
  ],
  PRODUCT_CONTENT: [
    { slotType: "FEATURED", label: "Ảnh nổi bật", required: true, recommended: true, minAssets: 1, maxAssets: 1, sortOrder: 10 },
    { slotType: "GALLERY", label: "Gallery", required: true, recommended: true, minAssets: 4, sortOrder: 20 },
    { slotType: "PRODUCT", label: "Chi tiết sản phẩm", required: false, recommended: true, minAssets: 2, sortOrder: 30 },
    { slotType: "MATERIAL", label: "Vật liệu", required: false, recommended: false, minAssets: 1, sortOrder: 40 },
    { slotType: "TECHNIQUE", label: "Kỹ thuật", required: false, recommended: false, minAssets: 1, sortOrder: 50 },
    { slotType: "PACKAGING", label: "Bao bì", required: false, recommended: false, minAssets: 1, sortOrder: 60 },
    { slotType: "OG_IMAGE", label: "OG Image", required: false, recommended: false, minAssets: 1, maxAssets: 1, sortOrder: 70 },
  ],
  CASE_STUDY: [
    { slotType: "COVER", label: "Ảnh bìa", required: true, recommended: true, minAssets: 1, maxAssets: 1, sortOrder: 10 },
    { slotType: "CUSTOMER", label: "Khách hàng", required: false, recommended: true, minAssets: 1, sortOrder: 20 },
    { slotType: "PROCESS", label: "Quy trình", required: false, recommended: true, minAssets: 3, sortOrder: 30 },
    { slotType: "PRODUCT", label: "Sản phẩm", required: false, recommended: true, minAssets: 1, sortOrder: 40 },
    { slotType: "TESTIMONIAL", label: "Testimonial", required: false, recommended: false, minAssets: 1, sortOrder: 50 },
    { slotType: "BEFORE_AFTER", label: "Trước / sau", required: false, recommended: false, minAssets: 1, sortOrder: 60 },
    { slotType: "OTHER", label: "Kết quả", required: false, recommended: false, minAssets: 1, sortOrder: 70 },
  ],
  CAMPAIGN: [
    { slotType: "HERO", label: "Hero", required: true, recommended: true, minAssets: 1, maxAssets: 1, sortOrder: 10 },
    { slotType: "FEATURED", label: "Nổi bật", required: false, recommended: true, minAssets: 1, sortOrder: 20 },
    { slotType: "GALLERY", label: "Gallery", required: false, recommended: true, minAssets: 4, sortOrder: 30 },
    { slotType: "OTHER", label: "Social", required: false, recommended: true, minAssets: 2, sortOrder: 40 },
    { slotType: "BACKGROUND", label: "Nền", required: false, recommended: false, minAssets: 1, sortOrder: 50 },
    { slotType: "OG_IMAGE", label: "OG Image", required: false, recommended: false, minAssets: 1, maxAssets: 1, sortOrder: 60 },
  ],
  SOCIAL: [
    { slotType: "FEATURED", label: "Ảnh chính", required: true, recommended: true, minAssets: 1, maxAssets: 1, sortOrder: 10 },
    { slotType: "GALLERY", label: "Gallery", required: false, recommended: true, minAssets: 3, sortOrder: 20 },
    { slotType: "BACKGROUND", label: "Nền", required: false, recommended: false, minAssets: 1, sortOrder: 30 },
  ],
  PRESENTATION: [
    { slotType: "COVER", label: "Bìa", required: true, recommended: true, minAssets: 1, maxAssets: 1, sortOrder: 10 },
    { slotType: "PRODUCT", label: "Sản phẩm", required: false, recommended: true, minAssets: 3, sortOrder: 20 },
    { slotType: "PROCESS", label: "Quy trình", required: false, recommended: true, minAssets: 2, sortOrder: 30 },
    { slotType: "FACTORY", label: "Nhà máy", required: false, recommended: false, minAssets: 1, sortOrder: 40 },
    { slotType: "DOCUMENTATION", label: "Tài liệu", required: false, recommended: false, minAssets: 1, sortOrder: 50 },
  ],
  GENERAL: [
    { slotType: "FEATURED", label: "Nổi bật", required: false, recommended: true, minAssets: 1, sortOrder: 10 },
    { slotType: "GALLERY", label: "Gallery", required: false, recommended: true, minAssets: 3, sortOrder: 20 },
    { slotType: "INLINE", label: "Chèn bài", required: false, recommended: false, minAssets: 2, sortOrder: 30 },
  ],
};

export function getBundlePreset(contentType: MediaBundleContentType): MediaBundlePreset {
  return {
    contentType,
    slots: PRESETS[contentType] ?? PRESETS.GENERAL,
  };
}

export function createBundleSlotsFromPreset(contentType: MediaBundleContentType): MediaBundlePresetSlot[] {
  return getBundlePreset(contentType).slots.map((slot) => ({ ...slot }));
}

export type EvaluateBundleAgainstPresetInput = {
  existingSlotTypes: MediaBundleSlotType[];
  contentType: MediaBundleContentType;
};

export function evaluateBundleAgainstPreset(input: EvaluateBundleAgainstPresetInput): {
  missingSlots: MediaBundlePresetSlot[];
  existingSlotTypes: MediaBundleSlotType[];
} {
  const preset = getBundlePreset(input.contentType);
  const existing = new Set(input.existingSlotTypes);
  return {
    existingSlotTypes: [...existing],
    missingSlots: preset.slots.filter((slot) => !existing.has(slot.slotType)),
  };
}

/** Slot discovery preferences for suggestion/planning. */
export type MediaBundleSlotDiscoveryProfile = {
  slotType: MediaBundleSlotType;
  suitabilities: MediaContentSuitability[];
  roles: string[];
  libraries: string[];
  orientation?: "LANDSCAPE" | "PORTRAIT" | "SQUARE";
  minimumSeoScore: number;
};

export const SLOT_DISCOVERY_PROFILES: Record<MediaBundleSlotType, MediaBundleSlotDiscoveryProfile> = {
  HERO: {
    slotType: "HERO",
    suitabilities: ["LANDING_HERO", "FEATURED_IMAGE"],
    roles: ["HERO", "FEATURED"],
    libraries: [],
    orientation: "LANDSCAPE",
    minimumSeoScore: 65,
  },
  FEATURED: {
    slotType: "FEATURED",
    suitabilities: ["FEATURED_IMAGE", "BLOG_COVER"],
    roles: ["FEATURED", "PRODUCT_MAIN", "HERO"],
    libraries: [],
    orientation: "LANDSCAPE",
    minimumSeoScore: 55,
  },
  COVER: {
    slotType: "COVER",
    suitabilities: ["BLOG_COVER", "FEATURED_IMAGE"],
    roles: ["FEATURED", "HERO"],
    libraries: [],
    orientation: "LANDSCAPE",
    minimumSeoScore: 55,
  },
  GALLERY: {
    slotType: "GALLERY",
    suitabilities: ["PRODUCT_GALLERY", "FEATURED_IMAGE"],
    roles: ["PRODUCT_MAIN", "PRODUCT_DETAIL", "GALLERY"],
    libraries: ["PRODUCT"],
    minimumSeoScore: 40,
  },
  INLINE: {
    slotType: "INLINE",
    suitabilities: ["BLOG_INLINE"],
    roles: ["GENERAL", "PROCESS", "FACTORY", "MATERIAL"],
    libraries: [],
    minimumSeoScore: 40,
  },
  PRODUCT: {
    slotType: "PRODUCT",
    suitabilities: ["PRODUCT_GALLERY", "PRODUCT_DETAIL", "FEATURED_IMAGE"],
    roles: ["PRODUCT_MAIN", "PRODUCT_DETAIL"],
    libraries: ["PRODUCT"],
    minimumSeoScore: 45,
  },
  FACTORY: {
    slotType: "FACTORY",
    suitabilities: ["FACTORY_STORY", "BLOG_INLINE"],
    roles: ["FACTORY"],
    libraries: ["MANUFACTURING"],
    minimumSeoScore: 40,
  },
  PROCESS: {
    slotType: "PROCESS",
    suitabilities: ["PROCESS_STEP", "TECHNIQUE_DETAIL"],
    roles: ["PROCESS", "PRINTING", "EMBROIDERY"],
    libraries: ["MANUFACTURING", "PRODUCT"],
    minimumSeoScore: 40,
  },
  MATERIAL: {
    slotType: "MATERIAL",
    suitabilities: ["MATERIAL_DETAIL", "SPECIFICATION"],
    roles: ["MATERIAL"],
    libraries: ["PRODUCT", "MANUFACTURING"],
    minimumSeoScore: 40,
  },
  TECHNIQUE: {
    slotType: "TECHNIQUE",
    suitabilities: ["TECHNIQUE_DETAIL", "PROCESS_STEP"],
    roles: ["PRINTING", "EMBROIDERY", "PROCESS"],
    libraries: ["MANUFACTURING"],
    minimumSeoScore: 40,
  },
  PACKAGING: {
    slotType: "PACKAGING",
    suitabilities: ["PRODUCT_DETAIL", "CATALOGUE"],
    roles: ["PRODUCT_DETAIL", "PACKAGING"],
    libraries: ["PRODUCT"],
    minimumSeoScore: 35,
  },
  CUSTOMER: {
    slotType: "CUSTOMER",
    suitabilities: ["TESTIMONIAL", "CASE_STUDY"],
    roles: ["CUSTOMER_LOGO", "TESTIMONIAL"],
    libraries: [],
    minimumSeoScore: 35,
  },
  TEAM: {
    slotType: "TEAM",
    suitabilities: ["TEAM_PROFILE"],
    roles: ["TEAM", "GENERAL"],
    libraries: [],
    minimumSeoScore: 30,
  },
  TESTIMONIAL: {
    slotType: "TESTIMONIAL",
    suitabilities: ["TESTIMONIAL", "CASE_STUDY"],
    roles: ["CUSTOMER_LOGO", "TESTIMONIAL"],
    libraries: [],
    minimumSeoScore: 35,
  },
  BEFORE_AFTER: {
    slotType: "BEFORE_AFTER",
    suitabilities: ["BEFORE_AFTER", "COMPARISON"],
    roles: ["PROCESS", "PRODUCT_DETAIL"],
    libraries: [],
    minimumSeoScore: 35,
  },
  TIMELINE: {
    slotType: "TIMELINE",
    suitabilities: ["TIMELINE", "PROCESS_STEP"],
    roles: ["PROCESS"],
    libraries: [],
    minimumSeoScore: 30,
  },
  OG_IMAGE: {
    slotType: "OG_IMAGE",
    suitabilities: ["OG_IMAGE", "FEATURED_IMAGE", "LANDING_HERO"],
    roles: ["HERO", "FEATURED", "PRODUCT_MAIN"],
    libraries: [],
    orientation: "LANDSCAPE",
    minimumSeoScore: 65,
  },
  BACKGROUND: {
    slotType: "BACKGROUND",
    suitabilities: ["BACKGROUND"],
    roles: ["BACKGROUND", "GENERAL"],
    libraries: [],
    orientation: "LANDSCAPE",
    minimumSeoScore: 30,
  },
  DOCUMENTATION: {
    slotType: "DOCUMENTATION",
    suitabilities: ["DOCUMENTATION", "PRESENTATION", "SPECIFICATION"],
    roles: ["DOCUMENTATION"],
    libraries: [],
    minimumSeoScore: 30,
  },
  OTHER: {
    slotType: "OTHER",
    suitabilities: [],
    roles: [],
    libraries: [],
    minimumSeoScore: 30,
  },
};
