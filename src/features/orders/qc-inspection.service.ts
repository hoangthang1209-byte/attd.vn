import type { Prisma, QcEvidenceType, QcInspectionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveOrderItemTotalQuantity } from "@/features/orders/bom-calculations";
import {
  QC_EVIDENCE_TYPE_LABELS,
  QC_INSPECTION_STATUS_LABELS,
} from "@/features/orders/production-execution-labels";
import {
  parseQuantityInput,
  ProductionExecutionValidationError,
  serializeDecimal,
  validateStageQuantities,
} from "@/features/orders/production-quantity";

export type QcEvidenceRecord = {
  id: string;
  orderId: string;
  qcInspectionId: string | null;
  mediaAssetId: string;
  title: string | null;
  note: string | null;
  evidenceType: QcEvidenceType;
  evidenceTypeLabel: string;
  mimeType: string;
  filename: string;
  originalName: string | null;
  thumbnailUrl: string | null;
  url: string;
  createdAt: string;
};

export type QcInspectionRecord = {
  id: string;
  orderId: string;
  status: QcInspectionStatus;
  statusLabel: string;
  inspectedByEmployeeId: string | null;
  inspectedByEmployeeName: string | null;
  inspectedAt: string | null;
  inspectedQuantity: string;
  passedQuantity: string;
  defectQuantity: string;
  reworkQuantity: string;
  scrapQuantity: string;
  summary: string | null;
  correctiveAction: string | null;
  evidence: QcEvidenceRecord[];
  createdAt: string;
  updatedAt: string;
};

const evidenceInclude = {
  mediaAsset: {
    select: {
      mimeType: true,
      filename: true,
      originalName: true,
      thumbnailUrl: true,
      url: true,
    },
  },
} as const;

const qcInclude = {
  inspectedBy: { select: { fullName: true } },
  evidence: {
    include: evidenceInclude,
    orderBy: { createdAt: "desc" as const },
  },
} as const;

function mapEvidence(
  row: Prisma.OrderQcEvidenceGetPayload<{ include: typeof evidenceInclude }>,
): QcEvidenceRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    qcInspectionId: row.qcInspectionId,
    mediaAssetId: row.mediaAssetId,
    title: row.title,
    note: row.note,
    evidenceType: row.evidenceType,
    evidenceTypeLabel: QC_EVIDENCE_TYPE_LABELS[row.evidenceType],
    mimeType: row.mediaAsset.mimeType,
    filename: row.mediaAsset.filename,
    originalName: row.mediaAsset.originalName,
    thumbnailUrl: row.mediaAsset.thumbnailUrl,
    url: row.mediaAsset.url,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapQc(
  row: Prisma.OrderQcInspectionGetPayload<{ include: typeof qcInclude }>,
): QcInspectionRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    status: row.status,
    statusLabel: QC_INSPECTION_STATUS_LABELS[row.status],
    inspectedByEmployeeId: row.inspectedByEmployeeId,
    inspectedByEmployeeName: row.inspectedBy?.fullName ?? null,
    inspectedAt: row.inspectedAt?.toISOString() ?? null,
    inspectedQuantity: serializeDecimal(row.inspectedQuantity),
    passedQuantity: serializeDecimal(row.passedQuantity),
    defectQuantity: serializeDecimal(row.defectQuantity),
    reworkQuantity: serializeDecimal(row.reworkQuantity),
    scrapQuantity: serializeDecimal(row.scrapQuantity),
    summary: row.summary,
    correctiveAction: row.correctiveAction,
    evidence: row.evidence.map(mapEvidence),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getOrderExpectedQuantity(orderId: string): Promise<number> {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: { variants: true },
  });
  return items.reduce((sum, item) => sum + resolveOrderItemTotalQuantity(item), 0);
}

export async function getQcInspection(orderId: string): Promise<QcInspectionRecord | null> {
  const row = await prisma.orderQcInspection.findUnique({
    where: { orderId },
    include: qcInclude,
  });
  return row ? mapQc(row) : null;
}

export type UpsertQcInspectionInput = {
  status?: QcInspectionStatus;
  inspectedByEmployeeId?: string | null;
  inspectedAt?: string | null;
  inspectedQuantity?: unknown;
  passedQuantity?: unknown;
  defectQuantity?: unknown;
  reworkQuantity?: unknown;
  scrapQuantity?: unknown;
  summary?: string | null;
  correctiveAction?: string | null;
};

