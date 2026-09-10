import { Prisma, type CostingSourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  findCostLibraryDbIdReadOnly,
  isKnownCostLibrarySource,
  resolveCostLibraryItemIdForMutation,
} from "@/features/pricing/services/cost-library.service";
import {
  CostingSourcePriceValidationError,
  normalizeCostingPurchaseUnit,
  parseCostingSourceCalculationType,
  parseCostingSourceNote,
  parseCostingUnitPrice,
  resolveSourceForeignKeys,
  selectPickerSourcePrices,
  toPickerRows,
  type CostingSourcePricePickerRow,
  type CostingSourcePriceRecord,
  type StoredSourcePrice,
} from "@/features/pricing/costing-source-price";

const PRICE_INCLUDE = {
  supplier: { select: { id: true, code: true, name: true, isActive: true } },
} satisfies Prisma.CostingSourcePriceInclude;

type PriceRow = Prisma.CostingSourcePriceGetPayload<{ include: typeof PRICE_INCLUDE }>;

function sourceIdFromRow(row: Pick<PriceRow, "sourceType" | "productionMaterialId" | "productionTrimId" | "costLibraryItemId">): string {
  if (row.sourceType === "PRODUCTION_MATERIAL" && row.productionMaterialId) return row.productionMaterialId;
  if (row.sourceType === "PRODUCTION_TRIM" && row.productionTrimId) return row.productionTrimId;
  if (row.sourceType === "COST_LIBRARY" && row.costLibraryItemId) return row.costLibraryItemId;
  throw new CostingSourcePriceValidationError("Dòng giá thiếu nguồn hợp lệ.", "SOURCE_CORRUPT");
}

function mapRecord(row: PriceRow): CostingSourcePriceRecord {
  return {
    id: row.id,
    supplierId: row.supplierId,
    supplierName: row.supplier.name,
    supplierCode: row.supplier.code,
    sourceType: row.sourceType,
    sourceId: sourceIdFromRow(row),
    unitPrice: row.unitPrice.toNumber(),
    unit: row.unit,
    calculationType: row.calculationType,
    isActive: row.isActive,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function sourceWhere(sourceType: CostingSourceType, sourceId: string): Prisma.CostingSourcePriceWhereInput {
  if (sourceType === "PRODUCTION_MATERIAL") {
    return { sourceType, productionMaterialId: sourceId };
  }
  if (sourceType === "PRODUCTION_TRIM") {
    return { sourceType, productionTrimId: sourceId };
  }
  return { sourceType, costLibraryItemId: sourceId };
}

async function resolveSourceIdForRead(sourceType: CostingSourceType, sourceId: string): Promise<string | null> {
  if (sourceType === "PRODUCTION_MATERIAL") {
    const row = await prisma.productionMaterial.findUnique({ where: { id: sourceId }, select: { id: true } });
    if (!row) throw new CostingSourcePriceValidationError("Không tìm thấy vật liệu.", "SOURCE_NOT_FOUND");
    return row.id;
  }
  if (sourceType === "PRODUCTION_TRIM") {
    const row = await prisma.productionTrim.findUnique({ where: { id: sourceId }, select: { id: true } });
    if (!row) throw new CostingSourcePriceValidationError("Không tìm thấy phụ liệu.", "SOURCE_NOT_FOUND");
    return row.id;
  }
  if (!(await isKnownCostLibrarySource(sourceId))) {
    throw new CostingSourcePriceValidationError("Không tìm thấy mục cost library.", "SOURCE_NOT_FOUND");
  }
  return findCostLibraryDbIdReadOnly(sourceId);
}

async function resolveSourceIdForMutation(sourceType: CostingSourceType, sourceId: string): Promise<string> {
  if (sourceType === "PRODUCTION_MATERIAL" || sourceType === "PRODUCTION_TRIM") {
    const id = await resolveSourceIdForRead(sourceType, sourceId);
    if (!id) throw new CostingSourcePriceValidationError("Không tìm thấy nguồn.", "SOURCE_NOT_FOUND");
    return id;
  }
  return resolveCostLibraryItemIdForMutation(sourceId);
}

async function assertSupplierExists(supplierId: string): Promise<void> {
  const id = supplierId.trim();
  if (!id) {
    throw new CostingSourcePriceValidationError("Nhà cung cấp là bắt buộc.", "SUPPLIER_REQUIRED");
  }
  const supplier = await prisma.productionSupplier.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });
  if (!supplier) {
    throw new CostingSourcePriceValidationError("Không tìm thấy nhà cung cấp.", "SUPPLIER_NOT_FOUND");
  }
}

