import { buildHomepageChildCategoryGrid } from "@/features/home/homepage-category.utils";
import {
  getPublicCmsCategoryTree,
  type CmsCategoryTreeNode,
} from "@/features/categories/services/category.service";
import { getProductsForPublicListing } from "@/features/products/services/product.service";
import { mapPublicProductCardSalesBadges } from "@/features/products/product-sales-badges";
import { mapProductCardAvailableColors } from "@/features/products/product-card-color-swatches";
import { getPublishedBlogPosts } from "@/features/blog/services/blog-public.service";
import { catalogCategoryHref } from "@/lib/marketplaceCategoryTree";
import { getPrimaryProductImageFromProduct, getProductCardHoverImageFromProduct } from "@/lib/productImages";
import { isValidImageSrc } from "@/lib/imagePaths";
import type {
  HomepageBlogPostItem,
  HomepageCategoryItem,
  HomepageCmsConfig,
  HomepageData,
  HomepageEditorialSectionsConfig,
  HomepageHeroConfig,
  HomepageOemBannerConfig,
  HomepageProofItemConfig,
  HomepageProductItem,
  HomepageSourcingPathwayConfig,
} from "@/features/home/homepage.types";
import {
  DEFAULT_OEM_BANNER,
  DEFAULT_PROOF_ITEMS,
  DEFAULT_SOURCING_PATHWAYS,
  getDefaultHomepageCmsConfig,
  mergeHeroWithDefaults,
  PATHWAY_SLOT_TO_FALLBACK,
} from "@/features/home/homepage-cms-defaults";
import {
  validateEditorialSectionsInput,
  validateHomepageHeroInput,
  validateOemBannerInput,
  validatePathwaysInput,
  validateProofItemsInput,
  type HomepageHeroInput,
} from "@/features/home/homepage-cms-validation";
import { prisma } from "@/lib/prisma";
import type { HomepagePathwaySlot, HomepageProofIcon } from "@prisma/client";

const HOMEPAGE_ID = "default";

const AVAILABILITY_LABELS = {
  IN_STOCK: "Còn hàng",
  LOW_STOCK: "Sắp hết",
  OUT_OF_STOCK: "Hết hàng",
} as const;

type PublicListingProduct = Awaited<
  ReturnType<typeof getProductsForPublicListing>
>["products"][number];

function resolveMediaImageUrl(asset: {
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
} | null | undefined): string | null {
  if (!asset) return null;
  const candidate = asset.thumbnailUrl ?? asset.url;
  if (!candidate || !isValidImageSrc(candidate)) return null;
  if (!asset.mimeType.startsWith("image/")) return null;
  return candidate;
}

function resolveImageAlt(
  explicit: string | null | undefined,
  fallbackTitle: string,
): string {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed;
  return `Minh họa ${fallbackTitle}`;
}

/** Admin-only: ensure child CMS rows exist before panel updates. */
async function ensureHomepageCmsSeededForAdmin() {
  await prisma.homepageSettings.upsert({
    where: { id: HOMEPAGE_ID },
    create: { id: HOMEPAGE_ID },
    update: {},
  });

  for (const item of DEFAULT_PROOF_ITEMS) {
    await prisma.homepageProofItem.upsert({
      where: {
        homepageSettingsId_itemKey: {
          homepageSettingsId: HOMEPAGE_ID,
          itemKey: item.itemKey,
        },
      },
      create: {
        id: `hp-proof-${item.itemKey}`,
        homepageSettingsId: HOMEPAGE_ID,
        itemKey: item.itemKey,
        title: item.title,
        supportingText: item.supportingText,
        iconKey: item.iconKey as HomepageProofIcon,
        enabled: item.enabled,
        sortOrder: item.sortOrder,
      },
      update: {},
    });
  }

  for (const pathway of DEFAULT_SOURCING_PATHWAYS) {
    await prisma.homepageSourcingPathway.upsert({
      where: {
        homepageSettingsId_slot: {
          homepageSettingsId: HOMEPAGE_ID,
          slot: pathway.slot as HomepagePathwaySlot,
        },
      },
      create: {
        id: `hp-path-${pathway.visualFallbackKey}`,
        homepageSettingsId: HOMEPAGE_ID,
        slot: pathway.slot as HomepagePathwaySlot,
        microLabel: pathway.microLabel,
        title: pathway.title,
        description: pathway.description,
        ctaLabel: pathway.ctaLabel,
        ctaUrl: pathway.ctaUrl,
        enabled: pathway.enabled,
        sortOrder: pathway.sortOrder,
      },
      update: {},
    });
  }
}

