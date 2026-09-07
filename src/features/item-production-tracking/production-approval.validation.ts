import type { OrderItemProductionApprovalStatus } from "@prisma/client";

export class ProductionApprovalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionApprovalValidationError";
  }
}

export function validateReleaseRequirements(input: {
  status: OrderItemProductionApprovalStatus;
  sampleRequired: boolean;
  artworkFileId: string | null | undefined;
  sampleFileId: string | null | undefined;
  evidenceMediaAssetId: string | null | undefined;
  approvedByContactId: string | null | undefined;
  approvedByName: string | null | undefined;
  /** When no design files exist on the order/item, artwork may be omitted. */
  artworkOptional?: boolean;
  note?: string | null;
}): void {
  if (input.status !== "RELEASED") return;

  if (!input.artworkFileId && !input.artworkOptional) {
    throw new ProductionApprovalValidationError("Cần chọn artwork trước khi duyệt sản xuất.");
  }
  if (!input.artworkFileId && input.artworkOptional) {
    const note = input.note?.trim() ?? "";
    if (note.length < 5) {
      throw new ProductionApprovalValidationError(
        "Item không có file thiết kế — ghi chú lý do (tối thiểu 5 ký tự) trước khi RELEASED.",
      );
    }
  }

  const approverName = input.approvedByName?.trim();
  if (!input.approvedByContactId && !approverName) {
    throw new ProductionApprovalValidationError(
      "Cần người duyệt (liên hệ hoặc họ tên) trước khi RELEASED.",
    );
  }

  if (input.sampleRequired) {
    const hasSampleEvidence = Boolean(input.sampleFileId || input.evidenceMediaAssetId);
    if (!hasSampleEvidence) {
      throw new ProductionApprovalValidationError(
        "Item yêu cầu duyệt mẫu — cần file mẫu hoặc bằng chứng (Zalo/email).",
      );
    }
  }
}