function parseCalculationType(
  sourceType: CostingSourceType,
  value: unknown,
) {
  return parseCostingSourceCalculationType(sourceType, value);
}

export async function listCostingSourcePrices(input: {
  sourceType: CostingSourceType;
  sourceId: string;
  activeOnly?: boolean;
}): Promise<CostingSourcePriceRecord[]> {
  const sourceId = await resolveSourceIdForRead(input.sourceType, input.sourceId);
  if (!sourceId) return [];
  const rows = await prisma.costingSourcePrice.findMany({
    where: {
      ...sourceWhere(input.sourceType, sourceId),
      ...(input.activeOnly ? { isActive: true } : {}),
    },
    include: PRICE_INCLUDE,
    orderBy: [{ supplier: { name: "asc" } }, { supplier: { code: "asc" } }],
  });
  return rows.map(mapRecord);
}

export async function listCostingSourcePricesForPicker(input: {
  sourceType: CostingSourceType;
  sourceId: string;
}): Promise<CostingSourcePricePickerRow[]> {
  const sourceId = await resolveSourceIdForRead(input.sourceType, input.sourceId);
  if (!sourceId) return [];
  const rows = await prisma.costingSourcePrice.findMany({
    where: {
      ...sourceWhere(input.sourceType, sourceId),
      isActive: true,
      supplier: { isActive: true },
    },
    include: PRICE_INCLUDE,
    orderBy: [{ supplier: { name: "asc" } }, { supplier: { code: "asc" } }],
  });
  const stored: StoredSourcePrice[] = rows.map((row) => {
    const mapped = mapRecord(row);
    return {
      id: mapped.id,
      supplierId: mapped.supplierId,
      supplierName: mapped.supplierName,
      supplierCode: mapped.supplierCode,
      sourceType: mapped.sourceType,
      sourceId: mapped.sourceId,
      unitPrice: mapped.unitPrice,
      unit: mapped.unit,
      calculationType: mapped.calculationType,
      isActive: mapped.isActive,
      supplierIsActive: row.supplier.isActive,
      note: mapped.note,
    };
  });
  return toPickerRows(selectPickerSourcePrices(stored, { activeOnly: true, activeSuppliersOnly: true }));
}

export type UpsertCostingSourcePriceInput = {
  sourceType: CostingSourceType;
  sourceId: string;
  supplierId: string;
  unitPrice: unknown;
  unit: unknown;
  calculationType?: unknown;
  note?: unknown;
  isActive?: boolean;
};

export async function upsertCostingSourcePrice(
  input: UpsertCostingSourcePriceInput,
): Promise<CostingSourcePriceRecord> {
  const resolvedSourceId = await resolveSourceIdForMutation(input.sourceType, input.sourceId);
  const supplierId = input.supplierId.trim();
  await assertSupplierExists(supplierId);
  const fks = resolveSourceForeignKeys({
    sourceType: input.sourceType,
    productionMaterialId: input.sourceType === "PRODUCTION_MATERIAL" ? resolvedSourceId : null,
    productionTrimId: input.sourceType === "PRODUCTION_TRIM" ? resolvedSourceId : null,
    costLibraryItemId: input.sourceType === "COST_LIBRARY" ? resolvedSourceId : null,
  });
  const unitPrice = parseCostingUnitPrice(input.unitPrice);
  const unit = normalizeCostingPurchaseUnit(input.unit);
  const calculationType = parseCalculationType(input.sourceType, input.calculationType);
  const note = parseCostingSourceNote(input.note);
  const isActive = input.isActive !== false;

  const existing = await prisma.costingSourcePrice.findFirst({
    where: {
      supplierId,
      ...sourceWhere(input.sourceType, resolvedSourceId),
    },
  });

  const data = {
    supplierId,
    sourceType: fks.sourceType,
    productionMaterialId: fks.productionMaterialId,
    productionTrimId: fks.productionTrimId,
    costLibraryItemId: fks.costLibraryItemId,
    unitPrice,
    unit,
    calculationType,
    note,
    isActive,
  };

  const row = existing
    ? await prisma.costingSourcePrice.update({
        where: { id: existing.id },
        data,
        include: PRICE_INCLUDE,
      })
    : await prisma.costingSourcePrice.create({
        data,
        include: PRICE_INCLUDE,
      });

  return mapRecord(row);
}

