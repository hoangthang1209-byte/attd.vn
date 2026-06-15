/**
 * ATTD Demo Content Data — Patch 24.9.3c
 * Realistic B2B wholesale demo for ATTD.vn website preview.
 * All records marked with isDemo: true for safe idempotent seeding & deletion.
 */

export const DEMO_KEY = "attd-demo-2026";

// ─── Image helpers ────────────────────────────────────────────────────────────
// picsum.photos stable placeholder images keyed by seed string
const img = (seed: string, w = 800, h = 800) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

// ─── Types ───────────────────────────────────────────────────────────────────

export type DemoCategoryData = {
  name: string; slug: string; skuCode: string;
  description: string; sortOrder: number;
};

export type DemoVariantData = {
  sku: string; colorName?: string; colorCode?: string;
  sizeName?: string; capacity?: string; dimensions?: string;
  wholesalePrice: number; dealerPrice: number;
  stockQty: number; stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  imageUrl?: string;
};

export type DemoProductData = {
  name: string; slug: string; productCode: string;
  categorySlug: string; shortDescription: string; description: string;
  material: string; form?: string; fit?: string;
  defaultMoq: number; leadTime: string;
  supportsPrinting: boolean; supportsEmbroidery: boolean; supportsOem: boolean;
  useCases: string[]; targetCustomers: string[];
  tags: string[]; featuredImage: string; gallery: string[];
  variants: DemoVariantData[];
};

export type DemoBlogCategoryData = { name: string; slug: string; description: string };

export type DemoBlogPostData = {
  title: string; slug: string; excerpt: string; content: string;
  featuredImageUrl: string; categorySlug: string;
  tags: string[]; metaTitle: string; metaDescription: string;
};

export type DemoLandingPageData = {
  slug: string; title: string; heroTitle: string; heroDescription: string;
  seoContent: string; metaTitle: string; metaDescription: string;
  primaryCtaLabel: string; primaryCtaHref: string;
  secondaryCtaLabel: string; secondaryCtaHref: string;
};

export type DemoKbCategoryData = { name: string; slug: string; description: string; sortOrder: number };

export type DemoKbEntryData = {
  title: string; slug: string; summary: string; content: string;
  categorySlug: string; type: string;
  tags: string[]; priority: "HIGH" | "MEDIUM" | "LOW";
  isFeatured: boolean; isVerified: boolean;
};

export type DemoClientLogoData = {
  companyName: string; website?: string; imageUrl: string; sortOrder: number;
};

export type DemoCaseStudyData = {
  title: string; category: string; quantity: string; timeline: string;
  summary: string; imageUrl: string; sortOrder: number;
};

// ─── 1. Product Categories ───────────────────────────────────────────────────

export const DEMO_CATEGORIES: DemoCategoryData[] = [
  { name: "Áo thun trơn", slug: "ao-thun-tron", skuCode: "AT", sortOrder: 1,
    description: "Kho sỉ áo thun trơn CVC, TC, Cotton 100% cho đồng phục và quà tặng B2B." },
  { name: "Áo polo trơn", slug: "ao-polo-tron", skuCode: "AP", sortOrder: 2,
    description: "Áo polo trơn sỉ cho đồng phục doanh nghiệp, agency và đại lý." },
  { name: "Áo khoác đồng phục", slug: "ao-khoac-dong-phuc", skuCode: "AK", sortOrder: 3,
    description: "Áo khoác gió, hoodie trơn sỉ cho đồng phục sự kiện và quà tặng." },
  { name: "Nón đồng phục", slug: "non-dong-phuc", skuCode: "ND", sortOrder: 4,
    description: "Nón lưỡi trai, nón bucket cotton cho đồng phục và sự kiện B2B." },
  { name: "Tote bag", slug: "tote-bag", skuCode: "TB", sortOrder: 5,
    description: "Tote canvas, túi vải không dệt sỉ cho doanh nghiệp và sự kiện." },
  { name: "Bình giữ nhiệt", slug: "binh-giu-nhiet", skuCode: "BGN", sortOrder: 6,
    description: "Bình giữ nhiệt inox, bình Tritan quà tặng doanh nghiệp sỉ." },
  { name: "Khăn bandana", slug: "khan-bandana", skuCode: "KBD", sortOrder: 7,
    description: "Khăn bandana polyester và cotton sỉ cho sự kiện và đồng phục." },
  { name: "Gift set doanh nghiệp", slug: "gift-set-doanh-nghiep", skuCode: "GS", sortOrder: 8,
    description: "Combo quà tặng doanh nghiệp sỉ cho onboarding, hội nghị, activation." },
  { name: "OEM / Private Label", slug: "oem-private-label", skuCode: "OEM", sortOrder: 9,
    description: "Đặt hàng OEM và private label cho thương hiệu và nhà phân phối." },
];

// ─── 2. Products (18 demo products) ──────────────────────────────────────────

