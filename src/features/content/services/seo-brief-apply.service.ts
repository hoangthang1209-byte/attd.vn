import type { Prisma } from "@prisma/client";
import {
  SEO_BRIEF_APPLY_FIELD_KEYS,
  type SeoBriefApplyFieldKey,
  type SeoBriefSuggestion,
} from "@/features/content/services/seo-brief-suggestion.types";
import type { AiGenerationRunRecord } from "@/features/content/services/seo-brief-generator.service";

export type SeoContentBriefRecord = {
  id: string;
  topicId: string;
  workingTitle: string | null;
  proposedSlug: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  searchIntentNotes: string | null;
  audienceNotes: string | null;
  valueProposition: string | null;
  outline: unknown;
  questions: unknown;
  entities: string[];
  requiredSections: string[];
  ctaType: string | null;
  ctaText: string | null;
  wordCountMin: number | null;
  wordCountMax: number | null;
  schemaTypes: string[];
  mediaRequirements: unknown;
  editorNotes: string | null;
  version: number;
  approvedAt: Date | string | null;
  approvedBy: string | null;
  lastAppliedGenerationRunId: string | null;
};

export type SeoBriefApplyStore = {
  getRun: (runId: string) => Promise<AiGenerationRunRecord | null>;
  getBrief: (topicId: string) => Promise<SeoContentBriefRecord | null>;
  upsertBrief: (
    topicId: string,
    data: Record<string, unknown>,
  ) => Promise<SeoContentBriefRecord>;
};

export type ApplySeoBriefSuggestionInput = {
  topicId: string;
  runId: string;
  fields: SeoBriefApplyFieldKey[];
  confirmApprovedOverwrite?: boolean;
};

export class SeoBriefApplyError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "SeoBriefApplyError";
    this.code = code;
    this.status = status;
  }
}

function parseSuggestionFromRun(run: AiGenerationRunRecord): SeoBriefSuggestion {
  if (run.status !== "COMPLETED") {
    throw new SeoBriefApplyError(
      "Chỉ áp dụng được từ run COMPLETED.",
      "RUN_NOT_COMPLETED",
      400,
    );
  }
  const output = run.output;
  if (!output || typeof output !== "object") {
    throw new SeoBriefApplyError("Run không có output suggestion.", "NO_OUTPUT", 400);
  }
  const row = output as Record<string, unknown>;
  const suggestion = (row.suggestion ?? row) as SeoBriefSuggestion;
  if (!suggestion || typeof suggestion !== "object") {
    throw new SeoBriefApplyError("Output suggestion không hợp lệ.", "NO_OUTPUT", 400);
  }
  return suggestion;
}

function pickFieldValue(
  suggestion: SeoBriefSuggestion,
  field: SeoBriefApplyFieldKey,
): unknown {
  switch (field) {
    case "workingTitle":
      return suggestion.workingTitle ?? null;
    case "proposedSlug":
      return suggestion.proposedSlug ?? null;
    case "metaTitle":
      return suggestion.metaTitle ?? null;
    case "metaDescription":
      return suggestion.metaDescription ?? null;
    case "searchIntentNotes":
      return suggestion.searchIntentNotes ?? null;
    case "audienceNotes":
      return suggestion.audienceNotes ?? null;
    case "valueProposition":
      return suggestion.valueProposition ?? null;
    case "outline":
      return suggestion.outline ?? [];
    case "questions":
      return suggestion.questions ?? [];
    case "entities":
      return suggestion.entities ?? [];
    case "requiredSections":
      return suggestion.requiredSections ?? [];
    case "ctaType":
      return suggestion.ctaType ?? null;
    case "ctaText":
      return suggestion.ctaText ?? null;
    case "wordCountMin":
      return suggestion.wordCountMin ?? null;
    case "wordCountMax":
      return suggestion.wordCountMax ?? null;
    case "schemaTypes":
      return suggestion.schemaTypes ?? [];
    case "mediaRequirements":
      return (suggestion.mediaRequirements ?? null) as Prisma.InputJsonValue | null;
    case "editorNotes":
      return suggestion.editorNotes ?? null;
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}

/**
 * Apply selected suggestion fields onto SeoContentBrief.
 * Does NOT apply internalLinkSuggestions automatically.
 * Clears approval so the brief needs re-approval.
 */
export async function applySeoBriefSuggestion(
  input: ApplySeoBriefSuggestionInput,
  store: SeoBriefApplyStore,
): Promise<{
  brief: SeoContentBriefRecord;
  appliedFields: SeoBriefApplyFieldKey[];
  approvalCleared: boolean;
  internalLinksNotApplied: true;
}> {
  const run = await store.getRun(input.runId);
  if (!run) {
    throw new SeoBriefApplyError("Không tìm thấy generation run.", "RUN_NOT_FOUND", 404);
  }
  if (run.entityType !== "SEO_TOPIC" || run.entityId !== input.topicId) {
    throw new SeoBriefApplyError(
      "Run không thuộc chủ đề SEO này.",
      "RUN_TOPIC_MISMATCH",
      400,
    );
  }

  const suggestion = parseSuggestionFromRun(run);
  const existing = await store.getBrief(input.topicId);
  const wasApproved = Boolean(existing?.approvedAt);

  if (wasApproved && !input.confirmApprovedOverwrite) {
    throw new SeoBriefApplyError(
      "Brief đã được duyệt. Cần confirmApprovedOverwrite=true để ghi đè và hủy duyệt.",
      "APPROVED_CONFIRM_REQUIRED",
      409,
    );
  }

  const fields = [
    ...new Set(
      input.fields.filter((f): f is SeoBriefApplyFieldKey =>
        (SEO_BRIEF_APPLY_FIELD_KEYS as readonly string[]).includes(f),
      ),
    ),
  ];
  if (fields.length === 0) {
    throw new SeoBriefApplyError("Chọn ít nhất một field để áp dụng.", "NO_FIELDS", 400);
  }

  // Explicitly never apply internal links here.
  const patch: Record<string, unknown> = {
    lastAppliedGenerationRunId: input.runId,
    approvedAt: null,
    approvedBy: null,
  };

  for (const field of fields) {
    patch[field] = pickFieldValue(suggestion, field);
  }

  // Preserve non-selected fields from existing brief when upserting fresh rows.
  if (!existing) {
    for (const key of SEO_BRIEF_APPLY_FIELD_KEYS) {
      if (fields.includes(key)) continue;
      if (key === "outline") patch.outline = [];
      else if (key === "questions") patch.questions = [];
      else if (key === "entities" || key === "requiredSections" || key === "schemaTypes") {
        patch[key] = [];
      } else if (key === "mediaRequirements") {
        patch[key] = null;
      } else {
        patch[key] = null;
      }
    }
  }

  const brief = await store.upsertBrief(input.topicId, patch);

  return {
    brief,
    appliedFields: fields,
    approvalCleared: wasApproved,
    internalLinksNotApplied: true,
  };
}