export async function updateCostingSourcePrice(
  id: string,
  input: {
    expectedSourceType?: CostingSourceType;
    expectedSourceId?: string;
    unitPrice?: unknown;
    unit?: unknown;
    calculationType?: unknown;
    note?: unknown;
    isActive?: boolean;
    supplierId?: string;
  },
): Promise<CostingSourcePriceRecord> {
  const existing = await prisma.costingSourcePrice.findUnique({
    where: { id },
    include: PRICE_INCLUDE,
  });
  if (!existing) {
    throw new CostingSourcePriceValidationError("Không tìm thấy giá nhà cung cấp.", "NOT_FOUND");
  }
  const sourceId = sourceIdFromRow(existing);
  if (input.expectedSourceType && input.expectedSourceType !== existing.sourceType) {
    throw new CostingSourcePriceValidationError("Nguồn giá không khớp.", "SOURCE_MISMATCH");
  }
  if (input.expectedSourceId) {
    const expectedSourceId =
      existing.sourceType === "COST_LIBRARY"
        ? (await findCostLibraryDbIdReadOnly(input.expectedSourceId)) ?? input.expectedSourceId
        : input.expectedSourceId;
    if (expectedSourceId !== sourceId) {
      throw new CostingSourcePriceValidationError("Nguồn giá không khớp.", "SOURCE_MISMATCH");
    }
  }

  const supplierId = input.supplierId?.trim() || existing.supplierId;
  if (supplierId !== existing.supplierId) {
    await assertSupplierExists(supplierId);
    const collision = await prisma.costingSourcePrice.findFirst({
      where: {
        id: { not: id },
        supplierId,
        ...sourceWhere(existing.sourceType, sourceId),
      },
      select: { id: true },
    });
    if (collision) {
      throw new CostingSourcePriceValidationError(
        "Nhà cung cấp này đã có giá cho nguồn này.",
        "DUPLICATE_SUPPLIER_PRICE",
      );
    }
  }

  const calculationType =
    input.calculationType === undefined
      ? existing.calculationType
      : parseCalculationType(existing.sourceType, input.calculationType);

  const row = await prisma.costingSourcePrice.update({
    where: { id },
    data: {
      supplierId,
      unitPrice: input.unitPrice === undefined ? undefined : parseCostingUnitPrice(input.unitPrice),
      unit: input.unit === undefined ? undefined : normalizeCostingPurchaseUnit(input.unit),
      calculationType,
      note: input.note === undefined ? undefined : parseCostingSourceNote(input.note),
      isActive: input.isActive,
    },
    include: PRICE_INCLUDE,
  });
  return mapRecord(row);
}

export async function deactivateCostingSourcePrice(
  id: string,
  expected?: { sourceType?: CostingSourceType; sourceId?: string },
): Promise<CostingSourcePriceRecord> {
  return updateCostingSourcePrice(id, {
    expectedSourceType: expected?.sourceType,
    expectedSourceId: expected?.sourceId,
    isActive: false,
  });
}

export async function mergeCostingSourcePricesForSupplier(
  sourceSupplierId: string,
  targetSupplierId: string,
): Promise<{ moved: number; keptOnSource: number }> {
  const [sourcePrices, targetPrices] = await Promise.all([
    prisma.costingSourcePrice.findMany({ where: { supplierId: sourceSupplierId } }),
    prisma.costingSourcePrice.findMany({
      where: { supplierId: targetSupplierId },
      select: {
        productionMaterialId: true,
        productionTrimId: true,
        costLibraryItemId: true,
      },
    }),
  ]);

  const targetKeys = new Set(
    targetPrices.map(
      (row) => row.productionMaterialId ?? row.productionTrimId ?? row.costLibraryItemId ?? "",
    ),
  );

  let moved = 0;
  let keptOnSource = 0;
  for (const price of sourcePrices) {
    const key = price.productionMaterialId ?? price.productionTrimId ?? price.costLibraryItemId ?? "";
    if (targetKeys.has(key)) {
      await prisma.costingSourcePrice.update({
        where: { id: price.id },
        data: { isActive: false },
      });
      keptOnSource += 1;
      continue;
    }
    await prisma.costingSourcePrice.update({
      where: { id: price.id },
      data: { supplierId: targetSupplierId },
    });
    moved += 1;
  }

  return { moved, keptOnSource };
}
