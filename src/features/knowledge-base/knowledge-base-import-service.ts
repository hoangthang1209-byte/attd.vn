import type { Prisma } from "@prisma/client";
import type {
  ColumnMapping,
  DuplicateBehavior,
  ImportDefaultValues,
  ImportExecuteResult,
  ImportPreviewResult,
  ImportPreviewRow,
  ImportRowCandidate,
  KnowledgeBaseImportJobStatus,
} from "@/features/knowledge-base/knowledge-base-import-types";
import {
  findOrCreateCategoryByName,
  findOrCreateKnowledgeSource,
} from "@/features/knowledge-base/knowledge-base-source-utils";
import {
  createKnowledgeBaseEntry,
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
  copyTitle,
  ensureUniqueSlug,
  findSimilarTitles,
  slugFromTitle,
} from "@/features/knowledge-base/knowledge-base-import-validation";
import {
  getFileTypeFromName,
  mergeStructuredData,
  normalizeCategoryName,
  normalizePriority,
  normalizeStatus,
  normalizeType,
  parseBoolean,
  parseStructuredData,
  parseTags,
  parseUsageScope,
} from "@/features/knowledge-base/knowledge-base-import-utils";

type TransformContext = {
  categoryByName: Map<string, string>;
  categoryBySlug: Map<string, string>;
  defaultCategoryId: string | null;
};

type ImportExecutionContext = {
  autoCreateCategories: boolean;
  usedSlugs: Set<string>;
  categoryCache: Map<string, string>;
  createdCategoryCount: number;
  linkedSourceCount: number;
  createdSourceCount: number;
};

function stripSourceFromStructuredData(
  data: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!data) return null;
  const { source, sourceUrl, sourceType, sourceNote, sourceName, ...rest } = data;
  return Object.keys(rest).length > 0 ? rest : null;
}

function resolveSourceFields(row: ImportPreviewRow) {
  const fromRow = {
    name: row.sourceName?.trim() || null,
    url: row.sourceUrl?.trim() || null,
    type: row.sourceType?.trim() || null,
    note: row.sourceNote?.trim() || null,
  };
  if (fromRow.name) return fromRow;
  const data = row.structuredData ?? {};
  return {
    name: typeof data.source === "string" ? data.source.trim() : typeof data.sourceName === "string" ? data.sourceName.trim() : null,
    url: typeof data.sourceUrl === "string" ? data.sourceUrl.trim() : null,
    type: typeof data.sourceType === "string" ? data.sourceType.trim() : null,
    note: typeof data.sourceNote === "string" ? data.sourceNote.trim() : null,
  };
}

function setNestedField(target: Record<string, unknown>, path: string, value: string) {
  if (!value.trim()) return;
  const parts = path.split(".");
  if (parts.length === 1) {
    target[parts[0]] = value.trim();
    return;
  }
  const leaf = parts[parts.length - 1];
  if (/materials|printmethods|colors|sizes|usecases|services|questions|answers/i.test(leaf)) {
    target[leaf] = value.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  } else {
    target[leaf] = value.trim();
  }
}

