import type { HomepageProofIcon, HomepagePathwaySlot } from "@prisma/client";
import {
  validateHeroCtaUrl,
  validateHomepageHeroInput,
  type HomepageHeroInput,
} from "@/features/home/homepage-hero-validation";
import type {
  HomepageEditorialSectionsConfig,
  HomepageOemBannerConfig,
  HomepageProofItemConfig,
  HomepageSourcingPathwayConfig,
} from "@/features/home/homepage.types";
import { PROOF_ICON_KEYS } from "@/features/home/homepage-cms-defaults";

export { validateHeroCtaUrl, validateHomepageHeroInput, type HomepageHeroInput };

const PROOF_ITEM_KEYS = ["stock", "oem", "dealer", "delivery"] as const;

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
