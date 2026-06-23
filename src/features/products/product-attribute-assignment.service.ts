import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";
import {
  computeLegacyMirrorFromAssignments,
  type ProductAttributeAssignmentInput,
  resolveAssignmentDisplayValue,
  type ResolvedAssignmentValue,
} from "@/features/products/product-attribute-assignment.utils";

export const PRODUCT_ATTRIBUTE_ASSIGNMENT_INCLUDE = {
  orderBy: { sortOrder: "asc" as const },
  include: {
    attribute: { select: { id: true, name: true, code: true, status: true, isSpecificationAttribute: true, isVariantAttribute: true } },
    attributeValue: { select: { id: true, name: true, status: true, attributeId: true } },
  },
} satisfies Prisma.ProductAttributeAssignmentFindManyArgs;

type DbClient = Prisma.TransactionClient | typeof prisma;

function assignmentFieldKey(index: number, field: string): string {
  return `attributeAssignments.${index}.${field}`;
}

export async function validateProductAttributeAssignments(
  assignments: ProductAttributeAssignmentInput[],
): Promise<ResolvedAssignmentValue[]> {
  if (!assignments.length) return [];

  const fieldErrors: Record<string, string> = {};
  const seenAttributes = new Set<string>();
  const attributeIds = [...new Set(assignments.map((row) => row.attributeId))];

  const attributes = await prisma.productAttribute.findMany({
    where: { id: { in: attributeIds } },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      isSpecificationAttribute: true,
      isVariantAttribute: true,
      values: {
        where: { status: "ACTIVE" },
        select: { id: true, name: true, status: true, attributeId: true },
      },
    },
  });
  const attributeById = new Map(attributes.map((attr) => [attr.id, attr]));

  const resolved: ResolvedAssignmentValue[] = [];

  for (const [index, row] of assignments.entries()) {
    const attribute = attributeById.get(row.attributeId);
    if (!attribute) {
      fieldErrors[assignmentFieldKey(index, "attributeId")] = "Thuộc tính không tồn tại.";
      continue;
    }
    if (attribute.status !== "ACTIVE") {
      fieldErrors[assignmentFieldKey(index, "attributeId")] = "Thuộc tính không còn hoạt động.";
      continue;
    }
    if (!attribute.isSpecificationAttribute) {
      fieldErrors[assignmentFieldKey(index, "attributeId")] =
        "Thuộc tính này chỉ dùng cho biến thể, không thể gán làm thông tin sản phẩm.";
      continue;
    }
    if (seenAttributes.has(row.attributeId)) {
      fieldErrors[assignmentFieldKey(index, "attributeId")] = "Thuộc tính đã được gán trùng.";
      continue;
    }
    seenAttributes.add(row.attributeId);

    const customValue = row.customValue?.trim() || null;
    const attributeValueId = row.attributeValueId?.trim() || null;

    if (!attributeValueId && !customValue) {
      fieldErrors[assignmentFieldKey(index, "attributeValueId")] = "Vui lòng chọn giá trị hoặc nhập giá trị riêng.";
      continue;
    }
    if (attributeValueId && customValue) {
      fieldErrors[assignmentFieldKey(index, "customValue")] =
        "Chỉ chọn một: giá trị dùng chung hoặc giá trị riêng cho sản phẩm.";
      continue;
    }

    let valueName: string | null = null;
    if (attributeValueId) {
      const value = attribute.values.find((item) => item.id === attributeValueId);
      if (!value || value.attributeId !== attribute.id) {
        fieldErrors[assignmentFieldKey(index, "attributeValueId")] = "Giá trị không thuộc thuộc tính đã chọn.";
        continue;
      }
      if (value.status !== "ACTIVE") {
        fieldErrors[assignmentFieldKey(index, "attributeValueId")] = "Giá trị không còn hoạt động.";
        continue;
      }
      valueName = value.name;
    }

    const displayValue = resolveAssignmentDisplayValue(valueName, customValue);
    if (!displayValue) {
      fieldErrors[assignmentFieldKey(index, "attributeValueId")] = "Giá trị thuộc tính không hợp lệ.";
      continue;
    }

    resolved.push({
      attributeId: attribute.id,
      attributeCode: attribute.code,
      attributeName: attribute.name,
      attributeValueId,
      customValue,
      displayValue,
      sortOrder: row.sortOrder ?? index,
    });
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ProductAdminValidationError(
      "Không thể lưu sản phẩm. Vui lòng kiểm tra các trường được đánh dấu.",
      fieldErrors,
    );
  }

  return resolved;
}

export async function syncProductAttributeAssignments(
  productId: string,
  assignments: ProductAttributeAssignmentInput[] | undefined,
  db: DbClient = prisma,
): Promise<Partial<Record<"material" | "form", string>>> {
  if (assignments === undefined) return {};

  const resolved = await validateProductAttributeAssignments(assignments);

  const existing = await db.productAttributeAssignment.findMany({
    where: { productId },
    select: { id: true, attributeId: true },
  });
  const keepIds = new Set(
    assignments.map((row) => row.id).filter(Boolean) as string[],
  );
  const deleteIds = existing.filter((row) => !keepIds.has(row.id)).map((row) => row.id);

  if (deleteIds.length) {
    await db.productAttributeAssignment.deleteMany({ where: { id: { in: deleteIds } } });
  }

  for (const [index, row] of resolved.entries()) {
    const inputRow = assignments.find((item) => item.attributeId === row.attributeId);
    const data = {
      productId,
      attributeId: row.attributeId,
      attributeValueId: row.attributeValueId,
      customValue: row.customValue,
      sortOrder: row.sortOrder ?? index,
    };

    if (inputRow?.id) {
      await db.productAttributeAssignment.update({
        where: { id: inputRow.id },
        data,
      });
      continue;
    }

    await db.productAttributeAssignment.create({ data });
  }

  return computeLegacyMirrorFromAssignments(resolved);
}

export async function applyLegacyMirrorToProduct(
  productId: string,
  mirror: Partial<Record<"material" | "form", string>>,
  db: DbClient = prisma,
): Promise<void> {
  if (!Object.keys(mirror).length) return;
  await db.product.update({
    where: { id: productId },
    data: {
      ...(mirror.material !== undefined ? { material: mirror.material } : {}),
      ...(mirror.form !== undefined ? { form: mirror.form } : {}),
    },
  });
}
