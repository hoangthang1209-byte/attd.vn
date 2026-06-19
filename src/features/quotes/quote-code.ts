import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export async function generateQuoteNo(): Promise<string> {
  const count = await prisma.quote.count();
  return `BG-${String(count + 1).padStart(6, "0")}`;
}

export function generatePublicToken(): string {
  return randomBytes(24).toString("base64url");
}

export const DEFAULT_QUOTE_TERMS = [
  "Báo giá có hiệu lực trong thời gian ghi trên báo giá.",
  "Giá chưa bao gồm các hạng mục phát sinh ngoài mô tả nếu không được ghi rõ.",
  "Thời gian sản xuất và giao hàng sẽ được xác nhận sau khi chốt đơn và nhận đủ thông tin cần thiết.",
].join("\n");

export function defaultValidUntil(days = 7): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 0);
  return d;
}
