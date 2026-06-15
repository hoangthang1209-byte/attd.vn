import type { KnowledgeBaseSourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";

export type EntrySourceInfo = {
  name: string | null;
  url: string | null;
  type: string | null;
  note: string | null;
  sourceId: string | null;
  fromRelation: boolean;
};

const SOURCE_TYPE_ALIASES: Record<string, KnowledgeBaseSourceType> = {
  INTERNAL: "INTERNAL",
  WEBSITE: "WEBSITE",
  DOCUMENT: "DOCUMENT",
  STAFF_NOTE: "STAFF_NOTE",
  CUSTOMER_FEEDBACK: "CUSTOMER_FEEDBACK",
  MANUAL_INPUT: "MANUAL_INPUT",
  MANUAL: "MANUAL_INPUT",
  WEB: "WEBSITE",
  FILE: "DOCUMENT",
};

export function normalizeSourceType(value: string | undefined): KnowledgeBaseSourceType {
  if (!value?.trim()) return "MANUAL_INPUT";
  const key = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return SOURCE_TYPE_ALIASES[key] ?? "MANUAL_INPUT";
}

export function getEntrySourceInfo(entry: {
  sourceId?: string | null;
  structuredData?: Record<string, unknown> | null;
  source?: { id?: string; name: string; url?: string | null; type?: string; note?: string | null } | null;
}): EntrySourceInfo {
  if (entry.source) {
    return {
      name: entry.source.name,
      url: entry.source.url ?? null,
      type: entry.source.type ?? null,
      note: entry.source.note ?? null,
      sourceId: entry.source.id ?? entry.sourceId ?? null,
      fromRelation: Boolean(entry.source.id),
    };
  }

  const data = entry.structuredData ?? {};
  const name =
    typeof data.source === "string"
      ? data.source
      : typeof data.sourceName === "string"
        ? data.sourceName
        : null;
  const url = typeof data.sourceUrl === "string" ? data.sourceUrl : null;
  const type = typeof data.sourceType === "string" ? data.sourceType : null;
  const note = typeof data.sourceNote === "string" ? data.sourceNote : null;

  return {
    name,
    url,
    type,
    note,
    sourceId: entry.sourceId ?? null,
    fromRelation: false,
  };
}

export async function findOrCreateKnowledgeSource(input: {
  name: string;
  url?: string | null;
  type?: string;
  note?: string | null;
}): Promise<{ id: string; created: boolean }> {
  const name = input.name.trim();
  if (!name) throw new Error("Source name is required");

  const url = input.url?.trim() || null;
  const type = normalizeSourceType(input.type);
  const note = input.note?.trim() || null;

  const existing = await prisma.knowledgeBaseSource.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(url ? { url } : {}),
    },
  });

  if (existing) {
    return { id: existing.id, created: false };
  }

  const created = await prisma.knowledgeBaseSource.create({
    data: { name, url, type, note },
  });
  return { id: created.id, created: true };
}

export async function findOrCreateCategoryByName(
  name: string,
  autoCreate: boolean
): Promise<{ categoryId: string | null; created: boolean }> {
  const normalized = normalizeCategoryName(name);
  if (!normalized) return { categoryId: null, created: false };

  const existing = await prisma.knowledgeBaseCategory.findFirst({
    where: {
      OR: [
        { name: { equals: normalized, mode: "insensitive" } },
        { slug: toSlug(normalized) },
      ],
    },
  });

  if (existing) return { categoryId: existing.id, created: false };
  if (!autoCreate) return { categoryId: null, created: false };

  const slug = await uniqueCategorySlug(toSlug(normalized) || "danh-muc");
  const created = await prisma.knowledgeBaseCategory.create({
    data: {
      name: normalized,
      slug,
      description: `Danh mục tạo tự động từ import — ${normalized}`,
      sortOrder: 99,
      isActive: true,
    },
  });

  return { categoryId: created.id, created: true };
}

async function uniqueCategorySlug(base: string): Promise<string> {
  let slug = base;
  let counter = 2;
  while (await prisma.knowledgeBaseCategory.findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

export function normalizeCategoryName(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}
