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
  mediaAssetId?: string;
  mediaAsset: {
    visibility: MediaVisibility;
    seoScore: number;
    altText: string | null;
    width?: number | null;
    height?: number | null;
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

  if ((input.contentLength ?? 0) > 3000 && inlineCount < 3) {
    warnings.push("Bài rất dài (>3.000 từ ước lượng) nên có 3–6 ảnh nội dung.");
  }

  if ((input.contentLength ?? 0) > 2000 && inlineCount === 0) {
    warnings.push("Bài dài chưa có ảnh nội dung trong body — dùng “Tự động chèn ảnh” để đề xuất.");
  }

  // Missing alt on used PUBLIC inline assets is a publish blocker.
  for (const row of input.assignments) {
    if (row.placement !== "INLINE" || !row.mediaAsset) continue;
    if (!row.mediaAsset.altText?.trim()) {
      if (input.status === "PUBLISHED") {
        errors.push("Ảnh nội dung thiếu alt text bắt buộc.");
      } else {
        warnings.push("Ảnh nội dung thiếu alt text.");
      }
    }
    if (row.mediaAsset.visibility !== "PUBLIC") {
      errors.push("Ảnh nội dung không được dùng asset PRIVATE/INTERNAL.");
    }
    const minDim = Math.min(row.mediaAsset.width ?? 0, row.mediaAsset.height ?? 0);
    if (minDim > 0 && minDim < 400) {
      warnings.push("Một số ảnh nội dung có kích thước thấp (<400px).");
    }
  }

  // Duplicate INLINE assets
  const inlineIds = input.assignments
    .filter((row) => row.placement === "INLINE")
    .map((row) => row.mediaAssetId)
    .filter((id): id is string => Boolean(id));
  if (inlineIds.length !== new Set(inlineIds).size) {
    warnings.push("Có ảnh nội dung bị trùng trong cùng bài.");
  }

  // Cover reused as INLINE without an explicit separate editorial choice signal
  const coverIds = new Set(
    input.assignments
      .filter((row) => row.placement === "FEATURED" || row.placement === "COVER")
      .map((row) => row.mediaAssetId)
      .filter((id): id is string => Boolean(id)),
  );
  if (inlineIds.some((id) => coverIds.has(id))) {
    warnings.push("Ảnh Cover/Featured đang được tái sử dụng làm ảnh nội dung.");
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

  void assetIdsByPlacement;

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

import {
  buildInlineMediaFigureHtml,
} from "@/features/content/inline-media/inline-media-figure";

/** Build figure HTML for blog inline insertion (sanitizer preserves data-media-id). */
export function buildBlogInlineFigureHtml(params: {
  mediaAssetId: string;
  url: string;
  altText?: string | null;
  caption?: string | null;
}): string {
  return buildInlineMediaFigureHtml({
    mediaAssetId: params.mediaAssetId,
    url: params.url,
    altText: params.altText ?? "",
    caption: params.caption,
    variant: "CONTENT_WIDTH",
  });
}
