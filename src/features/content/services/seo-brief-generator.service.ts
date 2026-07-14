import { createHash } from "node:crypto";
import type { AiProvider } from "@/features/ai/providers/ai-provider";
import type { SeoBriefAiConfig } from "@/features/ai/ai-seo-brief-config";
import { isSeoBriefAiConfigured } from "@/features/ai/ai-seo-brief-config";
import type { AiRetrievalContext } from "@/features/ai-retrieval/ai-retrieval-types";
import {
  buildSeoBriefPrompt,
  SEO_BRIEF_PROMPT_VERSION,
  type SeoBriefPromptExistingBrief,
  type SeoBriefPromptTopic,
} from "@/features/content/services/seo-brief-prompt.service";
import {
  validateSeoBriefSuggestion,
  type SeoBriefSuggestion,
} from "@/features/content/services/seo-brief-suggestion.types";

export type AiGenerationRunRecord = {
  id: string;
  type: string;
  status: string;
  provider: string;
  model: string;
  promptVersion: string;
  entityType: string;
  entityId: string;
  retrievalRequestId: string | null;
  inputHash: string | null;
  inputSummary: unknown;
  output: unknown;
  warnings: unknown;
  errorMessage: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | string | null;
  requestedBy: string | null;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type SeoBriefGenerationRunStore = {
  findRunning: (topicId: string) => Promise<AiGenerationRunRecord | null>;
  findCompletedByInputHash: (
    topicId: string,
    inputHash: string,
  ) => Promise<AiGenerationRunRecord | null>;
  createRunning: (data: {
    provider: string;
    model: string;
    promptVersion: string;
    entityId: string;
    retrievalRequestId: string | null;
    inputHash: string;
    inputSummary: Record<string, unknown>;
    requestedBy: string | null;
  }) => Promise<AiGenerationRunRecord>;
  markCompleted: (
    id: string,
    data: {
      output: Record<string, unknown>;
      warnings: unknown;
      inputTokens: number | null;
      outputTokens: number | null;
      totalTokens: number | null;
      estimatedCostUsd: number | null;
    },
  ) => Promise<AiGenerationRunRecord>;
  markFailed: (id: string, errorMessage: string) => Promise<AiGenerationRunRecord>;
};

export type SeoBriefGeneratorDeps = {
  getTopicById: (id: string) => Promise<SeoBriefPromptTopic | null>;
  getExistingBrief: (topicId: string) => Promise<SeoBriefPromptExistingBrief>;
  retrieveContext: (
    topicId: string,
    opts?: { userId?: string | null; compatibilityMode?: boolean },
  ) => Promise<AiRetrievalContext>;
  provider: AiProvider;
  config: SeoBriefAiConfig;
  runs: SeoBriefGenerationRunStore;
};

export type GenerateSeoBriefOptions = {
  topicId: string;
  regenerate?: boolean;
  requestedBy?: string | null;
  userId?: string | null;
};

export type SeoBriefGenerationResult = {
  reused: boolean;
  run: AiGenerationRunRecord;
  suggestion: SeoBriefSuggestion;
  readinessScore: number;
  warnings: string[];
  conflicts: AiRetrievalContext["conflicts"];
  missingFacts: string[];
};

export class SeoBriefGeneratorError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "SeoBriefGeneratorError";
    this.code = code;
    this.status = status;
  }
}

const MIN_USABLE_FACTS = 1;

function usableFacts(context: AiRetrievalContext) {
  return context.facts.filter(
    (f) => f.visibility !== "CONFIDENTIAL" && f.sourceType !== "SEO_BRIEF",
  );
}

