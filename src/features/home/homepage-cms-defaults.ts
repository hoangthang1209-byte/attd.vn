import type { HomepagePathwaySlot, HomepageProofIcon } from "@prisma/client";
import type {
  HomepageCmsConfig,
  HomepageCompanyRealityConfig,
  HomepageCompanyRealityIcon,
  HomepageCompanyRealityItemConfig,
  HomepageEditorialSectionsConfig,
  HomepageHeroConfig,
  HomepageOemBannerConfig,
  HomepageProofItemConfig,
  HomepageSourcingPathwayConfig,
  HomepageWorkshopGalleryConfig,
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

export const DEFAULT_COMPANY_REALITY_ITEMS: HomepageCompanyRealityItemConfig[] = [
  {
    itemKey: "experience",
    title: "14+ năm kinh nghiệm",
    description:
      "Phát triển từ nền tảng AOTHUNTHONGDIEP và nguồn hàng VietnamClothing trong ngành may mặc và đồng phục.",
    iconKey: "TIMER",
    featured: true,
    active: true,
    sortOrder: 1,
  },
  {
    itemKey: "oem",
    title: "OEM / Private Label",
    description:
      "Hỗ trợ sản xuất và hoàn thiện theo thương hiệu riêng cho đại lý, xưởng in và doanh nghiệp.",
    iconKey: "PACKAGE",
    featured: false,
    active: true,
    sortOrder: 2,
  },
  {
    itemKey: "showroom",
    title: "Showroom & Kho hàng",
    description:
      "Showroom và kho hàng tại TP. Hồ Chí Minh. Vui lòng liên hệ trước khi ghé thăm.",
    iconKey: "BUILDING",
    featured: false,
    active: true,
    sortOrder: 3,
  },
  {
    itemKey: "manufacturing",
    title: "Mạng lưới sản xuất",
    description:
      "Phối hợp sản xuất và gia công trên toàn quốc theo quy mô đơn hàng và yêu cầu triển khai.",
    iconKey: "FACTORY",
    featured: false,
    active: true,
    sortOrder: 4,
  },
];

export const DEFAULT_COMPANY_REALITY: HomepageCompanyRealityConfig = {
  enabled: true,
  eyebrow: "Thông tin công ty",
  title: "ATTD trong thực tế",
  description:
    "Những điểm cốt lõi giúp đối tác B2B đánh giá năng lực công ty trước khi hợp tác.",
  layout: "FEATURED_PLUS_SUPPORTING",
  items: DEFAULT_COMPANY_REALITY_ITEMS,
};

export const DEFAULT_WORKSHOP_GALLERY: HomepageWorkshopGalleryConfig = {
  enabled: true,
  eyebrow: "Hình ảnh vận hành",
  title: "Góc nhìn từ xưởng",
  description:
    "Một vài hình ảnh thực tế từ kho, xưởng và quy trình chuẩn bị đơn hàng tại ATTD.",
  layout: "EDITORIAL_GRID",
  maxItems: 6,
  items: [],
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

export const COMPANY_REALITY_ICON_KEYS: HomepageCompanyRealityIcon[] = [
  "TIMER",
  "PACKAGE",
  "BUILDING",
  "FACTORY",
  "SETTINGS",
  "USERS",
  "TRUCK",
];

export const PROOF_ICON_LABELS: Record<HomepageProofIcon, string> = {
  PACKAGE: "Kho hàng (Package)",
  SETTINGS: "Tùy chỉnh (Settings)",
  USERS: "Đại lý (Users)",
  TRUCK: "Giao hàng (Truck)",
};

export const COMPANY_REALITY_ICON_LABELS: Record<HomepageCompanyRealityIcon, string> = {
  TIMER: "Kinh nghiệm (Timer)",
  PACKAGE: "OEM / Sản phẩm (Package)",
  BUILDING: "Showroom / Kho (Building)",
  FACTORY: "Sản xuất (Factory)",
  SETTINGS: "Tùy chỉnh (Settings)",
  USERS: "Đối tác (Users)",
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
    companyReality: DEFAULT_COMPANY_REALITY,
    workshopGallery: DEFAULT_WORKSHOP_GALLERY,
  };
}