export const DEMO_PRODUCTS: DemoProductData[] = [
  // ── Áo thun ──
  {
    name: "Áo thun CVC Basic",
    slug: "ao-thun-cvc-basic",
    productCode: "CVC-BASIC",
    categorySlug: "ao-thun-tron",
    shortDescription: "Áo thun CVC trơn bền màu, thoáng mát — nguồn hàng sỉ số lượng lớn.",
    description: "Áo thun CVC 65/35 trọng lượng 175–185g/m². Vải mềm, bền màu, không co rút sau nhiều lần giặt. Phù hợp in lụa, in DTG, thêu vi tính. Nguồn hàng B2B cho xưởng in, agency, đại lý đồng phục.",
    material: "CVC 65/35", form: "Regular fit", fit: "Unisex",
    defaultMoq: 50, leadTime: "Có sẵn: 1–3 ngày",
    supportsPrinting: true, supportsEmbroidery: true, supportsOem: true,
    useCases: ["Xưởng in", "Đồng phục công ty", "Đại lý sỉ", "Agency sự kiện"],
    targetCustomers: ["Đại lý sỉ", "Xưởng in", "Doanh nghiệp", "Agency"],
    tags: ["áo thun trơn", "CVC", "nguồn hàng sỉ", "đồng phục"],
    featuredImage: img("attd-cvc-1"),
    gallery: [img("attd-cvc-2"), img("attd-cvc-3"), img("attd-cvc-4")],
    variants: [
      { sku: "AT-CVC-BLK-M", colorName: "Đen", colorCode: "BLK", sizeName: "M", wholesalePrice: 45000, dealerPrice: 42000, stockQty: 500, stockStatus: "IN_STOCK", imageUrl: img("attd-cvc-blk") },
      { sku: "AT-CVC-BLK-L", colorName: "Đen", colorCode: "BLK", sizeName: "L", wholesalePrice: 45000, dealerPrice: 42000, stockQty: 480, stockStatus: "IN_STOCK" },
      { sku: "AT-CVC-BLK-XL", colorName: "Đen", colorCode: "BLK", sizeName: "XL", wholesalePrice: 46000, dealerPrice: 43000, stockQty: 300, stockStatus: "IN_STOCK" },
      { sku: "AT-CVC-WHT-M", colorName: "Trắng", colorCode: "WHT", sizeName: "M", wholesalePrice: 45000, dealerPrice: 42000, stockQty: 600, stockStatus: "IN_STOCK", imageUrl: img("attd-cvc-wht") },
      { sku: "AT-CVC-WHT-L", colorName: "Trắng", colorCode: "WHT", sizeName: "L", wholesalePrice: 45000, dealerPrice: 42000, stockQty: 550, stockStatus: "IN_STOCK" },
      { sku: "AT-CVC-WHT-XL", colorName: "Trắng", colorCode: "WHT", sizeName: "XL", wholesalePrice: 46000, dealerPrice: 43000, stockQty: 400, stockStatus: "IN_STOCK" },
      { sku: "AT-CVC-NVY-M", colorName: "Navy", colorCode: "NVY", sizeName: "M", wholesalePrice: 45000, dealerPrice: 42000, stockQty: 450, stockStatus: "IN_STOCK", imageUrl: img("attd-cvc-nvy") },
      { sku: "AT-CVC-NVY-L", colorName: "Navy", colorCode: "NVY", sizeName: "L", wholesalePrice: 45000, dealerPrice: 42000, stockQty: 420, stockStatus: "IN_STOCK" },
      { sku: "AT-CVC-NVY-XL", colorName: "Navy", colorCode: "NVY", sizeName: "XL", wholesalePrice: 46000, dealerPrice: 43000, stockQty: 250, stockStatus: "LOW_STOCK" },
    ],
  },
  {
    name: "Áo thun Cotton 2 chiều",
    slug: "ao-thun-cotton-2-chieu",
    productCode: "CT2C",
    categorySlug: "ao-thun-tron",
    shortDescription: "Áo thun cotton 100% co giãn 2 chiều, mềm mịn, dùng cho đồng phục và quà tặng.",
    description: "Áo thun cotton 100% dệt co giãn 2 chiều. Trọng lượng 190–200g/m². Vải mềm mịn, thấm hút tốt, không phai màu. Phù hợp cho đồng phục nhân viên, sự kiện activation, quà tặng onboarding.",
    material: "Cotton 100%", form: "Regular fit", fit: "Unisex",
    defaultMoq: 50, leadTime: "Có sẵn: 1–3 ngày",
    supportsPrinting: true, supportsEmbroidery: true, supportsOem: false,
    useCases: ["Đồng phục công ty", "Sự kiện", "Quà tặng"],
    targetCustomers: ["Doanh nghiệp", "Agency", "Đại lý sỉ"],
    tags: ["áo thun cotton", "co giãn 2 chiều", "đồng phục"],
    featuredImage: img("attd-ct2-1"),
    gallery: [img("attd-ct2-2"), img("attd-ct2-3")],
    variants: [
      { sku: "AT-CT2-BLK-L", colorName: "Đen", colorCode: "BLK", sizeName: "L", wholesalePrice: 55000, dealerPrice: 52000, stockQty: 300, stockStatus: "IN_STOCK" },
      { sku: "AT-CT2-WHT-L", colorName: "Trắng", colorCode: "WHT", sizeName: "L", wholesalePrice: 55000, dealerPrice: 52000, stockQty: 350, stockStatus: "IN_STOCK" },
      { sku: "AT-CT2-GRY-L", colorName: "Xám", colorCode: "GRY", sizeName: "L", wholesalePrice: 55000, dealerPrice: 52000, stockQty: 200, stockStatus: "IN_STOCK" },
    ],
  },

  // ── Áo polo ──
  {
    name: "Áo polo cá sấu Poly",
    slug: "ao-polo-ca-sau-poly",
    productCode: "PCY",
    categorySlug: "ao-polo-tron",
    shortDescription: "Áo polo cá sấu polyester pique, thoáng mát, bền màu — định lượng 200g/m².",
    description: "Áo polo pique polyester 100%. Định lượng 200–210g/m². Cổ bẻ 3 cúc, tay ngắn. Vải thoáng mát, nhanh khô, bền màu. Phù hợp đồng phục nhân viên bán hàng, sự kiện ngoài trời, activation.",
    material: "Polyester pique 100%", form: "Regular", fit: "Unisex",
    defaultMoq: 50, leadTime: "Có sẵn: 1–3 ngày",
    supportsPrinting: true, supportsEmbroidery: true, supportsOem: false,
    useCases: ["Đồng phục nhân viên", "Sự kiện ngoài trời", "Activation"],
    targetCustomers: ["Doanh nghiệp", "Agency sự kiện"],
    tags: ["áo polo trơn", "pique polyester", "đồng phục"],
    featuredImage: img("attd-polo-1"),
    gallery: [img("attd-polo-2"), img("attd-polo-3")],
    variants: [
      { sku: "AP-PCY-BLK-M", colorName: "Đen", colorCode: "BLK", sizeName: "M", wholesalePrice: 65000, dealerPrice: 61000, stockQty: 400, stockStatus: "IN_STOCK" },
      { sku: "AP-PCY-BLK-L", colorName: "Đen", colorCode: "BLK", sizeName: "L", wholesalePrice: 65000, dealerPrice: 61000, stockQty: 380, stockStatus: "IN_STOCK" },
      { sku: "AP-PCY-WHT-M", colorName: "Trắng", colorCode: "WHT", sizeName: "M", wholesalePrice: 65000, dealerPrice: 61000, stockQty: 450, stockStatus: "IN_STOCK" },
      { sku: "AP-PCY-WHT-L", colorName: "Trắng", colorCode: "WHT", sizeName: "L", wholesalePrice: 65000, dealerPrice: 61000, stockQty: 420, stockStatus: "IN_STOCK" },
      { sku: "AP-PCY-NVY-M", colorName: "Navy", colorCode: "NVY", sizeName: "M", wholesalePrice: 65000, dealerPrice: 61000, stockQty: 300, stockStatus: "IN_STOCK" },
      { sku: "AP-PCY-NVY-L", colorName: "Navy", colorCode: "NVY", sizeName: "L", wholesalePrice: 65000, dealerPrice: 61000, stockQty: 280, stockStatus: "IN_STOCK" },
    ],
  },
  {
    name: "Áo polo Cotton cao cấp",
    slug: "ao-polo-cotton-cao-cap",
    productCode: "PCO",
    categorySlug: "ao-polo-tron",
    shortDescription: "Áo polo cotton cao cấp 220g/m², mềm mịn, phù hợp đồng phục văn phòng.",
    description: "Áo polo cotton 100% cao cấp. Định lượng 220–230g/m². Cổ bẻ bo chắc, tay ngắn. Vải mềm, hút ẩm tốt, không xù lông. Phù hợp đồng phục văn phòng, nhân viên cấp cao, quà tặng doanh nghiệp.",
    material: "Cotton 100% cao cấp", form: "Slim fit", fit: "Unisex",
    defaultMoq: 30, leadTime: "Có sẵn: 2–5 ngày",
    supportsPrinting: true, supportsEmbroidery: true, supportsOem: true,
    useCases: ["Đồng phục văn phòng", "Quà tặng cấp cao", "OEM private label"],
    targetCustomers: ["Doanh nghiệp lớn", "Agency cao cấp"],
    tags: ["áo polo cotton", "đồng phục văn phòng", "cao cấp"],
    featuredImage: img("attd-polo-co-1"),
    gallery: [img("attd-polo-co-2"), img("attd-polo-co-3")],
    variants: [
      { sku: "AP-PCO-BLK-M", colorName: "Đen", colorCode: "BLK", sizeName: "M", wholesalePrice: 85000, dealerPrice: 80000, stockQty: 200, stockStatus: "IN_STOCK" },
      { sku: "AP-PCO-WHT-M", colorName: "Trắng", colorCode: "WHT", sizeName: "M", wholesalePrice: 85000, dealerPrice: 80000, stockQty: 220, stockStatus: "IN_STOCK" },
      { sku: "AP-PCO-NVY-L", colorName: "Navy", colorCode: "NVY", sizeName: "L", wholesalePrice: 85000, dealerPrice: 80000, stockQty: 180, stockStatus: "IN_STOCK" },
    ],
  },

  // ── Áo khoác / Hoodie ──
  {
    name: "Áo khoác gió đồng phục",
    slug: "ao-khoac-gio-dong-phuc",
    productCode: "KGD",
    categorySlug: "ao-khoac-dong-phuc",
    shortDescription: "Áo khoác gió chống thấm nhẹ, nhẹ nhàng, phù hợp đồng phục sự kiện ngoài trời.",
    description: "Áo khoác gió vải dù chống thấm nhẹ. Lớp ngoài polyester 100%, lót lưới thoáng. Có túi 2 bên và túi ngực. Phù hợp đồng phục sự kiện outdoor, tour du lịch, đội tình nguyện.",
    material: "Vải dù chống thấm nhẹ", form: "Regular",
    defaultMoq: 30, leadTime: "Đặt hàng: 5–10 ngày",
    supportsPrinting: true, supportsEmbroidery: false, supportsOem: true,
    useCases: ["Đồng phục sự kiện", "Tour du lịch", "Đội tình nguyện"],
    targetCustomers: ["Agency sự kiện", "Doanh nghiệp"],
    tags: ["áo khoác gió", "đồng phục sự kiện", "chống thấm"],
    featuredImage: img("attd-jacket-1"),
    gallery: [img("attd-jacket-2"), img("attd-jacket-3")],
    variants: [
      { sku: "AK-KGD-BLK-L", colorName: "Đen", colorCode: "BLK", sizeName: "L", wholesalePrice: 120000, dealerPrice: 115000, stockQty: 150, stockStatus: "IN_STOCK" },
      { sku: "AK-KGD-NVY-L", colorName: "Navy", colorCode: "NVY", sizeName: "L", wholesalePrice: 120000, dealerPrice: 115000, stockQty: 130, stockStatus: "IN_STOCK" },
      { sku: "AK-KGD-RED-L", colorName: "Đỏ", colorCode: "RED", sizeName: "L", wholesalePrice: 120000, dealerPrice: 115000, stockQty: 80, stockStatus: "LOW_STOCK" },
    ],
  },
  {
    name: "Hoodie trơn OEM",
    slug: "hoodie-tron-oem",
    productCode: "HDD",
    categorySlug: "ao-khoac-dong-phuc",
    shortDescription: "Hoodie trơn unisex 320g/m², form rộng — nền tốt cho in và thêu OEM.",
    description: "Hoodie trơn chất liệu cotton fleece 320g/m². Form oversize, mũ chụp có dây rút. Vải dày ấm, phù hợp in DTG, in lụa, thêu 3D. Là sản phẩm nền phổ biến cho OEM private label thời trang.",
    material: "Cotton fleece 320g/m²", form: "Oversize",
    defaultMoq: 30, leadTime: "OEM: 10–20 ngày tùy số lượng",
    supportsPrinting: true, supportsEmbroidery: true, supportsOem: true,
    useCases: ["OEM thời trang", "Streetwear", "Quà tặng cao cấp"],
    targetCustomers: ["Thương hiệu thời trang", "Đại lý OEM"],
    tags: ["hoodie", "OEM", "private label", "oversize"],
    featuredImage: img("attd-hoodie-1"),
    gallery: [img("attd-hoodie-2"), img("attd-hoodie-3")],
    variants: [
      { sku: "AK-HDD-BLK-L", colorName: "Đen", colorCode: "BLK", sizeName: "L", wholesalePrice: 145000, dealerPrice: 138000, stockQty: 200, stockStatus: "IN_STOCK" },
      { sku: "AK-HDD-WHT-L", colorName: "Trắng", colorCode: "WHT", sizeName: "L", wholesalePrice: 145000, dealerPrice: 138000, stockQty: 180, stockStatus: "IN_STOCK" },
      { sku: "AK-HDD-GRY-L", colorName: "Xám", colorCode: "GRY", sizeName: "L", wholesalePrice: 145000, dealerPrice: 138000, stockQty: 150, stockStatus: "IN_STOCK" },
    ],
  },

  // ── Nón ──
  {
    name: "Nón lưỡi trai Cotton",
    slug: "non-luoi-trai-cotton",
    productCode: "NLC",
    categorySlug: "non-dong-phuc",
    shortDescription: "Nón lưỡi trai 6 múi cotton, có thể in/thêu logo theo yêu cầu.",
    description: "Nón lưỡi trai 6 múi cotton twill. Khóa lưng nhựa điều chỉnh. Phần trước phẳng dễ thêu logo. Phù hợp đồng phục nhân viên ngoài trời, sự kiện, activation thương hiệu.",
    material: "Cotton twill", form: "6-panel structured",
    defaultMoq: 50, leadTime: "Đặt hàng: 5–10 ngày",
    supportsPrinting: true, supportsEmbroidery: true, supportsOem: false,
    useCases: ["Đồng phục ngoài trời", "Sự kiện", "Activation"],
    targetCustomers: ["Agency sự kiện", "Doanh nghiệp"],
    tags: ["nón lưỡi trai", "cotton", "đồng phục sự kiện"],
    featuredImage: img("attd-cap-1"),
    gallery: [img("attd-cap-2"), img("attd-cap-3")],
    variants: [
      { sku: "ND-NLC-BLK-OS", colorName: "Đen", colorCode: "BLK", sizeName: "OneSize", wholesalePrice: 35000, dealerPrice: 32000, stockQty: 300, stockStatus: "IN_STOCK" },
      { sku: "ND-NLC-WHT-OS", colorName: "Trắng", colorCode: "WHT", sizeName: "OneSize", wholesalePrice: 35000, dealerPrice: 32000, stockQty: 280, stockStatus: "IN_STOCK" },
      { sku: "ND-NLC-NVY-OS", colorName: "Navy", colorCode: "NVY", sizeName: "OneSize", wholesalePrice: 35000, dealerPrice: 32000, stockQty: 250, stockStatus: "IN_STOCK" },
    ],
  },
  {
    name: "Nón bucket sự kiện",
    slug: "non-bucket-su-kien",
    productCode: "NBK",
    categorySlug: "non-dong-phuc",
    shortDescription: "Nón bucket vành mềm unisex cho sự kiện, activation và quà tặng thương hiệu.",
    description: "Nón bucket cotton 100%, vành rộng mềm. Có thể in hoặc thêu logo 4 phía. Phổ biến trong các chương trình activation thương hiệu, lễ hội, sự kiện ngoài trời.",
    material: "Cotton 100%", form: "Bucket unisex",
    defaultMoq: 50, leadTime: "Đặt hàng: 5–10 ngày",
    supportsPrinting: true, supportsEmbroidery: true, supportsOem: false,
    useCases: ["Activation thương hiệu", "Lễ hội", "Sự kiện ngoài trời"],
    targetCustomers: ["Agency sự kiện", "Brand activation"],
    tags: ["nón bucket", "sự kiện", "activation thương hiệu"],
    featuredImage: img("attd-bucket-1"),
    gallery: [img("attd-bucket-2")],
    variants: [
      { sku: "ND-NBK-BLK-OS", colorName: "Đen", colorCode: "BLK", sizeName: "OneSize", wholesalePrice: 38000, dealerPrice: 35000, stockQty: 200, stockStatus: "IN_STOCK" },
      { sku: "ND-NBK-NAT-OS", colorName: "Kem", colorCode: "NAT", sizeName: "OneSize", wholesalePrice: 38000, dealerPrice: 35000, stockQty: 220, stockStatus: "IN_STOCK" },
    ],
  },

  // ── Tote bag ──
  {
    name: "Tote canvas Basic",
    slug: "tote-canvas-basic",
    productCode: "TCV",
    categorySlug: "tote-bag",
    shortDescription: "Tote bag canvas natural 380g/m², quai dài, phù hợp in logo và quà tặng sỉ.",
    description: "Tote bag canvas cotton 100% nặng 380g/m². Kích thước 38x40cm, quai dài 60cm. Không có lớp lót. Màu natural (kem) là phổ biến nhất cho in logo thương hiệu. Dùng cho quà tặng hội nghị, hội thảo, sự kiện.",
    material: "Canvas cotton 100%",
    defaultMoq: 100, leadTime: "Đặt hàng: 5–10 ngày",
    supportsPrinting: true, supportsEmbroidery: false, supportsOem: false,
    useCases: ["Quà tặng hội nghị", "Sự kiện thương hiệu", "Hội thảo"],
    targetCustomers: ["Agency sự kiện", "Doanh nghiệp"],
    tags: ["tote bag", "canvas", "quà tặng sự kiện"],
    featuredImage: img("attd-tote-1"),
    gallery: [img("attd-tote-2"), img("attd-tote-3")],
    variants: [
      { sku: "TB-TCV-NAT-OS", colorName: "Natural", colorCode: "NAT", sizeName: "OneSize", wholesalePrice: 28000, dealerPrice: 25000, stockQty: 500, stockStatus: "IN_STOCK" },
      { sku: "TB-TCV-BLK-OS", colorName: "Đen", colorCode: "BLK", sizeName: "OneSize", wholesalePrice: 28000, dealerPrice: 25000, stockQty: 350, stockStatus: "IN_STOCK" },
    ],
  },
  {
    name: "Túi vải không dệt",
    slug: "tui-vai-khong-det",
    productCode: "TVK",
    categorySlug: "tote-bag",
    shortDescription: "Túi vải không dệt 80gsm, gấp gọn — đóng gói và phân phối số lượng lớn.",
    description: "Túi vải không dệt PP 80gsm. Kích thước 35x40cm, quai ngắn. Gấp gọn, dễ vận chuyển. Phổ biến cho quà tặng hội nghị số lượng lớn, túi đựng nón, áo sự kiện.",
    material: "Vải không dệt PP 80gsm",
    defaultMoq: 200, leadTime: "Có sẵn: 1–3 ngày",
    supportsPrinting: true, supportsEmbroidery: false, supportsOem: false,
    useCases: ["Quà tặng hội nghị số lượng lớn", "Túi đựng sự kiện"],
    targetCustomers: ["Agency sự kiện", "Tổ chức hội nghị"],
    tags: ["túi không dệt", "túi sự kiện", "số lượng lớn"],
    featuredImage: img("attd-nonwoven-1"),
    gallery: [img("attd-nonwoven-2")],
    variants: [
      { sku: "TB-TVK-WHT-OS", colorName: "Trắng", colorCode: "WHT", sizeName: "OneSize", wholesalePrice: 8000, dealerPrice: 7000, stockQty: 2000, stockStatus: "IN_STOCK" },
      { sku: "TB-TVK-BLK-OS", colorName: "Đen", colorCode: "BLK", sizeName: "OneSize", wholesalePrice: 8000, dealerPrice: 7000, stockQty: 1500, stockStatus: "IN_STOCK" },
    ],
  },

  // ── Bình giữ nhiệt ──
  {
    name: "Bình giữ nhiệt Inox 500ml",
    slug: "binh-giu-nhiet-inox-500ml",
    productCode: "BGN500",
    categorySlug: "binh-giu-nhiet",
    shortDescription: "Bình giữ nhiệt inox 304 500ml, giữ nhiệt 12 giờ — quà tặng doanh nghiệp cao cấp.",
    description: "Bình giữ nhiệt thân inox 304 2 lớp chân không. Dung tích 500ml. Nắp xoáy kín. Giữ nhiệt 12h, giữ lạnh 24h. Logo in laser hoặc UV trực tiếp lên thân. Phù hợp quà tặng onboarding, hội nghị, đối tác.",
    material: "Inox 304 2 lớp chân không",
    defaultMoq: 30, leadTime: "Đặt hàng: 5–10 ngày",
    supportsPrinting: false, supportsEmbroidery: false, supportsOem: true,
    useCases: ["Quà tặng onboarding", "Quà tặng đối tác", "Hội nghị"],
    targetCustomers: ["Doanh nghiệp lớn", "Agency quà tặng"],
    tags: ["bình giữ nhiệt", "inox 304", "quà tặng doanh nghiệp"],
    featuredImage: img("attd-bottle-1"),
    gallery: [img("attd-bottle-2"), img("attd-bottle-3")],
    variants: [
      { sku: "BGN-B500-BLK-500ML", colorName: "Đen", colorCode: "BLK", capacity: "500ml", wholesalePrice: 95000, dealerPrice: 88000, stockQty: 200, stockStatus: "IN_STOCK", imageUrl: img("attd-bottle-blk") },
      { sku: "BGN-B500-WHT-500ML", colorName: "Trắng", colorCode: "WHT", capacity: "500ml", wholesalePrice: 95000, dealerPrice: 88000, stockQty: 180, stockStatus: "IN_STOCK" },
      { sku: "BGN-B500-NVY-500ML", colorName: "Navy", colorCode: "NVY", capacity: "500ml", wholesalePrice: 95000, dealerPrice: 88000, stockQty: 150, stockStatus: "IN_STOCK" },
    ],
  },
  {
    name: "Bình nước Tritan 600ml",
    slug: "binh-nuoc-tritan-600ml",
    productCode: "BTR600",
    categorySlug: "binh-giu-nhiet",
    shortDescription: "Bình nước Tritan trong suốt 600ml, an toàn BPA-free — in logo trang nhã.",
    description: "Bình nước nhựa Tritan trong suốt BPA-free. Dung tích 600ml. Nắp khóa flip-top. In silk-screen hoặc in UV. Nhẹ, chịu va đập, rửa được trong máy. Phù hợp quà tặng thể thao, sự kiện năng động.",
    material: "Tritan BPA-free",
    defaultMoq: 50, leadTime: "Có sẵn: 2–5 ngày",
    supportsPrinting: false, supportsEmbroidery: false, supportsOem: false,
    useCases: ["Quà tặng thể thao", "Sự kiện năng động", "Hội nghị"],
    targetCustomers: ["Agency sự kiện", "Doanh nghiệp"],
    tags: ["bình Tritan", "BPA-free", "quà tặng thể thao"],
    featuredImage: img("attd-tritan-1"),
    gallery: [img("attd-tritan-2")],
    variants: [
      { sku: "BGN-BTR-CLR-600ML", colorName: "Trong suốt", colorCode: "CLR", capacity: "600ml", wholesalePrice: 55000, dealerPrice: 50000, stockQty: 300, stockStatus: "IN_STOCK" },
      { sku: "BGN-BTR-BLK-600ML", colorName: "Đen", colorCode: "BLK", capacity: "600ml", wholesalePrice: 55000, dealerPrice: 50000, stockQty: 250, stockStatus: "IN_STOCK" },
    ],
  },

  // ── Khăn bandana ──
  {
    name: "Khăn bandana Polyester 60x60",
    slug: "khan-bandana-polyester-60x60",
    productCode: "BDP",
    categorySlug: "khan-bandana",
    shortDescription: "Khăn bandana polyester in sublimation 60x60cm — màu sắc rực rỡ cho sự kiện.",
    description: "Khăn bandana 100% polyester microfiber. Kích thước 60x60cm. In sublimation full màu toàn mặt. Phù hợp sự kiện thể thao, activation outdoor, fan meeting.",
    material: "Polyester microfiber 100%",
    defaultMoq: 100, leadTime: "Đặt hàng: 5–10 ngày",
    supportsPrinting: true, supportsEmbroidery: false, supportsOem: false,
    useCases: ["Sự kiện thể thao", "Activation outdoor", "Fan meeting"],
    targetCustomers: ["Agency sự kiện", "Tổ chức giải thể thao"],
    tags: ["khăn bandana", "polyester", "in sublimation", "sự kiện"],
    featuredImage: img("attd-bandana-1"),
    gallery: [img("attd-bandana-2")],
    variants: [
      { sku: "KBD-BDP-OS-60X60", sizeName: "60x60", dimensions: "60x60cm", wholesalePrice: 18000, dealerPrice: 16000, stockQty: 1000, stockStatus: "IN_STOCK" },
    ],
  },
  {
    name: "Khăn bandana Cotton 55x55",
    slug: "khan-bandana-cotton-55x55",
    productCode: "BDC",
    categorySlug: "khan-bandana",
    shortDescription: "Khăn bandana cotton 55x55cm, in lụa 1 màu — phù hợp đồng phục và quà tặng.",
    description: "Khăn bandana cotton 100%. Kích thước 55x55cm. In lụa 1–4 màu. Chất liệu mềm, thấm hút tốt. Phù hợp đồng phục nhà hàng, café, nhân viên phục vụ.",
    material: "Cotton 100%",
    defaultMoq: 100, leadTime: "Đặt hàng: 5–10 ngày",
    supportsPrinting: true, supportsEmbroidery: false, supportsOem: false,
    useCases: ["Đồng phục nhà hàng", "Đồng phục phục vụ", "Quà tặng nhỏ"],
    targetCustomers: ["Nhà hàng", "F&B", "Agency"],
    tags: ["khăn bandana", "cotton", "đồng phục F&B"],
    featuredImage: img("attd-bandana-co-1"),
    gallery: [img("attd-bandana-co-2")],
    variants: [
      { sku: "KBD-BDC-OS-55X55", sizeName: "55x55", dimensions: "55x55cm", wholesalePrice: 12000, dealerPrice: 10000, stockQty: 800, stockStatus: "IN_STOCK" },
    ],
  },

  // ── Gift set ──
  {
    name: "Combo gift set onboarding nhân viên",
    slug: "combo-gift-set-onboarding",
    productCode: "GFO",
    categorySlug: "gift-set-doanh-nghiep",
    shortDescription: "Combo quà tặng onboarding: áo thun + bình nước + khăn bandana, đóng hộp cao cấp.",
    description: "Set quà tặng chào mừng nhân viên mới: 1 áo thun CVC (M/L/XL), 1 bình nước Tritan 600ml, 1 khăn bandana cotton. Đóng hộp kraft hoặc hộp cứng. In logo và tên nhân viên theo yêu cầu.",
    material: "Combo nhiều chất liệu",
    defaultMoq: 20, leadTime: "OEM: 10–20 ngày tùy số lượng",
    supportsPrinting: true, supportsEmbroidery: true, supportsOem: true,
    useCases: ["Onboarding nhân viên mới", "HR gift", "Doanh nghiệp"],
    targetCustomers: ["Doanh nghiệp lớn", "HR department"],
    tags: ["gift set", "onboarding", "quà tặng nhân viên"],
    featuredImage: img("attd-giftset-1"),
    gallery: [img("attd-giftset-2"), img("attd-giftset-3")],
    variants: [
      { sku: "GS-GFO-STD-20PCS", sizeName: "Set chuẩn", wholesalePrice: 185000, dealerPrice: 175000, stockQty: 50, stockStatus: "IN_STOCK" },
      { sku: "GS-GFO-PRM-20PCS", sizeName: "Set premium", wholesalePrice: 250000, dealerPrice: 238000, stockQty: 30, stockStatus: "IN_STOCK" },
    ],
  },
  {
    name: "Combo quà tặng hội nghị",
    slug: "combo-qua-tang-hoi-nghi",
    productCode: "GFH",
    categorySlug: "gift-set-doanh-nghiep",
    shortDescription: "Combo quà tặng hội nghị: nón + tote bag + khăn, phù hợp sự kiện 200–1000 khách.",
    description: "Set quà tặng hội nghị: 1 nón lưỡi trai cotton, 1 tote canvas, 1 khăn bandana polyester. In logo thương hiệu đồng bộ. Phù hợp hội nghị khách hàng, hội thảo ngành, sự kiện thường niên.",
    material: "Combo nhiều chất liệu",
    defaultMoq: 50, leadTime: "OEM: 10–20 ngày tùy số lượng",
    supportsPrinting: true, supportsEmbroidery: false, supportsOem: false,
    useCases: ["Hội nghị khách hàng", "Hội thảo ngành", "Sự kiện thường niên"],
    targetCustomers: ["Doanh nghiệp", "Agency sự kiện", "Tổ chức hội thảo"],
    tags: ["gift set hội nghị", "quà tặng sự kiện", "đồng bộ thương hiệu"],
    featuredImage: img("attd-confgift-1"),
    gallery: [img("attd-confgift-2")],
    variants: [
      { sku: "GS-GFH-STD-50PCS", sizeName: "Set chuẩn", wholesalePrice: 135000, dealerPrice: 128000, stockQty: 100, stockStatus: "IN_STOCK" },
    ],
  },

  // ── OEM / Private Label ──
  {
    name: "Áo polo OEM private label",
    slug: "ao-polo-oem-private-label",
    productCode: "POL",
    categorySlug: "oem-private-label",
    shortDescription: "Sản xuất áo polo theo thiết kế riêng với nhãn mác và bao bì thương hiệu.",
    description: "Dịch vụ OEM áo polo theo thiết kế khách hàng. Chất liệu polyester hoặc cotton theo yêu cầu. Nhãn dệt tên thương hiệu, size label, hangtag. Đóng gói polybag hoặc hộp cứng. MOQ từ 100 cái/màu.",
    material: "Theo yêu cầu khách hàng",
    defaultMoq: 100, leadTime: "OEM: 10–20 ngày tùy số lượng",
    supportsPrinting: true, supportsEmbroidery: true, supportsOem: true,
    useCases: ["Private label thương hiệu", "Đồng phục doanh nghiệp riêng", "Xuất khẩu"],
    targetCustomers: ["Thương hiệu thời trang", "Doanh nghiệp xuất khẩu", "Nhà phân phối"],
    tags: ["OEM", "private label", "áo polo theo thiết kế"],
    featuredImage: img("attd-oem-1"),
    gallery: [img("attd-oem-2")],
    variants: [
      { sku: "OEM-POL-STD-100PCS", sizeName: "Set 100 cái", wholesalePrice: 95000, dealerPrice: 90000, stockQty: 0, stockStatus: "OUT_OF_STOCK" },
    ],
  },
  {
    name: "Bộ đồng phục sự kiện agency",
    slug: "bo-dong-phuc-su-kien-agency",
    productCode: "BDE",
    categorySlug: "oem-private-label",
    shortDescription: "Bộ đồng phục sự kiện trọn gói: áo + nón + túi đồng bộ nhận diện thương hiệu.",
    description: "Giải pháp đồng phục sự kiện trọn gói cho agency: áo thun/polo + nón lưỡi trai + túi tote, in/thêu đồng bộ logo thương hiệu client. Đảm bảo màu sắc nhất quán, phù hợp brand guideline. Tư vấn thiết kế miễn phí.",
    material: "Combo theo yêu cầu",
    defaultMoq: 30, leadTime: "OEM: 10–20 ngày tùy số lượng",
    supportsPrinting: true, supportsEmbroidery: true, supportsOem: true,
    useCases: ["Agency sự kiện", "Activation thương hiệu", "Roadshow"],
    targetCustomers: ["Agency sự kiện", "BTL agency", "Activation team"],
    tags: ["đồng phục agency", "sự kiện", "trọn gói", "activation"],
    featuredImage: img("attd-uniform-1"),
    gallery: [img("attd-uniform-2"), img("attd-uniform-3")],
    variants: [
      { sku: "OEM-BDE-STD-30PCS", sizeName: "Set 30 bộ", wholesalePrice: 230000, dealerPrice: 218000, stockQty: 0, stockStatus: "OUT_OF_STOCK" },
    ],
  },
];

