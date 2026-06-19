"use client";

import { useEffect, useState } from "react";
import type { PublicQuoteDocument } from "@/features/quotes/types";
import type { QuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import QuoteDocumentTable from "@/components/quotes/QuoteDocumentTable";
import {
  downloadQuotePdfFromApi,
  quotePdfDownloadFilename,
} from "@/features/quotes/pdf/download-quote-pdf.client";
import { openQuoteDocumentPrint } from "@/features/quotes/pdf/open-quote-document-print.client";

type Props = {
  token: string;
  company: QuoteCompanyProfile;
  logoUrl?: string | null;
};

export default function PublicQuoteDocument({ token, company, logoUrl }: Props) {
  const [quote, setQuote] = useState<PublicQuoteDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  useEffect(() => {
    void fetch(`/api/quotes/public/${token}`)
      .then(async (res) => {
        const data = await res.json() as { quote?: PublicQuoteDocument; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Không tìm thấy báo giá");
        setQuote(data.quote ?? null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function downloadPdf() {
    setPdfDownloading(true);
    try {
      const apiUrl = `/api/quotes/public/${encodeURIComponent(token)}/pdf`;
      await downloadQuotePdfFromApi(
        apiUrl,
        quotePdfDownloadFilename(quote?.quoteNo ?? token),
      );
    } catch (err) {
      console.error("[PublicQuoteDocument] PDF download failed", err);
      alert(
        err instanceof Error
          ? err.message
          : "Không thể tạo PDF báo giá. Vui lòng thử lại.",
      );
    } finally {
      setPdfDownloading(false);
    }
  }

  if (loading) return <div className="quote-public-page"><p>Đang tải báo giá…</p></div>;
  if (error || !quote) return <div className="quote-public-page"><p>{error ?? "Không tìm thấy báo giá"}</p></div>;

  return (
    <QuoteDocumentTable
      quote={quote}
      company={company}
      logoUrl={logoUrl}
      showActions
      onPrint={() => openQuoteDocumentPrint(token)}
      onDownloadPdf={() => void downloadPdf()}
      pdfDownloading={pdfDownloading}
    />
  );
}
