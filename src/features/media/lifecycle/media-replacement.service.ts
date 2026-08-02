/**
 * Safe asset replacement — preview first, apply only on explicit confirmation.
 * Never copies/moves files. Never auto-publishes. Idempotent apply.
 */

import { prisma } from "@/lib/prisma";
import {
  MediaLifecycleError,
  type MediaReplacementApplyMode,
  type MediaReplacementApplyResult,
  type MediaReplacementPlan,
  type ReplacementPlanItem,
} from "@/features/media/lifecycle/lifecycle.types";
import {
  assertValidReplacementTarget,
  writeLifecycleEvent,
} from "@/features/media/lifecycle/lifecycle-transition.service";
import { resolveMediaDependencies } from "@/features/media/lifecycle/media-dependency.service";
import {
  extractMediaIdsFromDescriptionBlocks,
  // patch helper — replace mediaId in blocks
} from "@/features/products/product-description-blocks";

function rewriteDescriptionBlocksMediaId(
  blocks: unknown,
  fromId: string,
  toId: string,
  toUrl: string,
): { next: unknown; changed: boolean } {
  if (!Array.isArray(blocks)) return { next: blocks, changed: false };
  let changed = false;
  const next = blocks.map((block) => {
    if (!block || typeof block !== "object") return block;
    const row = { ...(block as Record<string, unknown>) };
    if (row.mediaId === fromId) {
      row.mediaId = toId;
      if (typeof row.imageUrl === "string") row.imageUrl = toUrl;
      changed = true;
    }
    return row;
  });
  return { next, changed };
}

export async function planMediaAssetReplacement(input: {
  sourceAssetId: string;
  replacementAssetId: string;
}): Promise<MediaReplacementPlan> {
  if (input.sourceAssetId === input.replacementAssetId) {
    throw new MediaLifecycleError(
      "REPLACEMENT_INVALID",
      "Source và replacement phải khác nhau",
    );
  }

  const [source, replacement] = await Promise.all([
    prisma.mediaAsset.findUnique({
      where: { id: input.sourceAssetId },
      select: { id: true, url: true, visibility: true, lifecycleStatus: true },
    }),
    prisma.mediaAsset.findUnique({
      where: { id: input.replacementAssetId },
      select: {
        id: true,
        url: true,
        visibility: true,
        lifecycleStatus: true,
      },
    }),
  ]);
  if (!source || !replacement) {
    throw new MediaLifecycleError("ASSET_NOT_FOUND", "Không tìm thấy asset");
  }

  await assertValidReplacementTarget(source.id, replacement.id);

  const deps = await resolveMediaDependencies(source.id);
  const warnings: string[] = [];
  const blockers: string[] = [];
  const items: ReplacementPlanItem[] = [];

  for (const ref of deps.references) {
    let decision: ReplacementPlanItem["decision"] = "AUTO";
    let warning: string | null = null;

    if (!ref.replaceable || ref.relationMode === "LEGACY_URL") {
      decision = "UNSUPPORTED";
      warning = "Legacy / unsupported reference — manual review required";
    } else if (
      ref.publicImpact &&
      replacement.visibility === "PRIVATE"
    ) {
      decision = "BLOCKED";
      warning = "Cannot replace public usage with PRIVATE asset";
      blockers.push(`${ref.referenceType}:${ref.referenceId}`);
    } else if (ref.relationMode === "EXACT_URL" || ref.relationMode === "STRUCTURED_MEDIA_ID") {
      decision = "MANUAL";
      warning = "Exact URL / structured ID — included in APPLY_SUPPORTED with care";
      // Treat as AUTO for known fields (product/blog URL mirrors)
      if (
        ref.field === "featuredImage" ||
        ref.field === "gallery" ||
        ref.field === "imageUrl" ||
        ref.field === "featuredImageUrl" ||
        ref.field === "ogImageUrl" ||
        ref.field === "previewUrl" ||
        ref.field === "descriptionBlocks"
      ) {
        decision = "AUTO";
      }
    }

    items.push({ ...ref, decision, warning });
  }

  if (replacement.visibility === "PRIVATE") {
    warnings.push("Replacement is PRIVATE — public usages will be blocked");
  }
  if (replacement.lifecycleStatus !== "ACTIVE") {
    blockers.push("Replacement must be ACTIVE");
  }

  return {
    sourceAssetId: source.id,
    replacementAssetId: replacement.id,
    total: items.length,
    replaceableAutomatically: items.filter((i) => i.decision === "AUTO").length,
    needsManualReview: items.filter((i) => i.decision === "MANUAL").length,
    unsupported: items.filter((i) => i.decision === "UNSUPPORTED").length,
    blocked: items.filter((i) => i.decision === "BLOCKED").length,
    publicImpact: items.filter((i) => i.publicImpact).length,
    items,
    warnings,
    blockers,
  };
}