function mapProofItem(row: {
  itemKey: string;
  title: string;
  supportingText: string | null;
  iconKey: HomepageProofIcon;
  enabled: boolean;
  sortOrder: number;
}): HomepageProofItemConfig {
  return {
    itemKey: row.itemKey,
    title: row.title.trim() || DEFAULT_PROOF_ITEMS.find((d) => d.itemKey === row.itemKey)?.title || row.itemKey,
    supportingText: row.supportingText,
    iconKey: row.iconKey,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
  };
}

function mapPathway(row: {
  slot: HomepagePathwaySlot;
  microLabel: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  mediaAssetId: string | null;
  imageAlt: string | null;
  enabled: boolean;
  sortOrder: number;
  mediaAsset: { url: string; thumbnailUrl: string | null; mimeType: string; altText: string | null } | null;
}): HomepageSourcingPathwayConfig {
  const fallback = DEFAULT_SOURCING_PATHWAYS.find((d) => d.slot === row.slot);
  const imageUrl = resolveMediaImageUrl(row.mediaAsset);
  return {
    slot: row.slot,
    microLabel: row.microLabel.trim() || fallback?.microLabel || "",
    title: row.title.trim() || fallback?.title || "",
    description: row.description.trim() || fallback?.description || "",
    ctaLabel: row.ctaLabel.trim() || fallback?.ctaLabel || "",
    ctaUrl: row.ctaUrl.trim() || fallback?.ctaUrl || "/",
    mediaAssetId: row.mediaAssetId,
    imageUrl,
    imageAlt: imageUrl
      ? resolveImageAlt(row.imageAlt ?? row.mediaAsset?.altText, row.title)
      : null,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    visualFallbackKey: PATHWAY_SLOT_TO_FALLBACK[row.slot],
  };
}

function mapOemBanner(row: {
  oemEyebrow: string;
  oemHeading: string;
  oemDescription: string;
  oemCtaLabel: string;
  oemCtaUrl: string;
  oemMediaAssetId: string | null;
  oemImageAlt: string | null;
  oemEnabled: boolean;
  oemSectionOrder: number;
  oemMediaAsset: { url: string; thumbnailUrl: string | null; mimeType: string; altText: string | null } | null;
}): HomepageOemBannerConfig {
  const imageUrl = resolveMediaImageUrl(row.oemMediaAsset);
  return {
    eyebrow: row.oemEyebrow.trim() || DEFAULT_OEM_BANNER.eyebrow,
    heading: row.oemHeading.trim() || DEFAULT_OEM_BANNER.heading,
    description: row.oemDescription.trim() || DEFAULT_OEM_BANNER.description,
    ctaLabel: row.oemCtaLabel.trim() || DEFAULT_OEM_BANNER.ctaLabel,
    ctaUrl: row.oemCtaUrl.trim() || DEFAULT_OEM_BANNER.ctaUrl,
    mediaAssetId: row.oemMediaAssetId,
    imageUrl,
    imageAlt: imageUrl
      ? resolveImageAlt(row.oemImageAlt ?? row.oemMediaAsset?.altText, row.oemHeading)
      : null,
    enabled: row.oemEnabled,
    sectionOrder: row.oemSectionOrder,
  };
}

