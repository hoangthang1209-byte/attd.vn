import { randomInt } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { QUOTE_PUBLIC_SHORT_CODE_ALPHABET } from "@/features/quotes/quote-public-link.shared";

export {
  getQuotePublicPath,
  getQuotePublicUrl,
  parseQuotePublicLinkSegment,
  QUOTE_PUBLIC_SHORT_CODE_ALPHABET,
} from "@/features/quotes/quote-public-link.shared";
export type {
  QuotePublicLinkParts,
  QuotePublicLinkRecord,
} from "@/features/quotes/quote-public-link.shared";

export class QuotePublicLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotePublicLinkError";
  }
}

export function generateQuotePublicShortCode(): string {
  let code = "";
  for (let i = 0; i < 4; i += 1) {
    code += QUOTE_PUBLIC_SHORT_CODE_ALPHABET[
      randomInt(0, QUOTE_PUBLIC_SHORT_CODE_ALPHABET.length)
    ]!;
  }
  return code;
}

function isPublicShortCodeUniqueError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function allocateQuotePublicShortCode(): Promise<string> {
  const maxAttempts = 20;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateQuotePublicShortCode();
    const existing = await prisma.quote.findUnique({
      where: { publicShortCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new QuotePublicLinkError(
    "Không thể tạo mã truy cập báo giá ngắn. Vui lòng thử lại.",
  );
}

export async function ensureQuotePublicShortCode(quoteId: string): Promise<string> {
  const existing = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { publicShortCode: true },
  });
  if (!existing) {
    throw new QuotePublicLinkError("Không tìm thấy báo giá.");
  }
  if (existing.publicShortCode?.trim()) {
    return existing.publicShortCode.trim().toUpperCase();
  }

  const maxAttempts = 20;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateQuotePublicShortCode();
    try {
      const updated = await prisma.quote.updateMany({
        where: { id: quoteId, publicShortCode: null },
        data: { publicShortCode: code },
      });
      if (updated.count === 1) return code;

      const refreshed = await prisma.quote.findUnique({
        where: { id: quoteId },
        select: { publicShortCode: true },
      });
      if (refreshed?.publicShortCode?.trim()) {
        return refreshed.publicShortCode.trim().toUpperCase();
      }
    } catch (error) {
      if (isPublicShortCodeUniqueError(error)) continue;
      throw error;
    }
  }

  throw new QuotePublicLinkError(
    "Không thể tạo mã truy cập báo giá ngắn. Vui lòng thử lại.",
  );
}

export async function findQuoteIdByPublicLink(
  parts: import("@/features/quotes/quote-public-link.shared").QuotePublicLinkParts,
): Promise<string | null> {
  const row = await prisma.quote.findFirst({
    where: {
      quoteNo: parts.quoteNo,
      publicShortCode: parts.publicShortCode,
    },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function findQuotePublicTokenByPublicLink(
  parts: import("@/features/quotes/quote-public-link.shared").QuotePublicLinkParts,
): Promise<string | null> {
  const row = await prisma.quote.findFirst({
    where: {
      quoteNo: parts.quoteNo,
      publicShortCode: parts.publicShortCode,
    },
    select: { publicToken: true },
  });
  return row?.publicToken ?? null;
}
