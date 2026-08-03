/**
 * Canonical MediaAsset dependency resolver V2 (Sprint 14.5).
 * Wraps and extends resolveMediaReferences — relation-first, exact URL fallback.
 * Explicitly labels unsupported legacy modules without claiming full coverage.
 */

import { prisma } from "@/lib/prisma";
import {
  resolveMediaReferences,
  countMediaReferencesBatch,
  type MediaReference,
} from "@/features/media/services/media-reference.service";
import type {
  MediaAssetDependency,
  MediaDependencySummary,
  MediaRelationMode,
} from "@/features/media/lifecycle/lifecycle.types";

const PUBLIC_TYPES = new Set([
  "BLOG",
  "PRODUCT",
  "HOMEPAGE",
  "CONTENT_BUNDLE",
  "CATEGORY",
  "CASE_STUDY",
]);

function mapRelationMode(ref: MediaReference): MediaRelationMode {
  if (ref.referenceMode === "URL_MATCH") return "EXACT_URL";
  if (ref.field === "content.data-media-id") return "STRUCTURED_MEDIA_ID";
  if (ref.field === "descriptionBlocks") {
    return ref.referenceMode === "RELATION" ? "STRUCTURED_MEDIA_ID" : "EXACT_URL";
  }
  if (
    ref.field === "FEATURED" ||
    ref.field === "OG_IMAGE" ||
    ref.field === "INLINE" ||
    ref.field?.startsWith("INLINE") ||
    ref.field === "COVER" ||
    ref.field === "HERO" ||
    ref.field === "GALLERY"
  ) {
    return "CONTENT_MEDIA_ASSIGNMENT";
  }
  return "STRONG_FK";
}

function isPublicImpact(ref: MediaReference, contentStatus: string | null): boolean {
  if (!PUBLIC_TYPES.has(ref.type)) return false;
  if (ref.type === "BLOG") {
    return contentStatus === "PUBLISHED";
  }
  if (ref.type === "PRODUCT") return true;
  if (ref.type === "HOMEPAGE") return true;
  if (ref.type === "CONTENT_BUNDLE") return true;
  if (ref.type === "CATEGORY") return true;
  if (ref.type === "CASE_STUDY") return true;
  return false;
}

function isReplaceable(mode: MediaRelationMode): boolean {
  return (
    mode === "STRONG_FK" ||
    mode === "CONTENT_MEDIA_ASSIGNMENT" ||
    mode === "STRUCTURED_MEDIA_ID" ||
    mode === "EXACT_URL"
  );
}

async function enrichContentStatus(
  refs: MediaReference[],
): Promise<Map<string, string | null>> {
  const status = new Map<string, string | null>();
  const blogIds = [
    ...new Set(refs.filter((r) => r.type === "BLOG").map((r) => r.entityId)),
  ];
  if (blogIds.length) {
    const posts = await prisma.blogPost.findMany({
      where: { id: { in: blogIds } },
      select: { id: true, status: true },
      take: 100,
    });
    for (const post of posts) status.set(`BLOG:${post.id}`, post.status);
  }
  return status;
}

function toDependency(
  ref: MediaReference,
  statusMap: Map<string, string | null>,
): MediaAssetDependency {
  const mode = mapRelationMode(ref);
  const contentStatus = statusMap.get(`${ref.type}:${ref.entityId}`) ?? null;
  const publicImpact = isPublicImpact(ref, contentStatus);
  return {
    referenceType: ref.type,
    referenceId: ref.entityId,
    referenceLabel: ref.entityTitle || ref.entityCode || ref.entityId,
    referenceUrl: ref.route ?? null,
    field: ref.field ?? null,
    relationMode: mode,
    contentStatus,
    publicImpact,
    blocking: true,
    replaceable: isReplaceable(mode),
  };
}

/**
 * Detect known legacy URL fields that are NOT in the primary resolver.
 * Labeled explicitly — does not claim complete coverage.
 */
