#!/usr/bin/env npx tsx
/**
 * Creates or refreshes the catalog-workflow demo product (single slug only).
 *
 *   npx tsx scripts/seed-catalog-workflow-demo-product.ts          # dry run
 *   npx tsx scripts/seed-catalog-workflow-demo-product.ts --apply  # write changes
 *
 * Only mutates product slug `ao-polo-the-thao-pique-pro-demo`.
 * Does not modify any other product records.
 */
import { prisma } from "../src/lib/prisma";
import {
  createProductAdmin,
  getProductAdminById,
  updateProductAdmin,
} from "../src/features/products/product-admin.service";
import { generateVariantMatrix } from "../src/features/products/product-variant-matrix.service";
import { applyAttributePreset } from "../src/features/products/product-attribute-preset.service";
import { getAttributePreset, type AttributePresetKey } from "../src/features/products/product-attribute-presets";
import { mapProductToPublicDetail } from "../src/features/products/product-detail.mapper";
import { resolvePdpGalleryImageUrl } from "../src/lib/productOptionSelection";
import { buildPdpImageAllowlist } from "../src/lib/productImageScope";
import { buildProductExportBundle } from "../src/features/products/product-export.service";

const DEMO_SLUG = "ao-polo-the-thao-pique-pro-demo";
const DEMO_NAME = "Áo Polo Thể Thao Pique Pro — Demo";
const INTERNAL_NOTE =
  "Sản phẩm demo dùng để kiểm tra CMS, biến thể, ảnh màu và PDP. Không dùng để bán thực tế.";

/** Verified HTTPS polo URLs already present in this project's product media. */
const VERIFIED_IMAGES = {
  galleryNeutral:
    "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/ao-polo-Ya-tron-GzLHUcMeuxkEP9ObPK83XMxLPCmRD4.jpg",
  galleryDetail:
    "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/ao-polo-thi-n-thanh-tron-Xc0tlngYwK7ezF0O57pOe1GRiZBcSo.jpg",
  colorBlack:
    "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/ao-polo--en-tron-KwINGHMweFzPVckZkdN0ODEMEnXhLq.jpg",
  colorWhite:
    "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/ao-polo-tr-ng-tron-IWBlta2bQRhlVX720xcNsbowoGZFRJ.jpg",
  colorRed:
    "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/ao-polo-------tron-qKW9Y2cij8mTGhAiqoxwpuWxGImwvR.jpg",
  colorNavy:
    "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/ao-polo-v-ng-tron-DyBSnqGNfmAxmLQjiOBdRhYzuPdsxK.jpg",
  variantBlackL:
    "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/ao-polo-x-m-tron-Pq4351OcwHX7ol6Hi8R6oIuIaLsYUt.jpg",
  variantWhiteM:
    "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/ao-polo-tr-ng-tron-IWBlta2bQRhlVX720xcNsbowoGZFRJ.jpg",
} as const;

const COLOR_ROWS = [
  { label: "Đen", code: "BLK", imageUrl: VERIFIED_IMAGES.colorBlack },
  { label: "Trắng", code: "WHT", imageUrl: VERIFIED_IMAGES.colorWhite },
  { label: "Đỏ", code: "RED", imageUrl: VERIFIED_IMAGES.colorRed },
  { label: "Xanh navy", code: "NVY", imageUrl: VERIFIED_IMAGES.colorNavy },
] as const;

const SIZE_ROWS = [
  { label: "S", code: "S" },
  { label: "M", code: "M" },
  { label: "L", code: "L" },
] as const;

const STOCK_BY_COLOR: Record<string, number> = {
  Đen: 40,
  Trắng: 30,
  Đỏ: 20,
  "Xanh navy": 25,
};

const PRICE_BY_COLOR: Record<string, { wholesale: number; dealer: number }> = {
  Đen: { wholesale: 125_000, dealer: 125_000 },
  Trắng: { wholesale: 125_000, dealer: 125_000 },
  Đỏ: { wholesale: 130_000, dealer: 130_000 },
  "Xanh navy": { wholesale: 130_000, dealer: 130_000 },
};

async function ensurePreset(presetKey: AttributePresetKey, valueKeys: string[]) {
  const preset = getAttributePreset(presetKey);
  if (!preset) return;
  const existing = await prisma.productAttribute.findUnique({
    where: { code: preset.attribute.code },
  });
  await applyAttributePreset({
    presetKey,
    selectedValueKeys: valueKeys,
    mergeMode: existing ? "add-missing-values" : "create",
  });
}

