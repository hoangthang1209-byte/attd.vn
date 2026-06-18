/**
 * Demo content seeder service — Patch 24.9.3c
 * Idempotent: running multiple times will not create duplicate records.
 * Demo records are identified via metadata.isDemo = true or naming patterns.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEMO_KEY,
  DEMO_CATEGORIES,
  DEMO_PRODUCTS,
  DEMO_BLOG_CATEGORIES,
  DEMO_BLOG_POSTS,
  DEMO_LANDING_PAGES,
  DEMO_KB_CATEGORIES,
  DEMO_KB_ENTRIES,
  DEMO_CLIENT_LOGOS,
  DEMO_CASE_STUDIES,
} from "./demo-content-data";

const DEMO_META: Prisma.InputJsonValue = { isDemo: true, demoKey: DEMO_KEY };

export type SeedGroupResult = {
  created: number;
  updated: number;
  skipped: number;
  total: number;
};

export type SeedResult = {
  categories: SeedGroupResult;
  products: SeedGroupResult;
  variants: SeedGroupResult;
  blogCategories: SeedGroupResult;
  blogPosts: SeedGroupResult;
  landingPages: SeedGroupResult;
  kbCategories: SeedGroupResult;
  kbEntries: SeedGroupResult;
  clientLogos: SeedGroupResult;
  caseStudies: SeedGroupResult;
};

const zero = (): SeedGroupResult => ({ created: 0, updated: 0, skipped: 0, total: 0 });

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SlugResult = { action: "created" | "updated" | "skipped"; id: string };

async function upsertBySlug<T extends { id: string; metadata: Prisma.JsonValue | null }>(
  model: {
    findUnique: (a: { where: { slug: string } }) => Promise<T | null>;
    create: (a: { data: Prisma.InputJsonValue }) => Promise<T>;
    update: (a: { where: { id: string }; data: Prisma.InputJsonValue }) => Promise<T>;
  },
  slug: string,
  createData: Record<string, unknown>,
  updateData: Record<string, unknown>,
): Promise<SlugResult> {
  const existing = await model.findUnique({ where: { slug } }) as (T & { metadata?: Prisma.JsonValue | null }) | null;
  if (!existing) {
    const rec = await model.create({ data: createData as Prisma.InputJsonValue });
    return { action: "created", id: (rec as { id: string }).id };
  }
  const meta = existing.metadata as { isDemo?: boolean } | null;
  if (meta?.isDemo === true) {
    await model.update({ where: { id: existing.id }, data: updateData as Prisma.InputJsonValue });
    return { action: "updated", id: existing.id };
  }
  return { action: "skipped", id: existing.id };
}

function tally(r: SeedGroupResult, action: "created" | "updated" | "skipped") {
  r[action]++;
  r.total++;
}

// ─── Seed categories ──────────────────────────────────────────────────────────

async function seedCategories(): Promise<{ result: SeedGroupResult; idMap: Record<string, string> }> {
  const result = zero();
  const idMap: Record<string, string> = {};

  for (const cat of DEMO_CATEGORIES) {
    const existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
    if (!existing) {
      const created = await prisma.category.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          skuCode: cat.skuCode,
          description: cat.description,
          sortOrder: cat.sortOrder,
        },
      });
      idMap[cat.slug] = created.id;
      tally(result, "created");
    } else {
      idMap[cat.slug] = existing.id;
      tally(result, "skipped");
    }
  }
  return { result, idMap };
}

// ─── Seed products + variants ─────────────────────────────────────────────────

async function seedProducts(
  categoryIdMap: Record<string, string>,
): Promise<{ products: SeedGroupResult; variants: SeedGroupResult }> {
  const products = zero();
  const variants = zero();

  for (const p of DEMO_PRODUCTS) {
    const categoryId = categoryIdMap[p.categorySlug];
    if (!categoryId) continue;

    // Product upsert
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });

    let productId: string;

    if (!existing) {
      const slugBase = p.slug;
      const created = await prisma.product.create({
        data: {
          name: p.name,
          slug: slugBase,
          productCode: p.productCode,
          categoryId,
          shortDescription: p.shortDescription,
          description: p.description,
          material: p.material,
          form: p.form ?? null,
          fit: p.fit ?? null,
          defaultMoq: p.defaultMoq,
          leadTime: p.leadTime,
          supportsPrinting: p.supportsPrinting,
          supportsEmbroidery: p.supportsEmbroidery,
          supportsOem: p.supportsOem,
          useCases: p.useCases,
          targetCustomers: p.targetCustomers,
          tags: p.tags,
          featuredImage: p.featuredImage,
          gallery: p.gallery,
          status: "ACTIVE",
          metadata: DEMO_META,
        },
      });
      productId = created.id;
      tally(products, "created");
    } else {
      const meta = (existing.metadata as { isDemo?: boolean } | null);
      if (meta?.isDemo === true) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            name: p.name,
            shortDescription: p.shortDescription,
            description: p.description,
            material: p.material,
            form: p.form ?? null,
            fit: p.fit ?? null,
            defaultMoq: p.defaultMoq,
            leadTime: p.leadTime,
            supportsPrinting: p.supportsPrinting,
            supportsEmbroidery: p.supportsEmbroidery,
            supportsOem: p.supportsOem,
            useCases: p.useCases,
            targetCustomers: p.targetCustomers,
            tags: p.tags,
            featuredImage: p.featuredImage,
            gallery: p.gallery,
            status: "ACTIVE",
          },
        });
        tally(products, "updated");
      } else {
        tally(products, "skipped");
      }
      productId = existing.id;
    }

    // Variants
    for (const v of p.variants) {
      const existingVariant = await prisma.productVariant.findUnique({ where: { sku: v.sku } });

      if (!existingVariant) {
        await prisma.productVariant.create({
          data: {
            productId,
            sku: v.sku,
            colorName: v.colorName ?? null,
            colorCode: v.colorCode ?? null,
            sizeName: v.sizeName ?? null,
            dimensions: v.dimensions ?? null,
            capacity: v.capacity ?? null,
            wholesalePrice: v.wholesalePrice,
            dealerPrice: v.dealerPrice,
            stockQty: v.stockQty,
            stockStatus: v.stockStatus,
            imageUrl: v.imageUrl ?? null,
            variantStatus: "ACTIVE",
            metadata: DEMO_META,
          },
        });
        tally(variants, "created");
      } else {
        const vMeta = (existingVariant.metadata as { isDemo?: boolean } | null);
        if (vMeta?.isDemo === true) {
          await prisma.productVariant.update({
            where: { sku: v.sku },
            data: {
              stockQty: v.stockQty,
              stockStatus: v.stockStatus,
              wholesalePrice: v.wholesalePrice,
              dealerPrice: v.dealerPrice,
              imageUrl: v.imageUrl ?? null,
            },
          });
          tally(variants, "updated");
        } else {
          tally(variants, "skipped");
        }
      }
    }
  }

  return { products, variants };
}

// ─── Seed blog categories ─────────────────────────────────────────────────────

async function seedBlogCategories(): Promise<{ result: SeedGroupResult; idMap: Record<string, string> }> {
  const result = zero();
  const idMap: Record<string, string> = {};

  for (const cat of DEMO_BLOG_CATEGORIES) {
    const existing = await prisma.blogCategory.findUnique({ where: { slug: cat.slug } });
    if (!existing) {
      const created = await prisma.blogCategory.create({
        data: { name: cat.name, slug: cat.slug, description: cat.description, isVisible: true },
      });
      idMap[cat.slug] = created.id;
      tally(result, "created");
    } else {
      idMap[cat.slug] = existing.id;
      tally(result, "skipped");
    }
  }
  return { result, idMap };
}

// ─── Seed blog posts ──────────────────────────────────────────────────────────

async function seedBlogPosts(
  blogCategoryIdMap: Record<string, string>,
): Promise<SeedGroupResult> {
  const result = zero();

  for (const post of DEMO_BLOG_POSTS) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: post.slug } });
    const categoryId = blogCategoryIdMap[post.categorySlug];

    if (!existing) {
      const created = await prisma.blogPost.create({
        data: {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          featuredImageUrl: post.featuredImageUrl,
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
          tags: post.tags,
          status: "PUBLISHED",
          publishedAt: new Date(),
          aiMetadata: DEMO_META,
        },
      });
      if (categoryId) {
        await prisma.blogPostCategory.create({ data: { postId: created.id, categoryId } });
      }
      tally(result, "created");
    } else {
      const meta = (existing.aiMetadata as { isDemo?: boolean } | null);
      if (meta?.isDemo === true) {
        await prisma.blogPost.update({
          where: { id: existing.id },
          data: {
            title: post.title,
            excerpt: post.excerpt,
            content: post.content,
            featuredImageUrl: post.featuredImageUrl,
            metaTitle: post.metaTitle,
            metaDescription: post.metaDescription,
            tags: post.tags,
          },
        });
        tally(result, "updated");
      } else {
        tally(result, "skipped");
      }
    }
  }
  return result;
}

// ─── Seed landing pages ───────────────────────────────────────────────────────

async function seedLandingPages(): Promise<SeedGroupResult> {
  const result = zero();

  for (const lp of DEMO_LANDING_PAGES) {
    const existing = await prisma.landingPageContent.findUnique({ where: { slug: lp.slug } });
    if (!existing) {
      await prisma.landingPageContent.create({
        data: {
          slug: lp.slug,
          title: lp.title,
          heroTitle: lp.heroTitle,
          heroDescription: lp.heroDescription,
          seoContent: lp.seoContent,
          metaTitle: lp.metaTitle,
          metaDescription: lp.metaDescription,
          primaryCtaLabel: lp.primaryCtaLabel,
          primaryCtaHref: lp.primaryCtaHref,
          secondaryCtaLabel: lp.secondaryCtaLabel,
          secondaryCtaHref: lp.secondaryCtaHref,
          isPublished: true,
        },
      });
      tally(result, "created");
    } else {
      // Landing pages: always update if they exist since they don't have demo marker
      // Only update if seoContent is empty (avoid overwriting real edits)
      if (!existing.seoContent || existing.seoContent.trim() === "") {
        await prisma.landingPageContent.update({
          where: { id: existing.id },
          data: {
            heroTitle: lp.heroTitle,
            heroDescription: lp.heroDescription,
            seoContent: lp.seoContent,
            metaTitle: lp.metaTitle,
            metaDescription: lp.metaDescription,
            primaryCtaLabel: lp.primaryCtaLabel,
            primaryCtaHref: lp.primaryCtaHref,
            secondaryCtaLabel: lp.secondaryCtaLabel,
            secondaryCtaHref: lp.secondaryCtaHref,
          },
        });
        tally(result, "updated");
      } else {
        tally(result, "skipped");
      }
    }
  }
  return result;
}

// ─── Seed knowledge base ──────────────────────────────────────────────────────

async function seedKnowledgeBase(): Promise<{ categories: SeedGroupResult; entries: SeedGroupResult }> {
  const catResult = zero();
  const entryResult = zero();
  const catIdMap: Record<string, string> = {};

  // KB categories
  for (const cat of DEMO_KB_CATEGORIES) {
    const existing = await prisma.knowledgeBaseCategory.findUnique({ where: { slug: cat.slug } });
    if (!existing) {
      const created = await prisma.knowledgeBaseCategory.create({
        data: { name: cat.name, slug: cat.slug, description: cat.description, sortOrder: cat.sortOrder, isActive: true },
      });
      catIdMap[cat.slug] = created.id;
      tally(catResult, "created");
    } else {
      catIdMap[cat.slug] = existing.id;
      tally(catResult, "skipped");
    }
  }

  // KB entries
  for (const entry of DEMO_KB_ENTRIES) {
    const categoryId = catIdMap[entry.categorySlug];
    if (!categoryId) continue;

    const existing = await prisma.knowledgeBaseEntry.findUnique({ where: { slug: entry.slug } });
    const demoStructuredData: Prisma.InputJsonValue = { _demo: true, demoKey: DEMO_KEY };

    if (!existing) {
      await prisma.knowledgeBaseEntry.create({
        data: {
          title: entry.title,
          slug: entry.slug,
          summary: entry.summary,
          content: entry.content,
          structuredData: demoStructuredData,
          categoryId,
          type: entry.type as "COMPANY",
          status: "ACTIVE",
          priority: entry.priority,
          tags: entry.tags,
          isFeatured: entry.isFeatured,
          isVerified: entry.isVerified,
        },
      });
      tally(entryResult, "created");
    } else {
      const sd = existing.structuredData as { _demo?: boolean } | null;
      if (sd?._demo === true) {
        await prisma.knowledgeBaseEntry.update({
          where: { id: existing.id },
          data: {
            title: entry.title,
            summary: entry.summary,
            content: entry.content,
            tags: entry.tags,
            status: "ACTIVE",
          },
        });
        tally(entryResult, "updated");
      } else {
        tally(entryResult, "skipped");
      }
    }
  }

  return { categories: catResult, entries: entryResult };
}

// ─── Seed client logos ────────────────────────────────────────────────────────

async function seedClientLogos(): Promise<SeedGroupResult> {
  const result = zero();
  for (const logo of DEMO_CLIENT_LOGOS) {
    const existing = await prisma.clientLogoRecord.findFirst({ where: { companyName: logo.companyName } });
    if (!existing) {
      await prisma.clientLogoRecord.create({
        data: { companyName: logo.companyName, website: logo.website, imageUrl: logo.imageUrl, isVisible: true, sortOrder: logo.sortOrder },
      });
      tally(result, "created");
    } else {
      tally(result, "skipped");
    }
  }
  return result;
}

// ─── Seed case studies ────────────────────────────────────────────────────────

async function seedCaseStudies(): Promise<SeedGroupResult> {
  const result = zero();
  for (const cs of DEMO_CASE_STUDIES) {
    const existing = await prisma.caseStudyRecord.findFirst({ where: { title: cs.title } });
    if (!existing) {
      await prisma.caseStudyRecord.create({
        data: { title: cs.title, category: cs.category, quantity: cs.quantity, timeline: cs.timeline, summary: cs.summary, imageUrl: cs.imageUrl, isVisible: true, sortOrder: cs.sortOrder },
      });
      tally(result, "created");
    } else {
      tally(result, "skipped");
    }
  }
  return result;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function seedDemoContent(
  groups: string[] = ["all"],
): Promise<SeedResult> {
  const all = groups.includes("all");

  const summary: SeedResult = {
    categories: zero(), products: zero(), variants: zero(),
    blogCategories: zero(), blogPosts: zero(), landingPages: zero(),
    kbCategories: zero(), kbEntries: zero(),
    clientLogos: zero(), caseStudies: zero(),
  };

  // Categories always seeded first (products depend on them)
  if (all || groups.includes("products")) {
    const { result, idMap } = await seedCategories();
    summary.categories = result;
    if (all || groups.includes("products")) {
      const { products, variants } = await seedProducts(idMap);
      summary.products = products;
      summary.variants = variants;
    }
  }

  if (all || groups.includes("blog")) {
    const { result: catResult, idMap } = await seedBlogCategories();
    summary.blogCategories = catResult;
    summary.blogPosts = await seedBlogPosts(idMap);
  }

  if (all || groups.includes("landing")) {
    summary.landingPages = await seedLandingPages();
  }

  if (all || groups.includes("kb")) {
    const { categories, entries } = await seedKnowledgeBase();
    summary.kbCategories = categories;
    summary.kbEntries = entries;
  }

  if (all || groups.includes("clients")) {
    summary.clientLogos = await seedClientLogos();
    summary.caseStudies = await seedCaseStudies();
  }

  if (all || groups.includes("products") || groups.includes("pricing")) {
    const { seedPricingDemoData } = await import("@/features/pricing/services/pricing-overview.service");
    await seedPricingDemoData();
  }

  return summary;
}

// ─── Status ───────────────────────────────────────────────────────────────────

export async function getDemoStatus() {
  const [
    products, variants, blogPosts, kbEntries, clientLogos, caseStudies,
    totalProducts, totalVariants, totalBlogPosts, totalKbEntries,
    totalClientLogos, totalCaseStudies, categories, blogCategories, kbCategories,
    landingPages,
  ] = await Promise.all([
    prisma.product.count({ where: { metadata: { path: ["isDemo"], equals: true } } }),
    prisma.productVariant.count({ where: { metadata: { path: ["isDemo"], equals: true } } }),
    prisma.blogPost.count({ where: { aiMetadata: { path: ["isDemo"], equals: true } } }),
    prisma.knowledgeBaseEntry.count({ where: { structuredData: { path: ["_demo"], equals: true } } }),
    prisma.clientLogoRecord.count({ where: { companyName: { contains: "[Demo]" } } }),
    prisma.caseStudyRecord.count({ where: { title: { contains: "[Demo]" } } }),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.blogPost.count(),
    prisma.knowledgeBaseEntry.count(),
    prisma.clientLogoRecord.count(),
    prisma.caseStudyRecord.count(),
    prisma.category.count(),
    prisma.blogCategory.count(),
    prisma.knowledgeBaseCategory.count(),
    prisma.landingPageContent.count(),
  ]);

  return {
    demo: { products, variants, blogPosts, kbEntries, clientLogos, caseStudies },
    total: { products: totalProducts, variants: totalVariants, blogPosts: totalBlogPosts, kbEntries: totalKbEntries, clientLogos: totalClientLogos, caseStudies: totalCaseStudies, categories, blogCategories, kbCategories, landingPages },
  };
}

// ─── Delete demo content ──────────────────────────────────────────────────────

export async function deleteDemoContent(): Promise<{ deleted: Record<string, number> }> {
  const deleted: Record<string, number> = {};

  // Products (cascade variants via delete)
  const demoProducts = await prisma.product.findMany({
    where: { metadata: { path: ["isDemo"], equals: true } },
    select: { id: true },
  });
  for (const p of demoProducts) {
    await prisma.productVariant.deleteMany({ where: { productId: p.id } });
    await prisma.productImage.deleteMany({ where: { productId: p.id } });
  }
  const { count: pCount } = await prisma.product.deleteMany({ where: { metadata: { path: ["isDemo"], equals: true } } });
  deleted.products = pCount;

  // Variants (already demo-marked standalone orphans — safety cleanup)
  const { count: vCount } = await prisma.productVariant.deleteMany({ where: { metadata: { path: ["isDemo"], equals: true } } });
  deleted.variants = vCount;

  // Blog posts
  const demoBlogPosts = await prisma.blogPost.findMany({
    where: { aiMetadata: { path: ["isDemo"], equals: true } },
    select: { id: true },
  });
  for (const bp of demoBlogPosts) {
    await prisma.blogPostCategory.deleteMany({ where: { postId: bp.id } });
  }
  const { count: bpCount } = await prisma.blogPost.deleteMany({ where: { aiMetadata: { path: ["isDemo"], equals: true } } });
  deleted.blogPosts = bpCount;

  // KB entries
  const { count: kbCount } = await prisma.knowledgeBaseEntry.deleteMany({ where: { structuredData: { path: ["_demo"], equals: true } } });
  deleted.kbEntries = kbCount;

  // Client logos
  const { count: clCount } = await prisma.clientLogoRecord.deleteMany({ where: { companyName: { contains: "[Demo]" } } });
  deleted.clientLogos = clCount;

  // Case studies
  const { count: csCount } = await prisma.caseStudyRecord.deleteMany({ where: { title: { contains: "[Demo]" } } });
  deleted.caseStudies = csCount;

  return { deleted };
}
