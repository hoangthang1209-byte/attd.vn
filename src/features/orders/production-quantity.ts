import { Decimal } from "@prisma/client/runtime/library";

export class ProductionExecutionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionExecutionValidationError";
  }
}

export class HandoverValidationError extends Error {
  missingConditions: string[];

  constructor(missingConditions: string[], message?: string) {
    super(message ?? "Đơn hàng chưa đủ điều kiện sẵn sàng giao.");
    this.name = "HandoverValidationError";
    this.missingConditions = missingConditions;
  }
}

export class ShippedValidationError extends Error {
  missingConditions: string[];
  requiresExecutionFlow: boolean;

  constructor(
    missingConditions: string[],
    options?: { message?: string; requiresExecutionFlow?: boolean },
  ) {
    super(
      options?.message ??
        "Vui lòng tạo và xác nhận chuyến giao hàng trước khi chuyển đơn sang Đã giao hàng.",
    );
    this.name = "ShippedValidationError";
    this.missingConditions = missingConditions;
    this.requiresExecutionFlow = options?.requiresExecutionFlow ?? false;
  }
}

export class CompletionValidationError extends Error {
  missingConditions: string[];

  constructor(missingConditions: string[], message?: string) {
    super(message ?? "Đơn hàng chưa đủ điều kiện hoàn tất.");
    this.name = "CompletionValidationError";
    this.missingConditions = missingConditions;
  }
}

export function parseQuantityInput(value: unknown, fieldLabel: string): Decimal {
  if (value === null || value === undefined || value === "") {
    return new Decimal(0);
  }
  const num = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(num)) {
    throw new ProductionExecutionValidationError(`${fieldLabel} không hợp lệ.`);
  }
  if (num < 0) {
    throw new ProductionExecutionValidationError(`${fieldLabel} không được âm.`);
  }
  return new Decimal(num);
}

export function decimalToNumber(value: Decimal | null | undefined): number {
  if (!value) return 0;
  return value.toNumber();
}

export function formatQuantityDisplay(value: Decimal | number | null | undefined): string {
  const n = value instanceof Decimal ? value.toNumber() : Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 4 });
}

export function validateStageQuantities(input: {
  completedQuantity: Decimal;
  passedQuantity: Decimal;
  defectQuantity: Decimal;
  reworkQuantity: Decimal;
  scrapQuantity: Decimal;
  allowExceedCompleted?: boolean;
}): void {
  const parts = [
    input.passedQuantity,
    input.defectQuantity,
    input.reworkQuantity,
    input.scrapQuantity,
  ];
  const sum = parts.reduce((acc, v) => acc.plus(v), new Decimal(0));
  if (!input.allowExceedCompleted && sum.gt(input.completedQuantity)) {
    throw new ProductionExecutionValidationError(
      "Tổng đạt + lỗi + làm lại + hủy không được vượt quá số lượng hoàn thành.",
    );
  }
}

export function serializeDecimal(value: Decimal | null | undefined): string {
  if (!value) return "0";
  return value.toString();
}
