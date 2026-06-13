/** Editable site UI content — not SEO/catalog data. */

export const SITE_TAGLINE =
  "KHO SỈ ĐỒNG PHỤC & QUÀ TẶNG DOANH NGHIỆP";

export const SOCIAL_PROOF = {
  title: "Tại sao đại lý và doanh nghiệp chọn ATTD?",
  metrics: [
    { value: "1000+", label: "Khách hàng" },
    { value: "50+", label: "Đối tác" },
    { value: "63", label: "Tỉnh thành" },
    { value: "10+", label: "Năm kinh nghiệm" },
  ],
} as const;

export const SOURCING_PROCESS = {
  title: "Quy trình làm việc",
  steps: [
    {
      step: 1,
      title: "Chọn sản phẩm",
      description: "Chọn dòng blank phù hợp từ danh mục áo thun, polo và quà tặng DN.",
    },
    {
      step: 2,
      title: "Nhận báo giá",
      description: "Liên hệ ATTD để nhận báo giá sỉ theo số lượng và yêu cầu gia công.",
    },
    {
      step: 3,
      title: "Sản xuất / in thêu",
      description: "Phối hợp xưởng in, thêu hoặc OEM theo file thiết kế doanh nghiệp.",
    },
    {
      step: 4,
      title: "Giao hàng",
      description: "Giao hàng toàn quốc — hỗ trợ đại lý và doanh nghiệp trên mọi miền.",
    },
  ],
} as const;

export const FOOTER_TRUST = {
  title: "Vì sao chọn ATTD",
  items: [
    "Kho hàng sẵn nguồn",
    "Hỗ trợ đại lý",
    "Hỗ trợ in thêu",
    "Giao hàng toàn quốc",
  ],
} as const;

/** Reusable trust bullets for product & category pages */
export const TRUST_BLOCK = {
  title: "Vì sao chọn ATTD",
  items: [
    "Nguồn hàng ổn định",
    "Hỗ trợ đại lý",
    "Hỗ trợ in thêu",
    "Giao hàng toàn quốc",
  ],
} as const;

/** Banner before final homepage CTA */
export const TRUST_BANNER = {
  items: [
    "Hỗ trợ đại lý toàn quốc",
    "Kho hàng nhiều danh mục",
    "Hỗ trợ in và thêu",
    "Giao hàng toàn quốc",
    "Tư vấn nhanh",
  ],
} as const;

export const HERO_MOSAIC = [
  {
    slug: "ao-thun-tron",
    label: "Áo thun trơn",
    description: "Blank cotton & CVC",
    span: "large",
  },
  {
    slug: "ao-polo-tron",
    label: "Áo polo trơn",
    description: "Pique & đồng phục",
    span: "medium",
  },
  {
    slug: "non",
    label: "Nón",
    description: "Snapback & bucket",
    span: "small",
  },
  {
    slug: "tote",
    label: "Tote",
    description: "Canvas & quà tặng",
    span: "small",
  },
  {
    slug: "bandana",
    label: "Bandana",
    description: "Phụ kiện trơn",
    span: "small",
  },
  {
    slug: "binh-giu-nhiet",
    label: "Bình giữ nhiệt",
    description: "Quà tặng DN",
    span: "wide",
  },
] as const;