/** Load full homepage CMS configuration with safe defaults (read-only). */
export async function getHomepageCmsConfig(): Promise<HomepageCmsConfig> {
  try {
    const row = await prisma.homepageSettings.findUnique({
      where: { id: HOMEPAGE_ID },
      include: {
        proofItems: { orderBy: { sortOrder: "asc" } },
        sourcingPathways: {
          orderBy: { sortOrder: "asc" },
          include: {
            mediaAsset: {
              select: { url: true, thumbnailUrl: true, mimeType: true, altText: true },
            },
          },
        },
        oemMediaAsset: {
          select: { url: true, thumbnailUrl: true, mimeType: true, altText: true },
        },
      },
    });

    if (!row) {
      return getDefaultHomepageCmsConfig();
    }

    const proofItems =
      row.proofItems.length > 0
        ? row.proofItems.map(mapProofItem)
        : DEFAULT_PROOF_ITEMS;

    const pathwayItems =
      row.sourcingPathways.length > 0
        ? row.sourcingPathways.map(mapPathway)
        : DEFAULT_SOURCING_PATHWAYS;

    return {
      hero: mergeHeroWithDefaults({
        eyebrow: row.heroEyebrow,
        heading: row.heroHeading,
        description: row.heroDescription,
        primaryCtaLabel: row.heroPrimaryCtaLabel,
        primaryCtaUrl: row.heroPrimaryCtaUrl,
        secondaryCtaLabel: row.heroSecondaryCtaLabel,
        secondaryCtaUrl: row.heroSecondaryCtaUrl,
      }),
      proofStrip: {
        enabled: row.proofStripEnabled,
        order: row.proofStripOrder,
        items: proofItems,
      },
      sourcingPathways: {
        enabled: row.sourcingPathwaysEnabled,
        order: row.sourcingPathwaysOrder,
        items: pathwayItems.filter((p) => p.enabled).length
          ? pathwayItems
          : DEFAULT_SOURCING_PATHWAYS,
      },
      oemBanner: mapOemBanner(row),
    };
  } catch {
    return getDefaultHomepageCmsConfig();
  }
}

export async function getHomepageHeroConfig(): Promise<HomepageHeroConfig> {
  const cms = await getHomepageCmsConfig();
  return cms.hero;
}

export async function upsertHomepageHeroConfig(
  input: HomepageHeroInput,
): Promise<{ hero: HomepageHeroConfig } | { error: string }> {
  const validationError = validateHomepageHeroInput(input);
  if (validationError) return { error: validationError };

  await prisma.homepageSettings.upsert({
    where: { id: HOMEPAGE_ID },
    create: {
      id: HOMEPAGE_ID,
      heroEyebrow: input.eyebrow.trim(),
      heroHeading: input.heading.trim(),
      heroDescription: input.description.trim(),
      heroPrimaryCtaLabel: input.primaryCtaLabel.trim(),
      heroPrimaryCtaUrl: input.primaryCtaUrl.trim(),
      heroSecondaryCtaLabel: input.secondaryCtaLabel.trim(),
      heroSecondaryCtaUrl: input.secondaryCtaUrl.trim(),
    },
    update: {
      heroEyebrow: input.eyebrow.trim(),
      heroHeading: input.heading.trim(),
      heroDescription: input.description.trim(),
      heroPrimaryCtaLabel: input.primaryCtaLabel.trim(),
      heroPrimaryCtaUrl: input.primaryCtaUrl.trim(),
      heroSecondaryCtaLabel: input.secondaryCtaLabel.trim(),
      heroSecondaryCtaUrl: input.secondaryCtaUrl.trim(),
    },
  });

  const hero = await getHomepageHeroConfig();
  return { hero };
}

export async function upsertHomepageProofConfig(
  items: HomepageProofItemConfig[],
): Promise<{ proofStrip: HomepageCmsConfig["proofStrip"] } | { error: string }> {
  const validationError = validateProofItemsInput(items);
  if (validationError) return { error: validationError };

  await ensureHomepageCmsSeededForAdmin();

  await prisma.$transaction(
    items.map((item) =>
      prisma.homepageProofItem.update({
        where: {
          homepageSettingsId_itemKey: {
            homepageSettingsId: HOMEPAGE_ID,
            itemKey: item.itemKey,
          },
        },
        data: {
          title: item.title.trim(),
          supportingText: item.supportingText?.trim() || null,
          iconKey: item.iconKey as HomepageProofIcon,
          enabled: item.enabled,
          sortOrder: item.sortOrder,
        },
      }),
    ),
  );

  const cms = await getHomepageCmsConfig();
  return { proofStrip: cms.proofStrip };
}

