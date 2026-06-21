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
