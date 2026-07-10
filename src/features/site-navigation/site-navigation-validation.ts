import type { SiteNavCtaSlot, SiteNavLinkTarget, SiteNavPlacement } from "@prisma/client";
import type {
  SiteNavCtaConfig,
  SiteNavLinkConfig,
  SiteNavigationSettingsConfig,
  SiteSocialLinkConfig,
} from "@/features/site-navigation/site-navigation.types";

function isValidExternalUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidInternalPath(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.includes(" ")) return false;
  if (trimmed.includes("://")) return false;
  return true;
}

export function validateNavHref(
  href: string,
  linkTarget: SiteNavLinkTarget,
): string | null {
  const trimmed = href.trim();
  if (!trimmed) return "URL không được để trống";

  if (linkTarget === "EXTERNAL") {
    return isValidExternalUrl(trimmed) ? null : "URL ngoài phải bắt đầu bằng http:// hoặc https://";
  }

  if (linkTarget === "INTERNAL") {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return "Liên kết nội bộ phải bắt đầu bằng /";
    }
    return isValidInternalPath(trimmed) ? null : "Đường dẫn nội bộ không hợp lệ";
  }

  return null;
}

export function validateNavItemInput(item: SiteNavLinkConfig): string | null {
  if (!item.label.trim()) return "Nhãn không được để trống";
  if (item.label.trim().length > 120) return "Nhãn tối đa 120 ký tự";

  const hrefError = validateNavHref(item.href, item.linkTarget);
  if (hrefError) return hrefError;

  if (item.description && item.description.length > 240) {
    return "Mô tả tối đa 240 ký tự";
  }

  return null;
}

/** Phase 1: root items + one child level only. */
export const MAX_NAV_NESTING_DEPTH = 2;

export function validateNavItemsHierarchy(
  placement: SiteNavPlacement,
  items: SiteNavLinkConfig[],
): string | null {
  const scoped = items.filter((item) => item.placement === placement);
  const byId = new Map(scoped.map((item) => [item.id, item]));
  const placementLabel = SITE_NAV_PLACEMENT_SHORT[placement];

  for (const item of scoped) {
    if (!item.parentId) continue;

    if (item.parentId === item.id) {
      return `${placementLabel}: "${item.label}" — mục không thể là cha của chính nó`;
    }

    const parent = byId.get(item.parentId);
    if (!parent) {
      return `${placementLabel}: "${item.label}" — mục cha không tồn tại trong cùng nhóm`;
    }

    if (parent.placement !== placement) {
      return `${placementLabel}: "${item.label}" — mục cha phải thuộc cùng vị trí`;
    }

    if (parent.parentId) {
      return `${placementLabel}: "${item.label}" — chỉ hỗ trợ tối đa ${MAX_NAV_NESTING_DEPTH} cấp menu (mục cha phải là mục gốc)`;
    }
  }

  for (const item of scoped) {
    if (!item.parentId) continue;
    const visited = new Set<string>();
    let current: SiteNavLinkConfig | undefined = item;
    while (current?.parentId) {
      if (visited.has(current.id)) {
        return `${placementLabel}: "${item.label}" — quan hệ cha-con bị vòng lặp`;
      }
      visited.add(current.id);
      const next = byId.get(current.parentId);
      if (!next) break;
      current = next;
    }
  }

  return null;
}

export function validateNavItemsForPlacement(
  placement: SiteNavPlacement,
  items: SiteNavLinkConfig[],
): string | null {
  const scoped = items.filter((item) => item.placement === placement);
  for (const item of scoped) {
    const error = validateNavItemInput(item);
    if (error) return `${SITE_NAV_PLACEMENT_SHORT[placement]}: ${error}`;
  }

  const hierarchyError = validateNavItemsHierarchy(placement, items);
  if (hierarchyError) return hierarchyError;

  return null;
}

export function validateCtaInput(cta: SiteNavCtaConfig): string | null {
  if (!cta.label.trim()) return "Nhãn CTA không được để trống";
  const hrefError = validateNavHref(cta.href, "INTERNAL");
  if (hrefError) return `CTA: ${hrefError}`;
  return null;
}