export function mapRawRowsToCandidates(
  rawRows: Record<string, string>[],
  mapping: ColumnMapping,
  ctx: TransformContext,
  defaults: ImportDefaultValues = {}
): ImportRowCandidate[] {
  return rawRows.map((raw, index) => {
    const mapped: Record<string, string> = {};
    for (const [sourceCol, kbField] of Object.entries(mapping)) {
      if (raw[sourceCol] != null) mapped[kbField] = String(raw[sourceCol]);
    }

    const title = mapped.title?.trim() ?? "";
    const content = mapped.content?.trim() || null;
    const summary = mapped.summary?.trim() || null;
    const textBlob = `${title} ${summary ?? ""} ${content ?? ""}`;

    let type =
      normalizeType(mapped.type) ??
      defaults.type ??
      detectEntryTypeFromText(textBlob) ??
      "COMPANY";

    let categoryName = normalizeCategoryName(mapped.category);
    let categoryId: string | null = null;

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
        categoryName = categoryName ?? detectedSlug;
      }
    }

    if (!categoryId) {
      categoryId = ctx.defaultCategoryId;
    }

    let structuredData = parseStructuredData(mapped.structuredData);
    const nested: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(mapped)) {
      if (field.startsWith("structuredData.")) {
        setNestedField(nested, field.replace("structuredData.", ""), value);
      }
    }
    structuredData = mergeStructuredData(structuredData, nested);

    if (mapped.source?.trim()) {
      structuredData = mergeStructuredData(structuredData, { source: mapped.source.trim() });
    }
    if (mapped.sourceUrl?.trim()) {
      structuredData = mergeStructuredData(structuredData, { sourceUrl: mapped.sourceUrl.trim() });
    }
    if (mapped.sourceType?.trim()) {
      structuredData = mergeStructuredData(structuredData, { sourceType: mapped.sourceType.trim() });
    }
    if (mapped.sourceNote?.trim()) {
      structuredData = mergeStructuredData(structuredData, { sourceNote: mapped.sourceNote.trim() });
    }

    const sourceName = mapped.source?.trim() || null;
    const sourceUrl = mapped.sourceUrl?.trim() || null;
    const sourceType = mapped.sourceType?.trim() || null;
    const sourceNote = mapped.sourceNote?.trim() || null;

    const tags = parseTags(mapped.tags);
    let usageScope = parseUsageScope(mapped.usageScope);
    if (usageScope.length === 0) {
      usageScope = defaults.usageScope ?? defaultUsageScopesForType(type);
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
      status: mapped.status ? normalizeStatus(mapped.status) : (defaults.status ?? "DRAFT"),
      priority: mapped.priority ? normalizePriority(mapped.priority) : (defaults.priority ?? "MEDIUM"),
      tags,
      usageScope,
      isVerified: mapped.isVerified ? parseBoolean(mapped.isVerified) : (defaults.isVerified ?? false),
      structuredData: structuredData && Object.keys(structuredData).length > 0 ? structuredData : null,
      sourceName,
      sourceUrl,
      sourceType,
      sourceNote,
    };
  });
}

async function buildTransformContext(): Promise<TransformContext> {
  const categories = await listKnowledgeBaseCategories();
  const categoryByName = new Map<string, string>();
  const categoryBySlug = new Map<string, string>();
  for (const cat of categories) {
    categoryByName.set(cat.name.trim().toLowerCase(), cat.id);
    categoryBySlug.set(cat.slug, cat.id);
  }
  return {
    categoryByName,
    categoryBySlug,
    defaultCategoryId: categories[0]?.id ?? null,
  };
}

export async function previewKnowledgeBaseImport(input: {
  rawRows: Record<string, string>[];
  mapping: ColumnMapping;
  defaults?: ImportDefaultValues;
  duplicateBehavior?: DuplicateBehavior;
  autoCreateCategories?: boolean;
}): Promise<ImportPreviewResult> {
  const ctx = await buildTransformContext();
  const candidates = mapRawRowsToCandidates(input.rawRows, input.mapping, ctx, input.defaults ?? {});
  const autoCreateCategories = input.autoCreateCategories ?? false;

  const existing = await prisma.knowledgeBaseEntry.findMany({
    select: { id: true, title: true, slug: true, categoryId: true },
  });
  const existingSlugs = new Map(existing.map((e) => [e.slug, e.id]));
  const existingTitleCategory = new Set(
    existing.map((e) => `${e.title.trim().toLowerCase()}::${e.categoryId}`)
  );

  const similarTitles = new Map<string, string>();
  for (const candidate of candidates) {
    const matchId = findSimilarTitles(candidate.title, existing);
    if (matchId) similarTitles.set(candidate.title.trim().toLowerCase(), matchId);
  }

  const rows = candidates.map((candidate) =>
    buildPreviewRow(
      candidate,
      existingSlugs,
      existingTitleCategory,
      similarTitles,
      input.duplicateBehavior ?? "skip",
      autoCreateCategories
    )
  );

  return {
    rows,
    summary: {
      total: rows.length,
      valid: rows.filter((r) => r.canImport).length,
      invalid: rows.filter((r) => !r.canImport).length,
      warnings: rows.filter((r) => r.issues.some((i) => i.level === "warning")).length,
      duplicates: rows.filter((r) => r.duplicateSlug || r.duplicateTitle || r.strongDuplicate || r.similarTitle).length,
    },
  };
}

