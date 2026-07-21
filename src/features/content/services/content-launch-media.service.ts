import "server-only";

import { prisma } from "@/lib/prisma";
import {
  CONTENT_LAUNCH_POLO_BUNDLE_CODE,
} from "@/features/content/launch/content-launch.constants";
import type {
  ContentLaunchMediaReadiness,
  ContentLaunchMediaSlotHealth,
} from "@/features/content/launch/content-launch.types";

export async function inspectPoloLaunchMediaBundle(): Promise<ContentLaunchMediaReadiness> {
  const bundle = await prisma.mediaBundle.findUnique({
    where: { code: CONTENT_LAUNCH_POLO_BUNDLE_CODE },
    include: {
      slots: {
        orderBy: { sortOrder: "asc" },
        include: {
          assets: {
            include: {
              mediaAsset: {
                select: {
                  id: true,
                  visibility: true,
                  altText: true,
                  title: true,
                  caption: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!bundle) {
    return {
      bundleId: null,
      bundleCode: CONTENT_LAUNCH_POLO_BUNDLE_CODE,
      bundleName: null,
      bundleStatus: null,
      editorHref: "/admin/content/media-bundles",
      publicAssetCount: 0,
      requiredSlotsFilled: 0,
      requiredSlotsTotal: 0,
      slots: [],
      missingRequiredSlots: [],
      warnings: [
        `Bundle ${CONTENT_LAUNCH_POLO_BUNDLE_CODE} chưa tồn tại. Có thể chuẩn bị qua Media Bundle editor hoặc KG media pilot (không auto-READY).`,
      ],
      readyEnoughForDraft: true, // optional media must not block draft
    };
  }

  const slots: ContentLaunchMediaSlotHealth[] = bundle.slots.map((slot) => {
    const publicAssets = slot.assets.filter((a) => a.mediaAsset.visibility === "PUBLIC");
    const privateRejected = slot.assets.length - publicAssets.length;
    void privateRejected;
    const missingAlt = publicAssets.filter((a) => !a.mediaAsset.altText?.trim()).length;
    const missingTitle = publicAssets.filter((a) => !a.mediaAsset.title?.trim()).length;
    const missingCaption = publicAssets.filter((a) => !a.mediaAsset.caption?.trim()).length;
    const filled = publicAssets.length >= Math.max(1, slot.minAssets);

    return {
      slotId: slot.id,
      slotType: slot.slotType,
      label: slot.label,
      required: slot.required,
      assetCount: slot.assets.length,
      publicAssetCount: publicAssets.length,
      missingAlt,
      missingTitle,
      missingCaption,
      filled,
    };
  });

  const required = slots.filter((s) => s.required);
  const requiredSlotsFilled = required.filter((s) => s.filled).length;
  const requiredSlotsTotal = required.length;
  const publicAssetCount = slots.reduce((sum, s) => sum + s.publicAssetCount, 0);
  const missingRequiredSlots = required.filter((s) => !s.filled).map((s) => s.label);

  const warnings: string[] = [];
  if (bundle.status !== "READY") {
    warnings.push(
      `Bundle đang ở trạng thái ${bundle.status} — không auto-READY; xuất bản Blog vẫn theo policy Featured image hiện tại.`,
    );
  }
  for (const slot of slots) {
    if (slot.assetCount > slot.publicAssetCount) {
      warnings.push(
        `Slot "${slot.label}" có asset không PUBLIC — asset private bị loại khỏi readiness công khai.`,
      );
    }
    if (slot.missingAlt > 0) {
      warnings.push(`Slot "${slot.label}" thiếu alt text trên ${slot.missingAlt} ảnh PUBLIC.`);
    }
  }
  if (missingRequiredSlots.length) {
    warnings.push(`Thiếu slot bắt buộc: ${missingRequiredSlots.join(", ")}.`);
  }

  const recommendedTypes = ["FEATURED", "HERO", "PRODUCT", "DETAIL", "MATERIAL", "PROCESS", "FACTORY", "OG_IMAGE"];
  const hasRecommended = slots.some(
    (s) => recommendedTypes.includes(s.slotType) && s.publicAssetCount > 0,
  );
  if (!hasRecommended) {
    warnings.push(
      "Chưa có slot Featured/Hero/Product/Detail khuyến nghị với ảnh PUBLIC — bài vẫn có thể soạn thảo.",
    );
  }

  return {
    bundleId: bundle.id,
    bundleCode: bundle.code ?? CONTENT_LAUNCH_POLO_BUNDLE_CODE,
    bundleName: bundle.name,
    bundleStatus: bundle.status,
    editorHref: `/admin/content/media-bundles/${bundle.id}`,
    publicAssetCount,
    requiredSlotsFilled,
    requiredSlotsTotal,
    slots,
    missingRequiredSlots,
    warnings,
    readyEnoughForDraft: true,
  };
}
