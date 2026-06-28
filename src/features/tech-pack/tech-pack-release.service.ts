import { Prisma, TechPackReleaseAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TechPackValidationError } from "@/features/tech-pack/tech-pack.errors";
import {
  validateBomMasterLinks,
  type BomValidationIssue,
} from "@/features/tech-pack/bom-release-validation";
import { detectBomDuplicates } from "@/features/tech-pack/bom-duplicate-detection";

const FLAT_SKETCH_TYPES = new Set(["FLAT_SKETCH_FRONT", "FLAT_SKETCH_BACK"]);
const ARTWORK_ASSET_TYPES = new Set([
  "LOGO_PLACEMENT",
  "PRINT_PLACEMENT",
  "EMBROIDERY_PLACEMENT",
  "ARTWORK_REFERENCE",
]);

export type ReleaseChecklistItem = {
  key: string;
  label: string;
  passed: boolean;
  required: boolean;
};

export type ReleaseReadiness = {
  canRelease: boolean;
  items: ReleaseChecklistItem[];
  errors: string[];
  bomChecks: BomValidationIssue[];
};

async function isGarmentProduct(productId: string | null): Promise<boolean> {
  if (!productId) return false;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { category: { select: { slug: true, name: true } }, variants: { select: { sizeName: true }, take: 1 } },
  });
  if (!product) return false;
  const slug = product.category.slug.toLowerCase();
  if (slug.includes("dich-vu") || slug.includes("service")) return false;
  return true;
}

export async function getTechPackReleaseReadiness(techPackId: string): Promise<ReleaseReadiness> {
  const pack = await prisma.techPack.findUnique({
    where: { id: techPackId },
    include: {
      bomItems: true,
      assets: true,
      artworkPlacements: true,
      measurements: true,
      pattern: { select: { id: true, status: true } },
    },
  });
  if (!pack) throw new TechPackValidationError("Không tìm thấy Tech Pack.");

  const hasProduct = Boolean(pack.productId || pack.productNameSnapshot);
  const hasCustomer = Boolean(pack.customerId || pack.customerNameSnapshot);
  const hasQuantity = (pack.quantitySnapshot ?? 0) > 0;
  const hasBom = pack.bomItems.length > 0;
  const hasFlatSketch = pack.assets.some((a) => FLAT_SKETCH_TYPES.has(a.type));
  const hasArtwork =
    pack.artworkPlacements.length > 0 ||
    pack.assets.some((a) => ARTWORK_ASSET_TYPES.has(a.type));
  const hasArtworkOrSketch = hasArtwork || hasFlatSketch;
  const garment = await isGarmentProduct(pack.productId);
  const hasMeasurements = pack.measurements.length > 0;
  const hasPattern = Boolean(pack.patternId);
  const patternExceptionOk =
    hasPattern || Boolean(pack.patternExceptionReason?.trim());

  const items: ReleaseChecklistItem[] = [
    { key: "product", label: "Sản phẩm", passed: hasProduct, required: true },
    { key: "customer", label: "Khách hàng", passed: hasCustomer, required: true },
    { key: "quantity", label: "Số lượng", passed: hasQuantity, required: true },
    { key: "bom", label: "BOM", passed: hasBom, required: true },
    { key: "artwork", label: "Artwork", passed: hasArtworkOrSketch, required: true },
    { key: "pattern", label: "Rập", passed: patternExceptionOk, required: true },
    {
      key: "measurements",
      label: "Thông số",
      passed: !garment || hasMeasurements,
      required: garment,
    },
  ];

  const errors: string[] = [];
  if (!hasProduct) errors.push("Thiếu thông tin sản phẩm.");
  if (!hasCustomer) errors.push("Thiếu thông tin khách hàng.");
  if (!hasQuantity) errors.push("Thiếu số lượng.");
  if (!hasBom) errors.push("Cần ít nhất một dòng BOM.");
  if (!hasArtworkOrSketch) errors.push("Cần artwork hoặc flat sketch.");
  if (!hasPattern && !pack.patternExceptionReason?.trim()) {
    errors.push("Chưa chọn rập. Vui lòng nhập lý do ngoại lệ.");
  }
  if (garment && !hasMeasurements) errors.push("Sản phẩm may mặc cần bảng thông số đo.");

  const bomChecks = hasBom
    ? [
        ...validateBomMasterLinks(
          pack.bomItems.map((row) => ({
            id: row.id,
            category: row.category,
            itemName: row.itemName,
            supplier: row.supplier,
            materialId: row.materialId,
            trimId: row.trimId,
            supplierId: row.supplierId,
          })),
        ),
        ...detectBomDuplicates(
          pack.bomItems.map((row) => ({
            id: row.id,
            category: row.category,
            itemName: row.itemName,
            materialId: row.materialId,
            trimId: row.trimId,
            supplierId: row.supplierId,
          })),
        ),
      ]
    : [];

  for (const issue of bomChecks) {
    if (issue.severity === "error") errors.push(issue.message);
  }

  const bomMasterPassed = bomChecks.filter((c) => c.severity === "error").length === 0;
  items.push({
    key: "bomMaster",
    label: "Liên kết dữ liệu BOM",
    passed: !hasBom || bomMasterPassed,
    required: true,
  });

  return {
    canRelease: errors.length === 0,
    items,
    errors,
    bomChecks,
  };
}

export function buildReleaseSnapshot(pack: {
  code: string;
  version: number;
  productNameSnapshot: string | null;
  customerNameSnapshot: string | null;
  quantitySnapshot: number | null;
  bomItemCount: number;
  artworkPlacementCount: number;
  measurementCount: number;
  patternCode: string | null;
  patternVersion: string | null;
}) {
  return {
    code: pack.code,
    version: pack.version,
    productName: pack.productNameSnapshot,
    customerName: pack.customerNameSnapshot,
    quantity: pack.quantitySnapshot,
    bomItemCount: pack.bomItemCount,
    artworkPlacementCount: pack.artworkPlacementCount,
    measurementCount: pack.measurementCount,
    patternCode: pack.patternCode,
    patternVersion: pack.patternVersion,
  };
}

export async function logTechPackReleaseEvent(input: {
  techPackId: string;
  version: number;
  action: TechPackReleaseAction;
  actorId?: string | null;
  actorName?: string | null;
  snapshotJson?: Prisma.InputJsonValue;
}) {
  return prisma.techPackReleaseHistory.create({
    data: {
      techPackId: input.techPackId,
      version: input.version,
      action: input.action,
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? null,
      snapshotJson: input.snapshotJson ?? undefined,
    },
  });
}

export async function getTechPackReleaseHistory(techPackId: string) {
  return prisma.techPackReleaseHistory.findMany({
    where: { techPackId },
    orderBy: { createdAt: "desc" },
  });
}
