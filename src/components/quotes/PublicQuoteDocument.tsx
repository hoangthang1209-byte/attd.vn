"use client";

import { useEffect, useState } from "react";
import type { PublicQuoteDocument } from "@/features/quotes/types";
import QuoteDocumentTable from "@/components/quotes/QuoteDocumentTable";

type Props = {
  token: string;
  company: { brandName: string; hotlineDisplay: string; email: string; address: string };
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
      const res = await fetch(`/api/quotes/public/${token}/pdf`);
      if (!res.ok) throw new Error("Không thể tạo PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bao-gia-${quote?.quoteNo ?? token}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Không thể tạo PDF. Vui lòng thử lại.");
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
      onPrint={() => window.print()}
      onDownloadPdf={() => void downloadPdf()}
      pdfDownloading={pdfDownloading}
    />
  );
}
