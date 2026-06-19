import type { QuoteStatus } from "@prisma/client";
import { getQuoteStatusLabel, quoteStatusBadgeClass } from "@/features/quotes/labels";

export default function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <span className={`admin-kb-badge ${quoteStatusBadgeClass(status)}`}>
      {getQuoteStatusLabel(status)}
    </span>
  );
}
