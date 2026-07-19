import type { Prisma, ProductStatus } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";

/** Canonical statuses that must never appear on public web surfaces. */
export const NON_PUBLIC_PRODUCT_STATUSES: ProductStatus[] = [
  "DRAFT",
  "INACTIVE",
  "ARCHIVED",
];

/**
 * Shared public catalog visibility rules.
 * A product is public only when ACTIVE, has a usable slug, belongs to an active
 * category, and is not marked demo/sample in metadata.
 *
 * Important: null/missing metadata must remain public. Prisma JSON path `NOT`
 * filters exclude DbNull rows, so we explicitly allow null metadata.
 */
export function buildPublicProductVisibilityWhere(
  extra: Prisma.ProductWhereInput = {},
): Prisma.ProductWhereInput {
  return {
    status: "ACTIVE",
    slug: { not: "" },
    category: { isActive: true },
    AND: [
      {
        OR: [
          { metadata: { equals: PrismaNamespace.DbNull } },
          {
            AND: [
              { metadata: { not: PrismaNamespace.JsonNull } },
              { metadata: { not: PrismaNamespace.DbNull } },
              {
                NOT: {
                  OR: [
                    { metadata: { path: ["isDemo"], equals: true } },
                    { metadata: { path: ["sampleData"], equals: true } },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
    ...extra,
  };
}

export function isPublicProductStatus(status: ProductStatus | string | null | undefined): boolean {
  return status === "ACTIVE";
}

export function shouldHideProductFromPublic(input: {
  status: ProductStatus | string | null | undefined;
  slug?: string | null;
  categoryIsActive?: boolean | null;
  metadata?: unknown;
}): boolean {
  if (!isPublicProductStatus(input.status)) return true;
  if (!input.slug?.trim()) return true;
  if (input.categoryIsActive === false) return true;
  if (isDemoOrSampleProductMetadata(input.metadata)) return true;
  return false;
}

export function isDemoOrSampleProductMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const record = metadata as Record<string, unknown>;
  return record.isDemo === true || record.sampleData === true;
}

export function planBulkPublicRevalidationPaths(input: {
  slugs: string[];
  categorySlugs?: string[];
  affectsHomepage?: boolean;
}): string[] {
  const paths = new Set<string>(["/san-pham", "/sitemap.xml"]);
  for (const slug of input.slugs) {
    const trimmed = slug.trim();
    if (trimmed) paths.add(`/san-pham/${trimmed}`);
  }
  for (const categorySlug of input.categorySlugs ?? []) {
    const trimmed = categorySlug.trim();
    if (!trimmed) continue;
    paths.add(`/san-pham?category=${trimmed}`);
    paths.add(`/${trimmed}`);
  }
  if (input.affectsHomepage) paths.add("/");
  return Array.from(paths);
}
