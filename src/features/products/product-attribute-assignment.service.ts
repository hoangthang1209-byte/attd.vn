import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";
import {
  assertAttributeAssignmentIdsBelongToProduct,
  assertNoDuplicateRelationIds,
  deleteProductAttributeAssignmentsOwned,
  updateProductAttributeAssignmentOwned,
  type DbClient,
} from "@/features/products/product-relation-ownership";
import {
  computeLegacyMirrorFromAssignments,
  LEGACY_MIRROR_FIELD_BY_ATTRIBUTE_CODE,
  type ProductAttributeAssignmentInput,
  resolveAssignmentDisplayValue,
  type ResolvedAssignmentValue,
} from "@/features/products/product-attribute-assignment.utils";
import {
  assignmentNeedsUpdate,
  type ExistingAssignmentRow,
} from "@/features/products/product-save-relation-diff";

export const PRODUCT_ATTRIBUTE_ASSIGNMENT_INCLUDE = {
  orderBy: { sortOrder: "asc" as const },
  include: {
    attribute: { select: { id: true, name: true, code: true, status: true, isSpecificationAttribute: true, isVariantAttribute: true } },
    attributeValue: { select: { id: true, name: true, status: true, attributeId: true } },
  },
} satisfies Prisma.ProductAttributeAssignmentFindManyArgs;

function assignmentFieldKey(index: number, field: string): string {
  return `attributeAssignments.${index}.${field}`;
}

export async function validateProductAttributeAssignments(
  assignments: ProductAttributeAssignmentInput[],
  db: DbClient = prisma,
): Promise<ResolvedAssignmentValue[]> {
  if (!assignments.length) return [];

  const fieldErrors: Record<string, string> = {};
  const seenAttributes = new Set<string>();
  const attributeIds = [...new Set(assignments.map((row) => row.attributeId))];

  const attributes = await db.productAttribute.findMany({
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
  options?: {
    preResolved?: ResolvedAssignmentValue[];
    existingAssignments?: ExistingAssignmentRow[];
  },
): Promise<Partial<Record<"material" | "form", string | null>>> {
  if (assignments === undefined) return {};

  assertNoDuplicateRelationIds(assignments.map((row) => row.id));
  await assertAttributeAssignmentIdsBelongToProduct(
    db,
    productId,
    assignments.map((row) => row.id).filter(Boolean) as string[],
  );

  const [product, existingAssignments] = await Promise.all([
    db.product.findUnique({
      where: { id: productId },
      select: { material: true, form: true },
    }),
    options?.existingAssignments
      ? Promise.resolve(options.existingAssignments)
      : db.productAttributeAssignment.findMany({
          where: { productId },
          select: {
            id: true,
            attributeId: true,
            attributeValueId: true,
            customValue: true,
            sortOrder: true,
            attribute: { select: { code: true } },
            attributeValue: { select: { name: true } },
          },
        }).then((rows) =>
          rows.map((row) => ({
            id: row.id,
            attributeId: row.attributeId,
            attributeCode: row.attribute.code,
            attributeValueName: row.attributeValue?.name ?? null,
            attributeValueId: row.attributeValueId,
            customValue: row.customValue,
            sortOrder: row.sortOrder,
          })),
        ),
  ]);

  const previousDisplayByCode = new Map<string, string>();
  for (const row of existingAssignments) {
    const displayValue = resolveAssignmentDisplayValue(row.attributeValueName, row.customValue);
    if (displayValue && row.attributeCode) {
      previousDisplayByCode.set(row.attributeCode, displayValue);
    }
  }

  const resolved =
    options?.preResolved ?? (await validateProductAttributeAssignments(assignments, db));

  const existing = existingAssignments.map((row) => ({
    id: row.id,
    attributeId: row.attributeId,
  }));
  const existingById = new Map(existingAssignments.map((row) => [row.id, row]));
  const keepIds = new Set(
    assignments.map((row) => row.id).filter(Boolean) as string[],
  );
  const deleteIds = existing.filter((row) => !keepIds.has(row.id)).map((row) => row.id);

  if (deleteIds.length) {
    await deleteProductAttributeAssignmentsOwned(db, productId, deleteIds);
  }

  const assignmentCreates: Prisma.ProductAttributeAssignmentCreateManyInput[] = [];
  const assignmentUpdates: Array<{
    id: string;
    data: Prisma.ProductAttributeAssignmentUpdateManyMutationInput;
  }> = [];

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
      const existingRow = existingById.get(inputRow.id);
      if (
        existingRow &&
        !assignmentNeedsUpdate(
          {
            attributeId: row.attributeId,
            attributeValueId: row.attributeValueId,
            customValue: row.customValue,
            sortOrder: row.sortOrder ?? index,
          },
          existingRow,
          index,
        )
      ) {
        continue;
      }
      assignmentUpdates.push({ id: inputRow.id, data });
      continue;
    }

    assignmentCreates.push(data);
  }

  if (assignmentCreates.length) {
    await db.productAttributeAssignment.createMany({ data: assignmentCreates });
  }

  if (assignmentUpdates.length) {
    await Promise.all(
      assignmentUpdates.map((row) =>
        updateProductAttributeAssignmentOwned(db, productId, row.id, row.data),
      ),
    );
  }

  const mirror = computeLegacyMirrorFromAssignments(resolved);
  const legacyUpdates: Partial<Record<"material" | "form", string | null>> = { ...mirror };

  /**
   * Clear mirrored legacy scalars only when the removed assignment previously owned
   * the same display value. Legacy-only scalars with no assignment stay untouched.
   */
  for (const [code, field] of Object.entries(LEGACY_MIRROR_FIELD_BY_ATTRIBUTE_CODE) as Array<
    [string, "material" | "form"]
  >) {
    const hadAssignment = previousDisplayByCode.has(code);
    const stillAssigned = resolved.some((row) => row.attributeCode === code);
    if (!hadAssignment || stillAssigned) continue;

    const mirroredValue = previousDisplayByCode.get(code)?.trim() ?? "";
    const currentScalar = (field === "material" ? product?.material : product?.form)?.trim() ?? "";
    if (mirroredValue && currentScalar === mirroredValue) {
      legacyUpdates[field] = null;
    }
  }

  return legacyUpdates;
}

export async function applyLegacyMirrorToProduct(
  productId: string,
  mirror: Partial<Record<"material" | "form", string | null>>,
  db: DbClient = prisma,
  current?: { material: string | null; form: string | null },
): Promise<void> {
  const data: Prisma.ProductUpdateInput = {};
  if ("material" in mirror && mirror.material !== (current?.material ?? null)) {
    data.material = mirror.material;
  }
  if ("form" in mirror && mirror.form !== (current?.form ?? null)) {
    data.form = mirror.form;
  }
  if (!Object.keys(data).length) return;
  await db.product.update({
    where: { id: productId },
    data,
  });
}
