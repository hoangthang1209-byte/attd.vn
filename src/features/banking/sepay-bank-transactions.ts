import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeOrderFinancials } from "@/features/orders/order-finance";
import { isOrderPaymentLocked } from "@/features/orders/order-status";

export const BANK_TRANSACTION_STATUSES = [
  "UNMATCHED",
  "MATCHED",
  "NEEDS_REVIEW",
  "IGNORED",
] as const;

export type BankTransactionStatus = (typeof BANK_TRANSACTION_STATUSES)[number];
export type BankTransactionReconcileAction = "MATCH" | "IGNORE";

export class BankTransactionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BankTransactionValidationError";
  }
}

const sePayWebhookSchema = z.object({
  id: z.union([z.number(), z.string()]).transform((value) => String(value)),
  gateway: z.string().min(1),
  transactionDate: z.string().min(1),
  accountNumber: z.string().min(1),
  subAccount: z.string().nullish(),
  code: z.string().nullish(),
  content: z.string().default(""),
  transferType: z.enum(["in", "out"]),
  description: z.string().nullish(),
  transferAmount: z.coerce.number().positive(),
  accumulated: z.coerce.number().nullish(),
  referenceCode: z.string().nullish(),
}).passthrough();

export type SePayWebhookPayload = z.infer<typeof sePayWebhookSchema>;

export type BankTransactionRecord = {
  id: string;
  provider: string;
  externalId: string;
  gateway: string;
  transactionAt: string;
  accountNumber: string;
  content: string;
  transferType: string;
  amount: number;
  referenceCode: string | null;
  matchStatus: BankTransactionStatus;
  matchReason: string | null;
  matchedOrderId: string | null;
  matchedOrderNo: string | null;
  orderPaymentId: string | null;
  matchedAt: string | null;
};

export type SePayProcessingResult = {
  bankTransactionId: string;
  matchStatus: BankTransactionStatus;
  matchedOrderId: string | null;
  orderPaymentId: string | null;
  duplicate: boolean;
};

