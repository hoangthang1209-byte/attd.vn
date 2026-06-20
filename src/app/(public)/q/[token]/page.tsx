import { notFound, permanentRedirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ensureQuotePublicShortCode,
  getQuotePublicPath,
} from "@/features/quotes/quote-public-link.service";

type Props = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

/**
 * Legacy public quote URL — redirects to canonical short link.
 * Document/PDF routes under /q/[token]/document remain unchanged.
 */
export default async function LegacyPublicQuoteRedirectPage({ params }: Props) {
  const { token } = await params;
  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
    select: { id: true, quoteNo: true, publicShortCode: true },
  });

  if (!quote) notFound();

  const publicShortCode =
    quote.publicShortCode?.trim().toUpperCase() ||
    (await ensureQuotePublicShortCode(quote.id));

  const path = getQuotePublicPath({
    quoteNo: quote.quoteNo,
    publicShortCode,
  });

  if (!path) notFound();

  permanentRedirect(path);
}
