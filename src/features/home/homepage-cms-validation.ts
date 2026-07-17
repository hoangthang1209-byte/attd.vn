import type { HomepageProofIcon, HomepagePathwaySlot } from "@prisma/client";
import {
  validateHeroCtaUrl,
  validateHomepageHeroInput,
  type HomepageHeroInput,
} from "@/features/home/homepage-hero-validation";
import type {
  HomepageCompanyRealityConfig,
  HomepageEditorialSectionsConfig,
  HomepageOemBannerConfig,
  HomepageProofItemConfig,
  HomepageSourcingPathwayConfig,
  HomepageWorkshopGalleryConfig,
} from "@/features/home/homepage.types";
import { COMPANY_REALITY_ICON_KEYS, PROOF_ICON_KEYS } from "@/features/home/homepage-cms-defaults";

export { validateHeroCtaUrl, validateHomepageHeroInput, type HomepageHeroInput };

const PROOF_ITEM_KEYS = ["stock", "oem", "dealer", "delivery"] as const;
const COMPANY_REALITY_LAYOUTS = ["FEATURED_PLUS_SUPPORTING", "FOUR_EQUAL_ITEMS"] as const;
const WORKSHOP_GALLERY_LAYOUTS = ["EDITORIAL_GRID", "COMPACT_GRID", "HORIZONTAL_STRIP"] as const;
export function validateProofItemsInput(items: HomepageProofItemConfig[]): string | null {
  if (items.length !== 4) {
    return "Thanh lợi ích phải có đúng 4 mục.";
  }

  const keys = new Set<string>();
  const orders = new Set<number>();

  for (const item of items) {
    if (!PROOF_ITEM_KEYS.includes(item.itemKey as (typeof PROOF_ITEM_KEYS)[number])) {
      return "Mục lợi ích không hợp lệ.";
    }
    if (!item.title.trim()) {
      return "Vui lòng nhập tiêu đề cho từng mục lợi ích.";
    }
    if (item.title.length > 80) {
      return "Tiêu đề lợi ích không được vượt quá 80 ký tự.";
    }
    if (!PROOF_ICON_KEYS.includes(item.iconKey as HomepageProofIcon)) {
      return "Biểu tượng không hợp lệ.";
    }
    if (keys.has(item.itemKey)) return "Mục lợi ích bị trùng.";
    keys.add(item.itemKey);
    if (orders.has(item.sortOrder)) return "Thứ tự hiển thị lợi ích bị trùng.";
    orders.add(item.sortOrder);
  }

  return null;
}

export function validatePathwaysInput(items: HomepageSourcingPathwayConfig[]): string | null {
  if (items.length !== 3) {
    return "Lộ trình nguồn hàng phải có đúng 3 mục.";
  }

  const slots = new Set<string>();
  const orders = new Set<number>();

  for (const item of items) {
    if (!["STOCK", "OEM", "DEALER"].includes(item.slot)) {
      return "Loại lộ trình không hợp lệ.";
    }
    if (!item.title.trim() || !item.microLabel.trim()) {
      return "Vui lòng nhập tiêu đề và nhãn ngắn cho từng lộ trình.";
    }
    if (!item.description.trim()) {
      return "Vui lòng nhập mô tả cho từng lộ trình.";
    }
    if (!item.ctaLabel.trim()) {
      return "Vui lòng nhập nhãn nút cho từng lộ trình.";
    }
    if (item.title.length > 120 || item.microLabel.length > 80) {
      return "Tiêu đề hoặc nhãn ngắn quá dài.";
    }
    if (item.description.length > 500) {
      return "Mô tả lộ trình không được vượt quá 500 ký tự.";
    }
    const urlError = validateHeroCtaUrl(item.ctaUrl);
    if (urlError) return `Liên kết nút lộ trình: ${urlError}`;
    if (slots.has(item.slot)) return "Lộ trình bị trùng.";
    slots.add(item.slot);
    if (orders.has(item.sortOrder)) return "Thứ tự hiển thị lộ trình bị trùng.";
    orders.add(item.sortOrder);
  }

  return null;
}

export function validateOemBannerInput(input: HomepageOemBannerConfig): string | null {
  if (!input.heading.trim()) return "Vui lòng nhập tiêu đề banner OEM.";
  if (input.heading.length > 200) return "Tiêu đề banner không được vượt quá 200 ký tự.";
  if (input.eyebrow.length > 120) return "Nhãn giới thiệu không được vượt quá 120 ký tự.";
  if (input.description.length > 600) return "Mô tả banner không được vượt quá 600 ký tự.";
  if (!input.ctaLabel.trim()) return "Vui lòng nhập nhãn nút banner OEM.";
  const urlError = validateHeroCtaUrl(input.ctaUrl);
  if (urlError) return `Liên kết banner OEM: ${urlError}`;
  if (input.imageAlt && input.imageAlt.length > 200) {
    return "Mô tả ảnh không được vượt quá 200 ký tự.";
  }
  return null;
}

