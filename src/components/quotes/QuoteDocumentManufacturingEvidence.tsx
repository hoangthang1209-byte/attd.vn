import type { QuoteManufacturingEvidenceItem } from "@/features/quotes/types";

type Props = {
  items: QuoteManufacturingEvidenceItem[];
  absoluteMedia?: boolean;
  mediaBaseUrl?: string;
};

/**
 * Intentionally disabled for quotation documents (Quote-PDF-1).
 * Component retained so historical imports/types stay stable; Manufacturing Library
 * remains available outside the quote workflow.
 */
export default function QuoteDocumentManufacturingEvidence(_props: Props) {
  return null;
}
