/** Navigation structure — UI config only, not SEO/catalog data. */

import {
  getHotlineTel,
  getHotlineDisplay,
  getZaloUrl,
  getEmail,
} from "@/lib/companyInfo";

export type NavLink = {
  href: string;
  label: string;
};

export type MegaMenuLink = NavLink & {
  description?: string;
  imageUrl?: string;
};

export type MegaMenuColumn = {
  title?: string;
  links: MegaMenuLink[];
  featured?: {
    title: string;
    text: string;
    ctaHref?: string;
    ctaLabel?: string;
    imageUrl?: string;
  };
};

export type NavMegaMenu = {
  id: string;
  label: string;
  href?: string;
  columns: MegaMenuColumn[];
};

/** Category nav row for marketplace header. */
export type MarketplaceCategoryNavItem = NavLink & {
  mega?: boolean;
};

export const MARKETPLACE_CATEGORY_NAV: MarketplaceCategoryNavItem[] = [
  { href: "/ao-thun-tron", label: "Áo thun" },
  { href: "/ao-polo-tron", label: "Polo" },
  { href: "/non", label: "Nón" },
  { href: "/tote", label: "Tote" },
  { href: "/bandana", label: "Bandana" },
  { href: "/binh-giu-nhiet", label: "Bình giữ nhiệt" },
  { href: "/gift-set-doanh-nghiep", label: "Gift set" },
  { href: "/oem", label: "OEM" },
];

/** Primary nav links (direct, no dropdown). */
export const NAV_PRIMARY_LINKS: NavLink[] = [
  { href: "/nguon-hang", label: "Nguồn hàng" },
  { href: "/oem", label: "OEM" },
  { href: "/dai-ly", label: "Đại lý" },
  { href: "/blog", label: "Kiến thức" },
  { href: "/lien-he", label: "Liên hệ" },
];

/** Sản phẩm mega menu — visual B2B marketplace nav. */
export const NAV_SAN_PHAM_MENU: NavMegaMenu = {
  id: "san-pham",
  label: "Sản phẩm",
  href: "/san-pham",
  columns: [
    {
      title: "Sản phẩm chủ lực",
      links: [
        { href: "/ao-thun-tron", label: "Áo thun trơn", description: "Blank CVC, TC, Cotton" },
        { href: "/ao-polo-tron", label: "Áo polo trơn", description: "Pique đồng phục DN" },
        { href: "/non", label: "Nón đồng phục", description: "Snapback, bucket, lưỡi trai" },
        { href: "/tote", label: "Tote bag", description: "Canvas, vải không dệt" },
        { href: "/binh-giu-nhiet", label: "Bình giữ nhiệt", description: "Inox, Tritan quà tặng" },
      ],
    },
    {
      title: "Nguồn hàng B2B",
      links: [
        { href: "/san-pham", label: "Kho sỉ đồng phục", description: "Xem toàn bộ catalog" },
        { href: "/qua-tang-doanh-nghiep", label: "Quà tặng doanh nghiệp", description: "Gift set, combo" },
        { href: "/oem", label: "OEM / Private Label", description: "Gia công nhãn hiệu" },
        { href: "/gift-set-doanh-nghiep", label: "Gift set DN", description: "Onboarding, hội nghị" },
        { href: "/dai-ly", label: "Đại lý đồng phục", description: "Chính sách đối tác" },
      ],
    },
    {
      featured: {
        title: "Gửi yêu cầu nguồn hàng",
        text: "Gửi yêu cầu nguồn hàng, ATTD tư vấn số lượng tối thiểu, thời gian giao/sản xuất và báo giá sỉ.",
        ctaHref: "/lien-he",
        ctaLabel: "Gửi yêu cầu báo giá",
      },
      links: [],
    },
  ],
};

/** @deprecated Use NAV_SAN_PHAM_MENU + NAV_PRIMARY_LINKS */
export const NAV_MEGA_MENUS: NavMegaMenu[] = [NAV_SAN_PHAM_MENU];

/** Flat link list for mobile accordion. */
export function getMegaMenuLinks(menu: NavMegaMenu): NavLink[] {
  return menu.columns.flatMap((col) =>
    col.links.map((link) => ({ href: link.href, label: link.label }))
  );
}

export const NAV_DEALER_LINK: NavLink = {
  href: "/dai-ly",
  label: "Đại lý",
};

export const NAV_CONTACT_LINK: NavLink = {
  href: "/lien-he",
  label: "Liên hệ",
};

/** @deprecated Use companyInfo via getHotlineTel() */
export const CONTACT_HOTLINE = getHotlineTel();
/** @deprecated Use companyInfo via getHotlineDisplay() */
export const CONTACT_HOTLINE_DISPLAY = getHotlineDisplay();
/** @deprecated Use companyInfo via getZaloUrl() */
export const CONTACT_ZALO_URL = getZaloUrl();
/** @deprecated Use companyInfo via getEmail() */
export const CONTACT_EMAIL = getEmail();

export function shouldShowMobileActionBar(pathname: string): boolean {
  if (pathname.startsWith("/blog")) return false;
  if (pathname.startsWith("/admin") || pathname.startsWith("/quan-tri")) return false;
  return true;
}