function validateQcStatusRules(
  status: QcInspectionStatus,
  quantities: {
    passedQuantity: ReturnType<typeof parseQuantityInput>;
    defectQuantity: ReturnType<typeof parseQuantityInput>;
    reworkQuantity: ReturnType<typeof parseQuantityInput>;
    correctiveAction: string | null;
  },
  expectedQuantity: number,
): void {
  if (status === "PASSED" && quantities.passedQuantity.lte(0)) {
    throw new ProductionExecutionValidationError("Trạng thái Đạt yêu cầu số lượng đạt lớn hơn 0.");
  }
  if (status === "REWORK_REQUIRED") {
    if (quantities.reworkQuantity.lte(0) && !quantities.correctiveAction?.trim()) {
      throw new ProductionExecutionValidationError(
        "Cần làm lại yêu cầu số lượng làm lại hoặc hành động khắc phục.",
      );
    }
  }
  if (status === "FAILED") {
    if (quantities.defectQuantity.lte(0) && !quantities.correctiveAction?.trim()) {
      throw new ProductionExecutionValidationError(
        "Không đạt yêu cầu số lượng lỗi hoặc hành động khắc phục.",
      );
    }
  }
  if (
    (status === "PASSED" || status === "PASSED_WITH_NOTE") &&
    quantities.passedQuantity.gt(expectedQuantity)
  ) {
    throw new ProductionExecutionValidationError(
      "Số lượng QC đạt không được vượt quá tổng số lượng đơn hàng.",
    );
  }
}

export async function createQcInspection(
  orderId: string,
  input?: { inspectedByEmployeeId?: string | null },
): Promise<QcInspectionRecord> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ProductionExecutionValidationError("Không tìm thấy đơn hàng.");

  const existing = await prisma.orderQcInspection.findUnique({ where: { orderId } });
  if (existing) {
    const full = await getQcInspection(orderId);
    if (!full) throw new ProductionExecutionValidationError("Không tìm thấy QC.");
    return full;
  }

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.orderQcInspection.create({
      data: {
        orderId,
        status: "DRAFT",
        inspectedByEmployeeId: input?.inspectedByEmployeeId ?? null,
      },
      include: qcInclude,
    });
    await tx.orderActivity.create({
      data: {
        orderId,
        type: "PRODUCTION_UPDATED",
        title: "Bắt đầu kiểm tra QC",
        detail: null,
      },
    });
    return created;
  });

  return mapQc(row);
}

export async function updateQcInspection(
  orderId: string,
  input: UpsertQcInspectionInput,
): Promise<QcInspectionRecord> {
  let qc = await prisma.orderQcInspection.findUnique({ where: { orderId }, include: qcInclude });
  if (!qc) {
    await createQcInspection(orderId, {
      inspectedByEmployeeId: input.inspectedByEmployeeId ?? null,
    });
    qc = await prisma.orderQcInspection.findUnique({ where: { orderId }, include: qcInclude });
  }
  if (!qc) throw new ProductionExecutionValidationError("Không tìm thấy QC.");

  const expectedQuantity = await getOrderExpectedQuantity(orderId);

  const inspectedQuantity = input.inspectedQuantity !== undefined
    ? parseQuantityInput(input.inspectedQuantity, "Số lượng kiểm tra")
    : qc.inspectedQuantity;
  const passedQuantity = input.passedQuantity !== undefined
    ? parseQuantityInput(input.passedQuantity, "Số lượng đạt")
    : qc.passedQuantity;
  const defectQuantity = input.defectQuantity !== undefined
    ? parseQuantityInput(input.defectQuantity, "Số lượng lỗi")
    : qc.defectQuantity;
  const reworkQuantity = input.reworkQuantity !== undefined
    ? parseQuantityInput(input.reworkQuantity, "Số lượng làm lại")
    : qc.reworkQuantity;
  const scrapQuantity = input.scrapQuantity !== undefined
    ? parseQuantityInput(input.scrapQuantity, "Số lượng hủy")
    : qc.scrapQuantity;

  validateStageQuantities({
    completedQuantity: inspectedQuantity,
    passedQuantity,
    defectQuantity,
    reworkQuantity,
    scrapQuantity,
  });

  const nextStatus = input.status ?? qc.status;
  const correctiveAction =
    input.correctiveAction !== undefined ? input.correctiveAction?.trim() || null : qc.correctiveAction;

  validateQcStatusRules(
    nextStatus,
    { passedQuantity, defectQuantity, reworkQuantity, correctiveAction },
    expectedQuantity,
  );

  const data: Prisma.OrderQcInspectionUpdateInput = {
    inspectedQuantity,
    passedQuantity,
    defectQuantity,
    reworkQuantity,
    scrapQuantity,
    status: nextStatus,
    summary: input.summary !== undefined ? input.summary?.trim() || null : undefined,
    correctiveAction: input.correctiveAction !== undefined ? correctiveAction : undefined,
  };

  if (input.inspectedByEmployeeId !== undefined) {
    data.inspectedBy = input.inspectedByEmployeeId
      ? { connect: { id: input.inspectedByEmployeeId } }
      : { disconnect: true };
  }

  if (input.inspectedAt !== undefined) {
    data.inspectedAt = input.inspectedAt ? new Date(input.inspectedAt) : null;
  } else if (nextStatus !== "DRAFT" && !qc.inspectedAt) {
    data.inspectedAt = new Date();
  }

  const prevStatus = qc.status;
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.orderQcInspection.update({
      where: { orderId },
      data,
      include: qcInclude,
    });

    if (prevStatus !== nextStatus || input.passedQuantity !== undefined) {
      await tx.orderActivity.create({
        data: {
          orderId,
          type: "PRODUCTION_UPDATED",
          title: "Cập nhật kết quả QC",
          detail: `Trạng thái: ${QC_INSPECTION_STATUS_LABELS[nextStatus]}; Đạt: ${serializeDecimal(passedQuantity)}`,
        },
      });
    }

    return row;
  });

  return mapQc(updated);
}