export async function upsertHomepagePathwaysConfig(
  items: HomepageSourcingPathwayConfig[],
): Promise<{ sourcingPathways: HomepageCmsConfig["sourcingPathways"] } | { error: string }> {
  const validationError = validatePathwaysInput(items);
  if (validationError) return { error: validationError };

  await ensureHomepageCmsSeededForAdmin();

  await prisma.$transaction(
    items.map((item) =>
      prisma.homepageSourcingPathway.update({
        where: {
          homepageSettingsId_slot: {
            homepageSettingsId: HOMEPAGE_ID,
            slot: item.slot as HomepagePathwaySlot,
          },
        },
        data: {
          microLabel: item.microLabel.trim(),
          title: item.title.trim(),
          description: item.description.trim(),
          ctaLabel: item.ctaLabel.trim(),
          ctaUrl: item.ctaUrl.trim(),
          mediaAssetId: item.mediaAssetId || null,
          imageAlt: item.imageAlt?.trim() || null,
          enabled: item.enabled,
          sortOrder: item.sortOrder,
        },
      }),
    ),
  );

  const cms = await getHomepageCmsConfig();
  return { sourcingPathways: cms.sourcingPathways };
}

export async function upsertHomepageOemConfig(
  input: HomepageOemBannerConfig,
): Promise<{ oemBanner: HomepageOemBannerConfig } | { error: string }> {
  const validationError = validateOemBannerInput(input);
  if (validationError) return { error: validationError };

  await prisma.homepageSettings.upsert({
    where: { id: HOMEPAGE_ID },
    create: {
      id: HOMEPAGE_ID,
      oemEyebrow: input.eyebrow.trim(),
      oemHeading: input.heading.trim(),
      oemDescription: input.description.trim(),
      oemCtaLabel: input.ctaLabel.trim(),
      oemCtaUrl: input.ctaUrl.trim(),
      oemMediaAssetId: input.mediaAssetId || null,
      oemImageAlt: input.imageAlt?.trim() || null,
      oemEnabled: input.enabled,
      oemSectionOrder: input.sectionOrder,
    },
    update: {
      oemEyebrow: input.eyebrow.trim(),
      oemHeading: input.heading.trim(),
      oemDescription: input.description.trim(),
      oemCtaLabel: input.ctaLabel.trim(),
      oemCtaUrl: input.ctaUrl.trim(),
      oemMediaAssetId: input.mediaAssetId || null,
      oemImageAlt: input.imageAlt?.trim() || null,
      oemEnabled: input.enabled,
      oemSectionOrder: input.sectionOrder,
    },
  });

  const cms = await getHomepageCmsConfig();
  return { oemBanner: cms.oemBanner };
}

export async function upsertHomepageSectionsConfig(
  input: HomepageEditorialSectionsConfig & { oemSectionOrder: number },
): Promise<{ sections: HomepageEditorialSectionsConfig & { oemSectionOrder: number } } | { error: string }> {
  const validationError = validateEditorialSectionsInput(input);
  if (validationError) return { error: validationError };

  await prisma.homepageSettings.upsert({
    where: { id: HOMEPAGE_ID },
    create: {
      id: HOMEPAGE_ID,
      proofStripEnabled: input.proofStripEnabled,
      proofStripOrder: input.proofStripOrder,
      sourcingPathwaysEnabled: input.sourcingPathwaysEnabled,
      sourcingPathwaysOrder: input.sourcingPathwaysOrder,
      oemSectionOrder: input.oemSectionOrder,
    },
    update: {
      proofStripEnabled: input.proofStripEnabled,
      proofStripOrder: input.proofStripOrder,
      sourcingPathwaysEnabled: input.sourcingPathwaysEnabled,
      sourcingPathwaysOrder: input.sourcingPathwaysOrder,
      oemSectionOrder: input.oemSectionOrder,
    },
  });

  return {
    sections: {
      proofStripEnabled: input.proofStripEnabled,
      proofStripOrder: input.proofStripOrder,
      sourcingPathwaysEnabled: input.sourcingPathwaysEnabled,
      sourcingPathwaysOrder: input.sourcingPathwaysOrder,
      oemSectionOrder: input.oemSectionOrder,
    },
  };
}

