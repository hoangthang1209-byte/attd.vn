import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSku, ensureUniqueSku } from "@/features/products/product-sku-utils";

// ─── B2B Wholesale Category definitions ──────────────────────────────────────

export const PRODUCT_STARTER_CATEGORIES = [
  { name: "Áo thun trơn", slug: "ao-thun-tron", skuCode: "TS", description: "Áo thun cotton, CVC, TC — nguồn hàng sỉ cho xưởng in và đại lý", sortOrder: 1 },
  { name: "Áo polo trơn", slug: "ao-polo-tron", skuCode: "PO", description: "Áo polo pique — đồng phục doanh nghiệp và nguồn hàng sỉ", sortOrder: 2 },
  { name: "Áo khoác đồng phục", slug: "ao-khoac-dong-phuc", skuCode: "JK", description: "Windbreaker, bomber, hoodie — đồng phục và quà tặng B2B", sortOrder: 3 },
  { name: "Hoodie & Sweater", slug: "hoodie-sweater", skuCode: "HD", description: "Hoodie cotton fleece, sweater — đồng phục team và quà tặng doanh nghiệp", sortOrder: 4 },
  { name: "Nón đồng phục", slug: "non-dong-phuc", skuCode: "CAP", description: "Nón lưỡi trai, bucket hat, nón kết — nguồn hàng sỉ", sortOrder: 5 },
  { name: "Tote bag", slug: "tote-bag", skuCode: "TOTE", description: "Túi tote canvas, non-woven — quà tặng và marketing doanh nghiệp", sortOrder: 6 },
  { name: "Bình giữ nhiệt", slug: "binh-giu-nhiet", skuCode: "BGN", description: "Bình inox, bình tritan — quà tặng doanh nghiệp sỉ", sortOrder: 7 },
  { name: "Khăn bandana", slug: "khan-bandana", skuCode: "BND", description: "Bandana polyester, cotton — event và team building", sortOrder: 8 },
  { name: "Gift set doanh nghiệp", slug: "gift-set-doanh-nghiep", skuCode: "GIFT", description: "Combo quà tặng B2B — áo + phụ kiện + đóng gói theo brief", sortOrder: 9 },
] as const;

// ─── Sample products + variants ───────────────────────────────────────────────

type StarterProduct = {
  name: string;
  categorySlug: string;
  productCode: string;
  shortDescription: string;
  description: string;
  material: string;
  form?: string;
  defaultMoq: number;
  supportsPrinting: boolean;
  supportsEmbroidery: boolean;
  supportsOem: boolean;
  tags: string[];
  useCases: string[];
  targetCustomers: string[];
  status: "ACTIVE" | "DRAFT";
  variants: Array<{
    colorName: string;
    colorCode: string;
    sizeName?: string;
    dimensions?: string;
    capacity?: string;
    wholesalePrice?: number;
    dealerPrice?: number;
    stockQty: number;
    stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "PREORDER";
    internalNote?: string;
  }>;
};

