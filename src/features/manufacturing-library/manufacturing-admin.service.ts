import type {
  ManufacturingAssetStatus,
  ManufacturingMediaRole,
  ManufacturingVisibility,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const MANUFACTURING_RELATION_TARGET_TYPES = [
  "PRODUCT",
  "PRODUCT_CATEGORY",
  "TECH_PACK",
  "PATTERN",
  "KNOWLEDGE_ARTICLE",
  "CASE_STUDY",
  "QUOTE",
  "RFQ",
  "FUTURE_MODULE",
] as const;

export type ManufacturingAssetAdminInput = {
  title: string;
  slug: string;
  description?: string | null;
  categoryId?: string | null;
  status: ManufacturingAssetStatus;
  visibility: ManufacturingVisibility;
  priority: number;
  featured: boolean;
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  aiSummary?: string | null;
  aiKeywords?: unknown;
  metadata?: unknown;
  media?: Array<{
    mediaAssetId: string;
    role: ManufacturingMediaRole;
    caption?: string | null;
    altText?: string | null;
    sortOrder?: number;
  }>;
  displayLocations?: Array<{
    displayLocationId: string;
    sortOrder?: number;
    metadata?: unknown;
  }>;
  tags?: Array<{ name: string; slug?: string; description?: string | null }>;
  relations?: Array<{
    targetType: string;
    targetId: string;
    role?: string | null;
    sortOrder?: number;
    metadata?: unknown;
  }>;
  workflows?: Array<{
    workflowId: string;
    role?: string | null;
    sortOrder?: number;
    metadata?: unknown;
  }>;
};

export type ManufacturingCategoryAdminInput = {
  parentId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  sortOrder: number;
  active: boolean;
};

export type ManufacturingDisplayLocationAdminInput = {
  key: string;
  name: string;
  description?: string | null;
  active: boolean;
  sortOrder: number;
};

export type ManufacturingWorkflowAdminInput = {
  name: string;
  slug: string;
  description?: string | null;
  active: boolean;
  sortOrder: number;
  metadata?: unknown;
  steps?: Array<{
    id?: string;
    assetId?: string | null;
    title: string;
    description?: string | null;
    stepKey?: string | null;
    sortOrder?: number;
    estimatedDuration?: string | null;
    metadata?: unknown;
  }>;
};

export class ManufacturingAdminValidationError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "ManufacturingAdminValidationError";
  }
}

const assetInclude = {
  category: true,
  media: {
    include: { mediaAsset: true },
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
  },
  displayLocations: {
    include: { displayLocation: true },
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
  },
  tags: { include: { tag: true } },
  relations: { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }] },
  workflows: {
    include: { workflow: true },
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
  },
} satisfies Prisma.ManufacturingAssetInclude;

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalCleanString(value: unknown): string | null {
  const cleaned = cleanString(value);
  return cleaned ? cleaned : null;
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function asNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asDate(value?: string | null): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ManufacturingAdminValidationError("Ngày xuất bản không hợp lệ");
  }
  return date;
}

function parseJsonLike(value: unknown, fieldName: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new ManufacturingAdminValidationError(`${fieldName} phải là JSON hợp lệ`);
  }
}

function tagsFromInput(input: ManufacturingAssetAdminInput["tags"]) {
  return (input ?? [])
    .map((tag) => {
      const name = cleanString(tag.name);
      const slug = normalizeSlug(tag.slug || name);
      return name && slug ? { name, slug, description: tag.description ?? null } : null;
    })
    .filter((tag): tag is { name: string; slug: string; description: string | null } =>
      Boolean(tag),
    );
}

