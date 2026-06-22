import type { VariantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";

export type VariantDependencySummary = {
  quoteItems: number;
  orderItems: number;
  crmProductInterests: number;
  pricingCalculationItems: number;
  productPriceTiers: number;
  productMaterialRequirements: number;
};

export type VariantLifecyclePreview = {
  id: string;
  productId: string;
  sku: string;
  displayLabel: string | null;
  variantStatus: VariantStatus;
  optionValueIds: string[];
  dependencies: VariantDependencySummary;
  canHardDelete: boolean;
  dependencyMessage: string | null;
};

export type VariantLifecycleResult = {
  mode: "delete" | "archive" | "restore";
  removed: boolean;
  message: string;
  variant?: {
    id: string;
    sku: string;
    displayLabel: string | null;
    variantStatus: VariantStatus;
    optionValueIds: string[];
  };
};

export async function getVariantDependencySummary(
  variantId: string,
): Promise<VariantDependencySummary> {
  const [
    quoteItems,
    orderItems,
    crmProductInterests,
    pricingCalculationItems,
    productPriceTiers,
    productMaterialRequirements,
  ] = await Promise.all([
    prisma.quoteItem.count({ where: { variantId } }),
    prisma.orderItem.count({ where: { variantId } }),
    prisma.cRMProductInterest.count({ where: { variantId } }),
    prisma.pricingCalculationItem.count({ where: { variantId } }),
    prisma.productPriceTier.count({ where: { variantId } }),
    prisma.productMaterialRequirement.count({
      where: { variantId, isActive: true },
    }),
  ]);

  return {
    quoteItems,
    orderItems,
    crmProductInterests,
    pricingCalculationItems,
    productPriceTiers,
    productMaterialRequirements,
  };
}

export function formatVariantDependencyMessage(
  summary: VariantDependencySummary,
): string | null {
  const parts: string[] = [];
  if (summary.quoteItems > 0) {
    parts.push(`${summary.quoteItems} báo giá`);
  }
  if (summary.orderItems > 0) {
    parts.push(`${summary.orderItems} đơn hàng`);
  }
  if (summary.crmProductInterests > 0) {
    parts.push(`${summary.crmProductInterests} quan tâm sản phẩm CRM`);
  }
  if (summary.pricingCalculationItems > 0) {
    parts.push(`${summary.pricingCalculationItems} tính giá`);
  }
  if (summary.productPriceTiers > 0) {
    parts.push(`${summary.productPriceTiers} bậc giá`);
  }
  if (summary.productMaterialRequirements > 0) {
    parts.push(`${summary.productMaterialRequirements} định mức vật tư`);
  }
  if (!parts.length) return null;
  return `Biến thể đang được tham chiếu bởi ${parts.join(", ")}.`;
}

export function hasProtectedVariantDependencies(
  summary: VariantDependencySummary,
): boolean {
  return Object.values(summary).some((count) => count > 0);
}

export async function assertVariantDeletable(variantId: string): Promise<void> {
  const dependencies = await getVariantDependencySummary(variantId);
  if (!hasProtectedVariantDependencies(dependencies)) return;

  const detail = formatVariantDependencyMessage(dependencies);
  throw new ProductAdminValidationError(
    "Không thể xóa vĩnh viễn biến thể vì đã được sử dụng trong dữ liệu nghiệp vụ.",
    { variants: detail ?? "Biến thể đang có liên kết nghiệp vụ." },
    detail ?? undefined,
  );
}

export async function getVariantLifecyclePreview(
  productId: string,
  variantId: string,
): Promise<VariantLifecyclePreview> {
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
    select: {
      id: true,
      productId: true,
      sku: true,
      displayLabel: true,
      variantStatus: true,
      optionValues: { select: { optionValueId: true } },
    },
  });

  if (!variant) {
    throw new ProductAdminValidationError(
      "Không tìm thấy biến thể.",
      { variants: "Không tìm thấy biến thể." },
    );
  }

  const dependencies = await getVariantDependencySummary(variantId);
  const dependencyMessage = formatVariantDependencyMessage(dependencies);

  return {
    id: variant.id,
    productId: variant.productId,
    sku: variant.sku,
    displayLabel: variant.displayLabel,
    variantStatus: variant.variantStatus,
    optionValueIds: variant.optionValues.map((link) => link.optionValueId),
    dependencies,
    canHardDelete: !hasProtectedVariantDependencies(dependencies),
    dependencyMessage,
  };
}

export async function performVariantLifecycleAction(
  productId: string,
  variantId: string,
  mode: "delete" | "archive" | "restore",
): Promise<VariantLifecycleResult> {
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
    select: {
      id: true,
      productId: true,
      sku: true,
      displayLabel: true,
      variantStatus: true,
      optionValues: { select: { optionValueId: true } },
    },
  });

  if (!variant) {
    throw new ProductAdminValidationError(
      "Không tìm thấy biến thể.",
      { variants: "Không tìm thấy biến thể." },
    );
  }

  if (variant.productId !== productId) {
    throw new ProductAdminValidationError(
      "Biến thể không thuộc sản phẩm này.",
      { variants: "Biến thể không thuộc sản phẩm này." },
    );
  }

  if (mode === "delete") {
    await assertVariantDeletable(variantId);
    await prisma.$transaction(async (tx) => {
      await tx.productVariantOptionValue.deleteMany({ where: { variantId } });
      await tx.productVariant.delete({ where: { id: variantId } });
    });
    return {
      mode,
      removed: true,
      message: "Đã xóa biến thể.",
    };
  }

  if (mode === "archive") {
    if (variant.variantStatus === "INACTIVE" || variant.variantStatus === "ARCHIVED") {
      return {
        mode,
        removed: false,
        message: "Biến thể đã ngừng sử dụng.",
        variant: {
          id: variant.id,
          sku: variant.sku,
          displayLabel: variant.displayLabel,
          variantStatus: variant.variantStatus,
          optionValueIds: variant.optionValues.map((link) => link.optionValueId),
        },
      };
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: { variantStatus: "INACTIVE" },
      select: {
        id: true,
        sku: true,
        displayLabel: true,
        variantStatus: true,
        optionValues: { select: { optionValueId: true } },
      },
    });

    return {
      mode,
      removed: false,
      message: "Đã ngừng sử dụng biến thể.",
      variant: {
        id: updated.id,
        sku: updated.sku,
        displayLabel: updated.displayLabel,
        variantStatus: updated.variantStatus,
        optionValueIds: updated.optionValues.map((link) => link.optionValueId),
      },
    };
  }

  if (variant.variantStatus === "ACTIVE") {
    return {
      mode,
      removed: false,
      message: "Biến thể đang được bán.",
      variant: {
        id: variant.id,
        sku: variant.sku,
        displayLabel: variant.displayLabel,
        variantStatus: variant.variantStatus,
        optionValueIds: variant.optionValues.map((link) => link.optionValueId),
      },
    };
  }

  const updated = await prisma.productVariant.update({
    where: { id: variantId },
    data: { variantStatus: "ACTIVE" },
    select: {
      id: true,
      sku: true,
      displayLabel: true,
      variantStatus: true,
      optionValues: { select: { optionValueId: true } },
    },
  });

  return {
    mode,
    removed: false,
    message: "Đã kích hoạt lại biến thể.",
    variant: {
      id: updated.id,
      sku: updated.sku,
      displayLabel: updated.displayLabel,
      variantStatus: updated.variantStatus,
      optionValueIds: updated.optionValues.map((link) => link.optionValueId),
    },
  };
}
