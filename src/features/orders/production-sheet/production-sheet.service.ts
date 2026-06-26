import type { OrderDetailRecord } from "@/features/orders/order.types";
import { ORDER_STATUS_LABELS } from "@/features/orders/order-labels";
import {
  formatRequiredQuantityFormula,
  resolveOrderItemTotalQuantity,
} from "@/features/orders/bom-calculations";
import {
  MATERIAL_TYPE_LABELS,
  PRODUCTION_FILE_TYPE_LABELS,
} from "@/features/orders/production-pack-labels";
import { listOrderMaterials, listOrderProductionFiles } from "@/features/orders/production-pack.service";
import { evaluateProductionReadiness } from "@/features/orders/production-readiness.service";
import { evaluateOrderMaterialAvailability } from "@/features/materials/material-availability.service";
import type { MaterialAvailabilityRow } from "@/features/materials/material-availability.service";
import { getOrderDetail } from "@/features/orders/order.service";
import { evaluateHandoverReadiness } from "@/features/orders/handover-readiness.service";
import { computeStageProgressSummary } from "@/features/orders/production-stage.service";
import { buildProductionExecutionBundle } from "@/features/orders/production-execution.service";
import { ORDER_ITEM_READINESS_LABELS } from "@/features/orders/order-item-readiness";
import { QC_INSPECTION_STATUS_LABELS } from "@/features/orders/production-execution-labels";
import { isPreviewableProductionMime } from "@/lib/productionFileValidation";
import { formatMaterialQuantityDisplay } from "@/features/orders/production-sheet/production-sheet-format";
import type {
  ProductionSheetFileRow,
  ProductionSheetItemBom,
  ProductionSheetMaterialSummaryRow,
  ProductionSheetPdfData,
  ProductionSheetVariantRow,
  ProductionSheetViewModel,
} from "@/features/orders/production-sheet/production-sheet.types";
import type { QuoteCompanyProfile } from "@/features/quotes/quote-company-profile";

function productDisplayName(item: OrderDetailRecord["items"][number]): string {
  return [item.productNameSnapshot, item.variantNameSnapshot].filter(Boolean).join(" · ") || "—";
}

function mapVariantLines(item: OrderDetailRecord["items"][number]) {
  if (item.variants.length === 0) {
    return [
      {
        color: item.colorSnapshot,
        size: null,
        sku: item.skuSnapshot,
        quantity: item.quantity,
        unit: item.unit,
      },
    ];
  }
  return item.variants.map((variant) => ({
    color: variant.colorNameSnapshot,
    size: variant.sizeValue,
    sku: variant.skuSnapshot ?? item.skuSnapshot,
    quantity: variant.quantity,
    unit: variant.unit,
  }));
}

function expandVariantRows(order: OrderDetailRecord): ProductionSheetVariantRow[] {
  const rows: ProductionSheetVariantRow[] = [];
  let stt = 1;
  for (const item of order.items) {
    const productName = productDisplayName(item);
    for (const variant of mapVariantLines(item)) {
      rows.push({
        stt: stt++,
        designImageUrl: item.designImageUrl,
        productName,
        color: variant.color,
        size: variant.size,
        sku: variant.sku,
        quantity: variant.quantity,
        unit: variant.unit,
        note: item.itemNote,
      });
    }
  }
  return rows;
}

function buildAppliesToLabel(input: {
  orderItemId: string | null;
  productNameByItemId: Map<string, string>;
  appliesToColorName: string | null;
  appliesToSize: string | null;
}): string {
  if (!input.orderItemId) return "Toàn đơn hàng";
  const productName = input.productNameByItemId.get(input.orderItemId) ?? "Sản phẩm";
  const parts = [productName, input.appliesToColorName, input.appliesToSize].filter(Boolean);
  return parts.join(" · ");
}

function mapFileRow(
  file: Awaited<ReturnType<typeof listOrderProductionFiles>>[number],
  productNameByItemId: Map<string, string>,
): ProductionSheetFileRow {
  const isR2 = file.mediaAsset.storageProvider === "CLOUDFLARE_R2";
  const previewable = !isR2 && isPreviewableProductionMime(file.mediaAsset.mimeType);
  const previewUrl =
    previewable && (file.mediaAsset.thumbnailUrl || file.mediaAsset.url)
      ? file.mediaAsset.thumbnailUrl ?? file.mediaAsset.url
      : null;

  return {
    id: file.id,
    typeLabel: PRODUCTION_FILE_TYPE_LABELS[file.type],
    title: file.title ?? file.mediaAsset.filename,
    version: file.version,
    appliesToLabel: buildAppliesToLabel({
      orderItemId: file.orderItemId,
      productNameByItemId,
      appliesToColorName: file.appliesToColorName,
      appliesToSize: file.appliesToSize,
    }),
    note: file.note,
    filename: file.mediaAsset.filename,
    mimeType: file.mediaAsset.mimeType,
    format: file.mediaAsset.format,
    sizeBytes: file.mediaAsset.sizeBytes,
    previewUrl,
    isPreviewable: previewable,
    accessLabel: "Xem trong Bộ hồ sơ sản xuất trên ATTD Admin",
  };
}