async function resolveCategoryId(
  row: ImportPreviewRow,
  execCtx: ImportExecutionContext
): Promise<string | null> {
  if (row.categoryId) return row.categoryId;
  if (!row.categoryName) return null;

  const normalized = normalizeCategoryName(row.categoryName);
  if (!normalized) return null;

  const cacheKey = normalized.toLowerCase();
  if (execCtx.categoryCache.has(cacheKey)) {
    return execCtx.categoryCache.get(cacheKey) ?? null;
  }

  const result = await findOrCreateCategoryByName(normalized, execCtx.autoCreateCategories);
  if (result.categoryId) {
    execCtx.categoryCache.set(cacheKey, result.categoryId);
    if (result.created) execCtx.createdCategoryCount += 1;
    return result.categoryId;
  }

  const slug = resolveCategorySlugFromName(normalized);
  if (slug && execCtx.categoryCache.has(slug)) {
    return execCtx.categoryCache.get(slug) ?? null;
  }

  return null;
}

async function processImportRow(
  row: ImportPreviewRow,
  strategy: DuplicateBehavior,
  execCtx: ImportExecutionContext
): Promise<"created" | "updated" | "skipped"> {
  if (!row.canImport) return "skipped";

  const isDuplicate = row.duplicateSlug || row.duplicateTitle || row.strongDuplicate || row.similarTitle;
  if (isDuplicate && strategy === "skip") return "skipped";

  const categoryId = await resolveCategoryId(row, execCtx);
  if (!categoryId) return "skipped";

  let title = row.title;
  let slug = row.slug || slugFromTitle(title);

  if (isDuplicate && strategy === "copy") {
    title = copyTitle(row.title);
    slug = ensureUniqueSlug(slugFromTitle(title), execCtx.usedSlugs);
  } else if (strategy === "copy" && execCtx.usedSlugs.has(slug)) {
    slug = ensureUniqueSlug(`${slug}-copy`, execCtx.usedSlugs);
  } else if (!execCtx.usedSlugs.has(slug)) {
    execCtx.usedSlugs.add(slug);
  }

  const sourceFields = resolveSourceFields(row);
  let sourceId: string | null = null;
  if (sourceFields.name) {
    const sourceResult = await findOrCreateKnowledgeSource({
      name: sourceFields.name,
      url: sourceFields.url,
      type: sourceFields.type ?? undefined,
      note: sourceFields.note,
    });
    sourceId = sourceResult.id;
    if (sourceResult.created) execCtx.createdSourceCount += 1;
    else execCtx.linkedSourceCount += 1;
  }

  const structuredData = sourceId
    ? stripSourceFromStructuredData(row.structuredData)
    : row.structuredData;

  const payload: Prisma.KnowledgeBaseEntryUncheckedCreateInput = {
    title,
    slug,
    summary: row.summary,
    content: row.content,
    structuredData: (structuredData ?? undefined) as Prisma.InputJsonValue | undefined,
    categoryId,
    type: row.type,
    status: row.status,
    priority: row.priority,
    tags: row.tags,
    usageScope: row.usageScope,
    isVerified: row.isVerified,
    verifiedAt: row.isVerified ? new Date() : null,
    sourceId,
  };

  if (isDuplicate && strategy === "update" && row.existingEntryId) {
    await updateKnowledgeBaseEntry(row.existingEntryId, payload);
    return "updated";
  }

  if (isDuplicate && strategy === "update" && row.duplicateSlug) {
    const existing = await prisma.knowledgeBaseEntry.findUnique({ where: { slug: row.slug } });
    if (existing) {
      await updateKnowledgeBaseEntry(existing.id, payload);
      return "updated";
    }
  }

  await createKnowledgeBaseEntry(payload);
  return "created";
}

