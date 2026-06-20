import type { OrderProductGender } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createProductAdmin } from "@/features/products/product-admin.service";
import { allocateOrderCustomSku } from "@/features/orders/order-custom-sku";
import { OrderValidationError } from "@/features/orders/order.service";
import { isOrderProductGender, orderProductGenderLabel } from "@/features/orders/order-gender";

export type CreateOrderCustomProductInput = {
  name: string;
  categoryId: string;
  colorId: string;
  gender: OrderProductGender;
  description?: string | null;
  defaultMoq?: number | null;
  unit?: string | null;
  designImageUrl?: string | null;
  productionLeadTime?: string | null;
  customerCode: string;
  sizeName?: string | null;
};

export async function createOrderCustomProduct(input: CreateOrderCustomProductInput) {
  const name = input.name.trim();
  if (!name) throw new OrderValidationError("Tên sản phẩm là bắt buộc.");
  if (!input.categoryId) throw new OrderValidationError("Danh mục là bắt buộc.");
  if (!input.colorId) throw new OrderValidationError("Màu sắc là bắt buộc.");
  if (!isOrderProductGender(input.gender)) {
    throw new OrderValidationError("Giới tính không hợp lệ.");
  }
  if (!input.customerCode?.trim()) {
    throw new OrderValidationError("Vui lòng chọn khách hàng trước khi tạo sản phẩm tùy chọn.");
  }

  const [color, category] = await Promise.all([
    prisma.color.findUnique({ where: { id: input.colorId } }),
    prisma.category.findUnique({ where: { id: input.categoryId } }),
  ]);
  if (!color || !color.isActive) throw new OrderValidationError("Màu sắc không hợp lệ.");
  if (!category) throw new OrderValidationError("Danh mục không hợp lệ.");

  const product = await createProductAdmin({
    name,
    categoryId: input.categoryId,
    description: input.description?.trim() || undefined,
    defaultMoq: input.defaultMoq ?? undefined,
    leadTime: input.productionLeadTime?.trim() || undefined,
    featuredImage: input.designImageUrl?.trim() || undefined,
    variants: [
      {
        colorName: color.name,
        colorCode: color.hex ?? undefined,
        sizeName: input.sizeName?.trim() || undefined,
        imageUrl: input.designImageUrl?.trim() || undefined,
      },
    ],
  });

  if (!product) {
    throw new OrderValidationError("Không thể tạo sản phẩm trong danh mục.");
  }

  const systemCode = product.systemCode;
  if (!systemCode) {
    throw new OrderValidationError("Không thể gán mã hệ thống cho sản phẩm.");
  }

  const variant = product.variants?.[0];
  if (variant?.id) {
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { colorId: color.id },
    });
  }

  const skuSnapshot = await allocateOrderCustomSku({
    customerCode: input.customerCode.trim(),
    systemCode,
    colorName: color.name,
    sizeName: input.sizeName,
  });

  return {
    productId: product.id,
    variantId: variant?.id ?? null,
    productNameSnapshot: product.name,
    variantNameSnapshot: variant
      ? [color.name, input.sizeName?.trim()].filter(Boolean).join(" · ")
      : color.name,
    systemCode,
    skuSnapshot,
    colorId: color.id,
    categoryId: category.id,
    colorSnapshot: color.name,
    categorySnapshot: category.name,
    gender: input.gender,
    genderSnapshot: orderProductGenderLabel(input.gender),
    description: input.description?.trim() || null,
    designImageUrl: input.designImageUrl?.trim() || null,
    moqSnapshot: input.defaultMoq ?? product.defaultMoq ?? null,
    productionLeadTime: input.productionLeadTime?.trim() || product.leadTime || null,
    unit: input.unit?.trim() || "cái",
  };
}
