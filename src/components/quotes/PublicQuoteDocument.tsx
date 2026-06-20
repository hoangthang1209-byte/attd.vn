"use client";

import { useEffect, useState } from "react";
import type { PublicQuoteDocument } from "@/features/quotes/types";
import type { QuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import QuoteDocumentTable from "@/components/quotes/QuoteDocumentTable";
import QuotePublicLoading from "@/components/quotes/QuotePublicLoading";
import {
  downloadQuotePdfFromApi,
  quotePdfDownloadFilename,
} from "@/features/quotes/pdf/download-quote-pdf.client";
import {
  openQuotePdfInlinePublic,
  quotePdfDownloadUrlPublic,
} from "@/features/quotes/pdf/open-quote-pdf.client";

type Props = {
  token: string;
  company: QuoteCompanyProfile;
  logoUrl?: string | null;
  loadingLogoUrl?: string | null;
};

export default function PublicQuoteDocument({
  token,
  company,
  logoUrl,
  loadingLogoUrl,
}: Props) {
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
      const apiUrl = quotePdfDownloadUrlPublic(token);
      await downloadQuotePdfFromApi(
        apiUrl,
        quotePdfDownloadFilename(quote?.quoteNo ?? token),
      );
    } catch (err) {
      console.error("[PublicQuoteDocument] PDF download failed", err);
      alert(
        err instanceof Error
          ? err.message
          : "Không thể tạo file PDF giao diện báo giá. Vui lòng thử lại.",
      );
    } finally {
      setPdfDownloading(false);
    }
  }

  if (loading) {
    return <QuotePublicLoading logoUrl={loadingLogoUrl ?? logoUrl} />;
  }
  if (error || !quote) {
    return (
      <div className="quote-public-page">
        <p>{error ?? "Không tìm thấy báo giá"}</p>
      </div>
    );
  }

  return (
    <QuoteDocumentTable
      quote={quote}
      company={company}
      logoUrl={logoUrl}
      showActions
      onPrint={() => openQuotePdfInlinePublic(token)}
      onDownloadPdf={() => void downloadPdf()}
      pdfDownloading={pdfDownloading}
    />
  );
}