function findAvailabilityForRow(
  row: { materialCode: string | null; materialName: string; unit: string; materialId?: string | null },
  availabilityMap: Map<string, MaterialAvailabilityRow>,
): MaterialAvailabilityRow | null {
  if (row.materialId) {
    const byId = availabilityMap.get(`id:${row.materialId}`);
    if (byId) return byId;
  }
  const codeKey = row.materialCode ? `code:${row.materialCode.toLowerCase()}` : null;
  if (codeKey) {
    for (const av of availabilityMap.values()) {
      if (av.materialCode?.toLowerCase() === row.materialCode?.toLowerCase()) return av;
    }
  }
  for (const av of availabilityMap.values()) {
    if (av.materialName === row.materialName && av.unit === row.unit) return av;
  }
  return null;
}

function buildItemBoms(
  order: OrderDetailRecord,
  materials: Awaited<ReturnType<typeof listOrderMaterials>>,
  availability: MaterialAvailabilityRow[],
): ProductionSheetItemBom[] {
  const availabilityMap = new Map(availability.map((a) => [a.aggregateKey, a]));

  return materials.items.map((item) => ({
    orderItemId: item.orderItemId,
    productName:
      [item.productNameSnapshot, item.variantNameSnapshot].filter(Boolean).join(" · ") || "—",
    totalQuantity: item.totalQuantity,
    rows: item.materials.map((row) => {
      const av = findAvailabilityForRow(
        {
          materialCode: row.materialCode,
          materialName: row.materialName,
          unit: row.unit,
          materialId: row.materialId,
        },
        availabilityMap,
      );
      return {
        materialTypeLabel: MATERIAL_TYPE_LABELS[row.materialType],
        materialName: row.materialName,
        materialCode: row.materialCode,
        unit: row.unit,
        consumptionPerUnit: row.consumptionPerUnit,
        wastagePercent: row.wastagePercent,
        requiredQuantity: formatMaterialQuantityDisplay(row.requiredQuantity, row.unit),
        availableQuantity: av?.availableQuantity ?? null,
        shortageQuantity: av?.shortageQuantity ?? null,
        readinessLabel: av?.readinessLabel ?? (av ? null : "Chưa kiểm tồn"),
        requiredQuantityOverridden: row.requiredQuantityOverridden,
        formula: formatRequiredQuantityFormula(
          item.totalQuantity,
          row.consumptionPerUnit,
          row.wastagePercent,
          row.unit,
          row.requiredQuantity,
        ),
        note: row.note,
      };
    }),
  }));
}

function buildMaterialSummary(
  summary: Awaited<ReturnType<typeof listOrderMaterials>>["summary"],
  availability: MaterialAvailabilityRow[],
): ProductionSheetMaterialSummaryRow[] {
  const availabilityMap = new Map(availability.map((a) => [a.aggregateKey, a]));

  return summary.map((row, index) => {
    const av = findAvailabilityForRow(row, availabilityMap);
    return {
      stt: index + 1,
      materialTypeLabel:
        MATERIAL_TYPE_LABELS[row.materialType as keyof typeof MATERIAL_TYPE_LABELS] ??
        row.materialType,
      materialName: row.materialName,
      materialCode: row.materialCode,
      unit: row.unit,
      totalRequiredQuantity: formatMaterialQuantityDisplay(row.totalRequiredQuantity, row.unit),
      availableQuantity: av?.availableQuantity ?? null,
      shortageQuantity: av?.shortageQuantity ?? null,
      readinessLabel: av?.readinessLabel ?? "Chưa kiểm tồn",
      notes: row.notes,
    };
  });
}

