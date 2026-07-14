import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type BriefOutlineItem = {
  level: "H2" | "H3";
  heading: string;
  purpose?: string;
  notes?: string;
  required?: boolean;
  sortOrder: number;
};

function validateOutline(outline: unknown): BriefOutlineItem[] {
  if (!Array.isArray(outline)) throw new Error("Outline phải là mảng.");
  return outline.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error("Mục outline không hợp lệ.");
    const row = item as Record<string, unknown>;
    const level = row.level === "H3" ? "H3" : "H2";
    const heading = typeof row.heading === "string" ? row.heading.trim() : "";
    if (!heading) throw new Error("Outline thiếu heading.");
    return {
      level,
      heading,
      purpose: typeof row.purpose === "string" ? row.purpose : undefined,
      notes: typeof row.notes === "string" ? row.notes : undefined,
      required: row.required === true,
      sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : index,
    };
  });
}

export async function getSeoContentBrief(topicId: string) {
  return prisma.seoContentBrief.findUnique({ where: { topicId } });
}

export async function upsertSeoContentBrief(
  topicId: string,
  input: {
    workingTitle?: string | null;
    proposedSlug?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    searchIntentNotes?: string | null;
    audienceNotes?: string | null;
    valueProposition?: string | null;
    outline?: unknown;
    questions?: unknown;
    entities?: string[];
    requiredSections?: string[];
    ctaType?: string | null;
    ctaText?: string | null;
    wordCountMin?: number | null;
    wordCountMax?: number | null;
    schemaTypes?: string[];
    mediaRequirements?: Prisma.InputJsonValue;
    editorNotes?: string | null;
  },
  approvedBy?: string,
) {
  const topic = await prisma.seoTopic.findUnique({ where: { id: topicId } });
  if (!topic) throw new Error("Không tìm thấy chủ đề SEO.");

  const existing = await prisma.seoContentBrief.findUnique({ where: { topicId } });
  const outline = input.outline !== undefined ? validateOutline(input.outline) : undefined;

  let version = existing?.version ?? 1;
  if (existing?.approvedAt && outline) {
    version += 1;
  }

  const brief = await prisma.seoContentBrief.upsert({
    where: { topicId },
    create: {
      topicId,
      workingTitle: input.workingTitle ?? null,
      proposedSlug: input.proposedSlug ?? null,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      searchIntentNotes: input.searchIntentNotes ?? null,
      audienceNotes: input.audienceNotes ?? null,
      valueProposition: input.valueProposition ?? null,
      outline: (outline ?? []) as Prisma.InputJsonValue,
      questions: (input.questions ?? []) as Prisma.InputJsonValue,
      entities: input.entities ?? [],
      requiredSections: input.requiredSections ?? [],
      ctaType: input.ctaType ?? null,
      ctaText: input.ctaText ?? null,
      wordCountMin: input.wordCountMin ?? null,
      wordCountMax: input.wordCountMax ?? null,
      schemaTypes: input.schemaTypes ?? [],
      mediaRequirements: input.mediaRequirements ?? undefined,
      editorNotes: input.editorNotes ?? null,
      version: 1,
    },
    update: {
      ...(input.workingTitle !== undefined ? { workingTitle: input.workingTitle } : {}),
      ...(input.proposedSlug !== undefined ? { proposedSlug: input.proposedSlug } : {}),
      ...(input.metaTitle !== undefined ? { metaTitle: input.metaTitle } : {}),
      ...(input.metaDescription !== undefined ? { metaDescription: input.metaDescription } : {}),
      ...(input.searchIntentNotes !== undefined
        ? { searchIntentNotes: input.searchIntentNotes }
        : {}),
      ...(input.audienceNotes !== undefined ? { audienceNotes: input.audienceNotes } : {}),
      ...(input.valueProposition !== undefined ? { valueProposition: input.valueProposition } : {}),
      ...(outline !== undefined ? { outline: outline as Prisma.InputJsonValue, version } : {}),
      ...(input.questions !== undefined
        ? { questions: input.questions as Prisma.InputJsonValue }
        : {}),
      ...(input.entities !== undefined ? { entities: input.entities } : {}),
      ...(input.requiredSections !== undefined ? { requiredSections: input.requiredSections } : {}),
      ...(input.ctaType !== undefined ? { ctaType: input.ctaType } : {}),
      ...(input.ctaText !== undefined ? { ctaText: input.ctaText } : {}),
      ...(input.wordCountMin !== undefined ? { wordCountMin: input.wordCountMin } : {}),
      ...(input.wordCountMax !== undefined ? { wordCountMax: input.wordCountMax } : {}),
      ...(input.schemaTypes !== undefined ? { schemaTypes: input.schemaTypes } : {}),
      ...(input.mediaRequirements !== undefined
        ? { mediaRequirements: input.mediaRequirements }
        : {}),
      ...(input.editorNotes !== undefined ? { editorNotes: input.editorNotes } : {}),
    },
  });

  if (approvedBy) {
    void approvedBy;
  }

  return brief;
}

export async function approveSeoContentBrief(topicId: string, approvedBy: string) {
  const brief = await prisma.seoContentBrief.findUnique({ where: { topicId } });
  if (!brief) throw new Error("Chưa có brief để duyệt.");

  const updated = await prisma.$transaction(async (tx) => {
    const b = await tx.seoContentBrief.update({
      where: { topicId },
      data: { approvedAt: new Date(), approvedBy },
    });
    await tx.seoTopic.update({
      where: { id: topicId },
      data: { status: "BRIEF_READY" },
    });
    return b;
  });

  return updated;
}
