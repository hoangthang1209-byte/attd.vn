/** Navigation structure — UI config only, not SEO/catalog data. */

export type NavLink = {
  href: string;
  label: string;
};

export type NavDropdown = {
  id: string;
  label: string;
  links: NavLink[];
};

export const NAV_DROPDOWNS: NavDropdown[] = [
  {
    id: "san-pham",
    label: "Sản phẩm",
    links: [
      { href: "/ao-thun-tron", label: "Áo thun trơn" },
      { href: "/ao-polo-tron", label: "Áo polo trơn" },
      { href: "/non", label: "Nón" },
      { href: "/tote", label: "Tote" },
      { href: "/bandana", label: "Bandana" },
      { href: "/binh-giu-nhiet", label: "Bình giữ nhiệt" },
    ],
  },
  {
    id: "kho-hang",
    label: "Kho hàng",
    links: [
      { href: "/kho-ao-thun-tron", label: "Kho áo thun trơn" },
      { href: "/kho-ao-polo-tron", label: "Kho áo polo trơn" },
      { href: "/ao-thun-tron-si", label: "Áo thun trơn sỉ" },
      { href: "/ao-polo-tron-si", label: "Áo polo trơn sỉ" },
    ],
  },
  {
    id: "nguon-hang",
    label: "Nguồn hàng",
    links: [
      { href: "/nguon-hang-ao-thun-tron", label: "Nguồn hàng áo thun trơn" },
      { href: "/oem", label: "OEM" },
      { href: "/chinh-sach-dai-ly", label: "Chính sách đại lý" },
    ],
  },
  {
    id: "kien-thuc",
    label: "Kiến thức",
    links: [
      { href: "/bang-mau-ao-thun-tron", label: "Bảng màu áo thun" },
      { href: "/size-ao-thun-tron", label: "Size áo thun" },
      { href: "/vai-cotton-2-chieu", label: "Vải cotton 2 chiều" },
      { href: "/vai-cvc-la-gi", label: "Vải CVC" },
      { href: "/vai-tc-la-gi", label: "Vải TC" },
    ],
  },
];

export const NAV_DEALER_LINK: NavLink = {
  href: "/dai-ly",
  label: "Đại lý",
};

export const NAV_CONTACT_LINK: NavLink = {
  href: "/lien-he",
  label: "Liên hệ",
};

export const CONTACT_HOTLINE = "0934337667";
export const CONTACT_HOTLINE_DISPLAY = "0934 337 667";
export const CONTACT_ZALO_URL = "https://zalo.me/0934337667";
export const CONTACT_EMAIL = "contact@attd.vn";

/** Paths where the mobile sticky action bar is shown. */
export function shouldShowMobileActionBar(pathname: string): boolean {
  if (pathname === "/") return false;
  if (pathname.startsWith("/blog")) return false;
  if (pathname.startsWith("/quan-tri")) return false;
  return true;
}