function parseVietnamBankDate(value: string): Date {
  const normalized = value.trim().replace(" ", "T");
  const parsed = new Date(`${normalized}+07:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("transactionDate không hợp lệ");
  }
  return parsed;
}

function normalizeOrderNo(input: string): string | null {
  const match = input.match(/\bDH[\s._-]?(\d{6})\b/i);
  return match ? `DH-${match[1]}` : null;
}

function extractOrderNo(payload: SePayWebhookPayload): string | null {
  const haystack = [payload.code, payload.content, payload.description, payload.subAccount]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
  return normalizeOrderNo(haystack);
}

function paymentTypeForIncomingTransfer(input: {
  confirmedPaid: number;
  amount: number;
  totalAmount: number;
}): "DEPOSIT" | "PAYMENT" {
  if (input.confirmedPaid <= 0 && input.amount < input.totalAmount) return "DEPOSIT";
  return "PAYMENT";
}

function reconciliationBlockReason(input: {
  orderNo: string;
  currency: string;
  orderStatus: import("@prisma/client").OrderStatus;
  outstandingAmount: number;
  amount: number;
}): string | null {
  if (input.currency !== "VND") {
    return `Đơn ${input.orderNo} dùng tiền tệ ${input.currency}; Phase 1 chỉ đối soát chuyển khoản VND.`;
  }
  if (isOrderPaymentLocked(input.orderStatus)) {
    return `Đơn ${input.orderNo} đã ${input.orderStatus === "COMPLETED" ? "hoàn tất" : "hủy"}; không thể cập nhật thanh toán.`;
  }
  if (input.outstandingAmount <= 0) {
    return `Đơn ${input.orderNo} không còn công nợ phải thu.`;
  }
  if (input.amount > input.outstandingAmount) {
    return `Số tiền ${input.amount.toLocaleString("vi-VN")} đ vượt công nợ ${input.outstandingAmount.toLocaleString("vi-VN")} đ của ${input.orderNo}.`;
  }
  return null;
}

async function findExistingTransaction(externalId: string) {
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    matchStatus: BankTransactionStatus;
    matchedOrderId: string | null;
    orderPaymentId: string | null;
  }>>(Prisma.sql`
    SELECT "id", "matchStatus", "matchedOrderId", "orderPaymentId"
    FROM "BankTransaction"
    WHERE "provider" = 'SEPAY' AND "externalId" = ${externalId}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

function duplicateResult(existing: Awaited<ReturnType<typeof findExistingTransaction>>): SePayProcessingResult {
  if (!existing) throw new Error("Không tìm thấy giao dịch đã tồn tại");
  return {
    bankTransactionId: existing.id,
    matchStatus: existing.matchStatus,
    matchedOrderId: existing.matchedOrderId,
    orderPaymentId: existing.orderPaymentId,
    duplicate: true,
  };
}

export function parseSePayWebhookPayload(input: unknown): SePayWebhookPayload {
  return sePayWebhookSchema.parse(input);
}

export async function processSePayWebhook(
  payload: SePayWebhookPayload,
): Promise<SePayProcessingResult> {
  const existing = await findExistingTransaction(payload.id);
  if (existing) return duplicateResult(existing);

  const transactionId = randomUUID();
  const transactionAt = parseVietnamBankDate(payload.transactionDate);
  const orderNo = extractOrderNo(payload);
  const rawPayload = JSON.stringify(payload);

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "BankTransaction" (
          "id", "provider", "externalId", "gateway", "transactionAt",
          "accountNumber", "subAccount", "code", "content", "transferType",
          "amount", "accumulated", "referenceCode", "description", "rawPayload",
          "matchStatus", "createdAt", "updatedAt"
        ) VALUES (
          ${transactionId}, 'SEPAY', ${payload.id}, ${payload.gateway}, ${transactionAt},
          ${payload.accountNumber}, ${payload.subAccount ?? null}, ${payload.code ?? null},
          ${payload.content}, ${payload.transferType}, ${payload.transferAmount},
          ${payload.accumulated ?? null}, ${payload.referenceCode ?? null},
          ${payload.description ?? null}, CAST(${rawPayload} AS jsonb),
          'UNMATCHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `);

      if (payload.transferType !== "in") {
        await tx.$executeRaw(Prisma.sql`
          UPDATE "BankTransaction"
          SET "matchStatus" = 'IGNORED',
              "matchReason" = 'Phase 1 chỉ tự đối soát giao dịch tiền vào.',
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${transactionId}
        `);
        return {
          bankTransactionId: transactionId,
          matchStatus: "IGNORED" as const,
          matchedOrderId: null,
          orderPaymentId: null,
          duplicate: false,
        };
      }

      if (!orderNo) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE "BankTransaction"
          SET "matchReason" = 'Không tìm thấy mã đơn hàng DH-xxxxxx trong nội dung chuyển khoản.',
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${transactionId}
        `);
        return {
          bankTransactionId: transactionId,
          matchStatus: "UNMATCHED" as const,
          matchedOrderId: null,
          orderPaymentId: null,
          duplicate: false,
        };
      }

      const order = await tx.order.findUnique({
        where: { orderNo },
        include: { payments: true },
      });

      if (!order) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE "BankTransaction"
          SET "matchReason" = ${`Có mã ${orderNo} nhưng không tìm thấy đơn hàng.`},
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${transactionId}
        `);
        return {
          bankTransactionId: transactionId,
          matchStatus: "UNMATCHED" as const,
          matchedOrderId: null,
          orderPaymentId: null,
          duplicate: false,
        };
      }

      const paymentInputs = order.payments.map((payment) => ({
        type: payment.type,
        status: payment.status,
        amount: payment.amount.toNumber(),
      }));
      const totalAmount = order.totalAmount.toNumber();
      const financials = computeOrderFinancials(totalAmount, paymentInputs);
      const confirmedPaid = financials.paidAmount;
      const reviewReason = reconciliationBlockReason({
        orderNo,
        currency: order.currency,
        orderStatus: order.status,
        outstandingAmount: financials.outstandingAmount,
        amount: payload.transferAmount,
      });

      if (reviewReason) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE "BankTransaction"
          SET "matchStatus" = 'NEEDS_REVIEW',
              "matchReason" = ${reviewReason},
              "matchedOrderId" = ${order.id},
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${transactionId}
        `);
        return {
          bankTransactionId: transactionId,
          matchStatus: "NEEDS_REVIEW" as const,
          matchedOrderId: order.id,
          orderPaymentId: null,
          duplicate: false,
        };
      }

      const paymentType = paymentTypeForIncomingTransfer({
        confirmedPaid,
        amount: payload.transferAmount,
        totalAmount,
      });
      const bankReference = payload.referenceCode?.trim() || `SEPAY-${payload.id}`;
      const noteParts = [
        "Tự động từ SePay",
        payload.gateway,
        payload.content?.trim(),
      ].filter(Boolean);

      const payment = await tx.orderPayment.create({
        data: {
          orderId: order.id,
          type: paymentType,
          method: "BANK_TRANSFER",
          amount: payload.transferAmount,
          paidAt: transactionAt,
          referenceCode: bankReference,
          note: noteParts.join(" · "),
        },
        select: { id: true },
      });

      await tx.orderActivity.create({
        data: {
          orderId: order.id,
          type: "PAYMENT_RECORDED",
          title: `Tự động ghi nhận ${paymentType === "DEPOSIT" ? "tiền cọc" : "thanh toán"}: ${payload.transferAmount.toLocaleString("vi-VN")} đ`,
          detail: `Chuyển khoản · SePay · ${bankReference}`,
          metadata: {
            source: "SEPAY",
            bankTransactionId: transactionId,
            sepayTransactionId: payload.id,
          },
        },
      });

      await tx.$executeRaw(Prisma.sql`
        UPDATE "BankTransaction"
        SET "matchStatus" = 'MATCHED',
            "matchReason" = ${`Tự động khớp theo mã ${orderNo}.`},
            "matchedOrderId" = ${order.id},
            "orderPaymentId" = ${payment.id},
            "matchedAt" = CURRENT_TIMESTAMP,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${transactionId}
      `);

      return {
        bankTransactionId: transactionId,
        matchStatus: "MATCHED" as const,
        matchedOrderId: order.id,
        orderPaymentId: payment.id,
        duplicate: false,
      };
    });
  } catch (error) {
    const duplicate = await findExistingTransaction(payload.id);
    if (duplicate) return duplicateResult(duplicate);
    throw error;
  }
}

type LockedBankTransaction = {
  id: string;
  provider: string;
  externalId: string;
  gateway: string;
  transactionAt: Date;
  content: string;
  transferType: string;
  amount: Prisma.Decimal;
  referenceCode: string | null;
  matchStatus: BankTransactionStatus;
  matchedOrderId: string | null;
  orderPaymentId: string | null;
};

async function lockBankTransaction(
  tx: Prisma.TransactionClient,
  transactionId: string,
): Promise<LockedBankTransaction | null> {
  const rows = await tx.$queryRaw<LockedBankTransaction[]>(Prisma.sql`
    SELECT
      "id", "provider", "externalId", "gateway", "transactionAt", "content",
      "transferType", "amount", "referenceCode", "matchStatus",
      "matchedOrderId", "orderPaymentId"
    FROM "BankTransaction"
    WHERE "id" = ${transactionId}
    FOR UPDATE
  `);
  return rows[0] ?? null;
}

export async function reconcileBankTransaction(
  transactionId: string,
  input: {
    action: BankTransactionReconcileAction;
    orderNo?: string | null;
    note?: string | null;
  },
) {
  const note = input.note?.trim() || null;

  return prisma.$transaction(async (tx) => {
    const transaction = await lockBankTransaction(tx, transactionId);
    if (!transaction) {
      throw new BankTransactionValidationError("Không tìm thấy giao dịch ngân hàng.");
    }
    if (transaction.orderPaymentId || transaction.matchStatus === "MATCHED") {
      throw new BankTransactionValidationError("Giao dịch này đã được đối soát.");
    }

    if (input.action === "IGNORE") {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "BankTransaction"
        SET "matchStatus" = 'IGNORED',
            "matchReason" = ${note ? `Bỏ qua thủ công · ${note}` : "Bỏ qua thủ công."},
            "matchedAt" = CURRENT_TIMESTAMP,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${transaction.id}
      `);
      return { matchStatus: "IGNORED" as const, matchedOrderId: transaction.matchedOrderId };
    }

    if (transaction.transferType !== "in") {
      throw new BankTransactionValidationError("Phase 1 chỉ khớp thủ công giao dịch tiền vào.");
    }
    if (transaction.matchStatus === "IGNORED") {
      throw new BankTransactionValidationError("Giao dịch đã được bỏ qua; chưa hỗ trợ mở lại trong Phase 1.");
    }

    const orderNo = normalizeOrderNo(input.orderNo?.trim() || "");
    if (!orderNo) {
      throw new BankTransactionValidationError("Mã đơn hàng phải có dạng DH-000523 hoặc DH000523.");
    }

    const order = await tx.order.findUnique({
      where: { orderNo },
      include: { payments: true },
    });
    if (!order) {
      throw new BankTransactionValidationError(`Không tìm thấy đơn hàng ${orderNo}.`);
    }

    const paymentInputs = order.payments.map((payment) => ({
      type: payment.type,
      status: payment.status,
      amount: payment.amount.toNumber(),
    }));
    const totalAmount = order.totalAmount.toNumber();
    const financials = computeOrderFinancials(totalAmount, paymentInputs);
    const amount = transaction.amount.toNumber();
    const blocked = reconciliationBlockReason({
      orderNo,
      currency: order.currency,
      orderStatus: order.status,
      outstandingAmount: financials.outstandingAmount,
      amount,
    });
    if (blocked) throw new BankTransactionValidationError(blocked);

    const paymentType = paymentTypeForIncomingTransfer({
      confirmedPaid: financials.paidAmount,
      amount,
      totalAmount,
    });
    const bankReference = transaction.referenceCode?.trim() || `SEPAY-${transaction.externalId}`;
    const payment = await tx.orderPayment.create({
      data: {
        orderId: order.id,
        type: paymentType,
        method: "BANK_TRANSFER",
        amount,
        paidAt: transaction.transactionAt,
        referenceCode: bankReference,
        note: ["Đối soát thủ công từ SePay", transaction.gateway, transaction.content.trim(), note]
          .filter(Boolean)
          .join(" · "),
      },
      select: { id: true },
    });

    await tx.orderActivity.create({
      data: {
        orderId: order.id,
        type: "PAYMENT_RECORDED",
        title: `Đối soát thủ công ${paymentType === "DEPOSIT" ? "tiền cọc" : "thanh toán"}: ${amount.toLocaleString("vi-VN")} đ`,
        detail: `Chuyển khoản · SePay · ${bankReference}`,
        metadata: {
          source: "SEPAY_MANUAL",
          bankTransactionId: transaction.id,
          sepayTransactionId: transaction.externalId,
          note,
        },
      },
    });

    await tx.$executeRaw(Prisma.sql`
      UPDATE "BankTransaction"
      SET "matchStatus" = 'MATCHED',
          "matchReason" = ${note ? `Khớp thủ công với ${orderNo} · ${note}` : `Khớp thủ công với ${orderNo}.`},
          "matchedOrderId" = ${order.id},
          "orderPaymentId" = ${payment.id},
          "matchedAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${transaction.id}
    `);

    return {
      matchStatus: "MATCHED" as const,
      matchedOrderId: order.id,
      matchedOrderNo: order.orderNo,
      orderPaymentId: payment.id,
    };
  });
}

