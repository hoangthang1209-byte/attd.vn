import type { OrderProductGender } from "@prisma/client";

export const ORDER_PRODUCT_GENDER_LABELS: Record<OrderProductGender, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  UNISEX: "Unisex",
  KIDS: "Trẻ em",
  OTHER: "Khác",
};

export const ORDER_PRODUCT_GENDER_OPTIONS = (
  Object.keys(ORDER_PRODUCT_GENDER_LABELS) as OrderProductGender[]
).map((value) => ({
  value,
  label: ORDER_PRODUCT_GENDER_LABELS[value],
}));

export function isOrderProductGender(value: string): value is OrderProductGender {
  return value in ORDER_PRODUCT_GENDER_LABELS;
}

export function orderProductGenderLabel(value: OrderProductGender | null | undefined): string | null {
  if (!value) return null;
  return ORDER_PRODUCT_GENDER_LABELS[value];
}