export function computeSeoBriefReadinessScore(input: {
  suggestion: SeoBriefSuggestion;
  factCount: number;
  conflictCount: number;
  warningCount: number;
  mediaBundleCount: number;
}): number {
  let score = 0;
  if (input.suggestion.workingTitle) score += 10;
  if (input.suggestion.metaTitle) score += 8;
  if (input.suggestion.metaDescription) score += 8;
  if (input.suggestion.outline.length >= 3) score += 16;
  else if (input.suggestion.outline.length >= 1) score += 8;
  if (input.suggestion.questions.length > 0) score += 8;
  if (input.suggestion.requiredFactIds.length > 0) score += 12;
  if (input.factCount >= 3) score += 12;
  else if (input.factCount >= 1) score += 6;
  if (input.mediaBundleCount > 0) score += 8;
  if (input.suggestion.ctaText) score += 4;
  if (input.suggestion.schemaTypes.length > 0) score += 4;

  score -= Math.min(20, input.conflictCount * 6);
  score -= Math.min(15, input.warningCount * 3);
  score -= Math.min(15, input.suggestion.missingFacts.length * 3);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function hashSeoBriefInput(parts: {
  topicId: string;
  promptVersion: string;
  model: string;
  primaryKeyword: string;
  retrievalRequestId: string;
  allowedFactIds: string[];
  existingBriefFingerprint: string;
}): string {
  const payload = JSON.stringify({
    topicId: parts.topicId,
    promptVersion: parts.promptVersion,
    model: parts.model,
    primaryKeyword: parts.primaryKeyword,
    retrievalRequestId: parts.retrievalRequestId,
    allowedFactIds: [...parts.allowedFactIds].sort(),
    existingBriefFingerprint: parts.existingBriefFingerprint,
  });
  return createHash("sha256").update(payload).digest("hex");
}

function briefFingerprint(brief: SeoBriefPromptExistingBrief): string {
  if (!brief) return "none";
  return createHash("sha256")
    .update(
      JSON.stringify({
        workingTitle: brief.workingTitle ?? null,
        metaTitle: brief.metaTitle ?? null,
        outline: brief.outline ?? [],
        approvedAt: brief.approvedAt ? String(brief.approvedAt) : null,
        versionHints: {
          cta: brief.ctaText ?? null,
          wordCountMin: brief.wordCountMin ?? null,
          wordCountMax: brief.wordCountMax ?? null,
        },
      }),
    )
    .digest("hex")
    .slice(0, 24);
}

function parseStoredSuggestion(output: unknown): SeoBriefSuggestion | null {
  if (!output || typeof output !== "object") return null;
  const row = output as Record<string, unknown>;
  const suggestion = row.suggestion ?? row;
  if (!suggestion || typeof suggestion !== "object") return null;
  return suggestion as SeoBriefSuggestion;
}

/**
 * Governed SEO Brief generation (Phase 12 + 19 + 21).
 * Suggestion-only — never mutates SeoContentBrief.
 */
export async function generateSeoBriefSuggestion(
  options: GenerateSeoBriefOptions,
  deps: SeoBriefGeneratorDeps,
): Promise<SeoBriefGenerationResult> {
  const { config, provider, runs } = deps;

  if (!config.enabled) {
    throw new SeoBriefGeneratorError(
      "AI SEO Brief đang tắt (AI_SEO_BRIEF_ENABLED).",
      "AI_DISABLED",
      503,
    );
  }
  if (!isSeoBriefAiConfigured(config)) {
    throw new SeoBriefGeneratorError(
      "AI SEO Brief chưa cấu hình đủ (thiếu OPENAI_API_KEY hoặc provider).",
      "AI_NOT_CONFIGURED",
      503,
    );
  }

  const topic = await deps.getTopicById(options.topicId);
  if (!topic) {
    throw new SeoBriefGeneratorError("Không tìm thấy chủ đề SEO.", "TOPIC_NOT_FOUND", 404);
  }

  const running = await runs.findRunning(options.topicId);
  if (running) {
    throw new SeoBriefGeneratorError(
      "Đang có một lần tạo brief AI khác cho chủ đề này (RUNNING). Thử lại sau.",
      "RUN_IN_PROGRESS",
      409,
    );
  }

  const existingBrief = await deps.getExistingBrief(options.topicId);
  const retrieval = await deps.retrieveContext(options.topicId, {
    userId: options.userId ?? null,
    compatibilityMode: true,
  });

  const facts = usableFacts(retrieval);
  if (facts.length < MIN_USABLE_FACTS) {
    throw new SeoBriefGeneratorError(
      "Không đủ fact từ Retrieval Layer để tạo SEO brief. Bổ sung Knowledge Base / Product / Media trước.",
      "INSUFFICIENT_FACTS",
      422,
    );
  }

  const built = buildSeoBriefPrompt({
    topic,
    existingBrief,
    retrieval,
    maxInputCharacters: config.maxInputCharacters,
  });

  const inputHash = hashSeoBriefInput({
    topicId: topic.id,
    promptVersion: built.promptVersion,
    model: config.model,
    primaryKeyword: topic.primaryKeyword,
    retrievalRequestId: retrieval.requestId,
    allowedFactIds: built.allowedFactIds,
    existingBriefFingerprint: briefFingerprint(existingBrief),
  });

  if (!options.regenerate) {
    const reused = await runs.findCompletedByInputHash(options.topicId, inputHash);
    if (reused?.output) {
      const suggestion = parseStoredSuggestion(reused.output);
      if (suggestion) {
        const readinessScore =
          typeof (reused.output as { readinessScore?: number }).readinessScore === "number"
            ? (reused.output as { readinessScore: number }).readinessScore
            : computeSeoBriefReadinessScore({
                suggestion,
                factCount: facts.length,
                conflictCount: retrieval.conflicts.length,
                warningCount: retrieval.warnings.length,
                mediaBundleCount: retrieval.facts.filter((f) => f.sourceType === "MEDIA_BUNDLE")
                  .length,
              });
        return {
          reused: true,
          run: reused,
          suggestion,
          readinessScore,
          warnings: [
            ...retrieval.warnings,
            ...suggestion.contentWarnings,
            "Reused completed run with matching inputHash.",
          ],
          conflicts: retrieval.conflicts,
          missingFacts: suggestion.missingFacts,
        };
      }
    }
  }

  const run = await runs.createRunning({
    provider: provider.name,
    model: config.model,
    promptVersion: SEO_BRIEF_PROMPT_VERSION,
    entityId: topic.id,
    retrievalRequestId: retrieval.requestId,
    inputHash,
    inputSummary: built.inputSummary,
    requestedBy: options.requestedBy ?? null,
  });

  const maxAttempts = 1 + Math.max(0, Math.min(1, config.retryInvalidOutput));
  let lastError: string | null = null;

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await provider.generateStructured({
        systemPrompt: built.systemPrompt,
        userPrompt: built.userPrompt,
        jsonSchema: built.jsonSchema,
        schemaName: built.schemaName,
        model: config.model,
        maxOutputTokens: config.maxOutputTokens,
        timeoutMs: config.timeoutMs,
      });

      const validated = validateSeoBriefSuggestion(result.output, {
        allowedFactIds: built.allowedFactIds,
        allowedInternalLinkTargets: built.allowedInternalLinkTargets,
      });

      if (!validated.ok) {
        lastError = validated.errors.join("; ");
        if (attempt < maxAttempts) continue;
        await runs.markFailed(run.id, `Invalid structured output: ${lastError}`);
        throw new SeoBriefGeneratorError(
          `AI trả về brief không hợp lệ: ${lastError}`,
          "INVALID_OUTPUT",
          422,
        );
      }

      const suggestion = validated.suggestion;
      const mediaBundleCount = retrieval.facts.filter((f) => f.sourceType === "MEDIA_BUNDLE").length;
      const readinessScore = computeSeoBriefReadinessScore({
        suggestion,
        factCount: facts.length,
        conflictCount: retrieval.conflicts.length,
        warningCount: retrieval.warnings.length + suggestion.contentWarnings.length,
        mediaBundleCount,
      });

      const warnings = [
        ...retrieval.warnings,
        ...suggestion.contentWarnings,
        ...(retrieval.conflicts.length
          ? retrieval.conflicts.map((c) => `conflict:${c.key}:${c.warning}`)
          : []),
      ];

      const output = {
        suggestion,
        readinessScore,
        retrievalRequestId: retrieval.requestId,
        conflicts: retrieval.conflicts,
        missingFacts: suggestion.missingFacts,
        promptVersion: SEO_BRIEF_PROMPT_VERSION,
      };

      const completed = await runs.markCompleted(run.id, {
        output,
        warnings,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        estimatedCostUsd: result.usage.estimatedCostUsd,
      });

      return {
        reused: false,
        run: completed,
        suggestion,
        readinessScore,
        warnings,
        conflicts: retrieval.conflicts,
        missingFacts: suggestion.missingFacts,
      };
    }

    throw new SeoBriefGeneratorError(
      lastError ?? "Không tạo được SEO brief suggestion.",
      "GENERATION_FAILED",
      500,
    );
  } catch (err) {
    if (err instanceof SeoBriefGeneratorError) {
      if (err.code !== "INVALID_OUTPUT") {
        await runs.markFailed(run.id, err.message).catch(() => null);
      }
      throw err;
    }
    const message = err instanceof Error ? err.message : "AI generation failed";
    await runs.markFailed(run.id, message).catch(() => null);
    throw new SeoBriefGeneratorError(message, "GENERATION_FAILED", 500);
  }
}
