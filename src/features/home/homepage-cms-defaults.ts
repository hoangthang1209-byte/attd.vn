import type { HomepagePathwaySlot, HomepageProofIcon } from "@prisma/client";
import type {
  HomepageCmsConfig,
  HomepageEditorialSectionsConfig,
  HomepageHeroConfig,
  HomepageOemBannerConfig,
  HomepageProofItemConfig,
  HomepageSourcingPathwayConfig,
} from "@/features/home/homepage.types";
import { DEFAULT_HOMEPAGE_HERO } from "@/features/home/homepage-hero-defaults";

export const DEFAULT_PROOF_ITEMS: HomepageProofItemConfig[] = [
  { itemKey: "stock", title: "Hàng sẵn kho", supportingText: null, iconKey: "PACKAGE", enabled: true, sortOrder: 1 },
  { itemKey: "oem", title: "OEM theo yêu cầu", supportingText: null, iconKey: "SETTINGS", enabled: true, sortOrder: 2 },
  { itemKey: "dealer", title: "Dành cho đại lý", supportingText: null, iconKey: "USERS", enabled: true, sortOrder: 3 },
  { itemKey: "delivery", title: "Giao hàng toàn quốc", supportingText: null, iconKey: "TRUCK", enabled: true, sortOrder: 4 },
];

export const DEFAULT_SOURCING_PATHWAYS: HomepageSourcingPathwayConfig[] = [
  {
    slot: "STOCK",
    microLabel: "Sẵn sàng triển khai",
    title: "Hàng sẵn kho",
    description:
      "Khám phá các nhóm sản phẩm có sẵn để triển khai đơn hàng nhanh và chủ động hơn.",
    ctaLabel: "Xem nguồn hàng",
    ctaUrl: "/san-pham",
    mediaAssetId: null,
    imageUrl: null,
    imageAlt: null,
    enabled: true,
    sortOrder: 1,
    visualFallbackKey: "stock",
  },
  {
    slot: "OEM",
    microLabel: "Phát triển theo yêu cầu",
    title: "Đặt hàng OEM",
    description:
      "Phát triển sản phẩm theo chất liệu, màu sắc, nhận diện và yêu cầu riêng của thương hiệu.",
    ctaLabel: "Tìm hiểu OEM",
    ctaUrl: "/oem",
    mediaAssetId: null,
    imageUrl: null,
    imageAlt: null,
    enabled: true,
    sortOrder: 2,
    visualFallbackKey: "oem",
  },
  {
    slot: "DEALER",
    microLabel: "Kết nối nguồn hàng",
    title: "Nguồn hàng cho đại lý",
    description:
      "Tiếp cận danh mục và chính sách phù hợp cho đơn vị kinh doanh, agency và đối tác phân phối.",
    ctaLabel: "Dành cho đại lý",
    ctaUrl: "/dai-ly",
    mediaAssetId: null,
    imageUrl: null,
    imageAlt: null,
    enabled: true,
    sortOrder: 3,
    visualFallbackKey: "dealer",
  },
];

export const DEFAULT_OEM_BANNER: HomepageOemBannerConfig = {
  eyebrow: "OEM & Private Label",
  heading: "Phát triển nguồn hàng theo thương hiệu của bạn",
  description:
    "Từ sản phẩm sẵn có đến phương án phát triển riêng, ATTD hỗ trợ bạn xác định hướng nguồn hàng phù hợp với nhu cầu triển khai.",
  ctaLabel: "Tìm hiểu dịch vụ OEM",
  ctaUrl: "/oem",
  mediaAssetId: null,
  imageUrl: null,
  imageAlt: null,
  enabled: true,
  sectionOrder: 30,
};

export const DEFAULT_EDITORIAL_SECTIONS: HomepageEditorialSectionsConfig = {
  proofStripEnabled: true,
  proofStripOrder: 10,
  sourcingPathwaysEnabled: true,
  sourcingPathwaysOrder: 20,
};

export const PATHWAY_SLOT_TO_FALLBACK: Record<HomepagePathwaySlot, "stock" | "oem" | "dealer"> = {
  STOCK: "stock",
  OEM: "oem",
  DEALER: "dealer",
};

export const PROOF_ICON_KEYS: HomepageProofIcon[] = ["PACKAGE", "SETTINGS", "USERS", "TRUCK"];

export const PROOF_ICON_LABELS: Record<HomepageProofIcon, string> = {
  PACKAGE: "Kho hàng (Package)",
  SETTINGS: "Tùy chỉnh (Settings)",
  USERS: "Đại lý (Users)",
  TRUCK: "Giao hàng (Truck)",
};

export function mergeHeroWithDefaults(partial?: Partial<HomepageHeroConfig> | null): HomepageHeroConfig {
  return {
    eyebrow: partial?.eyebrow?.trim() || DEFAULT_HOMEPAGE_HERO.eyebrow,
    heading: partial?.heading?.trim() || DEFAULT_HOMEPAGE_HERO.heading,
    description: partial?.description?.trim() || DEFAULT_HOMEPAGE_HERO.description,
    primaryCtaLabel: partial?.primaryCtaLabel?.trim() || DEFAULT_HOMEPAGE_HERO.primaryCtaLabel,
    primaryCtaUrl: partial?.primaryCtaUrl?.trim() || DEFAULT_HOMEPAGE_HERO.primaryCtaUrl,
    secondaryCtaLabel: partial?.secondaryCtaLabel?.trim() || DEFAULT_HOMEPAGE_HERO.secondaryCtaLabel,
    secondaryCtaUrl: partial?.secondaryCtaUrl?.trim() || DEFAULT_HOMEPAGE_HERO.secondaryCtaUrl,
  };
}

/** Read-only fallback when CMS rows are missing or DB is unavailable. */
export function getDefaultHomepageCmsConfig(): HomepageCmsConfig {
  return {
    hero: DEFAULT_HOMEPAGE_HERO,
    proofStrip: {
      enabled: DEFAULT_EDITORIAL_SECTIONS.proofStripEnabled,
      order: DEFAULT_EDITORIAL_SECTIONS.proofStripOrder,
      items: DEFAULT_PROOF_ITEMS,
    },
    sourcingPathways: {
      enabled: DEFAULT_EDITORIAL_SECTIONS.sourcingPathwaysEnabled,
      order: DEFAULT_EDITORIAL_SECTIONS.sourcingPathwaysOrder,
      items: DEFAULT_SOURCING_PATHWAYS,
    },
    oemBanner: DEFAULT_OEM_BANNER,
  };
}
