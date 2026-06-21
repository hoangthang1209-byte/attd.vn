import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DESIGN_FILE_TYPES } from "@/features/orders/production-pack-labels";
import { resolveOrderItemTotalQuantity } from "@/features/orders/bom-calculations";

export type ReadinessItemStatus = "complete" | "incomplete" | "not_applicable";

export type ProductionReadinessItem = {
  key: string;
  label: string;
  status: ReadinessItemStatus;
  detail: string | null;
};

export type ProductionReadinessResult = {
  items: ProductionReadinessItem[];
  isReady: boolean;
  missingMandatory: string[];
};

function itemStatus(ok: boolean, notApplicable = false): ReadinessItemStatus {
  if (notApplicable) return "not_applicable";
  return ok ? "complete" : "incomplete";
}

export async function evaluateProductionReadiness(orderId: string): Promise<ProductionReadinessResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variants: true,
          materialRequirements: true,
        },
      },
      productionFiles: {
        where: { status: "ACTIVE" },
      },
    },
  });

  if (!order) {
    return { items: [], isReady: false, missingMandatory: ["Không tìm thấy đơn hàng"] };
  }

  const itemIds = new Set(order.items.map((i) => i.id));
  const activeFiles = [
    ...order.productionFiles,
    ...(await prisma.orderProductionFile.findMany({
      where: { orderItemId: { in: [...itemIds] }, status: "ACTIVE" },
    })),
  ];

  const hasOwner = Boolean(order.productionOwnerId || order.productionOwnerName?.trim());
  const hasDueDate = Boolean(order.productionDueDate);
  const hasDesignFile = activeFiles.some((f) => DESIGN_FILE_TYPES.includes(f.type));

  const productItemsNeedingBom = order.items.filter((i) => i.productId);
  const itemsMissingBom = productItemsNeedingBom.filter((i) => !i.materialRequirements.length);
  const allProductsHaveBom = productItemsNeedingBom.length === 0 || itemsMissingBom.length === 0;

  const hasProductionNote = Boolean(order.productionNote?.trim());
  const noteRequired = false;

  const items: ProductionReadinessItem[] = [
    {
      key: "production_owner",
      label: "Có người phụ trách sản xuất",
      status: itemStatus(hasOwner),
      detail: hasOwner
        ? order.productionOwnerName ?? null
        : "Chưa gán phụ trách sản xuất",
    },
    {
      key: "production_due_date",
      label: "Có hạn hoàn thành",
      status: itemStatus(hasDueDate),
      detail: hasDueDate ? order.productionDueDate!.toISOString().slice(0, 10) : "Chưa có hạn sản xuất",
    },
    {
      key: "design_files",
      label: "Có ít nhất một file thiết kế / tài liệu kỹ thuật phù hợp",
      status: itemStatus(hasDesignFile),
      detail: hasDesignFile
        ? `${activeFiles.filter((f) => DESIGN_FILE_TYPES.includes(f.type)).length} file đang sử dụng`
        : "Chưa có file thiết kế hoặc tài liệu kỹ thuật",
    },
    {
      key: "bom",
      label: "Các sản phẩm cần BOM đã có định mức nguyên phụ liệu",
      status: itemStatus(allProductsHaveBom, productItemsNeedingBom.length === 0),
      detail:
        productItemsNeedingBom.length === 0
          ? "Không có sản phẩm catalog — không áp dụng"
          : itemsMissingBom.length
            ? `${itemsMissingBom.length} dòng chưa có BOM`
            : "Đã có định mức cho tất cả sản phẩm",
    },
    {
      key: "production_note",
      label: "Có ghi chú sản xuất nếu required by workflow",
      status: itemStatus(hasProductionNote, !noteRequired),
      detail: noteRequired
        ? hasProductionNote
          ? "Đã có ghi chú"
          : "Chưa có ghi chú sản xuất"
        : "Không bắt buộc",
    },
  ];

  const missingMandatory = items
    .filter((i) => i.status === "incomplete")
    .map((i) => i.label);

  const isReady = missingMandatory.length === 0;

  return { items, isReady, missingMandatory };
}

export function formatReadinessAcknowledgementDetail(missing: string[]): string {
  return [
    "Bắt đầu sản xuất khi hồ sơ chưa đầy đủ — người dùng đã xác nhận.",
    missing.length ? `Thiếu: ${missing.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function isLegacyOrderForReadiness(input: {
  status: OrderStatus;
  productionStartedAt: Date | null;
  createdAt: Date;
}): boolean {
  if (input.productionStartedAt) return true;
  if (input.status === "IN_PRODUCTION" || input.status === "READY_TO_SHIP" || input.status === "SHIPPED" || input.status === "COMPLETED") {
    return true;
  }
  return false;
}

export async function getOrderItemQuantitiesForReadiness(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: { variants: true },
  });
  return items.map((item) => ({
    id: item.id,
    productId: item.productId,
    totalQuantity: resolveOrderItemTotalQuantity(item),
  }));
}