export async function listManufacturingAssetsAdmin(filters: {
  search?: string;
  categoryId?: string;
  status?: ManufacturingAssetStatus | "";
  visibility?: ManufacturingVisibility | "";
  featured?: "true" | "false" | "";
  displayLocationId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const where: Prisma.ManufacturingAssetWhereInput = {
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { slug: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.visibility ? { visibility: filters.visibility } : {}),
    ...(filters.featured ? { featured: filters.featured === "true" } : {}),
    ...(filters.displayLocationId
      ? { displayLocations: { some: { displayLocationId: filters.displayLocationId } } }
      : {}),
  };

  const [total, assets] = await Promise.all([
    prisma.manufacturingAsset.count({ where }),
    prisma.manufacturingAsset.findMany({
      where,
      include: assetInclude,
      orderBy: [{ updatedAt: "desc" }, { priority: "asc" }, { publishedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, assets };
}

export async function getManufacturingAssetAdmin(id: string) {
  return prisma.manufacturingAsset.findUnique({ where: { id }, include: assetInclude });
}

async function assertForeignKeys(input: ManufacturingAssetAdminInput) {
  if (input.categoryId) {
    const category = await prisma.manufacturingCategory.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    if (!category) throw new ManufacturingAdminValidationError("Danh mục không hợp lệ");
  }

  const mediaIds = [...new Set((input.media ?? []).map((item) => item.mediaAssetId))].filter(Boolean);
  if (mediaIds.length > 0) {
    const count = await prisma.mediaAsset.count({ where: { id: { in: mediaIds } } });
    if (count !== mediaIds.length) throw new ManufacturingAdminValidationError("Media không hợp lệ");
  }

  const locationIds = [
    ...new Set((input.displayLocations ?? []).map((item) => item.displayLocationId)),
  ].filter(Boolean);
  if (locationIds.length > 0) {
    const count = await prisma.manufacturingDisplayLocation.count({
      where: { id: { in: locationIds } },
    });
    if (count !== locationIds.length) {
      throw new ManufacturingAdminValidationError("Vị trí hiển thị không hợp lệ");
    }
  }

  const workflowIds = [...new Set((input.workflows ?? []).map((item) => item.workflowId))].filter(Boolean);
  if (workflowIds.length > 0) {
    const count = await prisma.manufacturingWorkflowTemplate.count({
      where: { id: { in: workflowIds } },
    });
    if (count !== workflowIds.length) {
      throw new ManufacturingAdminValidationError("Quy trình không hợp lệ");
    }
  }
}

export async function saveManufacturingAssetAdmin(
  input: ManufacturingAssetAdminInput,
  id?: string,
) {
  const title = cleanString(input.title);
  const slug = normalizeSlug(input.slug);
  if (!title) throw new ManufacturingAdminValidationError("Tên tài sản là bắt buộc");
  if (!slug) throw new ManufacturingAdminValidationError("Slug là bắt buộc");
  await assertForeignKeys(input);

  const duplicate = await prisma.manufacturingAsset.findUnique({ where: { slug } });
  if (duplicate && duplicate.id !== id) {
    throw new ManufacturingAdminValidationError("Slug đã tồn tại");
  }

  const data = {
    title,
    slug,
    description: input.description ?? null,
    categoryId: input.categoryId || null,
    status: input.status,
    visibility: input.visibility,
    priority: asNumber(input.priority),
    featured: Boolean(input.featured),
    publishedAt: asDate(input.publishedAt),
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    aiSummary: input.aiSummary ?? null,
    aiKeywords: parseJsonLike(input.aiKeywords, "AI keywords") as Prisma.InputJsonValue,
    metadata: parseJsonLike(input.metadata, "Metadata") as Prisma.InputJsonValue,
  };

  return prisma.$transaction(async (tx) => {
    const asset = id
      ? await tx.manufacturingAsset.update({ where: { id }, data })
      : await tx.manufacturingAsset.create({ data });

    await Promise.all([
      tx.manufacturingMedia.deleteMany({ where: { assetId: asset.id } }),
      tx.manufacturingAssetDisplayLocation.deleteMany({ where: { assetId: asset.id } }),
      tx.manufacturingAssetTag.deleteMany({ where: { assetId: asset.id } }),
      tx.manufacturingRelation.deleteMany({ where: { assetId: asset.id } }),
      tx.manufacturingAssetWorkflow.deleteMany({ where: { assetId: asset.id } }),
    ]);

    if (input.media?.length) {
      await tx.manufacturingMedia.createMany({
        data: input.media
          .filter((item) => item.mediaAssetId)
          .map((item) => ({
            assetId: asset.id,
            mediaAssetId: item.mediaAssetId,
            role: item.role,
            caption: item.caption ?? null,
            altText: item.altText ?? null,
            sortOrder: asNumber(item.sortOrder),
            metadata: undefined,
          })),
      });
    }

    if (input.displayLocations?.length) {
      await tx.manufacturingAssetDisplayLocation.createMany({
        data: input.displayLocations
          .filter((item) => item.displayLocationId)
          .map((item) => ({
            assetId: asset.id,
            displayLocationId: item.displayLocationId,
            sortOrder: asNumber(item.sortOrder),
            metadata: parseJsonLike(item.metadata, "Metadata vị trí") as Prisma.InputJsonValue,
          })),
        skipDuplicates: true,
      });
    }

    for (const tag of tagsFromInput(input.tags)) {
      const upserted = await tx.manufacturingTag.upsert({
        where: { slug: tag.slug },
        update: { name: tag.name, description: tag.description },
        create: tag,
      });
      await tx.manufacturingAssetTag.create({
        data: { assetId: asset.id, tagId: upserted.id },
      });
    }

    if (input.relations?.length) {
      await tx.manufacturingRelation.createMany({
        data: input.relations
          .filter((item) => cleanString(item.targetType) && cleanString(item.targetId))
          .map((item) => ({
            assetId: asset.id,
            targetType: cleanString(item.targetType).toUpperCase(),
            targetId: cleanString(item.targetId),
            role: optionalCleanString(item.role),
            sortOrder: asNumber(item.sortOrder),
            metadata: parseJsonLike(item.metadata, "Metadata liên kết") as Prisma.InputJsonValue,
          })),
      });
    }

    if (input.workflows?.length) {
      await tx.manufacturingAssetWorkflow.createMany({
        data: input.workflows
          .filter((item) => item.workflowId)
          .map((item) => ({
            assetId: asset.id,
            workflowId: item.workflowId,
            role: optionalCleanString(item.role),
            sortOrder: asNumber(item.sortOrder),
            metadata: parseJsonLike(item.metadata, "Metadata quy trình") as Prisma.InputJsonValue,
          })),
        skipDuplicates: true,
      });
    }

    return tx.manufacturingAsset.findUnique({ where: { id: asset.id }, include: assetInclude });
  });
}

export async function archiveManufacturingAssetAdmin(id: string) {
  return prisma.manufacturingAsset.update({
    where: { id },
    data: { status: "ARCHIVED", publishedAt: null },
  });
}

export async function deleteManufacturingAssetAdmin(id: string) {
  return prisma.manufacturingAsset.delete({ where: { id } });
}

export async function listManufacturingLookupsAdmin(search?: string) {
  const mediaWhere: Prisma.MediaAssetWhereInput = search
    ? {
        OR: [
          { filename: { contains: search, mode: "insensitive" } },
          { title: { contains: search, mode: "insensitive" } },
          { url: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [categories, displayLocations, workflows, mediaAssets, products, productCategories] =
    await Promise.all([
      prisma.manufacturingCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      prisma.manufacturingDisplayLocation.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.manufacturingWorkflowTemplate.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.mediaAsset.findMany({
        where: mediaWhere,
        orderBy: [{ createdAt: "desc" }],
        take: 80,
      }),
      prisma.product.findMany({
        select: { id: true, name: true, slug: true, productCode: true },
        orderBy: [{ updatedAt: "desc" }],
        take: 80,
      }),
      prisma.category.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: 120,
      }),
    ]);

  return {
    categories,
    displayLocations,
    workflows,
    mediaAssets,
    products,
    productCategories,
    relationTargetTypes: MANUFACTURING_RELATION_TARGET_TYPES,
  };
}

export async function saveManufacturingCategoryAdmin(
  input: ManufacturingCategoryAdminInput,
  id?: string,
) {
  const name = cleanString(input.name);
  const slug = normalizeSlug(input.slug);
  if (!name || !slug) throw new ManufacturingAdminValidationError("Tên và slug là bắt buộc");
  if (input.parentId && input.parentId === id) {
    throw new ManufacturingAdminValidationError("Danh mục cha không hợp lệ");
  }
  return id
    ? prisma.manufacturingCategory.update({
        where: { id },
        data: { ...input, name, slug, parentId: input.parentId || null },
      })
    : prisma.manufacturingCategory.create({
        data: { ...input, name, slug, parentId: input.parentId || null },
      });
}

export async function deleteManufacturingCategoryAdmin(id: string) {
  const [assets, children] = await Promise.all([
    prisma.manufacturingAsset.count({ where: { categoryId: id } }),
    prisma.manufacturingCategory.count({ where: { parentId: id } }),
  ]);
  if (assets > 0 || children > 0) {
    return prisma.manufacturingCategory.update({ where: { id }, data: { active: false } });
  }
  return prisma.manufacturingCategory.delete({ where: { id } });
}

export async function saveManufacturingDisplayLocationAdmin(
  input: ManufacturingDisplayLocationAdminInput,
  id?: string,
) {
  const key = normalizeSlug(input.key);
  const name = cleanString(input.name);
  if (!key || !name) throw new ManufacturingAdminValidationError("Key và tên là bắt buộc");
  return id
    ? prisma.manufacturingDisplayLocation.update({ where: { id }, data: { ...input, key, name } })
    : prisma.manufacturingDisplayLocation.create({ data: { ...input, key, name } });
}

export async function deleteManufacturingDisplayLocationAdmin(id: string) {
  const assets = await prisma.manufacturingAssetDisplayLocation.count({
    where: { displayLocationId: id },
  });
  if (assets > 0) {
    return prisma.manufacturingDisplayLocation.update({ where: { id }, data: { active: false } });
  }
  return prisma.manufacturingDisplayLocation.delete({ where: { id } });
}

export async function saveManufacturingWorkflowAdmin(
  input: ManufacturingWorkflowAdminInput,
  id?: string,
) {
  const name = cleanString(input.name);
  const slug = normalizeSlug(input.slug);
  if (!name || !slug) throw new ManufacturingAdminValidationError("Tên và slug là bắt buộc");
  return prisma.$transaction(async (tx) => {
    const workflow = id
      ? await tx.manufacturingWorkflowTemplate.update({
          where: { id },
          data: {
            name,
            slug,
            description: input.description ?? null,
            active: input.active,
            sortOrder: asNumber(input.sortOrder),
            metadata: parseJsonLike(input.metadata, "Metadata") as Prisma.InputJsonValue,
          },
        })
      : await tx.manufacturingWorkflowTemplate.create({
          data: {
            name,
            slug,
            description: input.description ?? null,
            active: input.active,
            sortOrder: asNumber(input.sortOrder),
            metadata: parseJsonLike(input.metadata, "Metadata") as Prisma.InputJsonValue,
          },
        });

    await tx.manufacturingWorkflowStep.deleteMany({ where: { workflowId: workflow.id } });
    if (input.steps?.length) {
      await tx.manufacturingWorkflowStep.createMany({
        data: input.steps
          .filter((step) => cleanString(step.title))
          .map((step, index) => ({
            workflowId: workflow.id,
            assetId: step.assetId || null,
            title: cleanString(step.title),
            description: step.description ?? null,
            stepKey: optionalCleanString(step.stepKey),
            sortOrder: asNumber(step.sortOrder, (index + 1) * 10),
            estimatedDuration: step.estimatedDuration ?? null,
            metadata: parseJsonLike(step.metadata, "Metadata bước") as Prisma.InputJsonValue,
          })),
      });
    }

    return tx.manufacturingWorkflowTemplate.findUnique({
      where: { id: workflow.id },
      include: { steps: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    });
  });
}

export async function deleteManufacturingWorkflowAdmin(id: string) {
  const assets = await prisma.manufacturingAssetWorkflow.count({ where: { workflowId: id } });
  if (assets > 0) {
    return prisma.manufacturingWorkflowTemplate.update({ where: { id }, data: { active: false } });
  }
  return prisma.manufacturingWorkflowTemplate.delete({ where: { id } });
}
