/**
 * Sprint 16.0 — Governed AI Content Engine Foundation.
 *
 * Provider-neutral contracts for AI *proposals*. Nothing in this package may
 * write to published content or auto-approve/auto-publish anything — humans
 * always apply/reject via the proposal service.
 */

export const CONTENT_GENERATION_VERSION = "content-generation-v1";

export const CONTENT_GENERATION_TYPES = [
  "BRIEF_SUGGESTION",
  "OUTLINE_SUGGESTION",
  "SECTION_DRAFT",
  "SECTION_REWRITE",
  "SECTION_SHORTEN",
  "SECTION_EXPAND",
  "SECTION_TONE_CHANGE",
  "SECTION_EXAMPLE",
  "FAQ_SUGGESTION",
  "CTA_SUGGESTION",
  "META_SUGGESTION",
  "INTERNAL_LINK_SUGGESTION",
  "MEDIA_SUGGESTION",
  "ALT_CAPTION_SUGGESTION",
] as const;

export type ContentGenerationType = (typeof CONTENT_GENERATION_TYPES)[number];

export function isContentGenerationType(value: unknown): value is ContentGenerationType {
  return typeof value === "string" && (CONTENT_GENERATION_TYPES as readonly string[]).includes(value);
}

/** Section-scoped generation types (operate on one WritingSectionDraft). */
export const CONTENT_GENERATION_SECTION_TYPES: ContentGenerationType[] = [
  "SECTION_DRAFT",
  "SECTION_REWRITE",
  "SECTION_SHORTEN",
  "SECTION_EXPAND",
  "SECTION_TONE_CHANGE",
  "SECTION_EXAMPLE",
];

export const CONTENT_GENERATION_PROVIDER_MODES = ["DISABLED", "MANUAL", "OPENAI", "TEST"] as const;
export type ContentGenerationProviderMode = (typeof CONTENT_GENERATION_PROVIDER_MODES)[number];

export const CONTENT_GENERATION_PROPOSAL_STATUSES = [
  "REQUESTED",
  "RUNNING",
  "GENERATED",
  "VALIDATION_FAILED",
  "APPLIED",
  "EDITED_AND_APPLIED",
  "REJECTED",
  "FAILED",
  "CANCELLED",
] as const;

export type ContentGenerationProposalStatus = (typeof CONTENT_GENERATION_PROPOSAL_STATUSES)[number];

/** Terminal statuses — no further human action changes the proposal. */
export const CONTENT_GENERATION_TERMINAL_STATUSES: ContentGenerationProposalStatus[] = [
  "APPLIED",
  "EDITED_AND_APPLIED",
  "REJECTED",
  "CANCELLED",
];

export const GENERATION_ERROR_CODES = {
  GENERATION_DISABLED: "GENERATION_DISABLED",
  PROVIDER_NOT_CONFIGURED: "PROVIDER_NOT_CONFIGURED",
  TYPE_NOT_ALLOWED: "TYPE_NOT_ALLOWED",
  INVALID_REQUEST: "INVALID_REQUEST",
  CONTEXT_NOT_READY: "CONTEXT_NOT_READY",
  TOPIC_NOT_FOUND: "TOPIC_NOT_FOUND",
  SECTION_NOT_FOUND: "SECTION_NOT_FOUND",
  DRAFT_NOT_FOUND: "DRAFT_NOT_FOUND",
  DAILY_LIMIT: "DAILY_LIMIT",
  MONTHLY_BUDGET_EXCEEDED: "MONTHLY_BUDGET_EXCEEDED",
  TIMEOUT: "TIMEOUT",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  INVALID_PROVIDER_OUTPUT: "INVALID_PROVIDER_OUTPUT",
  FACT_NOT_ALLOWED: "FACT_NOT_ALLOWED",
  MEDIA_NOT_ALLOWED: "MEDIA_NOT_ALLOWED",
  LINK_NOT_VALID: "LINK_NOT_VALID",
  UNSAFE_CLAIM: "UNSAFE_CLAIM",
  PROPOSAL_NOT_FOUND: "PROPOSAL_NOT_FOUND",
  PROPOSAL_NOT_APPLICABLE: "PROPOSAL_NOT_APPLICABLE",
  GENERATION_STALE: "GENERATION_STALE",
  APPLY_CONFLICT: "APPLY_CONFLICT",
} as const;

export type GenerationErrorCode = keyof typeof GENERATION_ERROR_CODES;