// ─── 3. Blog Categories ───────────────────────────────────────────────────────

export const DEMO_BLOG_CATEGORIES: DemoBlogCategoryData[] = [
  { name: "Kiến thức sản phẩm", slug: "kien-thuc-san-pham", description: "Hướng dẫn chọn vải, chất liệu, và các sản phẩm đồng phục." },
  { name: "Kinh nghiệm nhập sỉ", slug: "kinh-nghiem-nhap-si", description: "Kinh nghiệm đặt hàng sỉ, MOQ, lead-time và quản lý nguồn hàng." },
  { name: "Quà tặng doanh nghiệp", slug: "qua-tang-doanh-nghiep", description: "Ý tưởng và giải pháp quà tặng B2B cho hội nghị và onboarding." },
  { name: "Đồng phục doanh nghiệp", slug: "dong-phuc-doanh-nghiep", description: "Xu hướng và giải pháp đồng phục nhận diện thương hiệu." },
  { name: "OEM & Private Label", slug: "oem-private-label", description: "Hướng dẫn đặt hàng OEM, private label trong ngành đồng phục." },
];

// ─── 4. Blog Posts ────────────────────────────────────────────────────────────

export const DEMO_BLOG_POSTS: DemoBlogPostData[] = [
  {
    title: "Kho sỉ đồng phục là gì? Cách chọn nguồn hàng ổn định cho đại lý",
    slug: "kho-si-dong-phuc-la-gi",
    excerpt: "Kho sỉ đồng phục cung cấp nguồn hàng số lượng lớn cho đại lý, xưởng in và doanh nghiệp. Tìm hiểu cách chọn kho sỉ uy tín, ổn định và đúng chất lượng.",
    content: `## Kho sỉ đồng phục là gì?

Kho sỉ đồng phục (wholesale uniform warehouse) là đơn vị chuyên cung cấp sản phẩm đồng phục — áo thun, áo polo, nón, túi, phụ kiện — với số lượng lớn và giá sỉ cho đại lý, xưởng in, công ty tổ chức sự kiện.

Khác với cửa hàng bán lẻ, kho sỉ tập trung vào:
- **MOQ (số lượng tối thiểu)**: thường từ 50–100 cái/màu
- **Giá sỉ ổn định**: giá ít biến động, có chính sách đại lý rõ ràng
- **Hàng có sẵn**: tồn kho đa màu, đa size, giao ngay hoặc 1–3 ngày

## Tại sao cần chọn kho sỉ uy tín?

Nguồn hàng không ổn định sẽ dẫn đến:
- Thiếu hàng giữa chừng, không giao kịp cho khách
- Chất liệu thay đổi theo lô, khó kiểm soát chất lượng
- Giá biến động bất ngờ, khó lên báo giá cho khách

## Tiêu chí chọn kho sỉ tốt

1. **Hàng sẵn kho, tồn kho minh bạch**: biết rõ số lượng từng màu, từng size
2. **MOQ hợp lý**: 50–100 cái/màu cho sản phẩm phổ thông
3. **Chất liệu nhất quán**: cùng mã vải qua nhiều đợt nhập
4. **Hỗ trợ in/thêu**: hoặc cung cấp nền tốt cho xưởng in đối tác
5. **Chính sách đại lý rõ ràng**: giá đại lý, điều kiện thanh toán, đổi trả

## ATTD.vn — kho sỉ đồng phục B2B

ATTD.vn chuyên cung cấp nguồn hàng áo thun trơn, áo polo trơn, phụ kiện đồng phục sỉ cho đại lý và xưởng in toàn quốc. Tồn kho đa màu, đa size, giao nhanh 1–3 ngày.`,
    featuredImageUrl: img("attd-blog-1", 1200, 630),
    categorySlug: "kinh-nghiem-nhap-si",
    tags: ["kho sỉ", "đồng phục", "nguồn hàng", "đại lý"],
    metaTitle: "Kho sỉ đồng phục là gì? Cách chọn nguồn hàng ổn định | ATTD.vn",
    metaDescription: "Tìm hiểu kho sỉ đồng phục là gì và cách chọn nguồn hàng ổn định cho đại lý, xưởng in và doanh nghiệp B2B.",
  },
  {
    title: "Áo thun trơn CVC, TC và Cotton khác nhau thế nào?",
    slug: "ao-thun-cvc-tc-cotton-khac-nhau",
    excerpt: "3 chất liệu áo thun trơn phổ biến nhất trên thị trường sỉ: CVC, TC và Cotton 100%. Tìm hiểu sự khác biệt để chọn đúng cho đồng phục và quà tặng.",
    content: `## Ba chất liệu áo thun trơn phổ biến

### 1. Áo thun CVC (Chief Value Cotton)

CVC là hỗn hợp cotton và polyester, thường tỷ lệ **65% cotton / 35% polyester** hoặc 60/40.

**Ưu điểm:**
- Bền màu tốt hơn cotton thuần
- Ít nhăn, ít co rút
- Phù hợp in lụa, in DTG

**Nhược điểm:** Không mềm mịn như cotton 100%

**Thích hợp cho:** Đồng phục xưởng in, in quảng cáo số lượng lớn

### 2. Áo thun TC (Terylene Cotton)

TC là hỗn hợp **35% cotton / 65% polyester** — tỷ lệ polyester cao hơn CVC.

**Ưu điểm:**
- Giá rẻ nhất trong 3 loại
- Nhanh khô, ít nhăn

**Nhược điểm:** Kém thoáng mát, ít thấm hút

**Thích hợp cho:** Đồng phục hoạt động ngoài trời, đồng phục xưởng

### 3. Áo thun Cotton 100%

Hoàn toàn cotton tự nhiên, không pha synthetic.

**Ưu điểm:**
- Mềm mịn, thoáng mát nhất
- Thấm hút tốt
- Phù hợp đồng phục văn phòng, quà tặng cao cấp

**Nhược điểm:** Dễ nhăn, co rút nếu giặt sai cách; giá cao hơn

**Thích hợp cho:** Đồng phục văn phòng, quà tặng onboarding nhân viên

## Kết luận

- **CVC**: lựa chọn cân bằng cho đại lý và xưởng in
- **TC**: phù hợp đồng phục chi phí thấp
- **Cotton 100%**: tốt nhất cho quà tặng và đồng phục cao cấp`,
    featuredImageUrl: img("attd-blog-2", 1200, 630),
    categorySlug: "kien-thuc-san-pham",
    tags: ["CVC", "TC", "cotton", "áo thun trơn", "chất liệu"],
    metaTitle: "Áo thun CVC, TC, Cotton khác nhau thế nào? | ATTD.vn",
    metaDescription: "So sánh 3 chất liệu áo thun trơn phổ biến: CVC, TC và Cotton 100% — giúp đại lý và xưởng in chọn đúng nguồn hàng.",
  },
  {
    title: "MOQ là gì? Vì sao đơn hàng sỉ cần số lượng tối thiểu?",
    slug: "moq-la-gi-don-hang-si",
    excerpt: "MOQ (Minimum Order Quantity) là số lượng tối thiểu mỗi lần đặt hàng. Tìm hiểu tại sao kho sỉ áp dụng MOQ và cách tính toán đơn hàng hợp lý.",
    content: `## MOQ là gì?

MOQ — viết tắt của **Minimum Order Quantity** — là số lượng tối thiểu bạn phải đặt cho mỗi đơn hàng sỉ.

Ví dụ: MOQ = 50 cái có nghĩa là bạn phải đặt ít nhất 50 cái mới được mua với giá sỉ.

## Tại sao kho sỉ có MOQ?

1. **Hiệu quả sản xuất**: Đặt ít sẽ tốn chi phí setup in/thêu không đủ bù
2. **Quản lý tồn kho**: Kho không thể tách lẻ từng cái một
3. **Giá sỉ**: Giá ưu đãi chỉ có ý nghĩa khi số lượng đủ lớn

## MOQ phổ biến tại ATTD.vn

| Sản phẩm | MOQ |
|---|---|
| Áo thun trơn | 50 cái/màu |
| Áo polo | 50 cái/màu |
| Bình giữ nhiệt | 30 cái |
| Gift set | 20 set |

## Cách tính toán đơn hàng khi có MOQ

Nếu khách cần 30 áo thun nhưng MOQ là 50:
- Đặt 50 cái và lưu kho phần dư
- Gộp đơn với đơn hàng khác cùng màu/size
- Liên hệ ATTD để tư vấn lựa chọn sản phẩm phù hợp hơn`,
    featuredImageUrl: img("attd-blog-3", 1200, 630),
    categorySlug: "kinh-nghiem-nhap-si",
    tags: ["MOQ", "số lượng tối thiểu", "đặt hàng sỉ"],
    metaTitle: "MOQ là gì? Vì sao đặt hàng sỉ cần số lượng tối thiểu | ATTD.vn",
    metaDescription: "MOQ (Minimum Order Quantity) là số lượng tối thiểu khi đặt hàng sỉ. Tìm hiểu tại sao và cách tính toán đơn hàng hợp lý.",
  },
  {
    title: "Gợi ý combo quà tặng doanh nghiệp cho hội nghị và onboarding",
    slug: "combo-qua-tang-doanh-nghiep-hoi-nghi",
    excerpt: "Combo quà tặng doanh nghiệp đúng điệu không chỉ là sản phẩm — mà là câu chuyện thương hiệu. Gợi ý 5 combo phù hợp theo từng dịp.",
    content: `## Tại sao combo quà tặng quan trọng hơn quà tặng đơn lẻ?

Khi bạn tặng một bộ quà gồm 3–4 món phối hợp, người nhận cảm nhận được sự chu đáo và nhận diện thương hiệu được lặp lại trên nhiều vật phẩm.

## 5 combo quà tặng phổ biến cho doanh nghiệp

### 1. Combo Onboarding nhân viên mới
- Áo thun CVC có in logo công ty
- Bình nước Tritan 600ml
- Khăn bandana cotton
- Hộp đóng gói có in tên nhân viên

**Giá tham khảo:** Liên hệ báo giá sỉ

### 2. Combo Hội nghị khách hàng
- Nón lưỡi trai cotton in logo
- Tote canvas basic
- Khăn bandana polyester
- Túi đựng kit

### 3. Combo Đối tác cao cấp
- Áo polo cotton cao cấp
- Bình giữ nhiệt inox 500ml
- Hộp cứng premium

### 4. Combo Sự kiện Activation
- Áo thun trơn unisex
- Nón bucket
- Tote canvas

### 5. Combo Gift set tất niên
- Bình giữ nhiệt inox
- Áo thun/polo
- Khăn bandana cotton

## Ghi chú quan trọng

- Giá sỉ thay đổi theo số lượng, chất liệu và yêu cầu in/thêu
- Liên hệ ATTD để nhận báo giá trọn gói theo từng combo
- Hỗ trợ thiết kế đồng bộ logo trên toàn bộ sản phẩm trong combo`,
    featuredImageUrl: img("attd-blog-4", 1200, 630),
    categorySlug: "qua-tang-doanh-nghiep",
    tags: ["quà tặng doanh nghiệp", "combo", "onboarding", "hội nghị"],
    metaTitle: "5 combo quà tặng doanh nghiệp cho hội nghị và onboarding | ATTD.vn",
    metaDescription: "Gợi ý 5 combo quà tặng doanh nghiệp phù hợp cho hội nghị, onboarding nhân viên và tặng đối tác cao cấp.",
  },
  {
    title: "Cách chọn áo polo trơn cho đồng phục doanh nghiệp",
    slug: "cach-chon-ao-polo-tron-dong-phuc",
    excerpt: "Áo polo trơn là lựa chọn phổ biến cho đồng phục văn phòng và sự kiện. Tìm hiểu cách chọn chất liệu, form dáng và màu sắc phù hợp.",
    content: `## Tại sao áo polo phổ biến cho đồng phục?

Áo polo có cổ bẻ chuyên nghiệp, form gọn gàng, phù hợp cả văn phòng lẫn hoạt động ngoài trời. Vừa trang trọng hơn áo thun, vừa thoải mái hơn áo sơ mi.

## Polyester vs Cotton — nên chọn loại nào?

### Áo polo Polyester pique
- Nhanh khô, thoáng mát
- Bền màu lâu dài
- Phù hợp sự kiện ngoài trời, nhân viên bán hàng
- Giá phải chăng hơn

### Áo polo Cotton cao cấp
- Mềm mịn, thoáng mát
- Sang trọng hơn
- Phù hợp văn phòng, đồng phục cấp quản lý
- Giá cao hơn ~20–30%

## Màu sắc phổ biến cho đồng phục

- **Đen + trắng**: classic, dễ phối hợp với nhiều thương hiệu
- **Navy**: chuyên nghiệp, phổ biến ngành tài chính, logistics
- **Xanh dương nhạt**: thường dùng cho ngành y tế, giáo dục
- **Theo màu thương hiệu**: đặt màu theo pantone nếu số lượng đủ lớn

## MOQ cho đồng phục polo

- Áo polo polyester: MOQ 50 cái/màu
- Áo polo cotton: MOQ 30 cái/màu
- Đặt màu đặc biệt (pantone custom): MOQ 200+ cái

Liên hệ ATTD để được tư vấn và nhận báo giá.`,
    featuredImageUrl: img("attd-blog-5", 1200, 630),
    categorySlug: "dong-phuc-doanh-nghiep",
    tags: ["áo polo", "đồng phục", "chọn chất liệu"],
    metaTitle: "Cách chọn áo polo trơn cho đồng phục doanh nghiệp | ATTD.vn",
    metaDescription: "Hướng dẫn chọn áo polo trơn đồng phục doanh nghiệp: so sánh polyester vs cotton, màu sắc và MOQ phù hợp.",
  },
  {
    title: "Checklist đặt hàng đồng phục B2B cho agency sự kiện",
    slug: "checklist-dat-hang-dong-phuc-agency",
    excerpt: "Đặt hàng đồng phục sự kiện đúng cách giúp agency tránh sai sót, tiết kiệm chi phí và đảm bảo giao hàng đúng hạn.",
    content: `## Tại sao agency sự kiện cần checklist đặt hàng đồng phục?

Đặt hàng đồng phục cho sự kiện thường bị áp lực thời gian. Thiếu thông tin dẫn đến đặt sai size, sai màu hoặc giao hàng trễ.

## Checklist 10 điểm trước khi đặt hàng

**Thông tin cơ bản:**
- [ ] Tên sự kiện và ngày sự kiện
- [ ] Số lượng nhân viên cần đồng phục
- [ ] Phân loại vị trí (staff, team lead, VIP)

**Sản phẩm:**
- [ ] Loại sản phẩm (áo thun / polo / nón / túi)
- [ ] Chất liệu và màu sắc theo brand guideline
- [ ] Bảng size (S/M/L/XL/XXL) — đừng quên XXL
- [ ] Thiết kế in/thêu đã finalize chưa?

**Thông tin sản xuất:**
- [ ] Lead time cần (giao trước sự kiện bao nhiêu ngày?)
- [ ] MOQ đủ chưa? (nếu thiếu thì gộp đơn)
- [ ] Budget duyệt của client

**Giao hàng:**
- [ ] Địa chỉ giao hàng
- [ ] Cần đóng gói riêng theo vị trí không?

## Thời gian tối thiểu cần chuẩn bị

| Loại sản phẩm | Lead time cần thiết |
|---|---|
| Áo thun/polo sẵn kho | 1–3 ngày |
| In logo lên áo | 3–5 ngày sau khi duyệt mẫu |
| Gift set trọn gói | 7–14 ngày |

Hãy liên hệ ATTD trước ít nhất 2 tuần cho đơn hàng lớn (>200 bộ).`,
    featuredImageUrl: img("attd-blog-6", 1200, 630),
    categorySlug: "dong-phuc-doanh-nghiep",
    tags: ["đồng phục sự kiện", "agency", "checklist", "đặt hàng"],
    metaTitle: "Checklist đặt hàng đồng phục B2B cho agency sự kiện | ATTD.vn",
    metaDescription: "10 điểm checklist đặt hàng đồng phục sự kiện cho agency — tránh sai sót, đảm bảo giao đúng hạn.",
  },
  {
    title: "Nón đồng phục sỉ: các form phổ biến và cách chọn chất liệu",
    slug: "non-dong-phuc-si-cach-chon",
    excerpt: "Nón lưỡi trai, nón bucket hay nón snapback? Hướng dẫn chọn form nón phù hợp cho từng loại sự kiện và đồng phục.",
    content: `## Các loại nón đồng phục phổ biến

### Nón lưỡi trai 6 múi (Structured cap)
Form cổ điển, phần trước có bọng cứng dễ thêu logo. Phù hợp đồng phục ngoài trời, đội bán hàng.

### Nón bucket (Bucket hat)
Vành mềm tròn 360°. Thời thượng, phù hợp sự kiện lifestyle, activation thương hiệu trẻ.

### Nón snapback
Lưỡi trai phẳng, khóa lưng nhựa snap. Phổ biến trong giới streetwear và sự kiện âm nhạc.

## Chất liệu nón

| Chất liệu | Đặc điểm | Phù hợp cho |
|---|---|---|
| Cotton twill | Mềm, thoáng, bền | Đồng phục văn phòng, sự kiện |
| Polyester | Nhanh khô, nhẹ | Hoạt động ngoài trời |
| Vải dù | Chống thấm | Sự kiện mưa, outdoor |
| Mesh phía sau | Thoáng khí | Sự kiện hè, thể thao |

## Cách in/thêu logo trên nón

- **Thêu**: bền nhất, phù hợp logo nhỏ phần trước
- **In chuyển nhiệt**: màu sắc phong phú, phù hợp thiết kế phức tạp
- **In lụa**: chi phí thấp cho số lượng lớn, logo đơn giản

MOQ nón: 50 cái/màu. Liên hệ ATTD để nhận báo giá.`,
    featuredImageUrl: img("attd-blog-7", 1200, 630),
    categorySlug: "kien-thuc-san-pham",
    tags: ["nón đồng phục", "bucket hat", "lưỡi trai", "sỉ"],
    metaTitle: "Nón đồng phục sỉ: form phổ biến và cách chọn chất liệu | ATTD.vn",
    metaDescription: "Hướng dẫn chọn nón đồng phục sỉ: so sánh nón lưỡi trai, bucket hat, snapback và cách in logo.",
  },
  {
    title: "OEM/private label trong ngành đồng phục là gì?",
    slug: "oem-private-label-dong-phuc",
    excerpt: "OEM và private label giúp doanh nghiệp tạo dòng sản phẩm riêng mang thương hiệu của mình. Tìm hiểu quy trình và điều kiện tại ATTD.",
    content: `## OEM là gì?

**OEM** (Original Equipment Manufacturer) trong ngành đồng phục có nghĩa là: bạn cung cấp thiết kế, thông số kỹ thuật — nhà sản xuất sản xuất sản phẩm theo đó, mang nhãn hiệu của bạn.

## Private Label là gì?

**Private label** là khi bạn đặt hàng sản phẩm đã có sẵn mẫu (của nhà sản xuất) nhưng gắn thương hiệu của bạn lên đó.

## ATTD hỗ trợ OEM/Private Label như thế nào?

ATTD.vn cung cấp dịch vụ OEM và private label cho:
- Áo thun, áo polo theo thiết kế khách hàng
- Túi canvas, bình giữ nhiệt có in/khắc laser
- Gift set trọn bộ mang nhãn thương hiệu

## Điều kiện tối thiểu

| Sản phẩm | MOQ OEM |
|---|---|
| Áo thun/polo | 100 cái/màu |
| Bình giữ nhiệt | 50 cái |
| Gift set | 20 set |

## Quy trình đặt hàng OEM

1. Tư vấn sản phẩm và thông số kỹ thuật
2. Xác nhận mẫu thiết kế
3. Sản xuất mẫu (sample) — 5–7 ngày
4. Duyệt mẫu và điều chỉnh
5. Sản xuất hàng loạt — 10–20 ngày
6. QC và đóng gói theo yêu cầu
7. Giao hàng

Liên hệ ATTD để được tư vấn cụ thể.`,
    featuredImageUrl: img("attd-blog-8", 1200, 630),
    categorySlug: "oem-private-label",
    tags: ["OEM", "private label", "đồng phục theo thiết kế"],
    metaTitle: "OEM/private label trong ngành đồng phục là gì? | ATTD.vn",
    metaDescription: "Tìm hiểu OEM và private label trong ngành đồng phục: quy trình, điều kiện và cách đặt hàng tại ATTD.vn.",
  },
  {
    title: "Tote bag canvas và túi vải không dệt: nên chọn loại nào?",
    slug: "tote-bag-canvas-vs-tui-vai-khong-det",
    excerpt: "Tote canvas bền và sang hơn, túi không dệt rẻ và gấp gọn hơn. So sánh chi tiết để chọn đúng cho sự kiện và quà tặng.",
    content: `## Tote bag canvas

**Chất liệu:** Cotton canvas 280–400g/m²

**Ưu điểm:**
- Bền, tái sử dụng nhiều lần
- Sang trọng, phù hợp quà tặng cao cấp
- In logo sắc nét, giữ màu lâu

**Nhược điểm:** Giá cao hơn (25.000–40.000đ/cái sỉ), không gấp gọn

**Phù hợp cho:** Hội nghị khách hàng, quà tặng đối tác, sự kiện lifestyle

## Túi vải không dệt (PP non-woven)

**Chất liệu:** Polypropylene không dệt 80gsm

**Ưu điểm:**
- Giá rẻ (6.000–12.000đ/cái sỉ)
- Nhẹ, gấp gọn, dễ vận chuyển số lượng lớn
- In logo nhanh, lead time ngắn

**Nhược điểm:** Không bền bằng canvas, ít tái sử dụng

**Phù hợp cho:** Sự kiện lớn >500 người, hội chợ, phân phối hàng loạt

## Bảng so sánh

| Tiêu chí | Tote Canvas | Túi không dệt |
|---|---|---|
| Giá sỉ | 25.000–40.000đ | 6.000–12.000đ |
| Độ bền | Cao | Trung bình |
| MOQ | 100 cái | 200 cái |
| Lead time | 5–10 ngày | 1–3 ngày |

Liên hệ ATTD để nhận báo giá theo số lượng cụ thể.`,
    featuredImageUrl: img("attd-blog-9", 1200, 630),
    categorySlug: "kien-thuc-san-pham",
    tags: ["tote bag", "túi không dệt", "so sánh", "quà tặng sự kiện"],
    metaTitle: "Tote canvas vs túi vải không dệt: nên chọn loại nào? | ATTD.vn",
    metaDescription: "So sánh tote bag canvas và túi vải không dệt: giá, độ bền, MOQ để chọn đúng cho sự kiện và quà tặng doanh nghiệp.",
  },
  {
    title: "Cách chuẩn bị file thiết kế khi đặt quà tặng doanh nghiệp",
    slug: "chuan-bi-file-thiet-ke-qua-tang",
    excerpt: "File thiết kế đúng chuẩn giúp đảm bảo chất lượng in/thêu, tránh phát sinh chi phí và rút ngắn thời gian sản xuất.",
    content: `## Tại sao file thiết kế quan trọng?

Chất lượng in/thêu trực tiếp phụ thuộc vào chất lượng file. File không đúng chuẩn sẽ dẫn đến màu sai, đường nét không sắc, hoặc phải làm lại.

## Yêu cầu file cho từng kỹ thuật

### In lụa (silk-screen)
- Định dạng: AI hoặc EPS
- Màu: CMYK hoặc Pantone spot colors
- Outline tất cả font chữ
- Tách màu rõ ràng

### In DTG (Direct to Garment)
- Định dạng: PNG nền trong suốt, 300 DPI
- Màu: RGB hoặc CMYK
- Kích thước file ít nhất 2000x2000px

### Thêu vi tính
- Định dạng: AI/EPS hoặc CDR
- Logo không quá phức tạp (thêu không thể hiện gradient)
- Kích thước thực tế phải ghi rõ

### In laser (bình giữ nhiệt, kim loại)
- Định dạng: AI hoặc EPS vector
- Chỉ dùng màu đơn sắc (laser khắc 1 màu)

## Checklist file trước khi gửi

- [ ] Đúng định dạng theo kỹ thuật in
- [ ] Đủ độ phân giải (300 DPI trở lên)
- [ ] Font đã outline
- [ ] Pantone/màu đã confirm
- [ ] Kích thước thực tế đã ghi chú

Gửi file đến ATTD qua email hoặc Zalo để được kiểm tra miễn phí.`,
    featuredImageUrl: img("attd-blog-10", 1200, 630),
    categorySlug: "qua-tang-doanh-nghiep",
    tags: ["file thiết kế", "in ấn", "thêu", "đặt hàng"],
    metaTitle: "Cách chuẩn bị file thiết kế khi đặt quà tặng doanh nghiệp | ATTD.vn",
    metaDescription: "Hướng dẫn chuẩn bị file thiết kế đúng chuẩn cho in lụa, DTG, thêu và laser khi đặt quà tặng doanh nghiệp.",
  },
];