export function validateCompanyRealityInput(input: HomepageCompanyRealityConfig): string | null {
  if (!input.title.trim()) return "Vui lòng nhập tiêu đề ATTD trong thực tế.";
  if (input.title.length > 160) return "Tiêu đề ATTD trong thực tế không được vượt quá 160 ký tự.";
  if (input.eyebrow.length > 100) return "Nhãn ATTD trong thực tế không được vượt quá 100 ký tự.";
  if (input.description.length > 600) return "Mô tả ATTD trong thực tế không được vượt quá 600 ký tự.";
  if (!COMPANY_REALITY_LAYOUTS.includes(input.layout)) return "Layout ATTD trong thực tế không hợp lệ.";
  const keys = new Set<string>();
  let featuredCount = 0;
  for (const item of input.items) {
    if (!item.itemKey.trim() || keys.has(item.itemKey)) return "Mục ATTD trong thực tế bị trùng hoặc không hợp lệ.";
    keys.add(item.itemKey);
    if (item.active && (!item.title.trim() || !item.description.trim())) {
      return "Không thể bật mục ATTD trong thực tế khi thiếu tiêu đề hoặc mô tả.";
    }
    if (item.title.length > 120) return "Tiêu đề mục ATTD trong thực tế quá dài.";
    if (item.description.length > 500) return "Mô tả mục ATTD trong thực tế quá dài.";
    if (!COMPANY_REALITY_ICON_KEYS.includes(item.iconKey)) return "Biểu tượng ATTD trong thực tế không hợp lệ.";
    if (item.featured) featuredCount += 1;
  }
  if (featuredCount > 1) return "Chỉ được chọn một mục nổi bật.";
  return null;
}

export function validateWorkshopGalleryInput(input: HomepageWorkshopGalleryConfig): string | null {
  if (!input.title.trim()) return "Vui lòng nhập tiêu đề Góc nhìn từ xưởng.";
  if (input.title.length > 160) return "Tiêu đề Góc nhìn từ xưởng không được vượt quá 160 ký tự.";
  if (input.eyebrow.length > 100) return "Nhãn Góc nhìn từ xưởng không được vượt quá 100 ký tự.";
  if (input.description.length > 600) return "Mô tả Góc nhìn từ xưởng không được vượt quá 600 ký tự.";
  if (!WORKSHOP_GALLERY_LAYOUTS.includes(input.layout)) return "Layout Góc nhìn từ xưởng không hợp lệ.";
  if (!Number.isFinite(input.maxItems) || input.maxItems < 1 || input.maxItems > 12) {
    return "Số ảnh tối đa phải từ 1 đến 12.";
  }
  const mediaIds = new Set<string>();
  let featuredCount = 0;
  for (const item of input.items) {
    if (!item.mediaAssetId.trim()) return "Vui lòng chọn ảnh từ Thư viện Media.";
    if (mediaIds.has(item.mediaAssetId)) return "Ảnh trong Góc nhìn từ xưởng bị trùng.";
    mediaIds.add(item.mediaAssetId);
    if (item.caption && item.caption.length > 180) return "Caption ảnh không được vượt quá 180 ký tự.";
    if (item.altText && item.altText.length > 180) return "Alt text ảnh không được vượt quá 180 ký tự.";
    if (item.href) {
      const urlError = validateHeroCtaUrl(item.href);
      if (urlError) return `Liên kết ảnh: ${urlError}`;
    }
    if (item.featured) featuredCount += 1;
  }
  if (featuredCount > 1) return "Chỉ được chọn một ảnh nổi bật.";
  return null;
}

export function validateEditorialSectionsInput(
  input: HomepageEditorialSectionsConfig & { oemSectionOrder: number },
): string | null {
  const orders = [
    input.proofStripOrder,
    input.sourcingPathwaysOrder,
    input.oemSectionOrder,
  ];
  const unique = new Set(orders);
  if (unique.size !== orders.length) {
    return "Thứ tự section không được trùng nhau.";
  }
  return null;
}

export function parsePathwaySlot(value: unknown): HomepagePathwaySlot | null {
  if (value === "STOCK" || value === "OEM" || value === "DEALER") return value;
  return null;
}
