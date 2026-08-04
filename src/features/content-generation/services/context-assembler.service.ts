import type { ContentContextPackage } from "@/features/content-context/content-context.types";
import {
  ContentGenerationError,
  type GovernedGenerationContext,
} from "@/features/content-generation/contracts/generation.types";
import type { WritingPlan, WritingStructuredDraft } from "@/features/writing-engine/writing-engine.types";

export type AssembleContentGenerationContextInput = {
  topicId: string;
  briefId?: string | null;
  contextBuildId?: string | null;
  writingPlanId?: string | null;
  writingDraftId?: string | null;
  sectionId?: string | null;
  editorInstruction?: string | null;
};

export type ContextBuildLookup = {
  id: string;
  topicId: string;
  briefId: string | null;
  status: string;
  packageJson: unknown;
  retrievalRequestId: string | null;
  packageHash: string | null;
};

export type WritingPlanLookup = {
  id: string;
  planJson: unknown;
};

export type WritingDraftLookup = {
  id: string;
  writingPlanId: string;
  structuredDraft: unknown;
};

export type MediaGovernanceRow = {
  id: string;
  lifecycleStatus: string;
  rightsStatus: string;
};

export type ContentGenerationContextDeps = {
  getContextBuild: (id: string) => Promise<ContextBuildLookup | null>;
  findLatestCompletedContextBuild: (topicId: string) => Promise<ContextBuildLookup | null>;
  getWritingPlan?: (id: string) => Promise<WritingPlanLookup | null>;
  getWritingDraft?: (id: string) => Promise<WritingDraftLookup | null>;
  /**
   * Optional enrichment: looks up MediaAsset.lifecycleStatus/rightsStatus for
   * the ids already selected in the context package (read-only — never
   * mutates MediaAsset). When omitted, only the package's own PUBLIC-only
   * filtering applies.
   */
  getMediaAssetGovernance?: (ids: string[]) => Promise<MediaGovernanceRow[]>;
};

const CONFIDENTIAL_STATEMENT_PATTERN = /costPrice|unitCost|supplierPrice|margin|giá\s*vốn|chi\s*phí\s*nội\s*bộ/i;

const NON_PUBLIC_MEDIA_LIFECYCLE = new Set(["ARCHIVED", "DEPRECATED", "RETIRED"]);
const PUBLIC_COMPATIBLE_RIGHTS = new Set(["OWNED", "LICENSED"]);

function mediaId(id: string, index: number): string {
  return id || `media-${index}`;
}

function linkId(url: string, index: number): string {
  return url ? `link-${index}` : `link-${index}`;
}

/**
 * Assembles the governed generation context for a proposal request.
 *
 * Loads ONLY the already-governed `ContentContextBuild.packageJson` (never
 * queries Product/Knowledge tables directly) and applies an additional
 * generation-time safety filter on top: excludes confidential/private/cost
 * statements from facts, and excludes media whose lifecycle/rights make them
 * unsafe for public output (best-effort — falls back to the package's own
 * PUBLIC-only filtering when governance lookup isn't provided).
 */