async function loadAttributeValue(attributeCode: string, valueCode: string) {
  const attribute = await prisma.productAttribute.findUnique({
    where: { code: attributeCode },
    include: { values: { where: { status: "ACTIVE" } } },
  });
  if (!attribute) return null;
  const value =
    attribute.values.find((row) => row.code === valueCode) ??
    attribute.values.find((row) => row.name.toLowerCase() === valueCode.toLowerCase());
  if (!value) return null;
  return { attributeId: attribute.id, attributeValueId: value.id, label: value.name };
}

function buildLongDescription(): string {
  return `<h2>Áo polo thể thao Pique Pro — giải pháp đồng phục B2B</h2>
<p>Sản phẩm demo trong hệ thống ATTD.vn để kiểm tra quy trình danh mục: thuộc tính dùng chung, biến thể màu–size, ảnh PDP và xuất/nhập dữ liệu.</p>
<h3>Ứng dụng phù hợp</h3>
<ul>
<li>Đồng phục công ty và đội ngũ bán hàng</li>
<li>Team building, sự kiện nội bộ và kích hoạt thương hiệu</li>
<li>Đại lý đồng phục cần mẫu polo pique bền, dễ in thêu logo</li>
</ul>
<h3>Chất liệu &amp; form</h3>
<p>Vải thể thao Pique thoáng khí, form regular fit dễ mặc cho nam nữ. Phù hợp in lụa, in chuyển nhiệt và thêu vi tính.</p>
<h3>Điều kiện cung ứng</h3>
<p>MOQ từ 30 áo. Thời gian sản xuất tham khảo 7–12 ngày tùy số lượng và yêu cầu tùy chỉnh. Hỗ trợ OEM / private label theo thương hiệu khách hàng.</p>`;
}

function buildSpecifications() {
  return [
    { label: "Thành phần", value: "Polyester pha cotton", sortOrder: 1 },
    { label: "Định lượng", value: "220 GSM", sortOrder: 2 },
    { label: "Công nghệ in phù hợp", value: "In lụa, in chuyển nhiệt, thêu vi tính", sortOrder: 3 },
    { label: "Bảo quản", value: "Giặt máy nhẹ, không dùng thuốc tẩy mạnh", sortOrder: 4 },
    { label: "Xuất xứ", value: "Việt Nam", sortOrder: 5 },
  ];
}

function buildCustomizations() {
  return [
    { label: "In logo ngực trái", description: "MOQ áp dụng theo sản phẩm", sortOrder: 0, enabled: true },
    { label: "In sau lưng", description: "Hỗ trợ file vector / PDF in ấn", sortOrder: 1, enabled: true },
    { label: "Thêu logo", description: "Thêu vi tính theo màu chỉ thương hiệu", sortOrder: 2, enabled: true },
    { label: "Gắn nhãn riêng", description: "Nhãn mác theo thương hiệu khách hàng", sortOrder: 3, enabled: true },
    { label: "May theo màu thương hiệu", description: "Pantone / mẫu vải theo yêu cầu", sortOrder: 4, enabled: true },
    {
      label: "Đóng gói theo bộ phận / nhân sự",
      description: "Chia size và đóng túi riêng theo danh sách",
      sortOrder: 5,
      enabled: true,
    },
  ];
}

async function buildAssignments() {
  const rows: Array<{
    attributeId: string;
    attributeValueId?: string;
    customValue?: string;
    sortOrder: number;
  }> = [];

  const material = await loadAttributeValue("MATERIAL", "PIQUE");
  if (material) {
    rows.push({
      attributeId: material.attributeId,
      attributeValueId: material.attributeValueId,
      sortOrder: 0,
    });
  }

  const fit = await loadAttributeValue("FIT", "REGULAR");
  if (fit) {
    rows.push({
      attributeId: fit.attributeId,
      attributeValueId: fit.attributeValueId,
      sortOrder: 1,
    });
  }

  const collar = await loadAttributeValue("COLLAR", "POLO");
  if (collar) {
    rows.push({ attributeId: collar.attributeId, attributeValueId: collar.attributeValueId, sortOrder: 2 });
  }

  const gender = await loadAttributeValue("GENDER", "UNISEX");
  if (gender) {
    rows.push({ attributeId: gender.attributeId, attributeValueId: gender.attributeValueId, sortOrder: 3 });
  }

  const sleeve = await loadAttributeValue("SLEEVE", "SHORT");
  if (sleeve) {
    rows.push({ attributeId: sleeve.attributeId, attributeValueId: sleeve.attributeValueId, sortOrder: 4 });
  }

  const fabtype = await prisma.productAttribute.findUnique({ where: { code: "FABTYPE" } });
  if (fabtype) {
    const knit = await loadAttributeValue("FABTYPE", "KNIT");
    rows.push({
      attributeId: fabtype.id,
      attributeValueId: knit?.attributeValueId,
      customValue: knit ? undefined : "Pique thể thao",
      sortOrder: 5,
    });
  }

  return rows;
}