// ─── 5. Landing Pages ─────────────────────────────────────────────────────────

export const DEMO_LANDING_PAGES: DemoLandingPageData[] = [
  {
    slug: "nguon-hang", title: "Nguồn hàng sỉ ATTD.vn",
    heroTitle: "Kho sỉ đồng phục & quà tặng B2B — Giao nhanh, giá ổn định",
    heroDescription: "ATTD.vn cung cấp nguồn hàng áo thun, áo polo, nón, túi và quà tặng doanh nghiệp sỉ cho đại lý, xưởng in và doanh nghiệp toàn quốc.",
    seoContent: "Áo thun trơn CVC 65/35 từ 45.000đ/cái. Áo polo pique polyester từ 65.000đ/cái. MOQ 50 cái. Giao nhanh 1–3 ngày có sẵn kho.",
    metaTitle: "Nguồn hàng sỉ đồng phục & quà tặng B2B | ATTD.vn",
    metaDescription: "Kho sỉ đồng phục, áo thun trơn, áo polo, nón, túi và quà tặng doanh nghiệp. Giá sỉ ổn định, giao nhanh, hỗ trợ in/thêu.",
    primaryCtaLabel: "Xem danh sách sản phẩm", primaryCtaHref: "/san-pham",
    secondaryCtaLabel: "Liên hệ báo giá", secondaryCtaHref: "/lien-he",
  },
  {
    slug: "ao-thun-tron", title: "Áo thun trơn sỉ",
    heroTitle: "Kho áo thun trơn sỉ — CVC, Cotton, TC — Giao nhanh 1–3 ngày",
    heroDescription: "Nguồn hàng áo thun trơn B2B cho xưởng in, đại lý và doanh nghiệp. Đa màu, đa size, tồn kho ổn định.",
    seoContent: "Áo thun CVC 65/35: từ 45.000đ, MOQ 50 cái. Áo thun cotton 100%: từ 55.000đ, MOQ 50 cái. Phù hợp in lụa, DTG, thêu.",
    metaTitle: "Áo thun trơn sỉ — CVC, Cotton, TC | ATTD.vn",
    metaDescription: "Kho sỉ áo thun trơn CVC, Cotton 100%, TC. Đa màu, đa size, MOQ 50 cái, giao nhanh 1–3 ngày.",
    primaryCtaLabel: "Xem áo thun trơn", primaryCtaHref: "/san-pham",
    secondaryCtaLabel: "Liên hệ báo giá", secondaryCtaHref: "/lien-he",
  },
  {
    slug: "ao-polo-tron", title: "Áo polo trơn sỉ",
    heroTitle: "Kho áo polo trơn sỉ — Polyester & Cotton — Đồng phục & Sự kiện",
    heroDescription: "Áo polo trơn sỉ cho đồng phục doanh nghiệp và sự kiện. Polyester pique và cotton cao cấp. MOQ 50 cái.",
    seoContent: "Áo polo polyester pique từ 65.000đ. Áo polo cotton cao cấp từ 85.000đ. MOQ 50 cái. Hỗ trợ thêu logo.",
    metaTitle: "Áo polo trơn sỉ — Polyester & Cotton | ATTD.vn",
    metaDescription: "Kho sỉ áo polo trơn polyester pique và cotton cao cấp. MOQ 50 cái, hỗ trợ thêu logo đồng phục.",
    primaryCtaLabel: "Xem áo polo trơn", primaryCtaHref: "/san-pham",
    secondaryCtaLabel: "Liên hệ báo giá", secondaryCtaHref: "/lien-he",
  },
  {
    slug: "qua-tang-doanh-nghiep", title: "Quà tặng doanh nghiệp sỉ",
    heroTitle: "Quà tặng doanh nghiệp sỉ — Combo onboarding, hội nghị, đối tác",
    heroDescription: "Giải pháp quà tặng B2B: combo onboarding nhân viên, gift set hội nghị, quà tặng đối tác. In/thêu logo theo yêu cầu.",
    seoContent: "Combo gift set onboarding từ 185.000đ/set (áo + bình + khăn). Gift set hội nghị từ 135.000đ/set. MOQ 20 set.",
    metaTitle: "Quà tặng doanh nghiệp sỉ — Combo B2B | ATTD.vn",
    metaDescription: "Combo quà tặng doanh nghiệp: onboarding nhân viên, gift set hội nghị, quà đối tác. Đóng hộp đẹp, in logo.",
    primaryCtaLabel: "Xem gift set", primaryCtaHref: "/san-pham",
    secondaryCtaLabel: "Báo giá trọn gói", secondaryCtaHref: "/lien-he",
  },
  {
    slug: "oem", title: "OEM & Private Label",
    heroTitle: "Dịch vụ OEM & Private Label đồng phục — Từ thiết kế đến thành phẩm",
    heroDescription: "Sản xuất sản phẩm đồng phục theo thiết kế riêng. Nhãn mác thương hiệu, đóng gói tùy chỉnh. MOQ từ 100 cái.",
    seoContent: "OEM áo polo, áo thun theo thiết kế. Private label với nhãn dệt riêng. MOQ 100 cái/màu. Lead time 10–20 ngày.",
    metaTitle: "OEM & Private Label đồng phục | ATTD.vn",
    metaDescription: "Sản xuất đồng phục OEM và private label theo thiết kế riêng. Nhãn mác thương hiệu, đóng gói tùy chỉnh.",
    primaryCtaLabel: "Tìm hiểu dịch vụ OEM", primaryCtaHref: "/lien-he",
    secondaryCtaLabel: "Liên hệ tư vấn", secondaryCtaHref: "/lien-he",
  },
  {
    slug: "dai-ly", title: "Chính sách đại lý",
    heroTitle: "Trở thành đại lý ATTD.vn — Nguồn hàng ổn định, giá đại lý tốt",
    heroDescription: "Đăng ký đại lý ATTD.vn để nhận giá đại lý, ưu tiên tồn kho và hỗ trợ kinh doanh. Phù hợp xưởng in, đại lý đồng phục và agency sự kiện.",
    seoContent: "Giá đại lý thấp hơn giá sỉ thông thường 5–10%. Ưu tiên hàng tồn kho. Hỗ trợ tư vấn chọn sản phẩm.",
    metaTitle: "Chính sách đại lý ATTD.vn | Nguồn hàng sỉ đồng phục",
    metaDescription: "Đăng ký đại lý ATTD để nhận giá đại lý tốt, ưu tiên kho hàng và hỗ trợ kinh doanh nguồn hàng đồng phục.",
    primaryCtaLabel: "Đăng ký làm đại lý", primaryCtaHref: "/lien-he",
    secondaryCtaLabel: "Xem sản phẩm", secondaryCtaHref: "/san-pham",
  },
];

