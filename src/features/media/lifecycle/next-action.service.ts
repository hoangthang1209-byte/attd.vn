/**
 * Deterministic next-action recommender for Asset Workspace (no AI).
 */

import type { MediaLifecycleStatus, MediaRightsStatus, MediaVisibility } from "@prisma/client";

export type AssetNextAction = {
  code:
    | "ADD_ALT"
    | "REVIEW_METADATA"
    | "RESOLVE_RIGHTS"
    | "REPLACE_PUBLIC"
    | "ARCHIVE_UNUSED"
    | "RESTORE_ACTIVE"
    | "REVIEW_DUPLICATE"
    | "ADD_TO_BUNDLE"
    | "NONE";
  label: string;
  section: "overview" | "lifecycle" | "rights" | "usage" | "replacement" | "bundles";
};

export function recommendAssetNextAction(input: {
  altText?: string | null;
  title?: string | null;
  lifecycleStatus: MediaLifecycleStatus;
  visibility: MediaVisibility;
  rightsStatus: MediaRightsStatus;
  rightsExpiresAt?: Date | null;
  publicReferenceCount: number;
  totalReferenceCount: number;
  replacementAssetId?: string | null;
  duplicateStatus?: string | null;
  bundleCount: number;
  seoScore?: number | null;
}): AssetNextAction {
  if (input.lifecycleStatus === "RETIRED" || input.lifecycleStatus === "ARCHIVED") {
    return {
      code: "RESTORE_ACTIVE",
      label: "Khôi phục ACTIVE nếu ảnh vẫn cần dùng",
      section: "lifecycle",
    };
  }
  if (input.lifecycleStatus === "DEPRECATED" && input.publicReferenceCount > 0) {
    return {
      code: "REPLACE_PUBLIC",
      label: "Thay thế các chỗ dùng công khai",
      section: "replacement",
    };
  }
  if (
    input.rightsStatus === "UNKNOWN" &&
    input.visibility === "PUBLIC" &&
    input.publicReferenceCount > 0
  ) {
    return {
      code: "RESOLVE_RIGHTS",
      label: "Bổ sung quyền sử dụng cho ảnh công khai",
      section: "rights",
    };
  }
  if (
    input.rightsStatus === "LICENSED" &&
    input.rightsExpiresAt &&
    input.rightsExpiresAt.getTime() < Date.now()
  ) {
    return {
      code: "RESOLVE_RIGHTS",
      label: "Quyền đã hết hạn — cần review",
      section: "rights",
    };
  }
  if (!input.altText?.trim()) {
    return { code: "ADD_ALT", label: "Thêm alt text", section: "overview" };
  }
  if (input.duplicateStatus === "CONFIRMED_DUPLICATE" || input.duplicateStatus === "POSSIBLE_DUPLICATE") {
    return {
      code: "REVIEW_DUPLICATE",
      label: "Xử lý ảnh trùng",
      section: "overview",
    };
  }
  if (input.replacementAssetId && input.publicReferenceCount > 0) {
    return {
      code: "REPLACE_PUBLIC",
      label: "Áp dụng replacement đã chọn",
      section: "replacement",
    };
  }
  if ((input.seoScore ?? 0) < 50 || !input.title?.trim()) {
    return {
      code: "REVIEW_METADATA",
      label: "Hoàn thiện metadata",
      section: "overview",
    };
  }
  if (input.totalReferenceCount === 0 && input.lifecycleStatus === "ACTIVE") {
    return {
      code: "ARCHIVE_UNUSED",
      label: "Ảnh chưa dùng — cân nhắc Archive",
      section: "lifecycle",
    };
  }
  if (input.bundleCount === 0 && input.visibility === "PUBLIC") {
    return {
      code: "ADD_TO_BUNDLE",
      label: "Thêm vào Media Bundle",
      section: "bundles",
    };
  }
  return { code: "NONE", label: "Không có hành động bắt buộc", section: "overview" };
}