function resolveCategoryImageUrl(parent: CmsCategoryTreeNode): string | null {
  if (parent.imageUrl && isValidImageSrc(parent.imageUrl)) return parent.imageUrl;
  if (parent.featuredImage && isValidImageSrc(parent.featuredImage)) return parent.featuredImage;
  return null;
}

function mapParentCategory(parent: CmsCategoryTreeNode): HomepageCategoryItem | null {
  if (parent.productCount <= 0 || parent.isActive === false) return null;
  return {
    id: parent.id,
    name: parent.name,
    slug: parent.slug,
    href: catalogCategoryHref(parent.slug),
    imageUrl: resolveCategoryImageUrl(parent),
    productCount: parent.productCount,
  };
}

function deriveAvailabilityLabel(variants: PublicListingProduct["variants"]): string | null {
  if (variants.length === 0) return null;
  const statuses = variants.map((variant) => variant.stockStatus);
  if (statuses.includes("IN_STOCK")) return AVAILABILITY_LABELS.IN_STOCK;
  if (statuses.includes("LOW_STOCK")) return AVAILABILITY_LABELS.LOW_STOCK;
  if (statuses.includes("OUT_OF_STOCK")) return AVAILABILITY_LABELS.OUT_OF_STOCK;
  return null;
}

function mapProduct(product: PublicListingProduct): HomepageProductItem {
  const primaryImage = getPrimaryProductImageFromProduct(product);
  const hoverImage = getProductCardHoverImageFromProduct(product);
  const imageAlt = product.images[0]?.altText?.trim() || product.name;
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    href: `/san-pham/${product.slug}`,
    categoryName: product.category?.name ?? null,
    categorySlug: product.category?.slug ?? null,
    imageUrl: primaryImage && isValidImageSrc(primaryImage) ? primaryImage : null,
    hoverImageUrl: hoverImage && isValidImageSrc(hoverImage) ? hoverImage : null,
    imageAlt,
    minimumOrderQuantity: product.defaultMoq ?? null,
    productionLeadTime: product.leadTime ?? null,
    availabilityLabel: deriveAvailabilityLabel(product.variants),
    salesBadges: mapPublicProductCardSalesBadges(product),
    availableColors: mapProductCardAvailableColors(product),
  };
}

function mapBlogPost(post: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  publishedAt: Date | null;
}): HomepageBlogPostItem {
  const imageUrl =
    post.featuredImageUrl && isValidImageSrc(post.featuredImageUrl)
      ? post.featuredImageUrl
      : null;
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    href: `/blog/${post.slug}`,
    excerpt: post.excerpt,
    imageUrl,
    publishedAt: post.publishedAt?.toISOString() ?? null,
  };
}

/** Single CMS-backed data loader for the public homepage. */
export async function getHomepageData(): Promise<HomepageData> {
  const [{ products }, categoryTree, { posts: blogPostsRaw }, cms] =
    await Promise.all([
      getProductsForPublicListing({ page: 1, perPage: 12 }),
      getPublicCmsCategoryTree(),
      getPublishedBlogPosts(1, 3),
      getHomepageCmsConfig(),
    ]);

  const categories = categoryTree
    .map(mapParentCategory)
    .filter((category): category is HomepageCategoryItem => category != null);

  const childGrid = buildHomepageChildCategoryGrid(categoryTree);

  return {
    hero: cms.hero,
    cms,
    categories,
    gridChildCategories: childGrid.items,
    gridChildCategoryTotal: childGrid.totalVisible,
    showGridCategoryViewAllCta: childGrid.showViewAllCta,
    latestProducts: products.map(mapProduct),
    blogPosts: blogPostsRaw.map(mapBlogPost),
  };
}

export type EditorialSectionKey = "proof" | "pathways";

export function getPreCategoryEditorialSections(cms: HomepageCmsConfig): EditorialSectionKey[] {
  const candidates: Array<{ key: EditorialSectionKey; enabled: boolean; order: number }> = [
    { key: "proof", enabled: cms.proofStrip.enabled, order: cms.proofStrip.order },
    {
      key: "pathways",
      enabled: cms.sourcingPathways.enabled,
      order: cms.sourcingPathways.order,
    },
  ];

  return candidates
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order || (a.key === "proof" ? -1 : 1))
    .map((section) => section.key);
}