export async function assembleContentGenerationContext(
  input: AssembleContentGenerationContextInput,
  deps: ContentGenerationContextDeps,
): Promise<GovernedGenerationContext> {
  if (!input.topicId?.trim()) {
    throw new ContentGenerationError("topicId là bắt buộc.", "INVALID_REQUEST");
  }

  const build = input.contextBuildId
    ? await deps.getContextBuild(input.contextBuildId)
    : await deps.findLatestCompletedContextBuild(input.topicId);

  if (!build || build.status !== "COMPLETED" || !build.packageJson || typeof build.packageJson !== "object") {
    throw new ContentGenerationError(
      "Context Package chưa sẵn sàng cho chủ đề này. Hãy build Content Context trước.",
      "CONTEXT_NOT_READY",
    );
  }

  if (build.topicId !== input.topicId) {
    throw new ContentGenerationError("Context Package không thuộc chủ đề này.", "CONTEXT_NOT_READY");
  }

  const pkg = build.packageJson as ContentContextPackage;

  const facts = pkg.facts.filter(
    (f) => f.visibility === "PUBLIC" && f.publicOutputAllowed && !CONFIDENTIAL_STATEMENT_PATTERN.test(f.statement),
  );

  let mediaCandidates = pkg.media.selectedAssets;
  if (deps.getMediaAssetGovernance && mediaCandidates.length > 0) {
    const governance = await deps.getMediaAssetGovernance(mediaCandidates.map((m) => m.id));
    const governanceById = new Map(governance.map((g) => [g.id, g]));
    mediaCandidates = mediaCandidates.filter((m) => {
      const g = governanceById.get(m.id);
      if (!g) return true; // package already restricted to PUBLIC visibility
      if (NON_PUBLIC_MEDIA_LIFECYCLE.has(g.lifecycleStatus)) return false;
      if (!PUBLIC_COMPATIBLE_RIGHTS.has(g.rightsStatus)) return false;
      return true;
    });
  }

  const media = mediaCandidates.map((m, index) => ({
    id: mediaId(m.id, index),
    url: m.url,
    altText: m.altText ?? null,
    caption: m.caption ?? null,
    slotType: m.slotType,
  }));

  const links = pkg.internalLinks.map((l, index) => ({
    id: linkId(l.url, index),
    url: l.url,
    anchorText: l.anchorText,
    targetTitle: l.targetTitle,
    targetTopicId: l.targetId ?? null,
  }));

  let section: GovernedGenerationContext["section"] = null;
  if (input.sectionId) {
    if (!input.writingPlanId || !deps.getWritingPlan) {
      throw new ContentGenerationError(
        "Cần writingPlanId để lấy ngữ cảnh section.",
        "SECTION_NOT_FOUND",
      );
    }
    const planRow = await deps.getWritingPlan(input.writingPlanId);
    const plan = planRow?.planJson as WritingPlan | undefined;
    const sectionPlan = plan?.sections.find((s) => s.id === input.sectionId);
    if (!sectionPlan) {
      throw new ContentGenerationError("Không tìm thấy section trong writing plan.", "SECTION_NOT_FOUND");
    }

    let existingHtml: string | null = null;
    let existingPlainText: string | null = null;
    if (input.writingDraftId && deps.getWritingDraft) {
      const draftRow = await deps.getWritingDraft(input.writingDraftId);
      const structured = draftRow?.structuredDraft as WritingStructuredDraft | undefined;
      const existing = structured?.sections.find((s) => s.sectionId === input.sectionId);
      if (existing) {
        existingHtml = existing.html || null;
        existingPlainText = existing.plainText || null;
      }
    }

    section = {
      id: sectionPlan.id,
      heading: sectionPlan.heading,
      purpose: sectionPlan.purpose,
      targetWordCountMin: sectionPlan.targetWordCountMin,
      targetWordCountMax: sectionPlan.targetWordCountMax,
      requiredFactIds: sectionPlan.requiredFactIds,
      existingHtml,
      existingPlainText,
    };
  }

  return {
    topicId: pkg.entity.topicId,
    briefId: pkg.entity.briefId ?? null,
    language: pkg.language,
    topicTitle: pkg.topic.title,
    primaryKeyword: pkg.topic.primaryKeyword,
    brandVoice: {
      tone: pkg.brand.tone ?? null,
      voiceRules: pkg.brand.voiceRules,
      prohibitedPhrases: pkg.brand.prohibitedPhrases,
      terminology: pkg.brand.terminology,
    },
    facts: facts.map((f) => ({
      factId: f.factId,
      statement: f.statement,
      structuredValue: f.structuredValue ?? null,
      sourceType: f.sourceType,
      authorityRank: f.authorityRank,
    })),
    media,
    links,
    prohibitedClaims: pkg.prohibitedClaims.map((p) => p.key),
    outline: pkg.brief.outline.map((o) => ({
      level: o.level,
      heading: o.heading,
      purpose: o.purpose,
      required: o.required,
      sortOrder: o.sortOrder,
    })),
    section,
    editorInstruction: input.editorInstruction ?? null,
    provenance: {
      contextBuildId: build.id,
      retrievalRequestId: build.retrievalRequestId,
      packageHash: build.packageHash,
      generatedAt: new Date().toISOString(),
    },
  };
}
