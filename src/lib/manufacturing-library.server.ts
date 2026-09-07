import "server-only";

import { unstable_cache } from "next/cache";
import { MANUFACTURING_SURFACE_DISPLAY_LOCATION } from "@/lib/manufacturing/manufacturing.constants";
import {
  getManufacturingAssetsForDisplayLocation,
  getManufacturingAssetsForTarget,
} from "@/lib/manufacturing/manufacturing.service";
import { getManufacturingEvidenceForSurface } from "@/lib/manufacturing-library.config";
import type {
  ManufacturingEvidenceItem,
  ManufacturingEvidenceSurface,
} from "@/lib/manufacturing-library.types";
import { withPrismaPoolRetry } from "@/lib/prisma-pool-retry";
import {
  PUBLIC_CACHE_REVALIDATE_SECONDS,
  PUBLIC_CACHE_TAGS,
} from "@/lib/public-cache-tags";

export async function getManufacturingEvidenceForSurfaceAsync(
  surface: ManufacturingEvidenceSurface,
  options?: {
    relatedProductTypes?: readonly string[];
    limit?: number;
    requireMedia?: boolean;
  },
): Promise<readonly ManufacturingEvidenceItem[]> {
  const dbItems = await getManufacturingAssetsForDisplayLocation({
    locationKey: MANUFACTURING_SURFACE_DISPLAY_LOCATION[surface],
    visibility: "PUBLIC",
    limit: options?.limit,
    requireMedia: options?.requireMedia,
  });

  if (dbItems.length > 0) return dbItems;
  return getManufacturingEvidenceForSurface(surface, options);
}

function dedupeEvidenceItems(
  items: readonly ManufacturingEvidenceItem[],
): ManufacturingEvidenceItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export async function getManufacturingEvidenceForProduct(input: {
  productId: string;
  categoryId?: string | null;
  limit?: number;
}): Promise<readonly ManufacturingEvidenceItem[]> {
  const limit = input.limit ?? 2;
  return unstable_cache(
    async () =>
      withPrismaPoolRetry(() =>
        loadManufacturingEvidenceForProductUncached(
          input.productId,
          input.categoryId ?? null,
          limit,
        ),
      ),
    ["public-pdp-manufacturing-evidence", input.productId, input.categoryId ?? "", String(limit)],
    {
      tags: [PUBLIC_CACHE_TAGS.products],
      revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
    },
  )();
}

async function loadManufacturingEvidenceForProductUncached(
  productId: string,
  categoryId: string | null,
  limit: number,
): Promise<readonly ManufacturingEvidenceItem[]> {
  const locationKey = MANUFACTURING_SURFACE_DISPLAY_LOCATION.pdp;
  const productItems = await getManufacturingAssetsForTarget({
    targetType: "PRODUCT",
    targetId: productId,
    locationKey,
    visibility: "PUBLIC",
    requireMedia: true,
    limit,
  });

  const categoryItems = categoryId
    ? await getManufacturingAssetsForTarget({
        targetType: "PRODUCT_CATEGORY",
        targetId: categoryId,
        locationKey,
        visibility: "PUBLIC",
        requireMedia: true,
        limit,
      })
    : [];

  const specificItems = dedupeEvidenceItems([...productItems, ...categoryItems]).slice(0, limit);
  if (specificItems.length > 0) return specificItems;

  return getManufacturingAssetsForDisplayLocation({
    locationKey,
    visibility: "PUBLIC",
    requireMedia: true,
    limit,
  });
}