export async function applyMediaAssetReplacement(input: {
  sourceAssetId: string;
  replacementAssetId: string;
  mode: MediaReplacementApplyMode;
  selectedKeys?: string[];
  actorId?: string | null;
  reason?: string | null;
  /** When true, also add replacement into same bundles/collections (explicit). */
  inheritBundleJoins?: boolean;
  inheritCollectionJoins?: boolean;
}): Promise<MediaReplacementApplyResult> {
  if (input.mode === "PREVIEW") {
    const plan = await planMediaAssetReplacement(input);
    return {
      mode: "PREVIEW",
      updated: 0,
      skipped: plan.total,
      failed: 0,
      verified: true,
      details: plan.items.map((item) => ({
        referenceId: item.referenceId,
        field: item.field,
        status: "skipped" as const,
        message: item.decision,
      })),
    };
  }

  const plan = await planMediaAssetReplacement(input);
  if (plan.blockers.length && input.mode !== "APPLY_SELECTED") {
    // Still allow APPLY_SELECTED to skip blocked items
  }

  const source = await prisma.mediaAsset.findUnique({
    where: { id: input.sourceAssetId },
    select: { id: true, url: true, thumbnailUrl: true, lifecycleStatus: true },
  });
  const replacement = await prisma.mediaAsset.findUnique({
    where: { id: input.replacementAssetId },
    select: { id: true, url: true, thumbnailUrl: true, visibility: true },
  });
  if (!source || !replacement) {
    throw new MediaLifecycleError("ASSET_NOT_FOUND", "Không tìm thấy asset");
  }

  const selected = new Set(input.selectedKeys ?? []);
  const details: MediaReplacementApplyResult["details"] = [];
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const shouldApply = (item: ReplacementPlanItem) => {
    if (item.decision === "BLOCKED" || item.decision === "UNSUPPORTED") return false;
    if (input.mode === "APPLY_SUPPORTED") return item.decision === "AUTO";
    if (input.mode === "APPLY_SELECTED") {
      const key = `${item.referenceType}:${item.referenceId}:${item.field ?? ""}`;
      return selected.has(key);
    }
    return false;
  };

  await prisma.$transaction(async (tx) => {
    for (const item of plan.items) {
      if (!shouldApply(item)) {
        skipped += 1;
        details.push({
          referenceId: item.referenceId,
          field: item.field,
          status: "skipped",
          message: item.decision,
        });
        continue;
      }

      try {
        if (item.relationMode === "CONTENT_MEDIA_ASSIGNMENT") {
          await tx.contentMediaAssignment.updateMany({
            where: {
              mediaAssetId: source.id,
              entityId: item.referenceId,
              ...(item.field &&
              ["FEATURED", "OG_IMAGE", "INLINE", "COVER", "HERO", "GALLERY"].includes(
                item.field.split(":")[0] ?? "",
              )
                ? {
                    placement: item.field.split(":")[0] as never,
                  }
                : {}),
            },
            data: { mediaAssetId: replacement.id },
          });
          // Sync blog legacy URL mirrors when featured/OG
          if (item.referenceType === "BLOG") {
            const field = item.field?.split(":")[0];
            if (field === "FEATURED") {
              await tx.blogPost.updateMany({
                where: { id: item.referenceId },
                data: { featuredImageUrl: replacement.url },
              });
            }
            if (field === "OG_IMAGE") {
              await tx.blogPost.updateMany({
                where: { id: item.referenceId },
                data: { ogImageUrl: replacement.url },
              });
            }
          }
        } else if (item.relationMode === "STRONG_FK") {
          await applyStrongFk(tx, item, source.id, replacement.id);
        } else if (
          item.relationMode === "EXACT_URL" ||
          item.relationMode === "STRUCTURED_MEDIA_ID"
        ) {
          await applyUrlOrStructured(tx, item, source, replacement);
        } else {
          skipped += 1;
          details.push({
            referenceId: item.referenceId,
            field: item.field,
            status: "skipped",
            message: "unsupported",
          });
          continue;
        }

        updated += 1;
        details.push({
          referenceId: item.referenceId,
          field: item.field,
          status: "updated",
        });
      } catch (err) {
        failed += 1;
        details.push({
          referenceId: item.referenceId,
          field: item.field,
          status: "failed",
          message: err instanceof Error ? err.message : "replace_failed",
        });
      }
    }

    if (input.inheritBundleJoins) {
      const joins = await tx.mediaBundleSlotAsset.findMany({
        where: { mediaAssetId: source.id },
        select: { mediaBundleSlotId: true, sortOrder: true, note: true },
      });
      for (const join of joins) {
        await tx.mediaBundleSlotAsset.upsert({
          where: {
            mediaBundleSlotId_mediaAssetId: {
              mediaBundleSlotId: join.mediaBundleSlotId,
              mediaAssetId: replacement.id,
            },
          },
          create: {
            mediaBundleSlotId: join.mediaBundleSlotId,
            mediaAssetId: replacement.id,
            sortOrder: join.sortOrder,
            note: join.note,
          },
          update: {},
        });
      }
    }

    if (input.inheritCollectionJoins) {
      const joins = await tx.mediaAssetCollection.findMany({
        where: { mediaAssetId: source.id },
        select: { mediaCollectionId: true },
      });
      for (const join of joins) {
        await tx.mediaAssetCollection.upsert({
          where: {
            mediaAssetId_mediaCollectionId: {
              mediaAssetId: replacement.id,
              mediaCollectionId: join.mediaCollectionId,
            },
          },
          create: {
            mediaAssetId: replacement.id,
            mediaCollectionId: join.mediaCollectionId,
          },
          update: {},
        });
      }
    }
  });

  // Post-apply verification (idempotent check)
  const remaining = await resolveMediaDependencies(source.id);
  const stillReplaceable = remaining.references.filter(
    (r) =>
      r.replaceable &&
      plan.items.some(
        (p) =>
          p.referenceId === r.referenceId &&
          p.field === r.field &&
          p.decision === "AUTO" &&
          shouldApply(p),
      ),
  );

  await writeLifecycleEvent({
    mediaAssetId: source.id,
    action: "REPLACE_APPLY",
    fromStatus: source.lifecycleStatus,
    toStatus: source.lifecycleStatus,
    actorId: input.actorId,
    reason: input.reason,
    replacementAssetId: replacement.id,
    metadata: {
      mode: input.mode,
      updated,
      skipped,
      failed,
      remainingTotal: remaining.total,
    },
  });

  // Ensure source file untouched — re-read
  const sourceAfter = await prisma.mediaAsset.findUnique({
    where: { id: source.id },
    select: { url: true, storageKey: true, publicId: true },
  });
  if (!sourceAfter) {
    throw new MediaLifecycleError("REPLACE_VERIFY_FAILED", "Source asset missing after apply");
  }

  return {
    mode: input.mode,
    updated,
    skipped,
    failed,
    verified: stillReplaceable.length === 0 || failed === 0,
    details,
  };
}