async function resolveUnsupportedLegacyHints(
  assetId: string,
  urls: string[],
): Promise<MediaAssetDependency[]> {
  if (!urls.length) return [];
  const out: MediaAssetDependency[] = [];

  try {
    const categories = await prisma.category.findMany({
      where: { imageUrl: { in: urls }, mediaAssetId: null },
      select: { id: true, name: true, slug: true },
      take: 20,
    });
    for (const row of categories) {
      out.push({
        referenceType: "CATEGORY",
        referenceId: row.id,
        referenceLabel: row.name,
        referenceUrl: row.slug ? `/admin/products/categories?editCategory=${row.id}` : null,
        field: "imageUrl",
        relationMode: "LEGACY_URL",
        contentStatus: null,
        publicImpact: true,
        blocking: false,
        replaceable: false,
      });
    }
  } catch {
    /* partial failure ok */
  }

  try {
    const caseStudies = await prisma.caseStudyRecord.findMany({
      where: { imageUrl: { in: urls }, mediaAssetId: null },
      select: { id: true, title: true },
      take: 20,
    });
    for (const row of caseStudies) {
      out.push({
        referenceType: "CASE_STUDY",
        referenceId: row.id,
        referenceLabel: row.title,
        referenceUrl: `/admin/case-studies`,
        field: "imageUrl",
        relationMode: "LEGACY_URL",
        contentStatus: null,
        publicImpact: true,
        blocking: false,
        replaceable: false,
      });
    }
  } catch {
    /* CaseStudyRecord may not exist in all envs */
  }

  void assetId;
  return out;
}

export async function resolveMediaDependencies(
  mediaAssetId: string,
): Promise<MediaDependencySummary> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: mediaAssetId },
    select: { id: true, url: true, thumbnailUrl: true },
  });
  if (!asset) {
    return {
      mediaAssetId,
      total: 0,
      publicCount: 0,
      internalCount: 0,
      blockingCount: 0,
      replaceableCount: 0,
      unsupportedCount: 0,
      byModule: {},
      references: [],
    };
  }

  let legacyRefs: MediaReference[] = [];
  try {
    legacyRefs = await resolveMediaReferences(mediaAssetId);
  } catch (err) {
    console.error("[media-dependency] primary resolver failed:", err);
  }

  const statusMap = await enrichContentStatus(legacyRefs);
  const primary = legacyRefs.map((ref) => toDependency(ref, statusMap));

  const urls = [asset.url, asset.thumbnailUrl].filter(
    (v): v is string => Boolean(v?.trim()),
  );
  let legacyHints: MediaAssetDependency[] = [];
  try {
    legacyHints = await resolveUnsupportedLegacyHints(mediaAssetId, urls);
  } catch (err) {
    console.error("[media-dependency] legacy hint resolver failed:", err);
  }

  // Dedupe by type+id+field
  const seen = new Set<string>();
  const references: MediaAssetDependency[] = [];
  for (const ref of [...primary, ...legacyHints]) {
    const key = `${ref.referenceType}:${ref.referenceId}:${ref.field ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    references.push(ref);
  }

  const byModule: Record<string, MediaAssetDependency[]> = {};
  for (const ref of references) {
    (byModule[ref.referenceType] ??= []).push(ref);
  }

  return {
    mediaAssetId,
    total: references.length,
    publicCount: references.filter((r) => r.publicImpact).length,
    internalCount: references.filter((r) => !r.publicImpact).length,
    blockingCount: references.filter((r) => r.blocking).length,
    replaceableCount: references.filter((r) => r.replaceable).length,
    unsupportedCount: references.filter(
      (r) => r.relationMode === "LEGACY_URL" || !r.replaceable,
    ).length,
    byModule,
    references,
  };
}

export async function countMediaDependenciesBatch(
  mediaAssetIds: string[],
): Promise<Record<string, number>> {
  // Reuse existing batched counter for performance (card grids).
  return countMediaReferencesBatch(mediaAssetIds);
}

export function isLifecycleEligibleForSuggestion(input: {
  lifecycleStatus: string;
  visibility: string;
  rightsStatus?: string | null;
  rightsExpiresAt?: Date | null;
  usageRestriction?: string | null;
}): { ok: boolean; reason?: string } {
  if (input.visibility === "PRIVATE") {
    return { ok: false, reason: "private_visibility" };
  }
  if (
    input.lifecycleStatus === "ARCHIVED" ||
    input.lifecycleStatus === "RETIRED" ||
    input.lifecycleStatus === "DEPRECATED"
  ) {
    return { ok: false, reason: `lifecycle_${input.lifecycleStatus.toLowerCase()}` };
  }
  if (
    input.rightsStatus === "LICENSED" &&
    input.rightsExpiresAt &&
    input.rightsExpiresAt.getTime() < Date.now() &&
    input.usageRestriction
  ) {
    return { ok: false, reason: "rights_expired_restricted" };
  }
  if (input.lifecycleStatus === "REVIEW_REQUIRED") {
    return { ok: true, reason: "review_required_warning" };
  }
  return { ok: true };
}