export async function executeKnowledgeBaseImport(input: {
  rawRows: Record<string, string>[];
  mapping: ColumnMapping;
  defaults?: ImportDefaultValues;
  duplicateBehavior?: DuplicateBehavior;
  rowStrategies?: Record<number, DuplicateBehavior>;
  skipInvalid?: boolean;
  autoCreateCategories?: boolean;
  filename: string;
  createdBy?: string;
}): Promise<ImportExecuteResult> {
  const autoCreateCategories = input.autoCreateCategories ?? false;
  const preview = await previewKnowledgeBaseImport({
    rawRows: input.rawRows,
    mapping: input.mapping,
    defaults: input.defaults,
    duplicateBehavior: input.duplicateBehavior,
    autoCreateCategories,
  });

  const categories = await listKnowledgeBaseCategories();
  const categoryCache = new Map<string, string>();
  for (const cat of categories) {
    categoryCache.set(cat.name.trim().toLowerCase(), cat.id);
    categoryCache.set(cat.slug, cat.id);
  }

  const execCtx: ImportExecutionContext = {
    autoCreateCategories,
    usedSlugs: new Set(
      (await prisma.knowledgeBaseEntry.findMany({ select: { slug: true } })).map((e) => e.slug)
    ),
    categoryCache,
    createdCategoryCount: 0,
    linkedSourceCount: 0,
    createdSourceCount: 0,
  };

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let invalid = 0;
  let duplicates = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of preview.rows) {
    if (!row.canImport) {
      invalid += 1;
      if (!input.skipInvalid) {
        skipped += 1;
        errors.push(`Dòng ${row.rowNumber}: ${row.issues.filter((i) => i.level === "error").map((i) => i.message).join("; ")}`);
        continue;
      }
      skipped += 1;
      continue;
    }

    const isDuplicate = row.duplicateSlug || row.duplicateTitle || row.strongDuplicate || row.similarTitle;
    if (isDuplicate) duplicates += 1;

    const strategy =
      input.rowStrategies?.[row.rowNumber] ??
      row.duplicateStrategy ??
      input.duplicateBehavior ??
      "skip";

    try {
      const result = await processImportRow(row, strategy, execCtx);
      if (result === "created") created += 1;
      else if (result === "updated") updated += 1;
      else skipped += 1;
    } catch (error) {
      failed += 1;
      errors.push(`Dòng ${row.rowNumber}: ${error instanceof Error ? error.message : "Import thất bại"}`);
    }
  }

  const status: KnowledgeBaseImportJobStatus =
    failed > 0 && created + updated === 0
      ? "FAILED"
      : failed > 0 || invalid > 0
        ? "PARTIAL"
        : "COMPLETED";

  const job = await prisma.knowledgeBaseImportJob.create({
    data: {
      fileName: input.filename,
      fileType: getFileTypeFromName(input.filename),
      totalRows: preview.rows.length,
      validRows: preview.summary.valid,
      invalidRows: preview.summary.invalid,
      createdRows: created,
      updatedRows: updated,
      skippedRows: skipped,
      duplicateRows: duplicates,
      status,
      errorMessage: errors.length > 0 ? errors.slice(0, 3).join(" | ") : null,
      errors: errors.slice(0, 100),
      metadata: {
        mapping: input.mapping,
        defaults: input.defaults ?? {},
        duplicateBehavior: input.duplicateBehavior ?? "skip",
        autoCreateCategories,
        createdCategoryCount: execCtx.createdCategoryCount,
        linkedSourceCount: execCtx.linkedSourceCount,
        createdSourceCount: execCtx.createdSourceCount,
      },
      createdBy: input.createdBy ?? "admin",
    },
  });

  return {
    totalRows: preview.rows.length,
    created,
    updated,
    skipped,
    invalid,
    duplicates,
    failed,
    errors,
    jobId: job.id,
    status,
    createdCategoryCount: execCtx.createdCategoryCount,
    linkedSourceCount: execCtx.linkedSourceCount,
    createdSourceCount: execCtx.createdSourceCount,
  };
}

