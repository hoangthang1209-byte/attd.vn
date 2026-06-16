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
};

export type MegaMenuColumn = {
  title?: string;
  links: MegaMenuLink[];
  featured?: {
    title: string;
    text: string;
  };
};

export type NavMegaMenu = {
  id: string;
  label: string;
  href?: string;
  columns: MegaMenuColumn[];
};

export const NAV_MEGA_MENUS: NavMegaMenu[] = [
  {
    id: "san-pham",
    label: "Sản phẩm",
    href: "/san-pham",
    columns: [
      {
        title: "Tất cả sản phẩm",
        links: [
          {
            href: "/san-pham",
            label: "Danh mục sản phẩm sỉ",
            description: "Xem toàn bộ catalog B2B",
          },
        ],
      },
      {
        title: "Blank apparel",
        links: [
          {
            href: "/ao-thun-tron",
            label: "Áo thun trơn",
            description: "Cotton, CVC, TC — blank cho xưởng in",
          },
          {
            href: "/ao-polo-tron",
            label: "Áo polo trơn",
            description: "Pique, đồng phục doanh nghiệp",
          },
        ],
      },
      {
        title: "Quà tặng & phụ kiện",
        links: [
          { href: "/non", label: "Nón" },
          { href: "/tote", label: "Tote" },
          { href: "/bandana", label: "Bandana" },
          { href: "/binh-giu-nhiet", label: "Bình giữ nhiệt" },
        ],
      },
      {
        featured: {
          title: "Nguồn hàng B2B",
          text: "Blank apparel trơn cho đại lý, xưởng in, agency và doanh nghiệp — hỗ trợ in thêu theo yêu cầu.",
        },
        links: [],
      },
    ],
  },
  {
    id: "kho-hang",
    label: "Kho hàng",
    columns: [
      {
        title: "Kho blank",
        links: [
          {
            href: "/kho-ao-thun-tron",
            label: "Kho áo thun trơn",
            description: "Tồn kho đa màu, giao nhanh",
          },
          {
            href: "/kho-ao-polo-tron",
            label: "Kho áo polo trơn",
            description: "Polo sẵn kho cho đồng phục",
          },
        ],
      },
      {
        title: "Giá sỉ",
        links: [
          {
            href: "/ao-thun-tron-si",
            label: "Áo thun trơn sỉ",
            description: "Giá theo bậc số lượng",
          },
          {
            href: "/ao-polo-tron-si",
            label: "Áo polo trơn sỉ",
            description: "Chính sách đại lý",
          },
        ],
      },
      {
        featured: {
          title: "Wholesale apparel",
          text: "Kho hàng blank sẵn nguồn — phục vụ đại lý và xưởng in trên toàn quốc.",
        },
        links: [],
      },
    ],
  },
  {
    id: "nguon-hang",
    label: "Nguồn hàng",
    columns: [
      {
        links: [
          {
            href: "/nguon-hang-ao-thun-tron",
            label: "Nguồn hàng áo thun trơn",
            description: "Nhà cung cấp trực tiếp B2B",
          },
          {
            href: "/nguon-hang",
            label: "Tổng quan nguồn hàng",
            description: "Giải pháp sourcing ATTD",
          },
        ],
      },
      {
        links: [
          {
            href: "/oem",
            label: "OEM",
            description: "Private label & gia công",
          },
          {
            href: "/chinh-sach-dai-ly",
            label: "Chính sách đại lý",
            description: "Quyền lợi đối tác",
          },
        ],
      },
      {
        featured: {
          title: "B2B Sourcing",
          text: "Nguồn hàng ổn định cho đại lý đồng phục, xưởng in thêu và doanh nghiệp.",
        },
        links: [],
      },
    ],
  },
  {
    id: "kien-thuc",
    label: "Kiến thức",
    columns: [
      {
        title: "Hướng dẫn",
        links: [
          {
            href: "/bang-mau-ao-thun-tron",
            label: "Bảng màu áo thun",
            description: "Chọn màu đồng phục",
          },
          {
            href: "/size-ao-thun-tron",
            label: "Size áo thun",
            description: "Bảng size chuẩn",
          },
        ],
      },
      {
        title: "Chất liệu vải",
        links: [
          {
            href: "/vai-cotton-2-chieu",
            label: "Vải cotton 2 chiều",
          },
          { href: "/vai-cvc-la-gi", label: "Vải CVC" },
          { href: "/vai-tc-la-gi", label: "Vải TC" },
        ],
      },
      {
        featured: {
          title: "Kiến thức blank",
          text: "Tài liệu tham khảo cho đại lý và xưởng in khi tư vấn khách hàng doanh nghiệp.",
        },
        links: [],
      },
    ],
  },
];

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
  if (pathname === "/") return false;
  if (pathname.startsWith("/blog")) return false;
  if (pathname.startsWith("/admin") || pathname.startsWith("/quan-tri")) return false;
  return true;
}
