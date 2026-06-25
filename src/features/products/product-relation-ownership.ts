import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { throwProductRelationOwnershipError } from "@/features/products/product-admin-input";

export type DbClient = Prisma.TransactionClient | typeof prisma;

export { throwProductRelationOwnershipError } from "@/features/products/product-admin-input";

export function assertNoDuplicateRelationIds(
  ids: Array<string | undefined | null>,
): void {
  const seen = new Set<string>();
  for (const id of ids) {
    const trimmed = id?.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) throwProductRelationOwnershipError();
    seen.add(trimmed);
  }
}

async function assertExactUpdateCount(
  result: Prisma.BatchPayload,
  expected: number,
): Promise<void> {
  if (result.count !== expected) throwProductRelationOwnershipError();
}

export async function updateProductVariantOwned(
  db: DbClient,
  productId: string,
  variantId: string,
  data: Prisma.ProductVariantUpdateManyMutationInput,
): Promise<void> {
  const result = await db.productVariant.updateMany({
    where: { id: variantId, productId },
    data,
  });
  await assertExactUpdateCount(result, 1);
}

export async function updateProductOptionOwned(
  db: DbClient,
  productId: string,
  optionId: string,
  data: {
    name: string;
    slug: string;
    sortOrder: number;
    attributeId?: string | null;
  },
): Promise<void> {
  const result = await db.productOption.updateMany({
    where: { id: optionId, productId },
    data: {
      name: data.name,
      slug: data.slug,
      sortOrder: data.sortOrder,
      ...(data.attributeId !== undefined ? { attributeId: data.attributeId } : {}),
    },
  });
  await assertExactUpdateCount(result, 1);
}

export async function updateProductOptionValueOwned(
  db: DbClient,
  productId: string,
  optionId: string,
  valueId: string,
  data: {
    label: string;
    valueCode: string | null;
    imageUrl: string | null;
    sortOrder: number;
    attributeValueId?: string | null;
  },
): Promise<void> {
  const result = await db.productOptionValue.updateMany({
    where: { id: valueId, optionId, option: { productId } },
    data: {
      label: data.label,
      valueCode: data.valueCode,
      imageUrl: data.imageUrl,
      sortOrder: data.sortOrder,
      ...(data.attributeValueId !== undefined ? { attributeValueId: data.attributeValueId } : {}),
    },
  });
  await assertExactUpdateCount(result, 1);
}

export async function updateProductSpecificationOwned(
  db: DbClient,
  productId: string,
  specificationId: string,
  data: Prisma.ProductSpecificationUpdateManyMutationInput,
): Promise<void> {
  const result = await db.productSpecification.updateMany({
    where: { id: specificationId, productId },
    data,
  });
  await assertExactUpdateCount(result, 1);
}

export async function updateProductCustomizationOwned(
  db: DbClient,
  productId: string,
  customizationId: string,
  data: Prisma.ProductCustomizationCapabilityUpdateManyMutationInput,
): Promise<void> {
  const result = await db.productCustomizationCapability.updateMany({
    where: { id: customizationId, productId },
    data,
  });
  await assertExactUpdateCount(result, 1);
}

export async function updateProductAttributeAssignmentOwned(
  db: DbClient,
  productId: string,
  assignmentId: string,
  data: Prisma.ProductAttributeAssignmentUpdateManyMutationInput,
): Promise<void> {
  const result = await db.productAttributeAssignment.updateMany({
    where: { id: assignmentId, productId },
    data,
  });
  await assertExactUpdateCount(result, 1);
}

export async function deleteProductOptionsOwned(
  db: DbClient,
  productId: string,
  optionIds: string[],
): Promise<void> {
  if (!optionIds.length) return;
  const result = await db.productOption.deleteMany({
    where: { id: { in: optionIds }, productId },
  });
  if (result.count !== optionIds.length) throwProductRelationOwnershipError();
}

export async function deleteProductOptionValuesOwned(
  db: DbClient,
  productId: string,
  optionId: string,
  valueIds: string[],
): Promise<void> {
  if (!valueIds.length) return;
  const result = await db.productOptionValue.deleteMany({
    where: { id: { in: valueIds }, optionId, option: { productId } },
  });
  if (result.count !== valueIds.length) throwProductRelationOwnershipError();
}