async function buildOptions() {
  const colorAttr = await prisma.productAttribute.findUnique({
    where: { code: "COLOR" },
    include: { values: { where: { status: "ACTIVE" } } },
  });
  const sizeAttr = await prisma.productAttribute.findUnique({
    where: { code: "SIZE" },
    include: { values: { where: { status: "ACTIVE" } } },
  });
  if (!colorAttr || !sizeAttr) {
    throw new Error("Shared COLOR/SIZE attributes are required. Seed shared attributes first.");
  }

  return [
    {
      attributeId: colorAttr.id,
      name: "Màu sắc",
      slug: "mau-sac",
      sortOrder: 0,
      values: COLOR_ROWS.map((row, index) => {
        const shared = colorAttr.values.find((value) => value.code === row.code);
        return {
          attributeValueId: shared?.id ?? null,
          label: row.label,
          valueCode: row.code,
          imageUrl: row.imageUrl,
          sortOrder: index,
        };
      }),
    },
    {
      attributeId: sizeAttr.id,
      name: "Kích thước",
      slug: "kich-thuoc",
      sortOrder: 1,
      values: SIZE_ROWS.map((row, index) => {
        const shared = sizeAttr.values.find((value) => value.code === row.code);
        return {
          attributeValueId: shared?.id ?? null,
          label: row.label,
          valueCode: row.code,
          sortOrder: index,
        };
      }),
    },
  ];
}

async function buildCorePayload(categoryId: string) {
  return {
    name: DEMO_NAME,
    slug: DEMO_SLUG,
    categoryId,
    status: "DRAFT" as const,
    shortDescription:
      "Áo polo thể thao pique dành cho doanh nghiệp, đội nhóm và đại lý cần sản phẩm đồng phục bền, thoáng và dễ in thêu logo.",
    description: buildLongDescription(),
    defaultMoq: 30,
    leadTime: "7–12 ngày",
    useCases: ["Đồng phục công ty", "Team building", "Sự kiện", "Đại lý đồng phục", "In thêu logo theo yêu cầu"],
    targetCustomers: ["Doanh nghiệp", "Agency", "Đại lý đồng phục", "Ban tổ chức sự kiện"],
    supportsPrinting: true,
    supportsEmbroidery: true,
    supportsOem: true,
    tags: [
      "áo polo thể thao",
      "áo polo đồng phục",
      "áo polo pique",
      "áo đồng phục doanh nghiệp",
      "áo polo đại lý",
    ],
    seoTitle: "Áo Polo Thể Thao Pique Pro | Đồng Phục Doanh Nghiệp & Đại Lý",
    seoDescription:
      "Áo polo thể thao pique form regular fit, phù hợp đồng phục công ty, team building và đại lý. Hỗ trợ in thêu logo, MOQ từ 30 áo.",
    featuredImage: VERIFIED_IMAGES.galleryNeutral,
    gallery: [VERIFIED_IMAGES.galleryNeutral, VERIFIED_IMAGES.galleryDetail],
    fit: undefined,
    specifications: buildSpecifications(),
    customizations: buildCustomizations(),
    attributeAssignments: await buildAssignments(),
    options: await buildOptions(),
    variants: [],
    metadata: {
      isDemo: true,
      demoKey: "catalog-workflow",
      internalNote: INTERNAL_NOTE,
    },
  };
}

async function patchVariants(productId: string) {
  const product = await getProductAdminById(productId);
  if (!product) throw new Error("Product missing after matrix generation");

  const variants = product.variants.map((variant) => {
    const parts = (variant.displayLabel ?? "").split(" / ").map((part) => part.trim());
    const colorLabel = parts[0] || variant.colorName || "";
    const sizeLabel = parts[1] || variant.sizeName || "";

    const stockQty = colorLabel ? STOCK_BY_COLOR[colorLabel] ?? 0 : 0;
    const prices = colorLabel ? PRICE_BY_COLOR[colorLabel] : undefined;

    let imageUrl: string | null = null;
    if (colorLabel === "Đen" && sizeLabel === "L") imageUrl = VERIFIED_IMAGES.variantBlackL;
    if (colorLabel === "Trắng" && sizeLabel === "M") imageUrl = VERIFIED_IMAGES.variantWhiteM;

    return {
      id: variant.id,
      stockQty,
      stockStatus: stockQty > 0 ? ("IN_STOCK" as const) : ("OUT_OF_STOCK" as const),
      variantStatus: "ACTIVE" as const,
      wholesalePrice: prices?.wholesale,
      dealerPrice: prices?.dealer,
      imageUrl,
    };
  });

  await updateProductAdmin(productId, { variants });
}