export type CreateQcEvidenceInput = {
  mediaAssetId: string;
  title?: string | null;
  note?: string | null;
  evidenceType?: QcEvidenceType;
};

export async function addQcEvidence(
  orderId: string,
  input: CreateQcEvidenceInput,
): Promise<QcEvidenceRecord> {
  if (!input.mediaAssetId?.trim()) {
    throw new ProductionExecutionValidationError("Thiếu tệp đính kèm.");
  }

  const media = await prisma.mediaAsset.findUnique({ where: { id: input.mediaAssetId } });
  if (!media) throw new ProductionExecutionValidationError("Không tìm thấy tệp media.");

  let qc = await prisma.orderQcInspection.findUnique({ where: { orderId } });
  if (!qc) {
    await createQcInspection(orderId);
    qc = await prisma.orderQcInspection.findUnique({ where: { orderId } });
  }

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.orderQcEvidence.create({
      data: {
        orderId,
        qcInspectionId: qc!.id,
        mediaAssetId: input.mediaAssetId,
        title: input.title?.trim() || null,
        note: input.note?.trim() || null,
        evidenceType: input.evidenceType ?? "OTHER",
      },
      include: evidenceInclude,
    });
    await tx.orderActivity.create({
      data: {
        orderId,
        type: "PRODUCTION_UPDATED",
        title: "Thêm minh chứng QC",
        detail: input.title?.trim() || media.originalName || media.filename,
      },
    });
    return created;
  });

  return mapEvidence(row);
}

export async function updateQcEvidence(
  orderId: string,
  evidenceId: string,
  input: { title?: string | null; note?: string | null; evidenceType?: QcEvidenceType },
): Promise<QcEvidenceRecord> {
  const existing = await prisma.orderQcEvidence.findFirst({
    where: { id: evidenceId, orderId },
    include: evidenceInclude,
  });
  if (!existing) throw new ProductionExecutionValidationError("Không tìm thấy minh chứng QC.");

  const row = await prisma.orderQcEvidence.update({
    where: { id: evidenceId },
    data: {
      title: input.title !== undefined ? input.title?.trim() || null : undefined,
      note: input.note !== undefined ? input.note?.trim() || null : undefined,
      evidenceType: input.evidenceType,
    },
    include: evidenceInclude,
  });

  return mapEvidence(row);
}

export async function deleteQcEvidence(orderId: string, evidenceId: string): Promise<void> {
  const existing = await prisma.orderQcEvidence.findFirst({
    where: { id: evidenceId, orderId },
    include: { mediaAsset: { select: { filename: true, originalName: true } } },
  });
  if (!existing) throw new ProductionExecutionValidationError("Không tìm thấy minh chứng QC.");

  await prisma.$transaction(async (tx) => {
    await tx.orderQcEvidence.delete({ where: { id: evidenceId } });
    await tx.orderActivity.create({
      data: {
        orderId,
        type: "PRODUCTION_UPDATED",
        title: "Xóa minh chứng QC",
        detail: existing.title ?? existing.mediaAsset.originalName ?? existing.mediaAsset.filename,
      },
    });
  });
}

export function qcBoardStatusLabel(status: QcInspectionStatus | null | undefined): string {
  if (!status || status === "DRAFT") return "Chưa QC";
  if (status === "PASSED" || status === "PASSED_WITH_NOTE") return "Đạt";
  if (status === "REWORK_REQUIRED") return "Cần làm lại";
  if (status === "FAILED") return "Không đạt";
  return QC_INSPECTION_STATUS_LABELS[status];
}