export async function listKnowledgeBaseImportJobs(limit = 20) {
  const jobs = await prisma.knowledgeBaseImportJob.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return jobs.map((job) => ({
    id: job.id,
    fileName: job.fileName,
    fileType: job.fileType,
    totalRows: job.totalRows,
    validRows: job.validRows,
    invalidRows: job.invalidRows,
    createdRows: job.createdRows,
    updatedRows: job.updatedRows,
    skippedRows: job.skippedRows,
    duplicateRows: job.duplicateRows,
    status: job.status,
    errorMessage: job.errorMessage,
    createdBy: job.createdBy,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    metadata: (job.metadata as Record<string, unknown> | null) ?? null,
  }));
}

export async function bulkUpdateKnowledgeBaseEntries(input: {
  entryIds: string[];
  action: string;
  categoryId?: string;
  status?: string;
  priority?: string;
  value?: string;
}) {
  const { entryIds } = input;
  if (entryIds.length === 0) return { updated: 0 };

  const normalized = input.action
    .replace("change_category", "changeCategory")
    .replace("change_status", "changeStatus")
    .replace("change_priority", "changePriority");

  const categoryId = input.categoryId ?? (normalized === "changeCategory" ? input.value : undefined);
  const status = input.status ?? (normalized === "changeStatus" ? input.value : undefined);
  const priority = input.priority ?? (normalized === "changePriority" ? input.value : undefined);

  if (normalized === "delete") {
    const result = await prisma.knowledgeBaseEntry.deleteMany({ where: { id: { in: entryIds } } });
    return { updated: result.count };
  }

  if (normalized === "verify") {
    const result = await prisma.knowledgeBaseEntry.updateMany({
      where: { id: { in: entryIds } },
      data: { isVerified: true, verifiedAt: new Date() },
    });
    return { updated: result.count };
  }

  if (normalized === "unverify") {
    const result = await prisma.knowledgeBaseEntry.updateMany({
      where: { id: { in: entryIds } },
      data: { isVerified: false, verifiedAt: null },
    });
    return { updated: result.count };
  }

  if (normalized === "archive") {
    const result = await prisma.knowledgeBaseEntry.updateMany({
      where: { id: { in: entryIds } },
      data: { status: "ARCHIVED" },
    });
    return { updated: result.count };
  }

  if (normalized === "changeCategory" && categoryId) {
    const result = await prisma.knowledgeBaseEntry.updateMany({
      where: { id: { in: entryIds } },
      data: { categoryId },
    });
    return { updated: result.count };
  }

  if (normalized === "changeStatus" && status) {
    const result = await prisma.knowledgeBaseEntry.updateMany({
      where: { id: { in: entryIds } },
      data: { status: status as "DRAFT" | "ACTIVE" | "ARCHIVED" },
    });
    return { updated: result.count };
  }

  if (normalized === "changePriority" && priority) {
    const result = await prisma.knowledgeBaseEntry.updateMany({
      where: { id: { in: entryIds } },
      data: { priority: priority as "HIGH" | "MEDIUM" | "LOW" },
    });
    return { updated: result.count };
  }

  return { updated: 0 };
}
