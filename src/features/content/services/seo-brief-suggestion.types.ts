export const ALLOWED_SCHEMA_TYPES = [
  "Article",
  "FAQPage",
  "HowTo",
  "Organization",
  "BreadcrumbList",
  "WebPage",
] as const;

export type AllowedSchemaType = (typeof ALLOWED_SCHEMA_TYPES)[number];

export type SeoBriefSuggestionOutlineItem = {
  level: "H2" | "H3";
  heading: string;
  purpose?: string;
  notes?: string;
  required?: boolean;
  sortOrder: number;
};

export type SeoBriefSuggestionQuestion = {
  question: string;
  answerDirection?: string;
};

export type SeoBriefSuggestionInternalLink = {
  anchorText: string;
  targetUrl?: string;
  targetTopicId?: string;
  reason?: string;
};

/**
 * Suggestion-only SEO brief shape. Must not contain full article body copy.
 */
export type SeoBriefSuggestion = {
  workingTitle?: string | null;
  proposedSlug?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  searchIntentNotes?: string | null;
  audienceNotes?: string | null;
  valueProposition?: string | null;
  outline: SeoBriefSuggestionOutlineItem[];
  questions: SeoBriefSuggestionQuestion[];
  entities: string[];
  requiredSections: string[];
  ctaType?: string | null;
  ctaText?: string | null;
  wordCountMin?: number | null;
  wordCountMax?: number | null;
  schemaTypes: AllowedSchemaType[];
  mediaRequirements?: Record<string, unknown> | null;
  editorNotes?: string | null;
  /** Fact IDs drawn only from retrieval context. */
  requiredFactIds: string[];
  missingFacts: string[];
  /** Suggestions only — never auto-applied to SeoInternalLinkOpportunity. */
  internalLinkSuggestions: SeoBriefSuggestionInternalLink[];
  contentWarnings: string[];
};

export type SeoBriefSuggestionValidationOptions = {
  allowedFactIds: Set<string> | string[];
  allowedInternalLinkTargets: Set<string> | string[];
};

export type SeoBriefSuggestionValidationResult =
  | { ok: true; suggestion: SeoBriefSuggestion }
  | { ok: false; errors: string[] };

const MAX_SHORT = 200;
const MAX_META_DESC = 320;
const MAX_NOTES = 600;
const MAX_EDITOR = 2_000;
const MAX_OUTLINE_ITEMS = 40;
const MAX_QUESTIONS = 20;
const FULL_ARTICLE_MARKERS = [
  /\b(full article|全文|toàn bộ bài viết|body copy|paragraph 1)\b/i,
  /#{1,6}\s+.+\n{2,}[\s\S]{800,}/,
];

function asSet(value: Set<string> | string[]): Set<string> {
  return value instanceof Set ? value : new Set(value);
}

function asOptionalString(value: unknown, field: string, max: number, errors: string[]): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    errors.push(`${field} phải là chuỗi.`);
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    errors.push(`${field} vượt quá ${max} ký tự (brief-only, không viết bài đầy đủ).`);
  }
  return trimmed || null;
}

function asStringArray(value: unknown, field: string, errors: string[]): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    errors.push(`${field} phải là mảng chuỗi.`);
    return [];
  }
  return value
    .map((item, i) => {
      if (typeof item !== "string") {
        errors.push(`${field}[${i}] phải là chuỗi.`);
        return "";
      }
      return item.trim();
    })
    .filter(Boolean);
}

function looksLikeFullArticle(text: string): boolean {
  if (text.length > 3_500) return true;
  return FULL_ARTICLE_MARKERS.some((re) => re.test(text));
}

export const SEO_BRIEF_SUGGESTION_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "workingTitle",
    "proposedSlug",
    "metaTitle",
    "metaDescription",
    "searchIntentNotes",
    "audienceNotes",
    "valueProposition",
    "outline",
    "questions",
    "entities",
    "requiredSections",
    "ctaType",
    "ctaText",
    "wordCountMin",
    "wordCountMax",
    "schemaTypes",
    "mediaRequirements",
    "editorNotes",
    "requiredFactIds",
    "missingFacts",
    "internalLinkSuggestions",
    "contentWarnings",
  ],
  properties: {
    workingTitle: { type: ["string", "null"] },
    proposedSlug: { type: ["string", "null"] },
    metaTitle: { type: ["string", "null"] },
    metaDescription: { type: ["string", "null"] },
    searchIntentNotes: { type: ["string", "null"] },
    audienceNotes: { type: ["string", "null"] },
    valueProposition: { type: ["string", "null"] },
    outline: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["level", "heading", "purpose", "notes", "required", "sortOrder"],
        properties: {
          level: { type: "string", enum: ["H2", "H3"] },
          heading: { type: "string" },
          purpose: { type: ["string", "null"] },
          notes: { type: ["string", "null"] },
          required: { type: "boolean" },
          sortOrder: { type: "integer" },
        },
      },
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answerDirection"],
        properties: {
          question: { type: "string" },
          answerDirection: { type: ["string", "null"] },
        },
      },
    },
    entities: { type: "array", items: { type: "string" } },
    requiredSections: { type: "array", items: { type: "string" } },
    ctaType: { type: ["string", "null"] },
    ctaText: { type: ["string", "null"] },
    wordCountMin: { type: ["integer", "null"] },
    wordCountMax: { type: ["integer", "null"] },
    schemaTypes: {
      type: "array",
      items: {
        type: "string",
        enum: [...ALLOWED_SCHEMA_TYPES],
      },
    },
    mediaRequirements: {
      type: ["object", "null"],
      additionalProperties: true,
    },
    editorNotes: { type: ["string", "null"] },
    requiredFactIds: { type: "array", items: { type: "string" } },
    missingFacts: { type: "array", items: { type: "string" } },
    internalLinkSuggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["anchorText", "targetUrl", "targetTopicId", "reason"],
        properties: {
          anchorText: { type: "string" },
          targetUrl: { type: ["string", "null"] },
          targetTopicId: { type: ["string", "null"] },
          reason: { type: ["string", "null"] },
        },
      },
    },
    contentWarnings: { type: "array", items: { type: "string" } },
  },
};

