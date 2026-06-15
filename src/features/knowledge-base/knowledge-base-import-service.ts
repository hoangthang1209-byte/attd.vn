import type { Prisma } from "@prisma/client";
import type {
  ColumnMapping,
  DuplicateBehavior,
  ImportExecuteResult,
  ImportPreviewResult,
  ImportRowCandidate,
} from "@/features/knowledge-base/knowledge-base-import-types";
import {
  createKnowledgeBaseEntry,
  getCategoryIdBySlug,
  listKnowledgeBaseCategories,
  updateKnowledgeBaseEntry,
} from "@/features/knowledge-base/knowledge-base-seed";
import { prisma } from "@/lib/prisma";
import {
  defaultUsageScopesForType,
  detectCategorySlugFromText,
  detectEntryTypeFromText,
  resolveCategorySlugFromName,
} from "@/features/knowledge-base/knowledge-base-import-auto-categorize";
import {
  buildPreviewRow,
  ensureUniqueSlug,
  findSimilarTitles,
  parseBoolean,
  parseEntryType,
  parsePriority,
  parseStatus,
  parseTags,
  parseUsageScope,
  slugFromTitle,
} from "@/features/knowledge-base/knowledge-base-import-validation";

type TransformContext = {
  categoryByName: Map<string, string>;
  categoryBySlug: Map<string, string>;
};

function setNestedField(target: Record<string, unknown>, path: string, value: string) {
  if (!value.trim()) return;
  const parts = path.split(".");
  if (parts.length === 1) {
    target[parts[0]] = value.trim();
    return;
  }
  const [root, ...rest] = parts;
  const nested = (target[root] as Record<string, unknown> | undefined) ?? {};
  let current = nested;
  for (let i = 0; i < rest.length - 1; i += 1) {
    const key = rest[i];
    current[key] = (current[key] as Record<string, unknown> | undefined) ?? {};
    current = current[key] as Record<string, unknown>;
  }
  const leaf = rest[rest.length - 1];
  if (/colors|sizes|usecases|services|questions|answers/i.test(leaf)) {
    current[leaf] = value.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  } else {
    current[leaf] = value.trim();
  }
  target[root] = nested;
}

export function mapRawRowsToCandidates(
  rawRows: Record<string, string>[],
  mapping: ColumnMapping,
  ctx: TransformContext
): ImportRowCandidate[] {
  return rawRows.map((raw, index) => {
    const mapped: Record<string, string> = {};
    for (const [sourceCol, kbField] of Object.entries(mapping)) {
      if (raw[sourceCol] != null) {
        mapped[kbField] = String(raw[sourceCol]);
      }
    }

    const title = mapped.title?.trim() ?? "";
    const summary = mapped.summary?.trim() || null;
    const content = mapped.content?.trim() || null;
    const textBlob = `${title} ${summary ?? ""} ${content ?? ""}`;

    let type = parseEntryType(mapped.type) ?? detectEntryTypeFromText(textBlob) ?? "COMPANY";

    let categoryId: string | null = null;
    let categoryName: string | null = mapped.category?.trim() || null;

    if (categoryName) {
      const slug = resolveCategorySlugFromName(categoryName);
      categoryId =
        ctx.categoryByName.get(categoryName.toLowerCase()) ??
        (slug ? ctx.categoryBySlug.get(slug) ?? null : null);
    }

    if (!categoryId) {
      const detectedSlug = detectCategorySlugFromText(textBlob);
      if (detectedSlug) {
        categoryId = ctx.categoryBySlug.get(detectedSlug) ?? null;
        if (!categoryName) {
          categoryName = detectedSlug;
        }
      }
    }

    const structuredData: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(mapped)) {
      if (field.startsWith("structuredData.")) {
        setNestedField(structuredData, field.replace("structuredData.", ""), value);
      }
    }

    const tags = parseTags(mapped.tags);
    let usageScope = parseUsageScope(mapped.usageScope);
    if (usageScope.length === 0) {
      usageScope = defaultUsageScopesForType(type);
    }

    return {
      rowNumber: index + 1,
      title,
      slug: mapped.slug?.trim() || (title ? slugFromTitle(title) : ""),
      summary,
      content,
      type,
      categoryId,
      categoryName,
      status: parseStatus(mapped.status),
      priority: parsePriority(mapped.priority),
      tags,
      usageScope,
      isVerified: parseBoolean(mapped.isVerified),
      structuredData: Object.keys(structuredData).length > 0 ? structuredData : null,
    };
  });
}

