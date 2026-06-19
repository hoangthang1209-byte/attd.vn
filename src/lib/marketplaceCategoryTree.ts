/** Static B2B parent groups — used when DB has no parent/child hierarchy. */

export type StaticCategoryChild = {
  name: string;
  slug: string;
};

export type StaticCategoryParent = {
  id: string;
  name: string;
  slug: string;
  children: StaticCategoryChild[];
};

export const MARKETPLACE_PARENT_GROUPS: StaticCategoryParent[] = [
  {
    id: "dong-phuc",
    name: "Đồng phục",
    slug: "ao-khoac-dong-phuc",
    children: [
      { name: "Áo thun đồng phục", slug: "ao-thun-tron" },
      { name: "Áo polo đồng phục", slug: "ao-polo-tron" },
      { name: "Áo khoác đồng phục", slug: "ao-khoac-dong-phuc" },
      { name: "Đồng phục sự kiện", slug: "ao-thun-tron" },
    ],
  },
  {
    id: "ao-thun",
    name: "Áo thun",
    slug: "ao-thun-tron",
    children: [
      { name: "Áo thun trơn", slug: "ao-thun-tron" },
      { name: "Áo thun CVC", slug: "ao-thun-tron" },
      { name: "Áo thun cotton", slug: "ao-thun-tron" },
      { name: "Áo thun oversize", slug: "ao-thun-tron" },
      { name: "Áo thun boxy", slug: "ao-thun-tron" },
    ],
  },
  {
    id: "ao-polo",
    name: "Áo polo",
    slug: "ao-polo-tron",
    children: [
      { name: "Polo trơn", slug: "ao-polo-tron" },
      { name: "Polo cá sấu", slug: "ao-polo-tron" },
      { name: "Polo poly", slug: "ao-polo-tron" },
      { name: "Polo doanh nghiệp", slug: "ao-polo-tron" },
    ],
  },
  {
    id: "non-phu-kien",
    name: "Nón & phụ kiện",
    slug: "non-dong-phuc",
    children: [
      { name: "Nón lưỡi trai", slug: "non-dong-phuc" },
      { name: "Nón bucket", slug: "non-dong-phuc" },
      { name: "Bandana", slug: "khan-bandana" },
      { name: "Khăn sự kiện", slug: "khan-bandana" },
    ],
  },
  {
    id: "tui-tote",
    name: "Túi & tote",
    slug: "tote-bag",
    children: [
      { name: "Tote canvas", slug: "tote-bag" },
      { name: "Tote vải bố", slug: "tote-bag" },
      { name: "Túi quà tặng", slug: "gift-set-doanh-nghiep" },
      { name: "Túi sự kiện", slug: "tote-bag" },
    ],
  },
  {
    id: "binh-giu-nhiet",
    name: "Bình giữ nhiệt",
    slug: "binh-giu-nhiet",
    children: [
      { name: "Bình inox", slug: "binh-giu-nhiet" },
      { name: "Ly giữ nhiệt", slug: "binh-giu-nhiet" },
      { name: "Bình in logo", slug: "binh-giu-nhiet" },
    ],
  },
  {
    id: "qua-tang",
    name: "Quà tặng doanh nghiệp",
    slug: "gift-set-doanh-nghiep",
    children: [
      { name: "Gift set", slug: "gift-set-doanh-nghiep" },
      { name: "Sổ tay", slug: "gift-set-doanh-nghiep" },
      { name: "Bút", slug: "gift-set-doanh-nghiep" },
      { name: "Bộ quà tặng nhân viên", slug: "gift-set-doanh-nghiep" },
    ],
  },
  {
    id: "oem",
    name: "OEM / Private Label",
    slug: "oem-private-label",
    children: [
      { name: "OEM áo thun", slug: "ao-thun-tron" },
      { name: "OEM polo", slug: "ao-polo-tron" },
      { name: "Private label", slug: "oem-private-label" },
      { name: "Sản xuất theo mẫu", slug: "oem-private-label" },
    ],
  },
];

export function catalogCategoryHref(slug: string): string {
  return `/san-pham?category=${encodeURIComponent(slug)}`;
}
