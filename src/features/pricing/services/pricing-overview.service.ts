import { prisma } from "@/lib/prisma";
import { ensureDefaultPriceGroups } from "@/features/pricing/services/price-group.service";
import { listPricingCalculations } from "@/features/pricing/services/pricing-calculation.service";
import type { PricingOverviewStats } from "@/features/pricing/types";

export async function getPricingOverview(): Promise<PricingOverviewStats> {
  await ensureDefaultPriceGroups();

  const [activePriceGroups, productTierCount, serviceRuleCount, recent] = await Promise.all([
    prisma.priceGroup.count({ where: { isActive: true } }),
    prisma.productPriceTier.count({ where: { isActive: true } }),
    prisma.servicePriceRule.count({ where: { isActive: true } }),
    listPricingCalculations({ limit: 8 }),
  ]);

  return {
    activePriceGroups,
    productTierCount,
    serviceRuleCount,
    recentCalculations: recent.calculations,
  };
}

export async function seedPricingDemoData(): Promise<{ seeded: boolean; message: string }> {
  await ensureDefaultPriceGroups();

  const defaultGroup = await prisma.priceGroup.findFirst({ where: { isDefault: true } });
  if (!defaultGroup) {
    return { seeded: false, message: "Không có nhóm giá mặc định." };
  }

  const existingRules = await prisma.servicePriceRule.count();
  if (existingRules === 0) {
    await prisma.servicePriceRule.createMany({
      data: [
        {
          serviceType: "PRINT_DTF",
          name: "In DTF 1 mặt",
          priceGroupId: defaultGroup.id,
          calculationType: "PER_ITEM",
          unitPrice: 15000,
          setupFee: 50000,
          minQuantity: 1,
        },
        {
          serviceType: "EMBROIDERY",
          name: "Thêu logo ngực",
          priceGroupId: defaultGroup.id,
          calculationType: "PER_POSITION",
          unitPrice: 25000,
          setupFee: 80000,
          minQuantity: 1,
        },
        {
          serviceType: "SETUP",
          name: "Phí setup in/thêu",
          calculationType: "PER_ORDER",
          unitPrice: 100000,
          setupFee: 0,
          minQuantity: 1,
        },
      ],
    });
  }

  const productCount = await prisma.product.count();
  const tierCount = await prisma.productPriceTier.count();
  if (productCount > 0 && tierCount === 0) {
    const products = await prisma.product.findMany({
      take: 3,
      include: { variants: { take: 1 } },
      orderBy: { createdAt: "asc" },
    });

    for (const product of products) {
      await prisma.productPriceTier.create({
        data: {
          productId: product.id,
          variantId: product.variants[0]?.id ?? null,
          priceGroupId: defaultGroup.id,
          minQuantity: 50,
          maxQuantity: 199,
          unitPrice: 45000,
          costPrice: 32000,
        },
      });
      await prisma.productPriceTier.create({
        data: {
          productId: product.id,
          priceGroupId: defaultGroup.id,
          minQuantity: 200,
          unitPrice: 42000,
          costPrice: 30000,
        },
      });
    }
  }

  return { seeded: true, message: "Đã khởi tạo dữ liệu giá demo." };
}
