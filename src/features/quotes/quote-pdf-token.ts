import { prisma } from "@/lib/prisma";
import { generatePublicToken } from "@/features/quotes/quote-code";

export async function ensureQuotePublicToken(quoteId: string): Promise<string> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { publicToken: true },
  });
  if (quote?.publicToken) return quote.publicToken;

  const publicToken = generatePublicToken();
  await prisma.quote.update({
    where: { id: quoteId },
    data: { publicToken },
  });
  return publicToken;
}

export async function getQuotePublicTokenById(quoteId: string): Promise<string | null> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { publicToken: true },
  });
  return quote?.publicToken ?? null;
}