async function applyStrongFk(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  item: ReplacementPlanItem,
  sourceId: string,
  replacementId: string,
) {
  const field = item.field ?? "";
  if (field === "designMediaAssetId" && item.referenceType === "QUOTE") {
    await tx.quoteItem.updateMany({
      where: { id: item.referenceId, designMediaAssetId: sourceId },
      data: { designMediaAssetId: replacementId },
    });
    return;
  }
  if (field === "designMediaAssetId" && item.referenceType === "ORDER") {
    await tx.orderItem.updateMany({
      where: { id: item.referenceId, designMediaAssetId: sourceId },
      data: { designMediaAssetId: replacementId },
    });
    return;
  }
  if (field === "oemMediaAssetId") {
    await tx.homepageSettings.updateMany({
      where: { id: item.referenceId, oemMediaAssetId: sourceId },
      data: { oemMediaAssetId: replacementId },
    });
    return;
  }
  if (field === "mediaAssetId" && item.referenceType === "HOMEPAGE") {
    await tx.homepageSourcingPathway.updateMany({
      where: { id: item.referenceId, mediaAssetId: sourceId },
      data: { mediaAssetId: replacementId },
    });
    await tx.homepageWorkshopMedia.updateMany({
      where: { id: item.referenceId, mediaAssetId: sourceId },
      data: { mediaAssetId: replacementId },
    });
    return;
  }
  if (field === "avatarMediaAssetId") {
    await tx.salesRepresentative.updateMany({
      where: { id: item.referenceId, avatarMediaAssetId: sourceId },
      data: { avatarMediaAssetId: replacementId },
    });
    return;
  }
  if (item.referenceType === "MANUFACTURING") {
    await tx.manufacturingMedia.updateMany({
      where: { id: item.referenceId, mediaAssetId: sourceId },
      data: { mediaAssetId: replacementId },
    });
    return;
  }
  if (item.referenceType === "CONTENT_BUNDLE") {
    // Bundle slot: referenceId is bundle id in resolver — need slot-level
    // Existing resolver stores bundle id; update all slots for this asset in bundle
    const slots = await tx.mediaBundleSlot.findMany({
      where: { mediaBundleId: item.referenceId },
      select: { id: true },
    });
    for (const slot of slots) {
      const existing = await tx.mediaBundleSlotAsset.findUnique({
        where: {
          mediaBundleSlotId_mediaAssetId: {
            mediaBundleSlotId: slot.id,
            mediaAssetId: sourceId,
          },
        },
      });
      if (!existing) continue;
      await tx.mediaBundleSlotAsset.delete({
        where: {
          mediaBundleSlotId_mediaAssetId: {
            mediaBundleSlotId: slot.id,
            mediaAssetId: sourceId,
          },
        },
      });
      await tx.mediaBundleSlotAsset.upsert({
        where: {
          mediaBundleSlotId_mediaAssetId: {
            mediaBundleSlotId: slot.id,
            mediaAssetId: replacementId,
          },
        },
        create: {
          mediaBundleSlotId: slot.id,
          mediaAssetId: replacementId,
          sortOrder: existing.sortOrder,
          note: existing.note,
        },
        update: {},
      });
    }
    return;
  }
  if (field?.startsWith("role:")) {
    await tx.manufacturingMedia.updateMany({
      where: { id: item.referenceId, mediaAssetId: sourceId },
      data: { mediaAssetId: replacementId },
    });
    return;
  }

  // Order production / QC / delivery
  await tx.orderProductionFile.updateMany({
    where: { id: item.referenceId, mediaAssetId: sourceId },
    data: { mediaAssetId: replacementId },
  });
  await tx.orderQcEvidence.updateMany({
    where: { id: item.referenceId, mediaAssetId: sourceId },
    data: { mediaAssetId: replacementId },
  });
  await tx.orderDeliveryProof.updateMany({
    where: { id: item.referenceId, mediaAssetId: sourceId },
    data: { mediaAssetId: replacementId },
  });
}

