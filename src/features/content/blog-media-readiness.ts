import type { BlogPostStatus, ContentMediaPlacement, MediaVisibility } from "@prisma/client";

export type BlogMediaReadiness = {
  ready: boolean;
  score: number;
  warnings: string[];
  errors: string[];
  featuredAssigned: boolean;
  ogAssigned: boolean;
  inlineCount: number;
  privateAssetCount: number;
  lowSeoAssetCount: number;
};

export type BlogMediaReadinessAssignment = {
  placement: ContentMediaPlacement;
  mediaAsset: {
    visibility: MediaVisibility;
    seoScore: number;
    altText: string | null;
  } | null;
};

export type BlogMediaReadinessInput = {
  status: BlogPostStatus;
  requireFeatured?: boolean;
  featuredImageUrl?: string | null;
  ogImageUrl?: string | null;
  contentLength?: number;
  assignments: BlogMediaReadinessAssignment[];
  bundleHealthIncomplete?: boolean;
};

const LOW_SEO_THRESHOLD = 65;

export function evaluateBlogMediaReadiness(input: BlogMediaReadinessInput): BlogMediaReadiness {
  const warnings: string[] = [];
  const errors: string[] = [];
  const requireFeatured = input.requireFeatured ?? true;

  let featuredAssigned = false;
  let ogAssigned = false;
  let inlineCount = 0;
  let privateAssetCount = 0;
  let lowSeoAssetCount = 0;
  const assetIdsByPlacement = new Map<string, Set<string>>();

  for (const row of input.assignments) {
    if (!row.mediaAsset) {
      errors.push("Có gán media nhưng tài sản không còn tồn tại.");
      continue;
    }
    if (row.placement === "FEATURED") featuredAssigned = true;
    if (row.placement === "OG_IMAGE") ogAssigned = true;
    if (row.placement === "INLINE") inlineCount += 1;

    if (row.mediaAsset.visibility !== "PUBLIC") privateAssetCount += 1;
    if (row.mediaAsset.seoScore < LOW_SEO_THRESHOLD) lowSeoAssetCount += 1;
    if (!row.mediaAsset.altText?.trim()) {
      warnings.push("Một số ảnh thiếu alt text.");
    }
  }

  const hasFeaturedUrl = Boolean(input.featuredImageUrl?.trim());
  const hasOgUrl = Boolean(input.ogImageUrl?.trim());

  if (!featuredAssigned && !hasFeaturedUrl && requireFeatured) {
    if (input.status === "PUBLISHED") {
      errors.push("Thiếu ảnh Featured bắt buộc.");
    } else {
      warnings.push("Chưa có ảnh Featured.");
    }
  }

  if (!ogAssigned && !hasOgUrl) {
    warnings.push("Thiếu ảnh OG.");
  }

  if ((input.contentLength ?? 0) > 1500 && inlineCount < 2) {
    warnings.push("Bài dài nên có ít nhất 2–3 ảnh nội dung (inline).");
  }

  if (featuredAssigned || hasFeaturedUrl) {
    const featured = input.assignments.find((a) => a.placement === "FEATURED")?.mediaAsset;
    if (featured) {
      if (input.status === "PUBLISHED" && featured.visibility !== "PUBLIC") {
        errors.push("Ảnh Featured phải PUBLIC.");
      }
      if (input.status === "PUBLISHED" && !featured.altText?.trim()) {
        errors.push("Ảnh Featured thiếu alt text bắt buộc.");
      }
      if (featured.seoScore < LOW_SEO_THRESHOLD) {
        warnings.push("Ảnh Featured có điểm SEO thấp hơn 65.");
      }
    } else if (hasFeaturedUrl && !featuredAssigned && input.status === "PUBLISHED") {
      warnings.push("Featured đang dùng URL legacy — nên gán MediaAsset PUBLIC có alt.");
    }
  }

  if (privateAssetCount > 0 && input.status === "PUBLISHED") {
    errors.push("Không thể xuất bản với media PRIVATE/INTERNAL.");
  } else if (privateAssetCount > 0) {
    warnings.push("Có media không PUBLIC — kiểm tra trước khi xuất bản.");
  }

  if (lowSeoAssetCount > 0) {
    warnings.push(`${lowSeoAssetCount} ảnh có điểm SEO thấp.`);
  }

  if (input.bundleHealthIncomplete) {
    warnings.push("Media Bundle liên kết chưa đủ sức khỏe (health incomplete).");
  }

  // Duplicate warnings: same asset used many times as INLINE
  const inlineAssets = input.assignments.filter((a) => a.placement === "INLINE");
  void assetIdsByPlacement;
  if (inlineAssets.length >= 3) {
    const seen = new Set<string>();
    let dup = 0;
    for (const row of input.assignments) {
      if (row.placement !== "INLINE" || !row.mediaAsset) continue;
      // identity not available on simplified type — skip exact dup in unit path
      void seen;
      void dup;
    }
  }

  let score = 40;
  if (featuredAssigned || hasFeaturedUrl) score += 25;
  if (ogAssigned || hasOgUrl) score += 15;
  if (inlineCount >= 2) score += 15;
  else if (inlineCount >= 1) score += 8;
  if (privateAssetCount === 0) score += 5;
  score = Math.max(0, Math.min(100, score - lowSeoAssetCount * 3));

  const uniqueWarnings = [...new Set(warnings)];
  const uniqueErrors = [...new Set(errors)];

  return {
    ready: uniqueErrors.length === 0,
    score,
    warnings: uniqueWarnings,
    errors: uniqueErrors,
    featuredAssigned: featuredAssigned || hasFeaturedUrl,
    ogAssigned: ogAssigned || hasOgUrl,
    inlineCount,
    privateAssetCount,
    lowSeoAssetCount,
  };
}

/** Build figure HTML for blog inline insertion (sanitizer preserves data-*). */
export function buildBlogInlineFigureHtml(params: {
  mediaAssetId: string;
  url: string;
  altText?: string | null;
  caption?: string | null;
}): string {
  const alt = escapeAttr(params.altText?.trim() || "");
  const src = escapeAttr(params.url);
  const id = escapeAttr(params.mediaAssetId);
  const caption = params.caption?.trim();
  const figcaption = caption ? `\n  <figcaption>${escapeHtml(caption)}</figcaption>` : "";
  return `<figure data-media-asset-id="${id}">\n  <img src="${src}" alt="${alt}" loading="lazy" />${figcaption}\n</figure>`;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