// ─── 6. Knowledge Base Categories ────────────────────────────────────────────

export const DEMO_KB_CATEGORIES: DemoKbCategoryData[] = [
  { name: "Thương hiệu & Định vị", slug: "thuong-hieu-dinh-vi", description: "Thông tin định vị thương hiệu ATTD.vn", sortOrder: 1 },
  { name: "Sản phẩm & Chất liệu", slug: "san-pham-chat-lieu", description: "Kiến thức về sản phẩm và chất liệu đồng phục", sortOrder: 2 },
  { name: "Chính sách B2B", slug: "chinh-sach-b2b", description: "MOQ, lead-time, giá đại lý và chính sách kinh doanh", sortOrder: 3 },
];

// ─── 7. Knowledge Base Entries ────────────────────────────────────────────────

export const DEMO_KB_ENTRIES: DemoKbEntryData[] = [
  {
    title: "ATTD.vn là kho sỉ đồng phục B2B, không phải xưởng in lẻ",
    slug: "attd-la-kho-si-dong-phuc-b2b",
    summary: "ATTD.vn chuyên cung cấp nguồn hàng đồng phục số lượng lớn cho đại lý, xưởng in và doanh nghiệp. Không phục vụ in lẻ 1–5 cái.",
    content: "ATTD.vn = Kho sỉ đồng phục & quà tặng doanh nghiệp B2B. Đơn hàng tối thiểu từ 50 cái. Khách hàng mục tiêu: đại lý sỉ, xưởng in, agency sự kiện, doanh nghiệp đặt đồng phục số lượng lớn. Không nhận in 1–5 áo lẻ.",
    categorySlug: "thuong-hieu-dinh-vi", type: "BRAND_VOICE",
    tags: ["định vị", "B2B", "kho sỉ", "attd"], priority: "HIGH", isFeatured: true, isVerified: true,
  },
  {
    title: "Phân biệt ATTD.vn và AOTHUNTHONGDIEP.com",
    slug: "phan-biet-attd-va-aothunthongdiep",
    summary: "ATTD.vn là kho sỉ B2B. AOTHUNTHONGDIEP.com là dịch vụ in áo theo yêu cầu và đồng phục custom.",
    content: "ATTD.vn: kho sỉ đồng phục B2B, cung cấp nguồn hàng trơn số lượng lớn, giá sỉ ổn định. AOTHUNTHONGDIEP.com: dịch vụ in áo theo yêu cầu, nhận in từ 1 chiếc, tư vấn thiết kế, đồng phục custom từng đơn.",
    categorySlug: "thuong-hieu-dinh-vi", type: "COMPANY",
    tags: ["ATTD", "AOTHUNTHONGDIEP", "phân biệt"], priority: "HIGH", isFeatured: true, isVerified: true,
  },
  {
    title: "Khách hàng mục tiêu của ATTD.vn",
    slug: "khach-hang-muc-tieu-attd",
    summary: "Khách hàng mục tiêu: đại lý sỉ đồng phục, xưởng in số lượng lớn, agency sự kiện, doanh nghiệp đặt đồng phục.",
    content: "Nhóm khách hàng chính: 1) Đại lý sỉ đồng phục tại các tỉnh/thành. 2) Xưởng in, xưởng thêu cần nguồn hàng trơn. 3) Agency sự kiện, activation agency. 4) Doanh nghiệp đặt đồng phục nội bộ. 5) Nhà phân phối quà tặng B2B.",
    categorySlug: "thuong-hieu-dinh-vi", type: "CUSTOMER_SEGMENT",
    tags: ["khách hàng", "đại lý", "xưởng in", "agency"], priority: "HIGH", isFeatured: false, isVerified: true,
  },
  {
    title: "Chính sách MOQ và điều kiện đặt hàng sỉ",
    slug: "chinh-sach-moq-don-hang-si",
    summary: "MOQ từ 50 cái/màu cho áo thun và polo. Một số sản phẩm đặc biệt có MOQ riêng.",
    content: "MOQ chuẩn: Áo thun/polo 50 cái/màu. Nón 50 cái. Tote bag 100 cái. Túi không dệt 200 cái. Bình giữ nhiệt 30 cái. Gift set 20 set. OEM: từ 100 cái/màu. Không tách đơn nhỏ hơn MOQ trừ khi là khách đại lý có ký hợp đồng.",
    categorySlug: "chinh-sach-b2b", type: "POLICY",
    tags: ["MOQ", "đặt hàng", "chính sách"], priority: "HIGH", isFeatured: true, isVerified: true,
  },
  {
    title: "Lead time giao hàng theo từng loại sản phẩm",
    slug: "lead-time-giao-hang-san-pham",
    summary: "Hàng có sẵn kho: 1–3 ngày. Đặt hàng thêm: 5–10 ngày. OEM/in logo: 10–20 ngày.",
    content: "Hàng có sẵn kho (áo thun, polo, tote, nón): 1–3 ngày. Sản phẩm đặt thêm (không có sẵn màu/size): 5–10 ngày. In lụa lên hàng có sẵn: +3–5 ngày. OEM/private label: 10–20 ngày. Gift set trọn gói: 7–14 ngày.",
    categorySlug: "chinh-sach-b2b", type: "LOGISTICS",
    tags: ["lead time", "giao hàng", "sản xuất"], priority: "HIGH", isFeatured: false, isVerified: true,
  },
  {
    title: "Giá sỉ và chính sách đại lý ATTD.vn",
    slug: "gia-si-chinh-sach-dai-ly",
    summary: "Giá sỉ công khai trên website. Giá đại lý tốt hơn 5–10% cho khách ký hợp đồng đại lý.",
    content: "Giá công khai là giá sỉ thông thường. Đại lý đăng ký chính thức nhận giá đại lý thấp hơn 5–10%. Điều kiện đại lý: mua tối thiểu 2.000 cái/tháng hoặc cam kết doanh số. Giá không hiển thị công khai trên website để tránh cạnh tranh giữa các đại lý.",
    categorySlug: "chinh-sach-b2b", type: "PRICING",
    tags: ["giá sỉ", "đại lý", "chính sách giá"], priority: "HIGH", isFeatured: false, isVerified: true,
  },
  {
    title: "Áo thun CVC 65/35 — thông tin sản phẩm chi tiết",
    slug: "ao-thun-cvc-thong-tin-chi-tiet",
    summary: "CVC 65/35 là chất liệu phổ biến nhất tại ATTD. Định lượng 175–185g/m², phù hợp in và thêu.",
    content: "Áo thun CVC 65% cotton / 35% polyester. Định lượng 175–185g/m². Màu sắc: đen, trắng, navy, xám, đỏ, vàng, xanh dương, xanh lá. Size: S, M, L, XL, XXL. MOQ 50 cái/màu. Bền màu qua nhiều lần giặt. Phù hợp in lụa, in DTG, thêu vi tính. Tồn kho thường xuyên.",
    categorySlug: "san-pham-chat-lieu", type: "PRODUCT",
    tags: ["CVC", "áo thun trơn", "chất liệu"], priority: "MEDIUM", isFeatured: false, isVerified: true,
  },
  {
    title: "Áo polo polyester pique — đặc điểm và ứng dụng",
    slug: "ao-polo-polyester-pique-dac-diem",
    summary: "Polo pique polyester 200g/m², thoáng mát, bền màu — lý tưởng cho đồng phục nhân viên ngoài trời.",
    content: "Áo polo 100% polyester pique. Định lượng 200–210g/m². Cổ bẻ 3 cúc. Vải thoáng mát, nhanh khô, ít nhăn. Màu sắc: đen, trắng, navy, đỏ, vàng. MOQ 50 cái/màu. Phù hợp đồng phục nhân viên bán hàng, sự kiện ngoài trời, activation.",
    categorySlug: "san-pham-chat-lieu", type: "PRODUCT",
    tags: ["polo", "polyester", "pique", "đồng phục"], priority: "MEDIUM", isFeatured: false, isVerified: true,
  },
  {
    title: "FAQ — Câu hỏi thường gặp khi đặt hàng sỉ tại ATTD.vn",
    slug: "faq-dat-hang-si-attd",
    summary: "Trả lời các câu hỏi phổ biến về MOQ, lead time, thanh toán và đổi trả.",
    content: "Q: MOQ tối thiểu là bao nhiêu? A: 50 cái/màu cho áo thun và polo thông thường.\nQ: Có thể đặt mix size không? A: Có, miễn là tổng số lượng đạt MOQ.\nQ: Giao hàng toàn quốc không? A: Có, giao toàn quốc qua đơn vị vận chuyển đối tác.\nQ: Có nhận đặt hàng qua Zalo không? A: Có, liên hệ Zalo số hotline trên website.\nQ: Có in logo tại ATTD không? A: ATTD cung cấp nguồn hàng trơn. In logo qua đối tác hoặc theo giới thiệu.",
    categorySlug: "chinh-sach-b2b", type: "FAQ",
    tags: ["FAQ", "câu hỏi", "đặt hàng"], priority: "HIGH", isFeatured: true, isVerified: true,
  },
  {
    title: "Chính sách hiển thị giá trên website công khai",
    slug: "chinh-sach-hien-thi-gia-cong-khai",
    summary: "Giá bán lẻ và đại lý không hiển thị công khai. Website luôn hiển thị Liên hệ báo giá.",
    content: "Chính sách giá: Website ATTD.vn hiển thị CTA Liên hệ báo giá sỉ thay vì giá cụ thể. Lý do: tránh cạnh tranh giữa đại lý, bảo vệ chính sách đại lý. Giá cụ thể cung cấp sau khi khách liên hệ và xác nhận nhu cầu. Đại lý đã ký hợp đồng có thể xem giá qua portal riêng khi hệ thống đại lý hoàn thiện.",
    categorySlug: "chinh-sach-b2b", type: "PRICING",
    tags: ["giá", "chính sách", "liên hệ báo giá"], priority: "HIGH", isFeatured: false, isVerified: true,
  },
  {
    title: "Tote bag canvas — kích thước và cách in phổ biến",
    slug: "tote-bag-canvas-kich-thuoc-in",
    summary: "Tote canvas 38x40cm natural là SKU phổ biến nhất. In lụa 1 màu logo trước túi.",
    content: "Tote canvas standard: 38x40cm, canvas 380g/m², màu natural (kem) phổ biến nhất. Cũng có màu đen và navy. In lụa 1–4 màu lên mặt trước. In transfer nếu nhiều màu. Quai dài 60cm phù hợp đeo vai. MOQ 100 cái. Thích hợp quà tặng hội thảo, hội nghị.",
    categorySlug: "san-pham-chat-lieu", type: "PRODUCT",
    tags: ["tote bag", "canvas", "in lụa"], priority: "LOW", isFeatured: false, isVerified: false,
  },
  {
    title: "Bình giữ nhiệt inox 304 — spec và cách in logo",
    slug: "binh-giu-nhiet-inox-304-spec-in",
    summary: "Bình giữ nhiệt inox 304 2 lớp, 500ml, giữ nhiệt 12h. In laser hoặc UV lên thân.",
    content: "Bình giữ nhiệt inox 304 2 lớp chân không. Dung tích 500ml. Nắp xoáy kín. Giữ nhiệt 12h, lạnh 24h. In logo: laser khắc (bạch kim/đen nền thân inox), in UV màu. MOQ 30 cái. Màu: đen, trắng, navy, bạc. Phù hợp quà tặng onboarding, đối tác cao cấp.",
    categorySlug: "san-pham-chat-lieu", type: "PRODUCT",
    tags: ["bình giữ nhiệt", "inox", "quà tặng"], priority: "MEDIUM", isFeatured: false, isVerified: true,
  },
  {
    title: "Hướng dẫn import sản phẩm vào CMS",
    slug: "huong-dan-import-san-pham-cms",
    summary: "Hướng dẫn tải template, điền thông tin và nhập sản phẩm hàng loạt vào CMS ATTD.",
    content: "Bước 1: Vào /admin/products/import. Bước 2: Tải template phù hợp (áo thun, quà tặng). Bước 3: Điền thông tin sản phẩm theo cột header. Bước 4: Upload file CSV/XLSX. Bước 5: Preview và xác nhận import. Các cột bắt buộc: name, category, productCode. SKU được tạo tự động nếu để trống.",
    categorySlug: "chinh-sach-b2b", type: "POLICY",
    tags: ["import", "CMS", "sản phẩm", "hướng dẫn"], priority: "LOW", isFeatured: false, isVerified: false,
  },
  {
    title: "Script bán hàng — Trả lời khi khách hỏi về giá",
    slug: "script-ban-hang-tra-loi-hoi-gia",
    summary: "Câu trả lời chuẩn khi khách hỏi giá qua Zalo/Messenger.",
    content: "Khi khách hỏi: Giá áo thun bao nhiêu? Trả lời chuẩn: Dạ bên em chuyên cung cấp nguồn hàng sỉ cho xưởng in và đại lý. Giá phụ thuộc vào chất liệu, màu sắc và số lượng ạ. Anh/chị có thể cho em biết: số lượng cần, màu dự kiến, và sản phẩm cụ thể (CVC hay cotton)? Em sẽ báo giá chi tiết trong 30 phút.",
    categorySlug: "chinh-sach-b2b", type: "SALES_SCRIPT",
    tags: ["sales script", "giá", "khách hàng"], priority: "MEDIUM", isFeatured: false, isVerified: true,
  },
  {
    title: "Các trang landing page chính trên ATTD.vn và nội dung SEO",
    slug: "cac-trang-landing-page-attd",
    summary: "Danh sách các trang landing page chính và từ khóa SEO tương ứng.",
    content: "Landing pages: /nguon-hang (từ khóa: nguồn hàng áo thun sỉ), /ao-thun-tron (từ khóa: áo thun trơn sỉ, kho áo thun trơn), /ao-polo-tron (từ khóa: áo polo trơn sỉ), /qua-tang-doanh-nghiep (quà tặng doanh nghiệp sỉ), /oem (OEM đồng phục), /dai-ly (đại lý đồng phục). Mỗi trang có hero section, CTA liên hệ và nội dung SEO riêng.",
    categorySlug: "thuong-hieu-dinh-vi", type: "SEO_CONTEXT",
    tags: ["SEO", "landing page", "từ khóa"], priority: "MEDIUM", isFeatured: false, isVerified: false,
  },
];