const STARTER_PRODUCTS: StarterProduct[] = [
  {
    name: "Áo thun CVC basic",
    categorySlug: "ao-thun-tron",
    productCode: "CVC-BASIC",
    shortDescription: "Áo thun CVC cotton-viscose, kháng nhăn, form suông basic — nguồn hàng sỉ cho xưởng in và đại lý.",
    description: "Áo thun CVC (Cotton Viscose Combination) là dòng sản phẩm nền tảng cho nguồn hàng sỉ tại ATTD. Vải CVC giữ form tốt, kháng nhăn, bề mặt mịn — lý tưởng cho in lụa, in nhiệt và thêu logo. Phù hợp đồng phục doanh nghiệp, xưởng in và bán lẻ.\n\nLưu ý: Giá và MOQ trong dữ liệu mẫu là placeholder — liên hệ ATTD để nhận bảng giá thực tế.",
    material: "CVC (Cotton-Viscose Combination)",
    form: "Round neck, regular fit",
    defaultMoq: 50,
    supportsPrinting: true,
    supportsEmbroidery: true,
    supportsOem: true,
    tags: ["áo thun trơn", "CVC", "nguồn hàng sỉ", "xưởng in", "đồng phục"],
    useCases: ["Xưởng in blank", "Đồng phục công ty", "Đại lý sỉ", "OEM"],
    targetCustomers: ["Xưởng in", "Đại lý sỉ", "Doanh nghiệp"],
    status: "ACTIVE",
    variants: [
      { colorName: "Đen", colorCode: "BLK", sizeName: "M", wholesalePrice: 0, dealerPrice: 0, stockQty: 500, stockStatus: "IN_STOCK", internalNote: "Giá mẫu — liên hệ ATTD" },
      { colorName: "Đen", colorCode: "BLK", sizeName: "L", wholesalePrice: 0, dealerPrice: 0, stockQty: 500, stockStatus: "IN_STOCK" },
      { colorName: "Đen", colorCode: "BLK", sizeName: "XL", wholesalePrice: 0, dealerPrice: 0, stockQty: 300, stockStatus: "IN_STOCK" },
      { colorName: "Trắng", colorCode: "WHT", sizeName: "M", wholesalePrice: 0, dealerPrice: 0, stockQty: 500, stockStatus: "IN_STOCK" },
      { colorName: "Trắng", colorCode: "WHT", sizeName: "L", wholesalePrice: 0, dealerPrice: 0, stockQty: 500, stockStatus: "IN_STOCK" },
      { colorName: "Trắng", colorCode: "WHT", sizeName: "XL", wholesalePrice: 0, dealerPrice: 0, stockQty: 300, stockStatus: "IN_STOCK" },
      { colorName: "Xanh navy", colorCode: "NVY", sizeName: "M", wholesalePrice: 0, dealerPrice: 0, stockQty: 200, stockStatus: "IN_STOCK" },
      { colorName: "Xanh navy", colorCode: "NVY", sizeName: "L", wholesalePrice: 0, dealerPrice: 0, stockQty: 200, stockStatus: "IN_STOCK" },
      { colorName: "Xám", colorCode: "GRY", sizeName: "M", wholesalePrice: 0, dealerPrice: 0, stockQty: 200, stockStatus: "IN_STOCK" },
      { colorName: "Xám", colorCode: "GRY", sizeName: "L", wholesalePrice: 0, dealerPrice: 0, stockQty: 200, stockStatus: "IN_STOCK" },
    ],
  },
  {
    name: "Áo polo pique poly cá sấu",
    categorySlug: "ao-polo-tron",
    productCode: "PO-PIQUE-PL",
    shortDescription: "Áo polo cá sấu polyester pique — đồng phục doanh nghiệp, nhân viên F&B, sự kiện.",
    description: "Áo polo pique polyester phù hợp đồng phục công ty, ngân hàng, F&B và nhân viên bán hàng. Vải pique thoáng khí, giữ form, dễ in/thêu logo.\n\nLưu ý: Giá và MOQ là placeholder — liên hệ ATTD để xác nhận.",
    material: "Polyester pique",
    form: "Polo collar, regular fit",
    defaultMoq: 50,
    supportsPrinting: true,
    supportsEmbroidery: true,
    supportsOem: true,
    tags: ["áo polo", "đồng phục công ty", "pique", "OEM"],
    useCases: ["Đồng phục doanh nghiệp", "F&B", "Sự kiện", "OEM"],
    targetCustomers: ["Doanh nghiệp", "Agency quà tặng", "Xưởng in"],
    status: "ACTIVE",
    variants: [
      { colorName: "Đen", colorCode: "BLK", sizeName: "S", stockQty: 300, stockStatus: "IN_STOCK" },
      { colorName: "Đen", colorCode: "BLK", sizeName: "M", stockQty: 300, stockStatus: "IN_STOCK" },
      { colorName: "Đen", colorCode: "BLK", sizeName: "L", stockQty: 300, stockStatus: "IN_STOCK" },
      { colorName: "Trắng", colorCode: "WHT", sizeName: "M", stockQty: 300, stockStatus: "IN_STOCK" },
      { colorName: "Trắng", colorCode: "WHT", sizeName: "L", stockQty: 300, stockStatus: "IN_STOCK" },
      { colorName: "Xanh navy", colorCode: "NVY", sizeName: "M", stockQty: 150, stockStatus: "IN_STOCK" },
      { colorName: "Xanh navy", colorCode: "NVY", sizeName: "L", stockQty: 150, stockStatus: "IN_STOCK" },
    ],
  },
  {
    name: "Nón lưỡi trai cotton basic",
    categorySlug: "non-dong-phuc",
    productCode: "CAP-CT-BASIC",
    shortDescription: "Nón lưỡi trai cotton — in/thêu logo, dùng cho đồng phục và quà tặng doanh nghiệp.",
    description: "Nón lưỡi trai cotton 6 panel — phù hợp đồng phục nhân viên, event outdoor và combo quà tặng doanh nghiệp. Hỗ trợ thêu logo trước và sau.\n\nGiá là placeholder — liên hệ ATTD.",
    material: "Cotton 100%",
    form: "6-panel baseball cap",
    defaultMoq: 50,
    supportsPrinting: true,
    supportsEmbroidery: true,
    supportsOem: true,
    tags: ["nón lưỡi trai", "nón đồng phục", "baseball cap", "quà tặng"],
    useCases: ["Đồng phục", "Sự kiện", "Quà tặng doanh nghiệp"],
    targetCustomers: ["Doanh nghiệp", "Agency quà tặng"],
    status: "ACTIVE",
    variants: [
      { colorName: "Đen", colorCode: "BLK", sizeName: "OneSize", stockQty: 300, stockStatus: "IN_STOCK" },
      { colorName: "Trắng", colorCode: "WHT", sizeName: "OneSize", stockQty: 300, stockStatus: "IN_STOCK" },
      { colorName: "Xanh navy", colorCode: "NVY", sizeName: "OneSize", stockQty: 200, stockStatus: "IN_STOCK" },
    ],
  },
  {
    name: "Tote bag canvas basic",
    categorySlug: "tote-bag",
    productCode: "TOTE-CAN-BASIC",
    shortDescription: "Túi tote canvas 280gsm — in logo offset/lụa, quà tặng và marketing doanh nghiệp.",
    description: "Túi tote canvas 280gsm — bền, tái sử dụng, phù hợp in offset hoặc in lụa 1-2 màu. Kích cỡ 35x40cm standard. Dùng cho quà tặng doanh nghiệp, túi hội nghị và marketing campaign.\n\nGiá và MOQ là placeholder — liên hệ ATTD.",
    material: "Canvas 280gsm",
    defaultMoq: 100,
    supportsPrinting: true,
    supportsEmbroidery: false,
    supportsOem: true,
    tags: ["tote bag", "canvas", "quà tặng doanh nghiệp", "marketing"],
    useCases: ["Quà tặng doanh nghiệp", "Marketing", "Hội nghị"],
    targetCustomers: ["Agency quà tặng", "Doanh nghiệp"],
    status: "ACTIVE",
    variants: [
      { colorName: "Tự nhiên (Natural)", colorCode: "NT", dimensions: "35x40cm", stockQty: 500, stockStatus: "IN_STOCK" },
      { colorName: "Đen", colorCode: "BLK", dimensions: "35x40cm", stockQty: 300, stockStatus: "IN_STOCK" },
    ],
  },
  {
    name: "Bình giữ nhiệt inox 500ml",
    categorySlug: "binh-giu-nhiet",
    productCode: "BGN-INX-500",
    shortDescription: "Bình giữ nhiệt inox 304 500ml — khắc laser logo, quà tặng doanh nghiệp B2B.",
    description: "Bình giữ nhiệt inox 304 dung tích 500ml, giữ nóng 12h, lạnh 24h. Phù hợp quà tặng nhân viên, đối tác doanh nghiệp và kit onboarding. Hỗ trợ khắc laser hoặc in UV.\n\nGiá là placeholder — liên hệ ATTD.",
    material: "Inox 304",
    defaultMoq: 50,
    supportsPrinting: true,
    supportsEmbroidery: false,
    supportsOem: true,
    tags: ["bình giữ nhiệt", "inox", "quà tặng doanh nghiệp"],
    useCases: ["Quà tặng nhân viên", "Onboarding kit", "Gift set B2B"],
    targetCustomers: ["Agency quà tặng", "Doanh nghiệp"],
    status: "ACTIVE",
    variants: [
      { colorName: "Đen mờ", colorCode: "BLK", capacity: "500ml", stockQty: 200, stockStatus: "IN_STOCK" },
      { colorName: "Trắng sứ", colorCode: "WHT", capacity: "500ml", stockQty: 200, stockStatus: "IN_STOCK" },
      { colorName: "Bạc (Silver)", colorCode: "SIL", capacity: "500ml", stockQty: 100, stockStatus: "IN_STOCK" },
    ],
  },
  {
    name: "Khăn bandana polyester in sublimation",
    categorySlug: "khan-bandana",
    productCode: "BND-POLY-60",
    shortDescription: "Khăn bandana polyester 60x60cm — in sublimation full màu, event và team building.",
    description: "Khăn bandana polyester microfiber 60x60cm, in sublimation full màu — phù hợp event ngoài trời, marathon, team building và combo quà tặng brand.\n\nGiá là placeholder — liên hệ ATTD.",
    material: "Polyester microfiber",
    defaultMoq: 100,
    supportsPrinting: true,
    supportsEmbroidery: false,
    supportsOem: true,
    tags: ["bandana", "khăn đồng phục", "sublimation", "event"],
    useCases: ["Event", "Team building", "Quà tặng brand"],
    targetCustomers: ["Agency sự kiện", "Doanh nghiệp"],
    status: "ACTIVE",
    variants: [
      { colorName: "Trắng (in full màu)", colorCode: "WHT", dimensions: "60x60cm", stockQty: 500, stockStatus: "IN_STOCK" },
      { colorName: "Đen (in full màu)", colorCode: "BLK", dimensions: "60x60cm", stockQty: 300, stockStatus: "IN_STOCK" },
    ],
  },
  {
    name: "Combo quà tặng doanh nghiệp basic",
    categorySlug: "gift-set-doanh-nghiep",
    productCode: "GIFT-COMBO-BASIC",
    shortDescription: "Combo quà tặng B2B: áo polo + tote bag canvas — in/thêu logo theo brief.",
    description: "Combo quà tặng doanh nghiệp cơ bản gồm: 1x Áo polo pique + 1x Tote bag canvas. Phù hợp quà tặng nhân viên mới, đối tác và sự kiện doanh nghiệp. Hỗ trợ in/thêu logo theo brief.\n\nGiá là placeholder — liên hệ ATTD để nhận báo giá combo.",
    material: "Polyester pique + Canvas 280gsm",
    defaultMoq: 30,
    supportsPrinting: true,
    supportsEmbroidery: true,
    supportsOem: true,
    tags: ["gift set", "combo quà tặng", "đồng phục doanh nghiệp", "B2B"],
    useCases: ["Quà tặng nhân viên", "Onboarding kit", "Gift set sự kiện"],
    targetCustomers: ["Doanh nghiệp", "Agency quà tặng"],
    status: "DRAFT",
    variants: [
      { colorName: "Đen combo", colorCode: "BLK", stockQty: 100, stockStatus: "PREORDER", internalNote: "Đặt hàng theo brief doanh nghiệp" },
      { colorName: "Trắng combo", colorCode: "WHT", stockQty: 100, stockStatus: "PREORDER" },
    ],
  },
];

