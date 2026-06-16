/**
 * Demo image updater — Patch 24.9.4b
 * Safely replaces placeholder/missing demo images with curated Unsplash URLs.
 */

import { prisma } from "@/lib/prisma";
import {
  categoryDemoImages,
  getProductDemoImages,
  getBlogDemoImage,
  productDemoImages,
} from "./demo-image-map";
import { DEMO_CATEGORIES } from "./demo-content-data";
import {
  shouldReplaceImage,
  isDemoMarkedMetadata,
  isDemoMarkedAiMetadata,
  isLikelyRealImage,
} from "./demo-image-utils";

export type DemoImageUpdateSummary = {
  productsUpdated: number;
  variantsUpdated: number;
  categoriesUpdated: number;
  blogPostsUpdated: number;
  landingPagesUpdated: number;
  skippedRealImages: number;
};

export async function updateDemoImages(): Promise<DemoImageUpdateSummary> {
  const summary: DemoImageUpdateSummary = {
    productsUpdated: 0,
    variantsUpdated: 0,
    categoriesUpdated: 0,
    blogPostsUpdated: 0,
    landingPagesUpdated: 0,
    skippedRealImages: 0,
  };

  // ── Products ────────────────────────────────────────────────────────────────
  const products = await prisma.product.findMany({
    include: {
      category: { select: { slug: true } },
      variants: { select: { id: true, sku: true, imageUrl: true } },
    },
  });

  for (const product of products) {
    const isDemo =
      isDemoMarkedMetadata(product.metadata) ||
      product.slug in productDemoImages;

    const images = getProductDemoImages(product.slug, product.category.slug);

    let productChanged = false;
    const updateData: {
      featuredImage?: string;
      gallery?: string[];
    } = {};

    if (shouldReplaceImage(isDemo, product.featuredImage)) {
      updateData.featuredImage = images.featured;
      productChanged = true;
    } else if (product.featuredImage && isLikelyRealImage(product.featuredImage) && !isDemo) {
      summary.skippedRealImages++;
    }

    const gallery = Array.isArray(product.gallery) ? (product.gallery as string[]) : [];
    const needsGallery =
      gallery.length === 0 ||
      gallery.every((url) => shouldReplaceImage(isDemo, url));

    if (needsGallery && isDemo) {
      updateData.gallery = images.gallery;
      productChanged = true;
    } else if (gallery.some((url) => isLikelyRealImage(url) && !isDemo)) {
      summary.skippedRealImages++;
    }

    if (productChanged) {
      await prisma.product.update({
        where: { id: product.id },
        data: updateData,
      });
      summary.productsUpdated++;
    }

    for (const variant of product.variants) {
      if (!shouldReplaceImage(isDemo, variant.imageUrl)) {
        if (variant.imageUrl && isLikelyRealImage(variant.imageUrl) && !isDemo) {
          summary.skippedRealImages++;
        }
        continue;
      }
      const variantUrl = images.variant ?? images.featured;
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { imageUrl: variantUrl },
      });
      summary.variantsUpdated++;
    }
  }

  // ── Categories ──────────────────────────────────────────────────────────────
  const categories = await prisma.category.findMany();
  for (const cat of categories) {
    const demoUrl = categoryDemoImages[cat.slug];
    if (!demoUrl) continue;
    const isKnownDemo = DEMO_CATEGORIES.some((c) => c.slug === cat.slug);
    if (!shouldReplaceImage(isKnownDemo, cat.imageUrl)) {
      if (cat.imageUrl && isLikelyRealImage(cat.imageUrl)) summary.skippedRealImages++;
      continue;
    }
    await prisma.category.update({
      where: { id: cat.id },
      data: { imageUrl: demoUrl },
    });
    summary.categoriesUpdated++;
  }

  // ── Blog posts ──────────────────────────────────────────────────────────────
  const blogPosts = await prisma.blogPost.findMany({
    select: { id: true, slug: true, featuredImageUrl: true, aiMetadata: true },
  });

  for (const post of blogPosts) {
    const isDemo = isDemoMarkedAiMetadata(post.aiMetadata);
    if (!shouldReplaceImage(isDemo, post.featuredImageUrl)) {
      if (post.featuredImageUrl && isLikelyRealImage(post.featuredImageUrl) && !isDemo) {
        summary.skippedRealImages++;
      }
      continue;
    }
    await prisma.blogPost.update({
      where: { id: post.id },
      data: { featuredImageUrl: getBlogDemoImage(post.slug) },
    });
    summary.blogPostsUpdated++;
  }

  return summary;
}