export function validateSeoBriefSuggestion(
  raw: unknown,
  options: SeoBriefSuggestionValidationOptions,
): SeoBriefSuggestionValidationResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: ["Suggestion phải là object JSON."] };
  }

  const data = raw as Record<string, unknown>;
  const allowedFactIds = asSet(options.allowedFactIds);
  const allowedTargets = asSet(options.allowedInternalLinkTargets);

  const workingTitle = asOptionalString(data.workingTitle, "workingTitle", MAX_SHORT, errors);
  const proposedSlug = asOptionalString(data.proposedSlug, "proposedSlug", MAX_SHORT, errors);
  const metaTitle = asOptionalString(data.metaTitle, "metaTitle", 80, errors);
  const metaDescription = asOptionalString(data.metaDescription, "metaDescription", MAX_META_DESC, errors);
  const searchIntentNotes = asOptionalString(data.searchIntentNotes, "searchIntentNotes", MAX_NOTES, errors);
  const audienceNotes = asOptionalString(data.audienceNotes, "audienceNotes", MAX_NOTES, errors);
  const valueProposition = asOptionalString(data.valueProposition, "valueProposition", MAX_NOTES, errors);
  const ctaType = asOptionalString(data.ctaType, "ctaType", 80, errors);
  const ctaText = asOptionalString(data.ctaText, "ctaText", MAX_SHORT, errors);
  const editorNotes = asOptionalString(data.editorNotes, "editorNotes", MAX_EDITOR, errors);

  const blob = [
    workingTitle,
    metaDescription,
    searchIntentNotes,
    audienceNotes,
    valueProposition,
    editorNotes,
  ]
    .filter(Boolean)
    .join("\n");
  if (looksLikeFullArticle(blob)) {
    errors.push("Suggestion có vẻ là bài viết đầy đủ — chỉ chấp nhận brief/outline.");
  }

  let wordCountMin: number | null = null;
  let wordCountMax: number | null = null;
  if (data.wordCountMin != null) {
    if (typeof data.wordCountMin !== "number" || !Number.isFinite(data.wordCountMin)) {
      errors.push("wordCountMin không hợp lệ.");
    } else {
      wordCountMin = Math.floor(data.wordCountMin);
    }
  }
  if (data.wordCountMax != null) {
    if (typeof data.wordCountMax !== "number" || !Number.isFinite(data.wordCountMax)) {
      errors.push("wordCountMax không hợp lệ.");
    } else {
      wordCountMax = Math.floor(data.wordCountMax);
    }
  }

  const outlineRaw = Array.isArray(data.outline) ? data.outline : null;
  if (!outlineRaw) {
    errors.push("outline là bắt buộc và phải là mảng.");
  } else if (outlineRaw.length > MAX_OUTLINE_ITEMS) {
    errors.push(`outline vượt quá ${MAX_OUTLINE_ITEMS} mục.`);
  }

  const outline: SeoBriefSuggestionOutlineItem[] = (outlineRaw ?? []).map((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`outline[${index}] không hợp lệ.`);
      return { level: "H2" as const, heading: "", sortOrder: index };
    }
    const row = item as Record<string, unknown>;
    const level = row.level === "H3" ? "H3" : "H2";
    const heading = typeof row.heading === "string" ? row.heading.trim() : "";
    if (!heading) errors.push(`outline[${index}] thiếu heading.`);
    const purpose =
      typeof row.purpose === "string" ? row.purpose.trim().slice(0, MAX_NOTES) : undefined;
    const notes = typeof row.notes === "string" ? row.notes.trim().slice(0, MAX_NOTES) : undefined;
    if ((purpose && looksLikeFullArticle(purpose)) || (notes && looksLikeFullArticle(notes))) {
      errors.push(`outline[${index}] chứa nội dung giống bài viết đầy đủ.`);
    }
    return {
      level,
      heading,
      purpose: purpose || undefined,
      notes: notes || undefined,
      required: row.required === true,
      sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : index,
    };
  });

  const questionsRaw = Array.isArray(data.questions) ? data.questions : [];
  if (questionsRaw.length > MAX_QUESTIONS) {
    errors.push(`questions vượt quá ${MAX_QUESTIONS}.`);
  }
  const questions: SeoBriefSuggestionQuestion[] = questionsRaw.map((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`questions[${index}] không hợp lệ.`);
      return { question: "" };
    }
    const row = item as Record<string, unknown>;
    const question = typeof row.question === "string" ? row.question.trim() : "";
    if (!question) errors.push(`questions[${index}] thiếu question.`);
    const answerDirection =
      typeof row.answerDirection === "string" ? row.answerDirection.trim().slice(0, MAX_NOTES) : undefined;
    return { question, answerDirection: answerDirection || undefined };
  });

  const entities = asStringArray(data.entities, "entities", errors);
  const requiredSections = asStringArray(data.requiredSections, "requiredSections", errors);
  const requiredFactIds = asStringArray(data.requiredFactIds, "requiredFactIds", errors);
  const missingFacts = asStringArray(data.missingFacts, "missingFacts", errors);
  const contentWarnings = asStringArray(data.contentWarnings, "contentWarnings", errors);

  for (const factId of requiredFactIds) {
    if (!allowedFactIds.has(factId)) {
      errors.push(`Fact ID không có trong ngữ cảnh truy xuất: ${factId}`);
    }
  }

  const schemaTypesRaw = asStringArray(data.schemaTypes, "schemaTypes", errors);
  const schemaTypes: AllowedSchemaType[] = [];
  for (const t of schemaTypesRaw) {
    if ((ALLOWED_SCHEMA_TYPES as readonly string[]).includes(t)) {
      schemaTypes.push(t as AllowedSchemaType);
    } else {
      errors.push(`schemaType không được phép: ${t}`);
    }
  }

  let mediaRequirements: Record<string, unknown> | null = null;
  if (data.mediaRequirements != null) {
    if (typeof data.mediaRequirements !== "object" || Array.isArray(data.mediaRequirements)) {
      errors.push("mediaRequirements phải là object hoặc null.");
    } else {
      mediaRequirements = data.mediaRequirements as Record<string, unknown>;
    }
  }

  const linkRaw = Array.isArray(data.internalLinkSuggestions) ? data.internalLinkSuggestions : [];
  const internalLinkSuggestions: SeoBriefSuggestionInternalLink[] = linkRaw.map((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`internalLinkSuggestions[${index}] không hợp lệ.`);
      return { anchorText: "" };
    }
    const row = item as Record<string, unknown>;
    const anchorText = typeof row.anchorText === "string" ? row.anchorText.trim() : "";
    const targetUrl =
      typeof row.targetUrl === "string" && row.targetUrl.trim() ? row.targetUrl.trim() : undefined;
    const targetTopicId =
      typeof row.targetTopicId === "string" && row.targetTopicId.trim()
        ? row.targetTopicId.trim()
        : undefined;
    const reason = typeof row.reason === "string" ? row.reason.trim() : undefined;

    if (targetUrl && !allowedTargets.has(targetUrl)) {
      errors.push(`URL/target nội bộ không có trong retrieval: ${targetUrl}`);
    }
    if (targetTopicId && !allowedTargets.has(targetTopicId)) {
      errors.push(`targetTopicId không có trong retrieval: ${targetTopicId}`);
    }

    return { anchorText, targetUrl, targetTopicId, reason };
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    suggestion: {
      workingTitle,
      proposedSlug,
      metaTitle,
      metaDescription,
      searchIntentNotes,
      audienceNotes,
      valueProposition,
      outline,
      questions,
      entities,
      requiredSections,
      ctaType,
      ctaText,
      wordCountMin,
      wordCountMax,
      schemaTypes,
      mediaRequirements,
      editorNotes,
      requiredFactIds,
      missingFacts,
      internalLinkSuggestions,
      contentWarnings,
    },
  };
}

/** Fields that can be selectively applied onto SeoContentBrief. */
export const SEO_BRIEF_APPLY_FIELD_KEYS = [
  "workingTitle",
  "proposedSlug",
  "metaTitle",
  "metaDescription",
  "searchIntentNotes",
  "audienceNotes",
  "valueProposition",
  "outline",
  "questions",
  "entities",
  "requiredSections",
  "ctaType",
  "ctaText",
  "wordCountMin",
  "wordCountMax",
  "schemaTypes",
  "mediaRequirements",
  "editorNotes",
] as const;

export type SeoBriefApplyFieldKey = (typeof SEO_BRIEF_APPLY_FIELD_KEYS)[number];