const ERROR_STATUS: Record<GenerationErrorCode, number> = {
  GENERATION_DISABLED: 503,
  PROVIDER_NOT_CONFIGURED: 503,
  TYPE_NOT_ALLOWED: 422,
  INVALID_REQUEST: 400,
  CONTEXT_NOT_READY: 422,
  TOPIC_NOT_FOUND: 404,
  SECTION_NOT_FOUND: 404,
  DRAFT_NOT_FOUND: 404,
  DAILY_LIMIT: 429,
  MONTHLY_BUDGET_EXCEEDED: 429,
  TIMEOUT: 504,
  PROVIDER_ERROR: 502,
  INVALID_PROVIDER_OUTPUT: 502,
  FACT_NOT_ALLOWED: 422,
  MEDIA_NOT_ALLOWED: 422,
  LINK_NOT_VALID: 422,
  UNSAFE_CLAIM: 422,
  PROPOSAL_NOT_FOUND: 404,
  PROPOSAL_NOT_APPLICABLE: 409,
  GENERATION_STALE: 409,
  APPLY_CONFLICT: 409,
};

/** Vietnamese messages shown to editors; never leaks provider bodies/stacks. */
export const GENERATION_ERROR_MESSAGES_VI: Record<GenerationErrorCode, string> = {
  GENERATION_DISABLED: "Tính năng tạo nội dung AI đang tắt. Bạn vẫn có thể viết và chỉnh sửa thủ công.",
  PROVIDER_NOT_CONFIGURED: "Provider AI chưa được cấu hình đầy đủ.",
  TYPE_NOT_ALLOWED: "Loại đề xuất AI này chưa được cho phép.",
  INVALID_REQUEST: "Yêu cầu không hợp lệ.",
  CONTEXT_NOT_READY: "Context Package chưa sẵn sàng cho chủ đề này.",
  TOPIC_NOT_FOUND: "Không tìm thấy chủ đề.",
  SECTION_NOT_FOUND: "Không tìm thấy section trong writing plan.",
  DRAFT_NOT_FOUND: "Không tìm thấy bản nháp.",
  DAILY_LIMIT: "Đã vượt giới hạn tạo đề xuất AI trong ngày.",
  MONTHLY_BUDGET_EXCEEDED: "Đã vượt ngân sách AI hàng tháng.",
  TIMEOUT: "Yêu cầu tới provider AI đã hết thời gian chờ.",
  PROVIDER_ERROR: "Provider AI gặp lỗi khi tạo đề xuất.",
  INVALID_PROVIDER_OUTPUT: "Kết quả AI trả về không đúng định dạng.",
  FACT_NOT_ALLOWED: "Đề xuất tham chiếu fact không có trong ngữ cảnh được duyệt.",
  MEDIA_NOT_ALLOWED: "Đề xuất tham chiếu media không hợp lệ hoặc chưa được phép dùng công khai.",
  LINK_NOT_VALID: "Đề xuất tham chiếu liên kết không có trong ngữ cảnh.",
  UNSAFE_CLAIM: "Nội dung chứa claim chưa được fact hỗ trợ (MOQ/giá/thời gian giao/chứng nhận/...).",
  PROPOSAL_NOT_FOUND: "Không tìm thấy đề xuất AI.",
  PROPOSAL_NOT_APPLICABLE: "Đề xuất không ở trạng thái phù hợp cho thao tác này.",
  GENERATION_STALE: "Nội dung nguồn đã thay đổi kể từ khi tạo đề xuất — cần tạo lại đề xuất mới.",
  APPLY_CONFLICT: "Xung đột khi áp dụng — nội dung đích đã thay đổi.",
};

export class ContentGenerationError extends Error {
  code: GenerationErrorCode;
  status: number;

  constructor(message: string, code: GenerationErrorCode, status?: number) {
    super(message);
    this.name = "ContentGenerationError";
    this.code = code;
    this.status = status ?? ERROR_STATUS[code] ?? 400;
  }
}

// ---------------------------------------------------------------------------
// Governed context (assembled by context-assembler.service; never raw tables)
// ---------------------------------------------------------------------------

export type GovernedContextFact = {
  factId: string;
  statement: string;
  structuredValue?: Record<string, unknown> | null;
  sourceType: string;
  authorityRank: number;
};

export type GovernedContextMedia = {
  id: string;
  url: string;
  altText: string | null;
  caption: string | null;
  slotType: string;
};