// ─── Import function ──────────────────────────────────────────────────────────

export async function importProductStarterData(): Promise<{
  created: number;
  skipped: number;
  createdVariants: number;
  total: number;
}> {
  let created = 0;
  let skipped = 0;
  let createdVariants = 0;

  for (const cat of PRODUCT_STARTER_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: { name: cat.name, slug: cat.slug, skuCode: cat.skuCode, description: cat.description, sortOrder: cat.sortOrder },
      update: { skuCode: cat.skuCode, description: cat.description, sortOrder: cat.sortOrder },
    });
  }

  for (const item of STARTER_PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { productCode: item.productCode },
    });

    if (existing) { skipped++; continue; }

    const category = await prisma.category.findUnique({ where: { slug: item.categorySlug } });
    if (!category) continue;

    const slug = item.productCode.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const product = await prisma.product.create({
      data: {
        name: item.name,
        slug: `${category.slug}-${slug}`,
        productCode: item.productCode,
        categoryId: category.id,
        shortDescription: item.shortDescription,
        description: item.description,
        material: item.material,
        form: item.form ?? null,
        defaultMoq: item.defaultMoq,
        useCases: item.useCases,
        targetCustomers: item.targetCustomers,
        supportsPrinting: item.supportsPrinting,
        supportsEmbroidery: item.supportsEmbroidery,
        supportsOem: item.supportsOem,
        tags: item.tags,
        status: item.status,
        metadata: { sampleData: true } as Prisma.InputJsonValue,
      },
    });
    created++;

    for (const v of item.variants) {
      const baseSku = generateSku({
        productCode: item.productCode,
        colorName: v.colorName,
        colorCode: v.colorCode,
        sizeName: v.sizeName,
        dimensions: v.dimensions,
        capacity: v.capacity,
      });
      const sku = await ensureUniqueSku(baseSku);
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku,
          colorName: v.colorName,
          colorCode: v.colorCode,
          sizeName: v.sizeName,
          dimensions: v.dimensions,
          capacity: v.capacity,
          wholesalePrice: v.wholesalePrice ?? null,
          dealerPrice: v.dealerPrice ?? null,
          stockQty: v.stockQty,
          stockStatus: v.stockStatus,
          internalNote: v.internalNote ?? null,
          variantStatus: "ACTIVE",
          metadata: { sampleData: true } as Prisma.InputJsonValue,
        },
      });
      createdVariants++;
    }
  }

  return { created, skipped, createdVariants, total: STARTER_PRODUCTS.length };
}