export async function listBankTransactions(input?: {
  status?: BankTransactionStatus;
  limit?: number;
}): Promise<BankTransactionRecord[]> {
  const limit = Math.min(Math.max(input?.limit ?? 100, 1), 200);
  const status = input?.status;
  const statusClause = status
    ? Prisma.sql`WHERE bt."matchStatus" = ${status}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{
    id: string;
    provider: string;
    externalId: string;
    gateway: string;
    transactionAt: Date;
    accountNumber: string;
    content: string;
    transferType: string;
    amount: Prisma.Decimal;
    referenceCode: string | null;
    matchStatus: BankTransactionStatus;
    matchReason: string | null;
    matchedOrderId: string | null;
    matchedOrderNo: string | null;
    orderPaymentId: string | null;
    matchedAt: Date | null;
  }>>(Prisma.sql`
    SELECT
      bt."id", bt."provider", bt."externalId", bt."gateway",
      bt."transactionAt", bt."accountNumber", bt."content", bt."transferType",
      bt."amount", bt."referenceCode", bt."matchStatus", bt."matchReason",
      bt."matchedOrderId", o."orderNo" AS "matchedOrderNo",
      bt."orderPaymentId", bt."matchedAt"
    FROM "BankTransaction" bt
    LEFT JOIN "Order" o ON o."id" = bt."matchedOrderId"
    ${statusClause}
    ORDER BY bt."transactionAt" DESC, bt."createdAt" DESC
    LIMIT ${limit}
  `);

  return rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    externalId: row.externalId,
    gateway: row.gateway,
    transactionAt: row.transactionAt.toISOString(),
    accountNumber: row.accountNumber,
    content: row.content,
    transferType: row.transferType,
    amount: Number(row.amount),
    referenceCode: row.referenceCode,
    matchStatus: row.matchStatus,
    matchReason: row.matchReason,
    matchedOrderId: row.matchedOrderId,
    matchedOrderNo: row.matchedOrderNo,
    orderPaymentId: row.orderPaymentId,
    matchedAt: row.matchedAt?.toISOString() ?? null,
  }));
}