export type GovernedContextLink = {
  id: string;
  url: string;
  anchorText: string;
  targetTitle: string;
  targetTopicId: string | null;
};

export type GovernedContextSection = {
  id: string;
  heading: string;
  purpose: string;
  targetWordCountMin: number;
  targetWordCountMax: number;
  requiredFactIds: string[];
  existingHtml: string | null;
  existingPlainText: string | null;
};

export type GovernedGenerationContext = {
  topicId: string;
  briefId: string | null;
  language: string;
  topicTitle: string;
  primaryKeyword: string;
  brandVoice: {
    tone: string | null;
    voiceRules: string[];
    prohibitedPhrases: string[];
    terminology: Record<string, string>;
  };
  facts: GovernedContextFact[];
  media: GovernedContextMedia[];
  links: GovernedContextLink[];
  prohibitedClaims: string[];
  outline: Array<{ level: "H2" | "H3"; heading: string; purpose?: string; required?: boolean; sortOrder: number }>;
  section: GovernedContextSection | null;
  editorInstruction: string | null;
  provenance: {
    contextBuildId: string | null;
    retrievalRequestId: string | null;
    packageHash: string | null;
    generatedAt: string;
  };
};

// ---------------------------------------------------------------------------
// Structured output types (per generation type)
// ---------------------------------------------------------------------------

export type SectionResult = {
  sectionId: string;
  heading: string;
  html: string;
  plainText: string;
  factIdsUsed: string[];
  mediaIdsUsed: string[];
  internalLinkIdsUsed: string[];
  wordCount: number;
  warnings: string[];
};

export type BriefOutlineItem = {
  level: "H2" | "H3";
  heading: string;
  purpose?: string | null;
  required?: boolean;
  sortOrder: number;
};

export type BriefResult = {
  workingTitle: string | null;
  proposedSlug: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  audienceNotes: string | null;
  valueProposition: string | null;
  outline: BriefOutlineItem[];
  requiredSections: string[];
  ctaType: string | null;
  ctaText: string | null;
  wordCountMin: number | null;
  wordCountMax: number | null;
  schemaTypes: string[];
  factIdsUsed: string[];
  warnings: string[];
};

export type OutlineResult = {
  outline: BriefOutlineItem[];
  warnings: string[];
};

export type FaqItem = {
  question: string;
  answerHtml: string;
  factIdsUsed: string[];
};

export type FaqResult = {
  items: FaqItem[];
  warnings: string[];
};

export type MetaResult = {
  metaTitle: string;
  metaDescription: string;
  warnings: string[];
};

export type CtaResult = {
  ctaType: string;
  ctaText: string;
  destination: string | null;
  warnings: string[];
};

export type MediaSuggestion = {
  mediaAssetId: string;
  placement: string;
  altText: string;
  caption: string | null;
  reason: string | null;
};

export type MediaSuggestionResult = {
  suggestions: MediaSuggestion[];
  warnings: string[];
};

export type LinkSuggestion = {
  url: string;
  anchorText: string;
  targetTopicId: string | null;
  sectionId: string | null;
  reason: string | null;
};

export type LinkSuggestionResult = {
  suggestions: LinkSuggestion[];
  warnings: string[];
};

export type AltCaptionResult = {
  mediaAssetId: string | null;
  altText: string;
  caption: string | null;
  warnings: string[];
};

export type ContentGenerationOutput =
  | SectionResult
  | BriefResult
  | OutlineResult
  | FaqResult
  | MetaResult
  | CtaResult
  | MediaSuggestionResult
  | LinkSuggestionResult
  | AltCaptionResult;

// ---------------------------------------------------------------------------
// Provider request/result
// ---------------------------------------------------------------------------

export type ContentGenerationUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
};

export function emptyContentGenerationUsage(): ContentGenerationUsage {
  return { inputTokens: null, outputTokens: null, totalTokens: null, estimatedCostUsd: null };
}

export type ContentGenerationRequest = {
  type: ContentGenerationType;
  topicId: string;
  briefId: string | null;
  contextBuildId: string | null;
  writingPlanId: string | null;
  writingDraftId: string | null;
  sectionId: string | null;
  editorInstruction: string | null;
  model: string;
  maxOutputTokens: number;
  timeoutMs: number;
  context: GovernedGenerationContext;
};

export type ContentGenerationResult = {
  type: ContentGenerationType;
  output: unknown;
  rawText?: string;
  usage: ContentGenerationUsage;
  provider: string;
  model: string;
  warnings: string[];
};