export function validateSocialLinkInput(link: SiteSocialLinkConfig): string | null {
  if (!link.label.trim()) return "Nhãn mạng xã hội không được để trống";
  if (!link.isActive) return null;
  if (!link.href.trim()) return `${link.label}: URL không được để trống khi đang bật`;
  return isValidExternalUrl(link.href) ? null : `${link.label}: URL không hợp lệ`;
}

export function validateSettingsInput(settings: SiteNavigationSettingsConfig): string | null {
  if (!settings.utilityTagline.trim()) return "Tagline thanh tiện ích không được để trống";
  if (settings.utilityTagline.length > 160) return "Tagline tối đa 160 ký tự";
  if (!settings.megaMenuTriggerLabel.trim()) return "Nhãn mega menu không được để trống";
  if (!settings.searchPlaceholder.trim()) return "Placeholder tìm kiếm không được để trống";
  if (settings.searchPlaceholder.length > 120) return "Placeholder tìm kiếm tối đa 120 ký tự";
  if (!settings.copyrightText.trim()) return "Nội dung bản quyền không được để trống";
  if (settings.copyrightText.length > 120) return "Nội dung bản quyền tối đa 120 ký tự";
  if (!settings.originText.trim()) return "Dòng xuất xứ không được để trống";
  if (settings.originText.length > 160) return "Dòng xuất xứ tối đa 160 ký tự";
  if (settings.showLegalLink) {
    if (!settings.legalLinkLabel.trim()) return "Nhãn liên kết pháp lý không được để trống khi đang bật";
    if (settings.legalLinkLabel.length > 120) return "Nhãn liên kết pháp lý tối đa 120 ký tự";
    if (!settings.legalLinkHref.trim()) return "Đường dẫn liên kết pháp lý không được để trống khi đang bật";
    const href = settings.legalLinkHref.trim();
    if (href.startsWith("/")) {
      const hrefError = validateNavHref(href, "INTERNAL");
      if (hrefError) return `Liên kết pháp lý: ${hrefError}`;
    } else if (href.startsWith("http://") || href.startsWith("https://")) {
      if (!isValidExternalUrl(href)) return "Liên kết pháp lý: URL ngoài phải bắt đầu bằng http:// hoặc https://";
    } else {
      return "Liên kết pháp lý: Đường dẫn phải bắt đầu bằng / hoặc http(s)://";
    }
  }
  return null;
}

const SITE_NAV_PLACEMENT_SHORT: Record<SiteNavPlacement, string> = {
  UTILITY_BAR: "Thanh tiện ích",
  HEADER_MENU: "Menu header",
  CATEGORY_NAV: "Danh mục ngang",
  MOBILE_MENU: "Menu mobile",
  FOOTER_PRODUCTS: "Footer sản phẩm",
  FOOTER_SERVICES: "Footer dịch vụ",
  FOOTER_COMPANY: "Footer công ty",
};

export function parseSiteNavigationPanel(value: unknown): import("@/features/site-navigation/site-navigation.types").SiteNavigationCmsPanel | null {
  if (
    value === "settings" ||
    value === "utility_bar" ||
    value === "header_menu" ||
    value === "category_nav" ||
    value === "mobile_menu" ||
    value === "footer" ||
    value === "social" ||
    value === "ctas"
  ) {
    return value;
  }
  return null;
}

export function placementForPanel(
  panel: import("@/features/site-navigation/site-navigation.types").SiteNavigationCmsPanel,
): SiteNavPlacement | SiteNavPlacement[] | null {
  switch (panel) {
    case "utility_bar":
      return "UTILITY_BAR";
    case "header_menu":
      return "HEADER_MENU";
    case "category_nav":
      return "CATEGORY_NAV";
    case "mobile_menu":
      return "MOBILE_MENU";
    case "footer":
      return ["FOOTER_PRODUCTS", "FOOTER_SERVICES", "FOOTER_COMPANY"];
    default:
      return null;
  }
}

export function normalizeSortOrders<T extends { sortOrder: number }>(items: T[]): T[] {
  return items.map((item, index) => ({ ...item, sortOrder: (index + 1) * 10 }));
}

export type { SiteNavCtaSlot };