export async function buildProductionSheetViewModel(
  orderId: string,
): Promise<ProductionSheetViewModel | null> {
  const order = await getOrderDetail(orderId);
  if (!order) return null;

  const [files, materials, readiness, availability, executionBundle, handover] = await Promise.all([
    listOrderProductionFiles(orderId),
    listOrderMaterials(orderId),
    evaluateProductionReadiness(orderId),
    evaluateOrderMaterialAvailability(orderId),
    buildProductionExecutionBundle(orderId),
    evaluateHandoverReadiness(orderId),
  ]);

  const stages = executionBundle.isLegacy
    ? executionBundle.legacyStages
    : executionBundle.items.flatMap((item) => item.stages);
  const qc = executionBundle.isLegacy
    ? executionBundle.legacyQc
    : executionBundle.items.find((item) => item.qc)?.qc ?? null;

  const activeFiles = files.filter((f) => f.status === "ACTIVE");
  const productNameByItemId = new Map(
    order.items.map((item) => [item.id, productDisplayName(item)]),
  );

  const orderLevelFiles = activeFiles
    .filter((f) => !f.orderItemId)
    .map((f) => mapFileRow(f, productNameByItemId));

  const itemLevelFiles = order.items.map((item) => ({
    orderItemId: item.id,
    productName: productDisplayName(item),
    files: activeFiles
      .filter((f) => f.orderItemId === item.id)
      .map((f) => mapFileRow(f, productNameByItemId)),
  }));

  const acknowledgementActivity = order.activities.find(
    (activity) =>
      activity.type === "PRODUCTION_UPDATED" &&
      activity.title === "Xác nhận bắt đầu sản xuất khi hồ sơ chưa đầy đủ",
  );

  const handoverOverrideActivity = order.activities.find(
    (activity) =>
      activity.type === "PRODUCTION_UPDATED" &&
      activity.title === "Xác nhận chuyển sang Sẵn sàng giao khi hồ sơ chưa đầy đủ",
  );

  const stageSummary = computeStageProgressSummary(stages);
  const evidenceThumbnails = (qc?.evidence ?? [])
    .filter((ev) => ev.mimeType.startsWith("image/"))
    .slice(0, 4)
    .map((ev) => ({
      url: ev.thumbnailUrl ?? ev.url,
      title: ev.title ?? ev.filename,
    }));

  const executionSummary =
    stages.length > 0 || qc
      ? {
          stageProgressLabel: stages.length > 0 ? stageSummary.progressLabel : "—",
          qcStatusLabel: qc ? QC_INSPECTION_STATUS_LABELS[qc.status] : "Chưa QC",
          qcPassedQuantity: qc?.passedQuantity ?? "0",
          qcInspectedQuantity: qc?.inspectedQuantity ?? "0",
          packingLabel: stageSummary.packingCompleted
            ? "Đã đóng gói"
            : stageSummary.packingSkipped
              ? "Không áp dụng"
              : "Chưa đóng gói",
          handoverStateLabel: handover.stateLabel,
          evidenceThumbnails,
          orderReadinessLabel: ORDER_ITEM_READINESS_LABELS[executionBundle.orderReadiness.state],
        }
      : null;

  return {
    orderId: order.id,
    orderNo: order.orderNo,
    sourceQuoteNo: order.sourceQuoteNo,
    orderDate: order.orderDate,
    issuedAt: new Date().toISOString(),
    customerCompanyName: order.customerCompanyName,
    salesName: order.salesName,
    salesTitle: order.salesTitle,
    productionOwnerName: order.productionOwnerName,
    productionDueDate: order.productionDueDate,
    productionNote: order.productionNote,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status],
    variantRows: expandVariantRows(order),
    orderLevelFiles,
    itemLevelFiles,
    itemBoms: buildItemBoms(order, materials, availability),
    materialSummary: buildMaterialSummary(materials.summary, availability),
    readiness: {
      items: readiness.items,
      isReady: readiness.isReady,
    },
    acknowledgement: acknowledgementActivity
      ? {
          acknowledgedAt: acknowledgementActivity.createdAt,
          detail: acknowledgementActivity.detail,
        }
      : handoverOverrideActivity
        ? {
            acknowledgedAt: handoverOverrideActivity.createdAt,
            detail: handoverOverrideActivity.detail,
          }
        : null,
    executionSummary,
    adminOrderUrl: `/admin/orders/${order.id}#production-execution`,
  };
}

export function attachProductionSheetPdfMeta(
  sheet: ProductionSheetViewModel,
  company: QuoteCompanyProfile,
  logoUrl: string | null,
): ProductionSheetPdfData {
  return {
    ...sheet,
    company,
    logoUrl,
    printedAt: new Date().toISOString(),
  };
}