// ─── 8. Client Logos ──────────────────────────────────────────────────────────

export const DEMO_CLIENT_LOGOS: DemoClientLogoData[] = [
  { companyName: "Công ty Sự Kiện Minh An [Demo]", website: "https://example.com", imageUrl: img("attd-client-1", 200, 80), sortOrder: 1 },
  { companyName: "Agency Quà Tặng B2B Pro [Demo]", website: "https://example.com", imageUrl: img("attd-client-2", 200, 80), sortOrder: 2 },
  { companyName: "Đại lý Đồng phục Miền Nam [Demo]", website: "https://example.com", imageUrl: img("attd-client-3", 200, 80), sortOrder: 3 },
  { companyName: "Công ty Logistics Sao Việt [Demo]", website: "https://example.com", imageUrl: img("attd-client-4", 200, 80), sortOrder: 4 },
  { companyName: "Trường Quốc tế Demo School [Demo]", website: "https://example.com", imageUrl: img("attd-client-5", 200, 80), sortOrder: 5 },
  { companyName: "Agency Activation 360 [Demo]", website: "https://example.com", imageUrl: img("attd-client-6", 200, 80), sortOrder: 6 },
];

// ─── 9. Case Studies ──────────────────────────────────────────────────────────

export const DEMO_CASE_STUDIES: DemoCaseStudyData[] = [
  {
    title: "1.500 áo thun trơn cho agency sự kiện [Demo]",
    category: "Áo thun đồng phục",
    quantity: "1.500 cái",
    timeline: "5 ngày",
    summary: "Agency sự kiện cần 1.500 áo thun CVC trơn 3 màu (đen/trắng/navy) cho roadshow 5 thành phố. ATTD giao trong 5 ngày, đảm bảo màu sắc nhất quán.",
    imageUrl: img("attd-case-1"),
    sortOrder: 1,
  },
  {
    title: "800 nón đồng phục cho chương trình activation [Demo]",
    category: "Nón đồng phục",
    quantity: "800 cái",
    timeline: "7 ngày",
    summary: "Thương hiệu FMCG đặt 800 nón lưỡi trai cotton cho chiến dịch activation toàn quốc. Thêu logo trực tiếp, giao trước sự kiện 7 ngày.",
    imageUrl: img("attd-case-2"),
    sortOrder: 2,
  },
  {
    title: "500 gift set onboarding cho doanh nghiệp FDI [Demo]",
    category: "Gift set doanh nghiệp",
    quantity: "500 set",
    timeline: "14 ngày",
    summary: "Doanh nghiệp FDI cần 500 gift set onboarding cho nhân viên mới gồm áo polo + bình giữ nhiệt + khăn bandana, đóng hộp cứng in logo.",
    imageUrl: img("attd-case-3"),
    sortOrder: 3,
  },
  {
    title: "2.000 tote bag cho hội nghị khách hàng thường niên [Demo]",
    category: "Tote bag sự kiện",
    quantity: "2.000 cái",
    timeline: "10 ngày",
    summary: "Công ty bảo hiểm đặt 2.000 tote canvas natural in logo cho hội nghị đại lý thường niên. In 2 màu, giao đủ 2.000 cái trong 10 ngày.",
    imageUrl: img("attd-case-4"),
    sortOrder: 4,
  },
];