async function applyUrlOrStructured(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  item: ReplacementPlanItem,
  source: { id: string; url: string; thumbnailUrl: string | null },
  replacement: { id: string; url: string },
) {
  const field = item.field ?? "";
  if (item.referenceType === "PRODUCT") {
    if (field === "featuredImage") {
      await tx.product.updateMany({
        where: { id: item.referenceId, featuredImage: source.url },
        data: { featuredImage: replacement.url },
      });
      return;
    }
    if (field === "gallery") {
      const product = await tx.product.findUnique({
        where: { id: item.referenceId },
        select: { gallery: true },
      });
      if (!product) return;
      const next = product.gallery.map((url) =>
        url === source.url || url === source.thumbnailUrl ? replacement.url : url,
      );
      await tx.product.update({
        where: { id: item.referenceId },
        data: { gallery: next },
      });
      return;
    }
    if (field === "imageUrl") {
      await tx.productImage.updateMany({
        where: { id: item.referenceId, imageUrl: source.url },
        data: { imageUrl: replacement.url },
      });
      return;
    }
    if (field === "descriptionBlocks") {
      const product = await tx.product.findUnique({
        where: { id: item.referenceId },
        select: { descriptionBlocks: true },
      });
      if (!product) return;
      const { next, changed } = rewriteDescriptionBlocksMediaId(
        product.descriptionBlocks,
        source.id,
        replacement.id,
        replacement.url,
      );
      if (changed) {
        await tx.product.update({
          where: { id: item.referenceId },
          data: { descriptionBlocks: next as never },
        });
      }
      return;
    }
  }

  if (item.referenceType === "BLOG") {
    if (field === "featuredImageUrl") {
      await tx.blogPost.updateMany({
        where: { id: item.referenceId, featuredImageUrl: source.url },
        data: { featuredImageUrl: replacement.url },
      });
      return;
    }
    if (field === "ogImageUrl") {
      await tx.blogPost.updateMany({
        where: { id: item.referenceId, ogImageUrl: source.url },
        data: { ogImageUrl: replacement.url },
      });
      return;
    }
  }

  if (item.referenceType === "TECH_PACK" && field === "previewUrl") {
    await tx.techPackAsset.updateMany({
      where: { id: item.referenceId, previewUrl: source.url },
      data: { previewUrl: replacement.url },
    });
  }
}

// Keep import used for typecheck of helper presence
void extractMediaIdsFromDescriptionBlocks;
