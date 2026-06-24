/**
 * Idempotent seed for RevenueCategory hierarchy (Sprint 26.3.11).
 * Run: npx tsx scripts/seed-revenue-categories.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedNode = {
  code: string;
  name: string;
  isSystem?: boolean;
  children?: SeedNode[];
};

const SEED_TREE: SeedNode[] = [
  {
    code: "WHOLESALE_BLANK",
    name: "Hàng trơn kho sỉ",
    isSystem: true,
    children: [
      { code: "WHOLESALE_BLANK_TSHIRT", name: "Áo thun trơn", isSystem: true },
      { code: "WHOLESALE_BLANK_POLO", name: "Áo polo trơn", isSystem: true },
      { code: "WHOLESALE_BLANK_HOODIE", name: "Hoodie trơn", isSystem: true },
      { code: "WHOLESALE_BLANK_TANK", name: "Tank top trơn", isSystem: true },
      { code: "WHOLESALE_BLANK_ACCESSORY", name: "Phụ kiện hàng trơn", isSystem: true },
    ],
  },
  {
    code: "UNIFORM",
    name: "Đồng phục doanh nghiệp",
    isSystem: true,
    children: [
      { code: "UNIFORM_TSHIRT", name: "Áo thun đồng phục", isSystem: true },
      { code: "UNIFORM_POLO", name: "Áo polo đồng phục", isSystem: true },
      { code: "UNIFORM_SHIRT", name: "Áo sơ mi đồng phục", isSystem: true },
      { code: "UNIFORM_JACKET", name: "Áo khoác đồng phục", isSystem: true },
      { code: "UNIFORM_WORKER", name: "Đồng phục công nhân", isSystem: true },
      { code: "UNIFORM_HOSPITALITY", name: "Đồng phục nhà hàng / khách sạn", isSystem: true },
    ],
  },
  {
    code: "EVENT_MERCH",
    name: "Sự kiện & Merchandise",
    isSystem: true,
    children: [
      { code: "EVENT_TSHIRT", name: "Áo sự kiện", isSystem: true },
      { code: "EVENT_TEAMBUILDING", name: "Áo team building", isSystem: true },
      { code: "MERCH_TOTE", name: "Tote bag in logo", isSystem: true },
      { code: "MERCH_CAP", name: "Nón in / thêu logo", isSystem: true },
      { code: "MERCH_BANDANA", name: "Bandana theo yêu cầu", isSystem: true },
      { code: "MERCH_BRAND", name: "Merchandise thương hiệu", isSystem: true },
    ],
  },
  {
    code: "CORPORATE_GIFT",
    name: "Quà tặng doanh nghiệp",
    isSystem: true,
    children: [
      { code: "GIFT_THERMOS", name: "Bình giữ nhiệt in logo", isSystem: true },
      { code: "GIFT_SET", name: "Gift set doanh nghiệp", isSystem: true },
      { code: "GIFT_EVENT", name: "Quà tặng sự kiện", isSystem: true },
    ],
  },
  {
    code: "PACKAGING",
    name: "Phụ kiện & bao bì",
    isSystem: true,
    children: [
      { code: "PACKAGING_WOVEN_LABEL", name: "Nhãn dệt", isSystem: true },
      { code: "PACKAGING_HANGTAG", name: "Hangtag", isSystem: true },
      { code: "PACKAGING_PE_BAG", name: "Túi PE", isSystem: true },
      { code: "PACKAGING_BRAND", name: "Bao bì thương hiệu", isSystem: true },
    ],
  },
  {
    code: "SERVICE",
    name: "Dịch vụ gia công",
    isSystem: true,
    children: [
      { code: "SERVICE_CUSTOMER_GOODS_PRINT", name: "In trên hàng khách", isSystem: true },
      { code: "SERVICE_CUSTOMER_GOODS_EMBROIDERY", name: "Thêu trên hàng khách", isSystem: true },
      { code: "SERVICE_OTHER", name: "Gia công khác", isSystem: true },
    ],
  },
];

async function upsertNode(node: SeedNode, parentId: string | null, sortOrder: number) {
  const row = await prisma.revenueCategory.upsert({
    where: { code: node.code },
    create: {
      code: node.code,
      name: node.name,
      parentId,
      sortOrder,
      isActive: true,
      isSystem: node.isSystem ?? false,
    },
    update: {
      name: node.name,
      parentId,
      sortOrder,
      isActive: true,
      isSystem: node.isSystem ?? false,
    },
  });

  let childSort = 0;
  for (const child of node.children ?? []) {
    await upsertNode(child, row.id, childSort);
    childSort += 1;
  }
}

async function main() {
  let rootSort = 0;
  for (const root of SEED_TREE) {
    await upsertNode(root, null, rootSort);
    rootSort += 1;
  }
  const count = await prisma.revenueCategory.count();
  console.log(`Revenue categories seeded. Total rows: ${count}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