async function buildTransformContext(): Promise<TransformContext> {
  const categories = await listKnowledgeBaseCategories();
  const categoryByName = new Map<string, string>();
  const categoryBySlug = new Map<string, string>();
  for (const cat of categories) {
    categoryByName.set(cat.name.toLowerCase(), cat.id);
    categoryBySlug.set(cat.slug, cat.id);
  }
  return { categoryByName, categoryBySlug };
}

export async function previewKnowledgeBaseImport(input: {
  rawRows: Record<string, string>[];
  mapping: ColumnMapping;
}): Promise<ImportPreviewResult> {
  const ctx = await buildTransformContext();
  const candidates = mapRawRowsToCandidates(input.rawRows, input.mapping, ctx);

  const existing = await prisma.knowledgeBaseEntry.findMany({
    select: { id: true, title: true, slug: true },
  });
  const existingSlugs = new Map(existing.map((e) => [e.slug, e.id]));
  const existingTitles = new Set(existing.map((e) => e.title.trim().toLowerCase()));

  const similarTitles = new Map<string, string>();
  for (const candidate of candidates) {
    const matchId = findSimilarTitles(candidate.title, existing);
    if (matchId) {
      similarTitles.set(candidate.title.trim().toLowerCase(), matchId);
    }
  }

  const rows = candidates.map((candidate) =>
    buildPreviewRow(candidate, existingSlugs, existingTitles, similarTitles)
  );

  return {
    rows,
    summary: {
      total: rows.length,
      valid: rows.filter((r) => r.canImport).length,
      errors: rows.filter((r) => r.issues.some((i) => i.level === "error")).length,
      warnings: rows.filter((r) => r.issues.some((i) => i.level === "warning")).length,
      duplicates: rows.filter((r) => r.duplicateSlug || r.duplicateTitle || r.similarTitle).length,
    },
  };
}

export async function executeKnowledgeBaseImport(input: {
  rawRows: Record<string, string>[];
  mapping: ColumnMapping;
  duplicateBehavior: DuplicateBehavior;
  filename: string;
  createdBy?: string;
}): Promise<ImportExecuteResult> {
  const preview = await previewKnowledgeBaseImport({
    rawRows: input.rawRows,
    mapping: input.mapping,
  });

  const ctx = await buildTransformContext();
  const usedSlugs = new Set(
    (await prisma.knowledgeBaseEntry.findMany({ select: { slug: true } })).map((e) => e.slug)
  );

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of preview.rows) {
    if (!row.canImport && input.duplicateBehavior !== "update") {
      skipped += 1;
      errors.push(`Dòng ${row.rowNumber}: ${row.issues.map((i) => i.message).join("; ")}`);
      continue;
    }

    if ((row.duplicateSlug || row.duplicateTitle) && input.duplicateBehavior === "skip") {
      skipped += 1;
      continue;
    }

    let categoryId = row.categoryId;
    if (!categoryId && row.categoryName) {
      const slug = resolveCategorySlugFromName(row.categoryName);
      categoryId = slug ? await getCategoryIdBySlug(slug) : null;
    }
    if (!categoryId) {
      skipped += 1;
      errors.push(`Dòng ${row.rowNumber}: Không xác định được danh mục`);
      continue;
    }

    let slug = row.slug;
    if (input.duplicateBehavior === "copy" && (row.duplicateSlug || row.duplicateTitle)) {
      slug = ensureUniqueSlug(`${row.slug}-import`, usedSlugs);
    } else if (row.duplicateSlug && input.duplicateBehavior === "skip") {
      skipped += 1;
      continue;
    } else if (!usedSlugs.has(slug)) {
      usedSlugs.add(slug);
    }

    const payload: Prisma.KnowledgeBaseEntryUncheckedCreateInput = {
      title: row.title,
      slug,
      summary: row.summary,
      content: row.content,
      structuredData: (row.structuredData ?? undefined) as Prisma.InputJsonValue | undefined,
      categoryId,
      type: row.type,
      status: row.status,
      priority: row.priority,
      tags: row.tags,
      usageScope: row.usageScope,
      isVerified: row.isVerified,
      verifiedAt: row.isVerified ? new Date() : null,
    };

    try {
      if (input.duplicateBehavior === "update" && row.existingEntryId) {
        await updateKnowledgeBaseEntry(row.existingEntryId, payload);
        imported += 1;
      } else if (input.duplicateBehavior === "update" && row.duplicateSlug) {
        const existing = await prisma.knowledgeBaseEntry.findUnique({ where: { slug: row.slug } });
        if (existing) {
          await updateKnowledgeBaseEntry(existing.id, payload);
          imported += 1;
        } else {
          await createKnowledgeBaseEntry(payload);
          imported += 1;
        }
      } else {
        await createKnowledgeBaseEntry(payload);
        imported += 1;
      }
    } catch (error) {
      skipped += 1;
      errors.push(
        `Dòng ${row.rowNumber}: ${error instanceof Error ? error.message : "Import thất bại"}`
      );
    }
  }

  const job = await prisma.knowledgeBaseImportJob.create({
    data: {
      filename: input.filename,
      rows: preview.rows.length,
      imported,
      skipped,
      errors: errors.slice(0, 100),
      createdBy: input.createdBy ?? "admin",
    },
  });

  return { imported, skipped, errors, jobId: job.id };
}