async function validateDemoProduct(productId: string) {
  const admin = await getProductAdminById(productId);
  if (!admin) throw new Error("Validation failed: product not found");

  const publicDetail = mapProductToPublicDetail(admin as unknown as Parameters<typeof mapProductToPublicDetail>[0]);
  const allowlist = buildPdpImageAllowlist({
    images: publicDetail.images,
    variantImageUrls: publicDetail.variants.map((variant) => variant.imageUrl),
    optionValueImageUrls: publicDetail.optionGroups.flatMap((group) =>
      group.values.map((value) => value.imageUrl),
    ),
  });

  const blackSelection = { "mau-sac": "Đen", "kich-thuoc": "M" };
  const blackImage = resolvePdpGalleryImageUrl(
    publicDetail.variants,
    publicDetail.optionGroups,
    blackSelection,
    allowlist,
    publicDetail.images[0]?.imageUrl ?? null,
  );

  const exportBundle = await buildProductExportBundle({
    scope: "single",
    productIds: [productId],
    format: "xlsx",
    includeSpecifications: true,
    includeCustomizations: true,
    includeDealerPrice: true,
    includeWholesalePrice: true,
  });

  return {
    admin,
    publicDetail,
    blackImage,
    exportProductCount: exportBundle.productCount,
    exportVariantCount: exportBundle.variantCount,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "seed-catalog-workflow-demo-product — APPLY\n" : "seed-catalog-workflow-demo-product — dry run\n");

  const category =
    (await prisma.category.findFirst({ where: { slug: "ao-polo" } })) ??
    (await prisma.category.findFirst({ where: { slug: "ao-polo-tron" } }));
  if (!category) {
    throw new Error('Polo category not found (expected slug "ao-polo" or "ao-polo-tron").');
  }

  const existing = await prisma.product.findUnique({
    where: { slug: DEMO_SLUG },
    select: { id: true, productCode: true, name: true, status: true },
  });

  if (existing && !existing.productCode?.includes("DEMO")) {
    throw new Error(
      `Slug ${DEMO_SLUG} is used by a non-demo product (${existing.productCode}). Aborting to protect production data.`,
    );
  }

  if (!apply) {
    console.log("Would ensure presets: collar, gender, sleeve, fabric-type");
    console.log(`Would upsert demo product in category ${category.name} (${category.slug})`);
    console.log(`Existing demo: ${existing ? `${existing.id} / ${existing.productCode} / ${existing.status}` : "none"}`);
    console.log("Re-run with --apply to write changes.");
    return;
  }

  await ensurePreset("collar", ["polo"]);
  await ensurePreset("gender", ["unisex"]);
  await ensurePreset("sleeve", ["short"]);
  await ensurePreset("fabric-type", ["knit"]);

  const payload = await buildCorePayload(category.id);

  let productId: string;
  if (existing) {
    await prisma.productVariant.deleteMany({ where: { productId: existing.id } });
    await updateProductAdmin(existing.id, payload);
    productId = existing.id;
    console.log(`Updated demo product ${productId} (kept productCode ${existing.productCode})`);
  } else {
    const created = await createProductAdmin(payload);
    if (!created) throw new Error("Failed to create demo product");
    productId = created.id;
    console.log(`Created demo product ${productId} with productCode ${created.productCode}`);
  }

  const matrix = await generateVariantMatrix(productId, { confirmLarge: true });
  console.log(`Generated variants: created=${matrix.created}, preserved=${matrix.preserved}`);

  await patchVariants(productId);

  const validation = await validateDemoProduct(productId);
  const variantSkus = validation.admin.variants.map((variant) => variant.sku).sort();

  console.log("\n=== Validation summary ===");
  console.log(`Status: ${validation.admin.status}`);
  console.log(`Option groups: ${validation.admin.options.length}`);
  console.log(`Variants: ${validation.admin.variants.length}`);
  console.log(`Assignments: ${validation.admin.attributeAssignments.length}`);
  console.log(`Specifications: ${validation.admin.specifications.length}`);
  console.log(`Customizations: ${validation.admin.customizationCapabilities.length}`);
  console.log(`Material mirror: ${validation.admin.material ?? "(empty)"}`);
  console.log(`Form mirror: ${validation.admin.form ?? "(empty)"}`);
  console.log(`Legacy fit: ${validation.admin.fit ?? "(cleared)"}`);
  console.log(`PDP black image resolved: ${validation.blackImage ?? "(none)"}`);
  console.log(`Export bundle: ${validation.exportProductCount} product(s), ${validation.exportVariantCount} variant row(s)`);
  console.log(`SKUs:\n  ${variantSkus.join("\n  ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
