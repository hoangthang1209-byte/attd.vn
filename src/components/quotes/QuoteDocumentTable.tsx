"use client";

import type { PublicQuoteDocument } from "@/features/quotes/types";
import type { QuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import QuoteDocumentContent from "@/components/quotes/QuoteDocumentContent";

type Props = {
  quote: PublicQuoteDocument;
  company: QuoteCompanyProfile;
  logoUrl?: string | null;
  showActions?: boolean;
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  pdfDownloading?: boolean;
};

export default function QuoteDocumentTable({
  quote,
  company,
  logoUrl,
  showActions = false,
  onPrint,
  onDownloadPdf,
  pdfDownloading = false,
}: Props) {
  return (
    <>
      <QuoteDocumentContent quote={quote} company={company} logoUrl={logoUrl} />

      {showActions && (
        <div className="quote-doc__actions no-print">
          {onPrint && (
            <button type="button" className="admin-btn admin-btn--secondary" onClick={onPrint}>
              In / Lưu PDF
            </button>
          )}
          {onDownloadPdf && (
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={onDownloadPdf}
              disabled={pdfDownloading}
            >
              {pdfDownloading ? "Đang tạo PDF..." : "Tải PDF báo giá"}
            </button>
          )}
        </div>
      )}
    </>
  );
}
