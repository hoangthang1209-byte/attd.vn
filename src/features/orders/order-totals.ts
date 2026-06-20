import type { OrderProductGender } from "@prisma/client";
import { parseMoneyInput } from "@/features/pricing/parse-money";
import { isOrderProductGender } from "@/features/orders/order-gender";

export type OrderItemVariantInput = {
  key?: string;
  id?: string | null;
  colorId?: string | null;
  colorNameSnapshot?: string | null;
  sizeValue?: string | null;
  skuSnapshot?: string | null;
  quantity: number;
  unit?: string | null;
  sortOrder?: number;
};

export type OrderItemInput = {
  id?: string | null;
  productId?: string | null;
  variantId?: string | null;
  colorId?: string | null;
  categoryId?: string | null;
  gender?: OrderProductGender | null;
  productNameSnapshot?: string | null;
  variantNameSnapshot?: string | null;
  description?: string | null;
  designMediaAssetId?: string | null;
  designImageUrl?: string | null;
  skuSnapshot?: string | null;
  colorSnapshot?: string | null;
  categorySnapshot?: string | null;
  genderSnapshot?: string | null;
  moqSnapshot?: number | null;
  itemNote?: string | null;
  productionLeadTime?: string | null;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  sortOrder?: number;
  variants?: OrderItemVariantInput[];
  systemCode?: string | null;
};

export type ComputedOrderItem = OrderItemInput & {
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  variants?: OrderItemVariantInput[];
};

export type OrderTotals = {
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  vatAmount: number;
  totalAmount: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function sumVariantQuantities(variants: OrderItemVariantInput[] | undefined): number | null {
  if (!variants?.length) return null;
  return variants.reduce((sum, v) => sum + Math.max(0, Math.floor(v.quantity)), 0);
}

export function computeOrderItem(item: OrderItemInput): ComputedOrderItem {
  const variantTotal = sumVariantQuantities(item.variants);
  const quantity = Math.max(1, Math.floor(variantTotal ?? item.quantity));
  const unitPrice = roundMoney(item.unitPrice ?? 0);
  const lineTotal = roundMoney(quantity * unitPrice);
  return {
    ...item,
    quantity,
    unit: item.unit?.trim() || "cái",
    unitPrice,
    lineTotal,
    variants: item.variants,
  };
}

export function computeOrderTotals(
  items: ComputedOrderItem[],
  options: {
    discountAmount?: number;
    shippingFee?: number;
    vatRate?: number;
    vatAmount?: number;
  } = {},
): OrderTotals {
  const subtotal = roundMoney(items.reduce((sum, i) => sum + i.lineTotal, 0));
  const discountAmount = roundMoney(options.discountAmount ?? 0);
  const shippingFee = roundMoney(options.shippingFee ?? 0);
  const taxableBase = roundMoney(subtotal - discountAmount + shippingFee);

  let vatAmount: number;
  if (options.vatAmount != null && Number.isFinite(options.vatAmount)) {
    vatAmount = roundMoney(options.vatAmount);
  } else {
    const vatRate = options.vatRate ?? 0;
    vatAmount = roundMoney((taxableBase * vatRate) / 100);
  }

  const totalAmount = roundMoney(taxableBase + vatAmount);

  return {
    subtotal,
    discountAmount,
    shippingFee,
    vatAmount,
    totalAmount,
  };
}

function parseOrderItemVariantInput(raw: Record<string, unknown>, index: number): OrderItemVariantInput {
  const quantityRaw = raw.quantity;
  const quantity =
    typeof quantityRaw === "number"
      ? quantityRaw
      : typeof quantityRaw === "string"
        ? Number(quantityRaw)
        : 1;

  return {
    id: typeof raw.id === "string" ? raw.id : null,
    colorId: typeof raw.colorId === "string" ? raw.colorId : null,
    colorNameSnapshot:
      typeof raw.colorNameSnapshot === "string" ? raw.colorNameSnapshot : null,
    sizeValue: typeof raw.sizeValue === "string" ? raw.sizeValue : null,
    skuSnapshot: typeof raw.skuSnapshot === "string" ? raw.skuSnapshot : null,
    quantity: Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1,
    unit: typeof raw.unit === "string" ? raw.unit : "cái",
    sortOrder: index,
  };
}

export function parseOrderItemInput(raw: Record<string, unknown>, index: number): OrderItemInput {
  const quantityRaw = raw.quantity;
  const quantity =
    typeof quantityRaw === "number"
      ? quantityRaw
      : typeof quantityRaw === "string"
        ? Number(quantityRaw)
        : 1;
  const unitPrice = parseMoneyInput(raw.unitPrice) ?? 0;

  const variants = Array.isArray(raw.variants)
    ? raw.variants.map((v, vi) =>
        v && typeof v === "object"
          ? parseOrderItemVariantInput(v as Record<string, unknown>, vi)
          : parseOrderItemVariantInput({}, vi),
      )
    : undefined;

  return {
    id: typeof raw.id === "string" ? raw.id : null,
    productId: typeof raw.productId === "string" ? raw.productId : null,
    variantId: typeof raw.variantId === "string" ? raw.variantId : null,
    productNameSnapshot:
      typeof raw.productNameSnapshot === "string" ? raw.productNameSnapshot : null,
    variantNameSnapshot:
      typeof raw.variantNameSnapshot === "string" ? raw.variantNameSnapshot : null,
    description: typeof raw.description === "string" ? raw.description : null,
    designMediaAssetId:
      typeof raw.designMediaAssetId === "string" ? raw.designMediaAssetId : null,
    designImageUrl: typeof raw.designImageUrl === "string" ? raw.designImageUrl : null,
    skuSnapshot: typeof raw.skuSnapshot === "string" ? raw.skuSnapshot : null,
    colorId: typeof raw.colorId === "string" ? raw.colorId : null,
    categoryId: typeof raw.categoryId === "string" ? raw.categoryId : null,
    gender:
      typeof raw.gender === "string" && isOrderProductGender(raw.gender)
        ? raw.gender
        : null,
    colorSnapshot: typeof raw.colorSnapshot === "string" ? raw.colorSnapshot : null,
    categorySnapshot:
      typeof raw.categorySnapshot === "string" ? raw.categorySnapshot : null,
    genderSnapshot: typeof raw.genderSnapshot === "string" ? raw.genderSnapshot : null,
    moqSnapshot:
      raw.moqSnapshot != null && raw.moqSnapshot !== ""
        ? Number(raw.moqSnapshot)
        : null,
    itemNote: typeof raw.itemNote === "string" ? raw.itemNote : null,
    productionLeadTime:
      typeof raw.productionLeadTime === "string" ? raw.productionLeadTime : null,
    quantity: Number.isFinite(quantity) ? quantity : 1,
    unit: typeof raw.unit === "string" ? raw.unit : "cái",
    unitPrice,
    sortOrder: index,
    variants,
    systemCode: typeof raw.systemCode === "string" ? raw.systemCode : null,
  };
}