export async function deleteProductSpecificationsOwned(
  db: DbClient,
  productId: string,
  specificationIds: string[],
): Promise<void> {
  if (!specificationIds.length) return;
  const result = await db.productSpecification.deleteMany({
    where: { id: { in: specificationIds }, productId },
  });
  if (result.count !== specificationIds.length) throwProductRelationOwnershipError();
}

export async function deleteProductCustomizationsOwned(
  db: DbClient,
  productId: string,
  customizationIds: string[],
): Promise<void> {
  if (!customizationIds.length) return;
  const result = await db.productCustomizationCapability.deleteMany({
    where: { id: { in: customizationIds }, productId },
  });
  if (result.count !== customizationIds.length) throwProductRelationOwnershipError();
}

export async function deleteProductAttributeAssignmentsOwned(
  db: DbClient,
  productId: string,
  assignmentIds: string[],
): Promise<void> {
  if (!assignmentIds.length) return;
  const result = await db.productAttributeAssignment.deleteMany({
    where: { id: { in: assignmentIds }, productId },
  });
  if (result.count !== assignmentIds.length) throwProductRelationOwnershipError();
}

export async function assertVariantIdsBelongToProduct(
  db: DbClient,
  productId: string,
  variantIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(variantIds.filter(Boolean))];
  if (!uniqueIds.length) return;
  const count = await db.productVariant.count({
    where: { productId, id: { in: uniqueIds } },
  });
  if (count !== uniqueIds.length) throwProductRelationOwnershipError();
}

export async function assertSpecificationIdsBelongToProduct(
  db: DbClient,
  productId: string,
  specificationIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(specificationIds.filter(Boolean))];
  if (!uniqueIds.length) return;
  const count = await db.productSpecification.count({
    where: { productId, id: { in: uniqueIds } },
  });
  if (count !== uniqueIds.length) throwProductRelationOwnershipError();
}

export async function assertOptionIdsBelongToProduct(
  db: DbClient,
  productId: string,
  optionIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(optionIds.filter(Boolean))];
  if (!uniqueIds.length) return;
  const count = await db.productOption.count({
    where: { productId, id: { in: uniqueIds } },
  });
  if (count !== uniqueIds.length) throwProductRelationOwnershipError();
}

export async function assertOptionValueIdsBelongToProduct(
  db: DbClient,
  productId: string,
  optionValueIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(optionValueIds.filter(Boolean))];
  if (!uniqueIds.length) return;
  const count = await db.productOptionValue.count({
    where: { id: { in: uniqueIds }, option: { productId } },
  });
  if (count !== uniqueIds.length) throwProductRelationOwnershipError();
}

export async function assertCustomizationIdsBelongToProduct(
  db: DbClient,
  productId: string,
  customizationIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(customizationIds.filter(Boolean))];
  if (!uniqueIds.length) return;
  const count = await db.productCustomizationCapability.count({
    where: { productId, id: { in: uniqueIds } },
  });
  if (count !== uniqueIds.length) throwProductRelationOwnershipError();
}

export async function assertAttributeAssignmentIdsBelongToProduct(
  db: DbClient,
  productId: string,
  assignmentIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(assignmentIds.filter(Boolean))];
  if (!uniqueIds.length) return;
  const count = await db.productAttributeAssignment.count({
    where: { productId, id: { in: uniqueIds } },
  });
  if (count !== uniqueIds.length) throwProductRelationOwnershipError();
}

export async function assertVariantOptionValueLinksBelongToProduct(
  db: DbClient,
  productId: string,
  variantOptionValueIds: Record<string, string[]>,
): Promise<void> {
  const variantIds = Object.keys(variantOptionValueIds);
  await assertVariantIdsBelongToProduct(db, productId, variantIds);
  const optionValueIds = Object.values(variantOptionValueIds).flat();
  await assertOptionValueIdsBelongToProduct(db, productId, optionValueIds);
}
