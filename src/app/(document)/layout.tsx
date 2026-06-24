import type { Metadata } from "next";
import { buildPrivateNoindexMetadata } from "@/lib/seo/indexation-policy";

export const metadata: Metadata = buildPrivateNoindexMetadata();

export default function DocumentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="quote-document-pdf-root quote-document-print-host order-document-print-host production-sheet-print-host">
      {children}
    </div>
  );
}
