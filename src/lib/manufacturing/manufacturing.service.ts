import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  manufacturingFrontendAssetHasMedia,
  mapManufacturingAssetToFrontend,
  type ManufacturingAssetWithFrontendRelations,
} from "@/lib/manufacturing/manufacturing.mapper";
import type {
  GetManufacturingAssetsForDisplayLocationInput,
  GetManufacturingAssetsForTargetInput,
  ManufacturingCategorySummary,
  ManufacturingDisplayLocationSummary,
  ManufacturingFrontendAsset,
  ManufacturingWorkflowFrontend,
} from "@/lib/manufacturing/manufacturing.types";

const manufacturingAssetInclude = {
  category: { select: { slug: true, name: true } },
  media: {
    include: {
      mediaAsset: {
        select: {
          url: true,
          mimeType: true,
          altText: true,
          title: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
  tags: {
    include: {
      tag: { select: { name: true, slug: true } },
    },
  },
} satisfies Prisma.ManufacturingAssetInclude;

function logManufacturingServiceError(functionName: string, error: unknown): void {
  console.error(`[manufacturing.service] ${functionName} failed:`, error);
}

function sortFrontendRows<
  T extends {
    sortOrder: number;
    asset: { priority: number; publishedAt: Date | null; updatedAt?: Date | null };
  },
>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const displayDiff = a.sortOrder - b.sortOrder;
    if (displayDiff !== 0) return displayDiff;

    const priorityDiff = a.asset.priority - b.asset.priority;
    if (priorityDiff !== 0) return priorityDiff;

    const aPublished = a.asset.publishedAt?.getTime() ?? 0;
    const bPublished = b.asset.publishedAt?.getTime() ?? 0;
    const publishedDiff = bPublished - aPublished;
    if (publishedDiff !== 0) return publishedDiff;

    const aUpdated = a.asset.updatedAt?.getTime() ?? 0;
    const bUpdated = b.asset.updatedAt?.getTime() ?? 0;
    return bUpdated - aUpdated;
  });
}

function dedupeFrontendAssets(
  assets: ManufacturingFrontendAsset[],
): ManufacturingFrontendAsset[] {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    if (seen.has(asset.id)) return false;
    seen.add(asset.id);
    return true;
  });
}

function applyAssetOutputFilters(
  assets: ManufacturingFrontendAsset[],
  input: { requireMedia?: boolean; limit?: number },
): ManufacturingFrontendAsset[] {
  const deduped = dedupeFrontendAssets(assets);
  const filtered = input.requireMedia
    ? deduped.filter(manufacturingFrontendAssetHasMedia)
    : deduped;
  return typeof input.limit === "number" ? filtered.slice(0, input.limit) : filtered;
}

export async function getManufacturingAssetsForDisplayLocation(
  input: GetManufacturingAssetsForDisplayLocationInput,
): Promise<ManufacturingFrontendAsset[]> {
  try {
    const rows = await prisma.manufacturingAssetDisplayLocation.findMany({
      where: {
        displayLocation: {
          key: input.locationKey,
          active: true,
        },
        asset: {
          status: "PUBLISHED",
          ...(input.visibility ? { visibility: input.visibility } : {}),
        },
      },
      include: {
        asset: { include: manufacturingAssetInclude },
      },
    });

    const assets = sortFrontendRows(rows).map(({ asset }) =>
      mapManufacturingAssetToFrontend(asset as ManufacturingAssetWithFrontendRelations),
    );
    return applyAssetOutputFilters(assets, input);
  } catch (error) {
    logManufacturingServiceError("getManufacturingAssetsForDisplayLocation", error);
    return [];
  }
}

export async function getManufacturingAssetsForTarget(
  input: GetManufacturingAssetsForTargetInput,
): Promise<ManufacturingFrontendAsset[]> {
  try {
    const rows = await prisma.manufacturingRelation.findMany({
      where: {
        targetType: input.targetType,
        targetId: input.targetId,
        asset: {
          status: "PUBLISHED",
          ...(input.visibility ? { visibility: input.visibility } : {}),
          ...(input.locationKey
            ? {
                displayLocations: {
                  some: {
                    displayLocation: {
                      key: input.locationKey,
                      active: true,
                    },
                  },
                },
              }
            : {}),
        },
      },
      include: {
        asset: { include: manufacturingAssetInclude },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const assets = rows
      .sort((a, b) => {
        const relationDiff = a.sortOrder - b.sortOrder;
        if (relationDiff !== 0) return relationDiff;
        const priorityDiff = a.asset.priority - b.asset.priority;
        if (priorityDiff !== 0) return priorityDiff;
        const publishedDiff =
          (b.asset.publishedAt?.getTime() ?? 0) - (a.asset.publishedAt?.getTime() ?? 0);
        if (publishedDiff !== 0) return publishedDiff;
        return (b.asset.updatedAt?.getTime() ?? 0) - (a.asset.updatedAt?.getTime() ?? 0);
      })
      .map(({ asset }) =>
        mapManufacturingAssetToFrontend(asset as ManufacturingAssetWithFrontendRelations),
      );

    return applyAssetOutputFilters(assets, input);
  } catch (error) {
    logManufacturingServiceError("getManufacturingAssetsForTarget", error);
    return [];
  }
}

export async function getManufacturingWorkflowBySlug(
  slug: string,
): Promise<ManufacturingWorkflowFrontend | null> {
  try {
    const workflow = await prisma.manufacturingWorkflowTemplate.findFirst({
      where: { slug, active: true },
      include: {
        steps: {
          include: {
            asset: { include: manufacturingAssetInclude },
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!workflow) return null;

    return {
      id: workflow.id,
      name: workflow.name,
      slug: workflow.slug,
      description: workflow.description ?? undefined,
      steps: workflow.steps.map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description ?? undefined,
        stepKey: step.stepKey ?? undefined,
        sortOrder: step.sortOrder,
        estimatedDuration: step.estimatedDuration ?? undefined,
        asset: step.asset
          ? mapManufacturingAssetToFrontend(
              step.asset as ManufacturingAssetWithFrontendRelations,
            )
          : undefined,
      })),
    };
  } catch (error) {
    logManufacturingServiceError("getManufacturingWorkflowBySlug", error);
    return null;
  }
}

export async function getManufacturingCategories(): Promise<ManufacturingCategorySummary[]> {
  try {
    const categories = await prisma.manufacturingCategory.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return categories.map((category) => ({
      id: category.id,
      parentId: category.parentId ?? undefined,
      name: category.name,
      slug: category.slug,
      description: category.description ?? undefined,
      icon: category.icon ?? undefined,
      sortOrder: category.sortOrder,
    }));
  } catch (error) {
    logManufacturingServiceError("getManufacturingCategories", error);
    return [];
  }
}

export async function getManufacturingDisplayLocations(): Promise<
  ManufacturingDisplayLocationSummary[]
> {
  try {
    const locations = await prisma.manufacturingDisplayLocation.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return locations.map((location) => ({
      id: location.id,
      key: location.key,
      name: location.name,
      description: location.description ?? undefined,
      sortOrder: location.sortOrder,
    }));
  } catch (error) {
    logManufacturingServiceError("getManufacturingDisplayLocations", error);
    return [];
  }
}
