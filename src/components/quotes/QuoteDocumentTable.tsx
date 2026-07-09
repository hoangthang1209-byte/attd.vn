"use client";

import type { PublicQuoteDocument } from "@/features/quotes/types";
import type { QuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import QuoteDocumentContent from "@/components/quotes/QuoteDocumentContent";
import { ButtonLoading } from "@/components/ui/loading/ContextLoading";

type Props = {
  quote: PublicQuoteDocument;
  company: QuoteCompanyProfile;
  logoUrl?: string | null;
  showActions?: boolean;
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  pdfDownloading?: boolean;
};

/** Public quote document with optional action buttons outside the document root. */
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
        <div className="quote-document-actions quote-doc__actions no-print">
          <div className="quote-document-actions__group">
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
                aria-busy={pdfDownloading || undefined}
              >
                {pdfDownloading ? (
                  <ButtonLoading title="Đang tạo PDF..." tone="public" />
                ) : (
                  "Tải PDF báo giá"
                )}
              </button>
            )}
          </div>
          {onPrint && (
            <p className="quote-document-actions__hint">Mở file PDF để in hoặc lưu</p>
          )}
        </div>
      )}
    </>
  );
}