export async function listKnowledgeBaseImportJobs(limit = 10) {
  const jobs = await prisma.knowledgeBaseImportJob.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return jobs.map((job) => ({
    id: job.id,
    filename: job.filename,
    rows: job.rows,
    imported: job.imported,
    skipped: job.skipped,
    errors: Array.isArray(job.errors) ? (job.errors as string[]) : [],
    createdBy: job.createdBy,
    createdAt: job.createdAt.toISOString(),
  }));
}

export async function bulkUpdateKnowledgeBaseEntries(input: {
  entryIds: string[];
  action: "verify" | "archive" | "delete" | "changeCategory" | "changeStatus" | "changePriority";
  categoryId?: string;
  status?: string;
  priority?: string;
}) {
  const { entryIds, action } = input;
  if (entryIds.length === 0) return { updated: 0 };

  if (action === "delete") {
    const result = await prisma.knowledgeBaseEntry.deleteMany({
      where: { id: { in: entryIds } },
    });
    return { updated: result.count };
  }

  if (action === "verify") {
    const result = await prisma.knowledgeBaseEntry.updateMany({
      where: { id: { in: entryIds } },
      data: { isVerified: true, verifiedAt: new Date() },
    });
    return { updated: result.count };
  }

  if (action === "archive") {
    const result = await prisma.knowledgeBaseEntry.updateMany({
      where: { id: { in: entryIds } },
      data: { status: "ARCHIVED" },
    });
    return { updated: result.count };
  }

  if (action === "changeCategory" && input.categoryId) {
    const result = await prisma.knowledgeBaseEntry.updateMany({
      where: { id: { in: entryIds } },
      data: { categoryId: input.categoryId },
    });
    return { updated: result.count };
  }

  if (action === "changeStatus" && input.status) {
    const result = await prisma.knowledgeBaseEntry.updateMany({
      where: { id: { in: entryIds } },
      data: { status: input.status as "DRAFT" | "ACTIVE" | "ARCHIVED" },
    });
    return { updated: result.count };
  }

  if (action === "changePriority" && input.priority) {
    const result = await prisma.knowledgeBaseEntry.updateMany({
      where: { id: { in: entryIds } },
      data: { priority: input.priority as "HIGH" | "MEDIUM" | "LOW" },
    });
    return { updated: result.count };
  }

  return { updated: 0 };
}
