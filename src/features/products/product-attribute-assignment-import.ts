import { prisma } from "@/lib/prisma";
import { parseProductAttributesField, type ProductAttributeAssignmentInput } from "@/features/products/product-attribute-assignment.utils";

function normalizeLookup(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function resolveImportedProductAttributes(
  raw: string | undefined,
  options?: { allowCreateCatalogValues?: boolean },
): Promise<ProductAttributeAssignmentInput[]> {
  if (!raw?.trim()) return [];

  const pairs = parseProductAttributesField(raw);
  const attributes = await prisma.productAttribute.findMany({
    where: { status: "ACTIVE", isSpecificationAttribute: true },
    include: {
      values: {
        where: { status: "ACTIVE" },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const assignments: ProductAttributeAssignmentInput[] = [];

  for (const [index, pair] of pairs.entries()) {
    const labelKey = normalizeLookup(pair.label);
    const valueKey = normalizeLookup(pair.value);

    const attribute =
      attributes.find((item) => normalizeLookup(item.name) === labelKey) ??
      attributes.find((item) => normalizeLookup(item.code) === labelKey);

    if (!attribute) {
      throw new Error(`Không tìm thấy thuộc tính thông tin hoạt động: "${pair.label}".`);
    }

    const value =
      attribute.values.find((item) => normalizeLookup(item.name) === valueKey) ??
      attribute.values.find((item) => normalizeLookup(item.code) === valueKey);

    if (value) {
      assignments.push({
        attributeId: attribute.id,
        attributeValueId: value.id,
        sortOrder: index,
      });
      continue;
    }

    if (options?.allowCreateCatalogValues) {
      throw new Error(
        `Giá trị "${pair.value}" chưa có trong thuộc tính "${attribute.name}". Tạo giá trị catalog chưa được bật trong sprint này.`,
      );
    }

    assignments.push({
      attributeId: attribute.id,
      customValue: pair.value,
      sortOrder: index,
    });
  }

  return assignments;
}
